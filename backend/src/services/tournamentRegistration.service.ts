import { Types } from "mongoose";
import { requireAuth, requireClubAccess, requireRole } from "../auth/permissions";
import { AppError } from "../errors/AppError";
import { ErrorCodes } from "../errors/errorCodes";
import type { GraphQLContext } from "../graphql/context";
import type { IGolfer } from "../models/golfer.model";
import type {
  ITournament,
  TournamentRegistrationStatus,
} from "../models/tournament.model";
import type {
  ITournamentRegistration,
  PaymentStatus,
  RegStatus,
} from "../models/tournamentRegistration.model";
import { GolferRepository } from "../repositories/golfer.repository";
import { TournamentRegistrationRepository } from "../repositories/tournamentRegistration.repository";
import { TournamentRepository } from "../repositories/tournament.repository";
import { auditService } from "./audit.service";
import { buildAuditActorContext, sanitizeAuditRecord } from "./audit.utils";

export interface RegisterForTournamentInput {
  tournamentId: string;
  golferId: string;
  preferredTeeId?: string;
  email: string;
  phone?: string;
  notes?: string;
  agreedToTerms: boolean;
}

function ensureMemberRegistersSelf(context: GraphQLContext, golferId: string): void {
  requireAuth(context);
  if (context.user!.role === "MEMBER" && context.user!.golferId !== golferId) {
    throw new AppError(
      "Members can only register themselves.",
      ErrorCodes.UNAUTHORIZED,
      403
    );
  }
}

function ensureRegistrationCancelAccess(
  context: GraphQLContext,
  golferId: string
): void {
  requireAuth(context);
  const adminRoles = ["SUPER_ADMIN", "CLUB_ADMIN", "HANDICAP_CHAIR", "TOURNAMENT_ADMIN"];
  if (adminRoles.includes(context.user!.role)) {
    return;
  }
  if (context.user!.role === "MEMBER" && context.user!.golferId === golferId) {
    return;
  }
  throw new AppError("Access denied.", ErrorCodes.UNAUTHORIZED, 403);
}

function ensureTournamentOpen(tournament: ITournament): void {
  if (tournament.registrationStatus !== "OPEN") {
    throw new AppError(
      "Registration for this tournament is not open.",
      ErrorCodes.REGISTRATION_CLOSED,
      400
    );
  }

  if (tournament.registrationCloseAt && new Date() > tournament.registrationCloseAt) {
    throw new AppError(
      "Registration deadline has passed.",
      ErrorCodes.REGISTRATION_CLOSED,
      400
    );
  }
}

function checkEligibility(tournament: ITournament, golfer: IGolfer): void {
  const eligibility = tournament.eligibility;
  if (!eligibility) {
    return;
  }

  if (
    eligibility.minHandicapIndex !== undefined &&
    eligibility.minHandicapIndex !== null &&
    (golfer.currentHandicapIndex === undefined ||
      golfer.currentHandicapIndex === null ||
      golfer.currentHandicapIndex < eligibility.minHandicapIndex)
  ) {
    throw new AppError(
      `A minimum Handicap Index of ${eligibility.minHandicapIndex} is required.`,
      ErrorCodes.NOT_ELIGIBLE,
      400
    );
  }

  if (
    eligibility.maxHandicapIndex !== undefined &&
    eligibility.maxHandicapIndex !== null &&
    (golfer.currentHandicapIndex === undefined ||
      golfer.currentHandicapIndex === null ||
      golfer.currentHandicapIndex > eligibility.maxHandicapIndex)
  ) {
    throw new AppError(
      `A maximum Handicap Index of ${eligibility.maxHandicapIndex} is required.`,
      ErrorCodes.NOT_ELIGIBLE,
      400
    );
  }

  if (
    eligibility.gender &&
    eligibility.gender !== "ALL" &&
    golfer.gender !== eligibility.gender
  ) {
    throw new AppError(
      "This tournament is not open to your gender eligibility.",
      ErrorCodes.NOT_ELIGIBLE,
      400
    );
  }

  if (eligibility.membershipCodes?.length) {
    if (!eligibility.membershipCodes.includes(golfer.membershipCode)) {
      throw new AppError(
        "Your membership type is not eligible for this tournament.",
        ErrorCodes.NOT_ELIGIBLE,
        400
      );
    }
  }
}

function getRegistrationSnapshot(registration: ITournamentRegistration) {
  return {
    golferId: registration.golferId.toString(),
    status: registration.status,
    paymentStatus: registration.paymentStatus,
    preferredTeeId: registration.preferredTeeId,
    registeredAt: registration.registeredAt.toISOString(),
  };
}

export const tournamentRegistrationService = {
  async tournamentRegistrations(
    tournamentId: string,
    context: GraphQLContext
  ): Promise<ITournamentRegistration[]> {
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN", "TOURNAMENT_ADMIN"]);

    const tournament = await TournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new AppError("Tournament not found.", ErrorCodes.NOT_FOUND, 404);
    }
    requireClubAccess(context, tournament.clubId.toString());

    return TournamentRegistrationRepository.findByTournament(tournamentId);
  },

  async myTournamentRegistrations(context: GraphQLContext): Promise<ITournamentRegistration[]> {
    requireAuth(context);
    if (!context.user!.golferId) {
      throw new AppError(
        "Current user is not linked to a golfer profile.",
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }
    return TournamentRegistrationRepository.findByGolfer(context.user!.golferId);
  },

  async registerForTournament(
    input: RegisterForTournamentInput,
    context: GraphQLContext
  ): Promise<ITournamentRegistration> {
    requireAuth(context);
    ensureMemberRegistersSelf(context, input.golferId);

    if (!input.agreedToTerms) {
      throw new AppError(
        "You must agree to the terms to register.",
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }

    const tournament = await TournamentRepository.findById(input.tournamentId);
    if (!tournament) {
      throw new AppError("Tournament not found.", ErrorCodes.NOT_FOUND, 404);
    }
    requireClubAccess(context, tournament.clubId.toString());
    ensureTournamentOpen(tournament);

    const golfer = await GolferRepository.findById(input.golferId);
    if (!golfer) {
      throw new AppError("Golfer not found.", ErrorCodes.NOT_FOUND, 404);
    }
    if (golfer.membershipStatus !== "ACTIVE") {
      throw new AppError(
        "Inactive golfers cannot register for tournaments.",
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }

    const existing = await TournamentRegistrationRepository.findExisting(
      input.tournamentId,
      input.golferId
    );
    if (existing && existing.status !== "CANCELLED") {
      throw new AppError(
        "Golfer is already registered for this tournament.",
        ErrorCodes.REGISTRATION_DUPLICATE,
        409
      );
    }

    checkEligibility(tournament, golfer);

    const registeredCount = await TournamentRepository.countRegistered(input.tournamentId);
    const status: RegStatus =
      tournament.maxPlayers && registeredCount >= tournament.maxPlayers
        ? "WAITLISTED"
        : "REGISTERED";
    const paymentStatus: PaymentStatus =
      tournament.entryFee && tournament.entryFee > 0 ? "UNPAID" : "NOT_REQUIRED";

    const payload: Partial<ITournamentRegistration> = {
      tournamentId: new Types.ObjectId(input.tournamentId),
      clubId: tournament.clubId,
      golferId: new Types.ObjectId(input.golferId),
      playerNameSnapshot: `${golfer.firstName} ${golfer.lastName}`,
      ghinNumberSnapshot: golfer.ghinNumber,
      emailSnapshot: input.email,
      handicapIndexSnapshot: golfer.currentHandicapIndex,
      preferredTeeId: input.preferredTeeId,
      status,
      paymentStatus,
      notes: input.notes,
      registeredAt: new Date(),
    };

    const registration = existing
      ? await TournamentRegistrationRepository.update(existing._id.toString(), payload)
      : await TournamentRegistrationRepository.create(payload);
    if (!registration) {
      throw new AppError("Registration could not be saved.", ErrorCodes.INTERNAL_ERROR, 500);
    }

    const auditActor = buildAuditActorContext(context, tournament.clubId.toString());
    await auditService.log({
      ...auditActor,
      entityType: "REGISTRATION",
      entityId: registration._id.toString(),
      action: "REGISTRATION_CREATED",
      summary: `${registration.playerNameSnapshot} registered for ${tournament.name}.`,
      before: existing ? sanitizeAuditRecord(getRegistrationSnapshot(existing)) : null,
      after: sanitizeAuditRecord(getRegistrationSnapshot(registration)),
    });

    return registration;
  },

  async cancelRegistration(
    id: string,
    reason: string | undefined,
    context: GraphQLContext
  ): Promise<ITournamentRegistration> {
    requireAuth(context);

    const registration = await TournamentRegistrationRepository.findById(id);
    if (!registration) {
      throw new AppError("Registration not found.", ErrorCodes.NOT_FOUND, 404);
    }
    requireClubAccess(context, registration.clubId.toString());
    ensureRegistrationCancelAccess(context, registration.golferId.toString());

    const updated = await TournamentRegistrationRepository.update(id, {
      status: "CANCELLED",
      notes: reason ?? registration.notes,
    });
    if (!updated) {
      throw new AppError("Registration not found.", ErrorCodes.NOT_FOUND, 404);
    }

    const auditActor = buildAuditActorContext(context, registration.clubId.toString());
    await auditService.log({
      ...auditActor,
      entityType: "REGISTRATION",
      entityId: id,
      action: "REGISTRATION_CANCELLED",
      summary: reason ?? `${registration.playerNameSnapshot} cancelled registration.`,
      before: sanitizeAuditRecord(getRegistrationSnapshot(registration)),
      after: sanitizeAuditRecord(getRegistrationSnapshot(updated)),
    });

    return updated;
  },

  async approve(id: string, context: GraphQLContext): Promise<ITournamentRegistration> {
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN", "TOURNAMENT_ADMIN"]);

    const registration = await TournamentRegistrationRepository.findById(id);
    if (!registration) {
      throw new AppError("Registration not found.", ErrorCodes.NOT_FOUND, 404);
    }
    requireClubAccess(context, registration.clubId.toString());

    const updated = await TournamentRegistrationRepository.update(id, {
      status: "REGISTERED",
    });
    if (!updated) {
      throw new AppError("Registration not found.", ErrorCodes.NOT_FOUND, 404);
    }

    const auditActor = buildAuditActorContext(context, registration.clubId.toString());
    await auditService.log({
      ...auditActor,
      entityType: "REGISTRATION",
      entityId: id,
      action: "REGISTRATION_APPROVED",
      summary: `${registration.playerNameSnapshot} registration was approved.`,
      before: sanitizeAuditRecord(getRegistrationSnapshot(registration)),
      after: sanitizeAuditRecord(getRegistrationSnapshot(updated)),
    });

    return updated;
  },

  async waitlist(id: string, context: GraphQLContext): Promise<ITournamentRegistration> {
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN", "TOURNAMENT_ADMIN"]);

    const registration = await TournamentRegistrationRepository.findById(id);
    if (!registration) {
      throw new AppError("Registration not found.", ErrorCodes.NOT_FOUND, 404);
    }
    requireClubAccess(context, registration.clubId.toString());

    const updated = await TournamentRegistrationRepository.update(id, {
      status: "WAITLISTED",
    });
    if (!updated) {
      throw new AppError("Registration not found.", ErrorCodes.NOT_FOUND, 404);
    }

    const auditActor = buildAuditActorContext(context, registration.clubId.toString());
    await auditService.log({
      ...auditActor,
      entityType: "REGISTRATION",
      entityId: id,
      action: "REGISTRATION_WAITLISTED",
      summary: `${registration.playerNameSnapshot} registration was waitlisted.`,
      before: sanitizeAuditRecord(getRegistrationSnapshot(registration)),
      after: sanitizeAuditRecord(getRegistrationSnapshot(updated)),
    });

    return updated;
  },
};

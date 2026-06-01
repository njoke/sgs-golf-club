import { Types } from "mongoose";
import { requireAuth, requireClubAccess, requireRole } from "../auth/permissions";
import { AppError } from "../errors/AppError";
import { ErrorCodes } from "../errors/errorCodes";
import type { GraphQLContext } from "../graphql/context";
import type {
  ITournament,
  ITournamentEligibility,
  TournamentFormat,
  TournamentRegistrationStatus,
  TournamentStatus,
} from "../models/tournament.model";
import { TournamentRepository } from "../repositories/tournament.repository";
import { auditService } from "./audit.service";
import { buildAuditActorContext, diffAuditFields, sanitizeAuditRecord } from "./audit.utils";

export interface TournamentEligibilityInput extends ITournamentEligibility {}

export interface CreateTournamentInput {
  clubId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  courseId?: string;
  format: TournamentFormat;
  registrationStatus?: TournamentRegistrationStatus;
  registrationOpenAt?: Date;
  registrationCloseAt?: Date;
  maxPlayers?: number;
  entryFee?: number;
  membersOnly?: boolean;
  allowGuests?: boolean;
  eligibility?: TournamentEligibilityInput;
}

function getTournamentAuditSnapshot(tournament: ITournament) {
  return {
    name: tournament.name,
    description: tournament.description,
    startDate: tournament.startDate.toISOString(),
    endDate: tournament.endDate?.toISOString(),
    courseId: tournament.courseId?.toString(),
    format: tournament.format,
    registrationStatus: tournament.registrationStatus,
    registrationOpenAt: tournament.registrationOpenAt?.toISOString(),
    registrationCloseAt: tournament.registrationCloseAt?.toISOString(),
    maxPlayers: tournament.maxPlayers,
    entryFee: tournament.entryFee,
    membersOnly: tournament.membersOnly,
    allowGuests: tournament.allowGuests,
    status: tournament.status,
  };
}

function validateRegistrationDates(input: CreateTournamentInput): void {
  if (input.registrationStatus === "OPEN") {
    if (!input.registrationOpenAt || !input.registrationCloseAt) {
      throw new AppError(
        "Registration open and close dates are required when opening registration.",
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }
  }
}

function mapTournamentInput(
  input: CreateTournamentInput,
  actorUserId?: string
): Partial<ITournament> {
  return {
    ...input,
    clubId: new Types.ObjectId(input.clubId),
    courseId: input.courseId ? new Types.ObjectId(input.courseId) : undefined,
    registrationStatus: input.registrationStatus ?? "DRAFT",
    membersOnly: input.membersOnly ?? true,
    allowGuests: input.allowGuests ?? false,
    status: "ACTIVE",
    createdByUserId: actorUserId ? new Types.ObjectId(actorUserId) : undefined,
  };
}

export const tournamentService = {
  async getTournaments(
    clubId: string,
    status: TournamentStatus | undefined,
    registrationStatus: TournamentRegistrationStatus | undefined,
    context: GraphQLContext
  ): Promise<ITournament[]> {
    requireAuth(context);
    requireClubAccess(context, clubId);
    return TournamentRepository.findByClub(clubId, status, registrationStatus);
  },

  async getById(id: string): Promise<ITournament | null> {
    return TournamentRepository.findById(id);
  },

  async getOpenTournaments(clubId: string, context: GraphQLContext): Promise<ITournament[]> {
    requireAuth(context);
    requireClubAccess(context, clubId);
    return TournamentRepository.findOpenForClub(clubId);
  },

  async createTournament(
    input: CreateTournamentInput,
    context: GraphQLContext
  ): Promise<ITournament> {
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN", "TOURNAMENT_ADMIN"]);
    requireClubAccess(context, input.clubId);
    validateRegistrationDates(input);

    const tournament = await TournamentRepository.create(
      mapTournamentInput(input, context.user!.userId)
    );
    const auditActor = buildAuditActorContext(context, input.clubId);
    await auditService.log({
      ...auditActor,
      entityType: "TOURNAMENT",
      entityId: tournament._id.toString(),
      action: "TOURNAMENT_CREATED",
      summary: `Tournament ${tournament.name} was created.`,
      before: null,
      after: sanitizeAuditRecord(getTournamentAuditSnapshot(tournament)),
    });

    return tournament;
  },

  async updateTournament(
    id: string,
    input: CreateTournamentInput,
    context: GraphQLContext
  ): Promise<ITournament> {
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN", "TOURNAMENT_ADMIN"]);

    const tournament = await TournamentRepository.findById(id);
    if (!tournament) {
      throw new AppError("Tournament not found.", ErrorCodes.NOT_FOUND, 404);
    }

    requireClubAccess(context, tournament.clubId.toString());
    if (input.clubId !== tournament.clubId.toString()) {
      throw new AppError(
        "Tournament club ID cannot be changed.",
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }

    validateRegistrationDates(input);

    const updated = await TournamentRepository.update(id, {
      name: input.name,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
      courseId: input.courseId ? new Types.ObjectId(input.courseId) : undefined,
      format: input.format,
      registrationStatus: input.registrationStatus ?? tournament.registrationStatus,
      registrationOpenAt: input.registrationOpenAt,
      registrationCloseAt: input.registrationCloseAt,
      maxPlayers: input.maxPlayers,
      entryFee: input.entryFee,
      membersOnly: input.membersOnly ?? tournament.membersOnly,
      allowGuests: input.allowGuests ?? tournament.allowGuests,
      eligibility: input.eligibility,
      clubId: tournament.clubId,
      createdByUserId: tournament.createdByUserId,
      status: tournament.status,
    });
    if (!updated) {
      throw new AppError("Tournament not found.", ErrorCodes.NOT_FOUND, 404);
    }

    const auditActor = buildAuditActorContext(context, input.clubId);
    const { before: auditBefore, after: auditAfter } = diffAuditFields(
      getTournamentAuditSnapshot(tournament),
      getTournamentAuditSnapshot(updated),
      [
        "name",
        "description",
        "startDate",
        "endDate",
        "courseId",
        "format",
        "registrationStatus",
        "registrationOpenAt",
        "registrationCloseAt",
        "maxPlayers",
        "entryFee",
        "membersOnly",
        "allowGuests",
        "status",
      ]
    );
    await auditService.log({
      ...auditActor,
      entityType: "TOURNAMENT",
      entityId: id,
      action: "TOURNAMENT_UPDATED",
      summary: `Tournament ${updated.name} was updated.`,
      before: auditBefore,
      after: auditAfter,
    });

    return updated;
  },

  async openRegistration(id: string, context: GraphQLContext): Promise<ITournament> {
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN", "TOURNAMENT_ADMIN"]);

    const tournament = await TournamentRepository.findById(id);
    if (!tournament) {
      throw new AppError("Tournament not found.", ErrorCodes.NOT_FOUND, 404);
    }
    requireClubAccess(context, tournament.clubId.toString());

    if (!tournament.registrationOpenAt || !tournament.registrationCloseAt) {
      throw new AppError(
        "Set registration open and close dates before opening.",
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }

    const updated = await TournamentRepository.update(id, { registrationStatus: "OPEN" });
    if (!updated) {
      throw new AppError("Tournament not found.", ErrorCodes.NOT_FOUND, 404);
    }

    const auditActor = buildAuditActorContext(context, tournament.clubId.toString());
    await auditService.log({
      ...auditActor,
      entityType: "TOURNAMENT",
      entityId: id,
      action: "TOURNAMENT_REGISTRATION_OPENED",
      summary: `Registration opened for ${updated.name}.`,
      before: sanitizeAuditRecord({
        registrationStatus: tournament.registrationStatus,
      }),
      after: sanitizeAuditRecord({
        registrationStatus: updated.registrationStatus,
      }),
    });

    return updated;
  },

  async closeRegistration(id: string, context: GraphQLContext): Promise<ITournament> {
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN", "TOURNAMENT_ADMIN"]);

    const tournament = await TournamentRepository.findById(id);
    if (!tournament) {
      throw new AppError("Tournament not found.", ErrorCodes.NOT_FOUND, 404);
    }
    requireClubAccess(context, tournament.clubId.toString());

    const updated = await TournamentRepository.update(id, { registrationStatus: "CLOSED" });
    if (!updated) {
      throw new AppError("Tournament not found.", ErrorCodes.NOT_FOUND, 404);
    }

    const auditActor = buildAuditActorContext(context, tournament.clubId.toString());
    await auditService.log({
      ...auditActor,
      entityType: "TOURNAMENT",
      entityId: id,
      action: "TOURNAMENT_REGISTRATION_CLOSED",
      summary: `Registration closed for ${updated.name}.`,
      before: sanitizeAuditRecord({
        registrationStatus: tournament.registrationStatus,
      }),
      after: sanitizeAuditRecord({
        registrationStatus: updated.registrationStatus,
      }),
    });

    return updated;
  },

  async cancelTournament(
    id: string,
    reason: string | undefined,
    context: GraphQLContext
  ): Promise<ITournament> {
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN", "TOURNAMENT_ADMIN"]);

    const tournament = await TournamentRepository.findById(id);
    if (!tournament) {
      throw new AppError("Tournament not found.", ErrorCodes.NOT_FOUND, 404);
    }
    requireClubAccess(context, tournament.clubId.toString());

    const updated = await TournamentRepository.update(id, {
      status: "CANCELLED",
      registrationStatus: "CANCELLED",
    });
    if (!updated) {
      throw new AppError("Tournament not found.", ErrorCodes.NOT_FOUND, 404);
    }

    const auditActor = buildAuditActorContext(context, tournament.clubId.toString());
    await auditService.log({
      ...auditActor,
      entityType: "TOURNAMENT",
      entityId: id,
      action: "TOURNAMENT_CANCELLED",
      summary: reason ?? `Tournament ${updated.name} was cancelled.`,
      before: sanitizeAuditRecord({
        status: tournament.status,
        registrationStatus: tournament.registrationStatus,
      }),
      after: sanitizeAuditRecord({
        status: updated.status,
        registrationStatus: updated.registrationStatus,
      }),
    });

    return updated;
  },
};

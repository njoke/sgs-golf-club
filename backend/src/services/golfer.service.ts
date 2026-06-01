import { FilterQuery, Types } from "mongoose";
import { Gender, IGolfer } from "../models/golfer.model";
import { Golfer } from "../models/golfer.model";
import { GolferRepository, GolferRosterFilter } from "../repositories/golfer.repository";
import { AppError } from "../errors/AppError";
import { ErrorCodes } from "../errors/errorCodes";
import { requireAuth, requireRole, requireClubAccess } from "../auth/permissions";
import type { GraphQLContext } from "../graphql/context";
import { auditService } from "./audit.service";
import { buildAuditActorContext, diffAuditFields, sanitizeAuditRecord } from "./audit.utils";

export interface AddNewGolferInput {
  clubId: string;
  ghinNumber?: string;
  localNumber?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  gender: Gender;
  dateOfBirth?: Date;
  email: string;
  phone?: string;
  membershipCode: string;
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface AddExistingGolferToClubInput {
  clubId: string;
  ghinNumber: string;
  membershipCode: string;
  localNumber?: string;
}

export interface UpdateGolferInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  gender?: Gender;
  dateOfBirth?: Date;
  email?: string;
  phone?: string;
  localNumber?: string;
  membershipCode?: string;
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface ExistingGolferSearchInput {
  clubId: string;
  ghinOrEmail?: string;
  firstName?: string;
  lastName?: string;
  association?: string;
}

export interface GolferSearchResult {
  ghinNumber?: string;
  firstName: string;
  lastName: string;
  email?: string;
  city?: string;
  state?: string;
  currentClubName: string | null;
  canAddToClub: boolean;
}

function getGolferAuditSnapshot(golfer: Pick<
  IGolfer,
  | "firstName"
  | "lastName"
  | "email"
  | "membershipCode"
  | "ghinNumber"
  | "gender"
  | "membershipStatus"
  | "currentHandicapIndex"
>) {
  return {
    firstName: golfer.firstName,
    lastName: golfer.lastName,
    email: golfer.email,
    membershipCode: golfer.membershipCode,
    ghinNumber: golfer.ghinNumber,
    gender: golfer.gender,
    membershipStatus: golfer.membershipStatus,
    currentHandicapIndex: golfer.currentHandicapIndex,
  };
}

export const golferService = {
  async getRoster(
    filter: GolferRosterFilter
  ): Promise<{ golfers: IGolfer[]; total: number }> {
    return GolferRepository.findByClub(filter);
  },

  async getById(id: string): Promise<IGolfer | null> {
    return GolferRepository.findById(id);
  },

  async searchExistingGolfers(
    input: ExistingGolferSearchInput
  ): Promise<GolferSearchResult[]> {
    if (!input.ghinOrEmail && !input.lastName) {
      throw new AppError(
        "Provide a GHIN number, email, or last name to search.",
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }
    if (input.firstName && !input.lastName) {
      throw new AppError(
        "Last name is required when searching by name.",
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }

    const query: FilterQuery<IGolfer> = {};

    if (input.ghinOrEmail) {
      const regex = new RegExp(input.ghinOrEmail, "i");
      query.$or = [{ ghinNumber: input.ghinOrEmail }, { email: regex }];
    }
    if (input.lastName) {
      query.lastName = new RegExp(input.lastName, "i");
    }
    if (input.firstName) {
      query.firstName = new RegExp(input.firstName, "i");
    }

    const results = await GolferRepository.searchGlobal(query);
    return results.map((g) => ({
      ghinNumber: g.ghinNumber,
      firstName: g.firstName,
      lastName: g.lastName,
      email: g.email,
      city: g.address?.city,
      state: g.address?.state,
      currentClubName: null,
      canAddToClub: g.membershipStatus === "INACTIVE",
    }));
  },

  async addNewGolfer(
    input: AddNewGolferInput,
    context: GraphQLContext
  ): Promise<IGolfer> {
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN"]);
    requireClubAccess(context, input.clubId);

    const existingByEmail = await GolferRepository.findByEmail(input.clubId, input.email);
    if (existingByEmail) {
      throw new AppError(
        `A golfer with email ${input.email} already exists in this club.`,
        ErrorCodes.ALREADY_EXISTS,
        409
      );
    }

    if (input.ghinNumber) {
      const existingByGhin = await GolferRepository.findByGhin(input.clubId, input.ghinNumber);
      if (existingByGhin) {
        throw new AppError(
          `GHIN number ${input.ghinNumber} is already registered in this club.`,
          ErrorCodes.ALREADY_EXISTS,
          409
        );
      }
    }

    const golfer = await GolferRepository.create({
      ...input,
      clubId: new Types.ObjectId(input.clubId),
      email: input.email.toLowerCase(),
      membershipStatus: "ACTIVE",
      statusDate: new Date(),
      digitalProfileStatus: "NONE",
    });

    const auditActor = buildAuditActorContext(context, input.clubId);
    await auditService.log({
      ...auditActor,
      entityType: "GOLFER",
      entityId: golfer._id.toString(),
      action: "GOLFER_CREATED",
      summary: `Golfer ${golfer.firstName} ${golfer.lastName} was added to the club.`,
      before: null,
      after: sanitizeAuditRecord(getGolferAuditSnapshot(golfer)),
    });

    return golfer;
  },

  async addExistingGolferToClub(
    input: AddExistingGolferToClubInput,
    context: GraphQLContext
  ): Promise<IGolfer> {
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN"]);
    requireClubAccess(context, input.clubId);

    const source = await GolferRepository.findByGhinGlobal(input.ghinNumber);
    if (!source) {
      throw new AppError(
        `No golfer found with GHIN ${input.ghinNumber}.`,
        ErrorCodes.NOT_FOUND,
        404
      );
    }

    // Block if already active in this club
    const existing = await GolferRepository.findByGhin(input.clubId, input.ghinNumber);
    if (existing && existing.membershipStatus === "ACTIVE") {
      throw new AppError(
        `Golfer with GHIN ${input.ghinNumber} is already an active member of this club.`,
        ErrorCodes.ALREADY_EXISTS,
        409
      );
    }

    // Reactivate if already in club but inactive
    if (existing) {
      const updated = await GolferRepository.update(existing._id.toString(), {
        membershipStatus: "ACTIVE",
        statusDate: new Date(),
        membershipCode: input.membershipCode,
        localNumber: input.localNumber,
      });
      const auditActor = buildAuditActorContext(context, input.clubId);
      await auditService.log({
        ...auditActor,
        entityType: "GOLFER",
        entityId: existing._id.toString(),
        action: "GOLFER_ACTIVATED",
        summary: `Golfer ${existing.firstName} ${existing.lastName} was reactivated in the club.`,
        before: sanitizeAuditRecord({
          membershipStatus: existing.membershipStatus,
          membershipCode: existing.membershipCode,
          localNumber: existing.localNumber,
        }),
        after: sanitizeAuditRecord({
          membershipStatus: updated?.membershipStatus,
          membershipCode: updated?.membershipCode,
          localNumber: updated?.localNumber,
        }),
      });
      return updated!;
    }

    // New record in this club
    const golfer = await GolferRepository.create({
      clubId: new Types.ObjectId(input.clubId),
      ghinNumber: source.ghinNumber,
      localNumber: input.localNumber,
      firstName: source.firstName,
      middleName: source.middleName,
      lastName: source.lastName,
      suffix: source.suffix,
      gender: source.gender,
      dateOfBirth: source.dateOfBirth,
      email: source.email,
      phone: source.phone,
      address: source.address,
      membershipCode: input.membershipCode,
      membershipStatus: "ACTIVE",
      statusDate: new Date(),
      digitalProfileStatus: "NONE",
    });

    const auditActor = buildAuditActorContext(context, input.clubId);
    await auditService.log({
      ...auditActor,
      entityType: "GOLFER",
      entityId: golfer._id.toString(),
      action: "GOLFER_CREATED",
      summary: `Existing golfer ${golfer.firstName} ${golfer.lastName} was added to the club.`,
      before: null,
      after: sanitizeAuditRecord(getGolferAuditSnapshot(golfer)),
    });

    return golfer;
  },

  async updateGolfer(
    id: string,
    input: UpdateGolferInput,
    context: GraphQLContext
  ): Promise<IGolfer> {
    requireAuth(context);

    const golfer = await GolferRepository.findById(id);
    if (!golfer) throw new AppError("Golfer not found.", ErrorCodes.NOT_FOUND, 404);

    requireClubAccess(context, golfer.clubId.toString());
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN", "HANDICAP_CHAIR"]);

    const updated = await GolferRepository.update(id, input as Partial<IGolfer>);
    const auditActor = buildAuditActorContext(context, golfer.clubId.toString());
    const requestedAddressFields = input.address
      ? {
          addressCity: golfer.address?.city,
          addressState: golfer.address?.state,
          addressCountry: golfer.address?.country,
        }
      : {};
    const updatedAddressFields = input.address
      ? {
          addressCity: updated?.address?.city,
          addressState: updated?.address?.state,
          addressCountry: updated?.address?.country,
        }
      : {};
    const { before: auditBefore, after: auditAfter } = diffAuditFields(
      {
        ...getGolferAuditSnapshot(golfer),
        localNumber: golfer.localNumber,
        phone: golfer.phone,
        dateOfBirth: golfer.dateOfBirth?.toISOString(),
        ...requestedAddressFields,
      },
      {
        ...getGolferAuditSnapshot(updated!),
        localNumber: updated?.localNumber,
        phone: updated?.phone,
        dateOfBirth: updated?.dateOfBirth?.toISOString(),
        ...updatedAddressFields,
      },
      [
        "firstName",
        "lastName",
        "email",
        "membershipCode",
        "ghinNumber",
        "gender",
        "currentHandicapIndex",
        "localNumber",
        "phone",
        "dateOfBirth",
        "addressCity",
        "addressState",
        "addressCountry",
      ]
    );

    await auditService.log({
      ...auditActor,
      entityType: "GOLFER",
      entityId: id,
      action: "GOLFER_UPDATED",
      summary: `Golfer ${updated!.firstName} ${updated!.lastName} profile was updated.`,
      before: auditBefore,
      after: auditAfter,
    });

    return updated!;
  },

  async activateGolfer(id: string, context: GraphQLContext): Promise<IGolfer> {
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN"]);

    const golfer = await GolferRepository.findById(id);
    if (!golfer) throw new AppError("Golfer not found.", ErrorCodes.NOT_FOUND, 404);
    requireClubAccess(context, golfer.clubId.toString());

    if (golfer.membershipStatus === "ACTIVE") {
      throw new AppError("Golfer is already active.", ErrorCodes.VALIDATION_ERROR, 400);
    }

    const updated = await GolferRepository.update(id, {
      membershipStatus: "ACTIVE",
      statusDate: new Date(),
    });

    const auditActor = buildAuditActorContext(context, golfer.clubId.toString());
    await auditService.log({
      ...auditActor,
      entityType: "GOLFER",
      entityId: id,
      action: "GOLFER_ACTIVATED",
      summary: `Golfer ${golfer.firstName} ${golfer.lastName} was activated.`,
      before: sanitizeAuditRecord({ membershipStatus: golfer.membershipStatus }),
      after: sanitizeAuditRecord({ membershipStatus: updated?.membershipStatus }),
    });

    return updated!;
  },

  async deactivateGolfer(
    id: string,
    reason: string | undefined,
    context: GraphQLContext
  ): Promise<IGolfer> {
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN"]);

    const golfer = await GolferRepository.findById(id);
    if (!golfer) throw new AppError("Golfer not found.", ErrorCodes.NOT_FOUND, 404);
    requireClubAccess(context, golfer.clubId.toString());

    if (golfer.membershipStatus === "INACTIVE") {
      throw new AppError("Golfer is already inactive.", ErrorCodes.VALIDATION_ERROR, 400);
    }

    const updated = await GolferRepository.update(id, {
      membershipStatus: "INACTIVE",
      statusDate: new Date(),
    });

    const auditActor = buildAuditActorContext(context, golfer.clubId.toString());
    await auditService.log({
      ...auditActor,
      entityType: "GOLFER",
      entityId: id,
      action: "GOLFER_DEACTIVATED",
      summary: reason ?? `Golfer ${golfer.firstName} ${golfer.lastName} was deactivated.`,
      before: sanitizeAuditRecord({ membershipStatus: golfer.membershipStatus }),
      after: sanitizeAuditRecord({ membershipStatus: updated?.membershipStatus }),
    });

    return updated!;
  },
};

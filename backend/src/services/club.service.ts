import { Club, IClub } from "../models/club.model";
import { ClubRepository } from "../repositories/club.repository";
import { AppError } from "../errors/AppError";
import { ErrorCodes } from "../errors/errorCodes";
import { requireAuth, requireRole, requireClubAccess } from "../auth/permissions";
import type { GraphQLContext } from "../graphql/context";
import { auditService } from "./audit.service";
import { buildAuditActorContext, diffAuditFields } from "./audit.utils";

export interface UpdateClubInput {
  name?: string;
  shortName?: string;
  phone?: string;
  email?: string;
  website?: string;
  hubspotCompanyId?: string;
  handicapChairperson?: string;
  contacts?: Array<{
    contactType: string;
    name?: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
}

export const clubService = {
  async getMyClubs(context: GraphQLContext): Promise<IClub[]> {
    requireAuth(context);
    if (context.user!.role === "SUPER_ADMIN") {
      return ClubRepository.findAllActive();
    }
    return ClubRepository.findByIds(context.user!.clubIds);
  },

  async getClubById(id: string, context: GraphQLContext): Promise<IClub | null> {
    requireAuth(context);
    requireClubAccess(context, id);
    return ClubRepository.findById(id);
  },

  async updateClub(
    id: string,
    input: UpdateClubInput,
    context: GraphQLContext
  ): Promise<IClub> {
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN"]);
    requireClubAccess(context, id);

    const before = await ClubRepository.findById(id);
    if (!before) {
      throw new AppError("Club not found.", ErrorCodes.NOT_FOUND, 404);
    }

    const updated = await ClubRepository.update(id, input as Partial<IClub>);
    if (!updated) {
      throw new AppError("Club not found.", ErrorCodes.NOT_FOUND, 404);
    }

    const auditKeys = [
      "name",
      "shortName",
      "phone",
      "email",
      "website",
      "hubspotCompanyId",
      "handicapChairperson",
      "contactsUpdated",
    ];
    const { before: auditBefore, after: auditAfter } = diffAuditFields(
      {
        name: before.name,
        shortName: before.shortName,
        phone: before.phone,
        email: before.email,
        website: before.website,
        hubspotCompanyId: before.hubspotCompanyId,
        handicapChairperson: before.handicapChairperson,
        contactsUpdated: input.contacts ? false : undefined,
      },
      {
        name: updated.name,
        shortName: updated.shortName,
        phone: updated.phone,
        email: updated.email,
        website: updated.website,
        hubspotCompanyId: updated.hubspotCompanyId,
        handicapChairperson: updated.handicapChairperson,
        contactsUpdated: input.contacts ? true : undefined,
      },
      auditKeys
    );
    const auditActor = buildAuditActorContext(context, id);

    await auditService.log({
      ...auditActor,
      entityType: "CLUB",
      entityId: id,
      action: "CLUB_UPDATED",
      summary: `Club ${updated.name} was updated.`,
      before: auditBefore,
      after: auditAfter,
    });

    return updated;
  },
};

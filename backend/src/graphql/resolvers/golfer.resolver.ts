import { golferService, AddNewGolferInput, AddExistingGolferToClubInput, UpdateGolferInput, ExistingGolferSearchInput } from "../../services/golfer.service";
import { requireAuth, requireRole, requireClubAccess } from "../../auth/permissions";
import { AppError } from "../../errors/AppError";
import { ErrorCodes } from "../../errors/errorCodes";
import type { GraphQLContext } from "../context";
import type { GolferRosterFilter } from "../../repositories/golfer.repository";
import type { IGolfer } from "../../models/golfer.model";

function mapGolfer(g: IGolfer) {
  return {
    ...g,
    id: g._id.toString(),
    clubId: g.clubId.toString(),
  };
}

export const golferResolvers = {
  Query: {
    golfers: async (
      _: unknown,
      { filter }: { filter: GolferRosterFilter },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      requireClubAccess(ctx, filter.clubId);
      const { golfers, total } = await golferService.getRoster(filter);
      const page = filter.page ?? 1;
      const pageSize = Math.min(filter.pageSize ?? 25, 100);
      return {
        nodes: golfers.map(mapGolfer),
        pageInfo: {
          totalCount: total,
          page,
          pageSize,
          hasNextPage: page * pageSize < total,
          hasPreviousPage: page > 1,
        },
      };
    },

    golfer: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const golfer = await golferService.getById(id);
      if (!golfer) throw new AppError("Golfer not found.", ErrorCodes.NOT_FOUND, 404);
      requireClubAccess(ctx, golfer.clubId.toString());
      return mapGolfer(golfer);
    },

    searchExistingGolfers: async (
      _: unknown,
      { input }: { input: ExistingGolferSearchInput },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      requireRole(ctx, ["SUPER_ADMIN", "CLUB_ADMIN"]);
      return golferService.searchExistingGolfers(input);
    },
  },

  Mutation: {
    addNewGolfer: async (
      _: unknown,
      { input }: { input: AddNewGolferInput },
      ctx: GraphQLContext
    ) => {
      const golfer = await golferService.addNewGolfer(input, ctx);
      return mapGolfer(golfer);
    },

    addExistingGolferToClub: async (
      _: unknown,
      { input }: { input: AddExistingGolferToClubInput },
      ctx: GraphQLContext
    ) => {
      const golfer = await golferService.addExistingGolferToClub(input, ctx);
      return mapGolfer(golfer);
    },

    updateGolfer: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateGolferInput },
      ctx: GraphQLContext
    ) => {
      const golfer = await golferService.updateGolfer(id, input, ctx);
      return mapGolfer(golfer);
    },

    activateGolfer: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const golfer = await golferService.activateGolfer(id, ctx);
      return mapGolfer(golfer);
    },

    deactivateGolfer: async (
      _: unknown,
      { id, reason }: { id: string; reason?: string },
      ctx: GraphQLContext
    ) => {
      const golfer = await golferService.deactivateGolfer(id, reason, ctx);
      return mapGolfer(golfer);
    },
  },
};

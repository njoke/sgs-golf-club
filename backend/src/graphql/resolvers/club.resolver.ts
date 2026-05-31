import { clubService, UpdateClubInput } from "../../services/club.service";
import type { GraphQLContext } from "../context";
import type { IClub } from "../../models/club.model";

function mapClub(club: IClub) {
  return {
    ...club,
    id: club._id.toString(),
  };
}

export const clubResolvers = {
  Query: {
    myClubs: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const clubs = await clubService.getMyClubs(ctx);
      return clubs.map(mapClub);
    },

    club: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const club = await clubService.getClubById(id, ctx);
      return club ? mapClub(club) : null;
    },
  },

  Mutation: {
    updateClub: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateClubInput },
      ctx: GraphQLContext
    ) => {
      const club = await clubService.updateClub(id, input, ctx);
      return mapClub(club);
    },
  },
};

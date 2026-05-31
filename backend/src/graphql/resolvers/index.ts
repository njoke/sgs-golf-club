import { authResolvers } from "./auth.resolver";
import { clubResolvers } from "./club.resolver";
import { golferResolvers } from "./golfer.resolver";

export const resolvers = {
  Query: {
    ...clubResolvers.Query,
    ...golferResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...clubResolvers.Mutation,
    ...golferResolvers.Mutation,
  },
};

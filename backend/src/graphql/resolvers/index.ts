import { auditLogResolvers } from "./auditLog.resolver";
import { authResolvers } from "./auth.resolver";
import { clubResolvers } from "./club.resolver";
import { courseResolvers } from "./course.resolver";
import { golferResolvers } from "./golfer.resolver";
import { scoreResolvers } from "./score.resolver";
import { tournamentResolvers } from "./tournament.resolver";
import { DateTimeScalar, JSONScalar } from "../scalars";

export const resolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,
  Tournament: tournamentResolvers.Tournament,
  Query: {
    ...auditLogResolvers.Query,
    ...clubResolvers.Query,
    ...courseResolvers.Query,
    ...golferResolvers.Query,
    ...scoreResolvers.Query,
    ...tournamentResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...clubResolvers.Mutation,
    ...courseResolvers.Mutation,
    ...golferResolvers.Mutation,
    ...scoreResolvers.Mutation,
    ...tournamentResolvers.Mutation,
  },
};

import type { IScore } from "../../models/score.model";
import {
  scoreService,
  type PostScoreInput,
} from "../../services/score.service";
import type { GraphQLContext } from "../context";
import type { ScoreHistoryFilterInput } from "../../repositories/score.repository";
import { AppError } from "../../errors/AppError";
import { ErrorCodes } from "../../errors/errorCodes";
import { toPlainObject } from "./toPlainObject";

function mapScore(score: IScore) {
  const plainScore = toPlainObject(score);
  return {
    ...plainScore,
    id: plainScore._id.toString(),
    clubId: plainScore.clubId.toString(),
    golferId: plainScore.golferId.toString(),
    courseId: plainScore.courseId?.toString() ?? null,
    teeId: plainScore.teeId ?? null,
  };
}

export const scoreResolvers = {
  Query: {
    golferScores: async (
      _: unknown,
      { filter }: { filter: ScoreHistoryFilterInput },
      ctx: GraphQLContext
    ) => {
      const { scores, total } = await scoreService.getScoreHistory(filter, ctx);
      const page = filter.page ?? 1;
      const pageSize = Math.min(filter.pageSize ?? 25, 100);

      return {
        nodes: scores.map(mapScore),
        pageInfo: {
          totalCount: total,
          page,
          pageSize,
          hasNextPage: page * pageSize < total,
          hasPreviousPage: page > 1,
        },
      };
    },

    score: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const score = await scoreService.getById(id, ctx);
      if (!score) {
        throw new AppError("Score not found.", ErrorCodes.NOT_FOUND, 404);
      }
      return mapScore(score);
    },
  },

  Mutation: {
    postScore: async (
      _: unknown,
      { input }: { input: PostScoreInput },
      ctx: GraphQLContext
    ) => {
      const score = await scoreService.postScore(input, ctx);
      return mapScore(score);
    },

    updateScore: async (
      _: unknown,
      { id, input }: { id: string; input: PostScoreInput },
      ctx: GraphQLContext
    ) => {
      const score = await scoreService.updateScore(id, input, ctx);
      return mapScore(score);
    },

    withdrawScore: async (
      _: unknown,
      { id, reason }: { id: string; reason?: string },
      ctx: GraphQLContext
    ) => {
      const score = await scoreService.withdrawScore(id, reason, ctx);
      return mapScore(score);
    },
  },
};

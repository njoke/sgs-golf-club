import { Types } from "mongoose";
import { requireAuth, requireClubAccess, requireOwnGolferOrAdmin, requireRole } from "../auth/permissions";
import { AppError } from "../errors/AppError";
import { ErrorCodes } from "../errors/errorCodes";
import type { GraphQLContext } from "../graphql/context";
import { HandicapEngine } from "../handicap/engine";
import { pairNineHoleScores } from "../handicap/nineHole";
import type { IGolfer } from "../models/golfer.model";
import type { IScore, ScoreEntryMode, ScoreStatus, ScoreType } from "../models/score.model";
import { CourseRepository } from "../repositories/course.repository";
import { GolferRepository } from "../repositories/golfer.repository";
import {
  ScoreRepository,
  type ScoreHistoryFilterInput,
} from "../repositories/score.repository";
import { auditService } from "./audit.service";
import { buildAuditActorContext, sanitizeAuditRecord } from "./audit.utils";
import { HandicapService } from "./handicap.service";

export interface PostScoreInput {
  clubId: string;
  golferId: string;
  datePlayed: Date;
  scoreType: ScoreType;
  holes: number;
  entryMode: ScoreEntryMode;
  courseId?: string;
  teeId?: string;
  courseName: string;
  teeName: string;
  grossScore: number;
  adjustedGrossScore?: number;
  holeScores?: number[];
  courseRating: number;
  slopeRating: number;
  par: number;
  isTournamentScore?: boolean;
  tournamentId?: string;
}

const handicapEngine = new HandicapEngine();
const handicapService = new HandicapService(
  {
    async findById(id) {
      const golfer = await GolferRepository.findById(id);
      if (!golfer) {
        return null;
      }

      return {
        id: golfer._id.toString(),
        gender: golfer.gender,
        currentHandicapIndex: golfer.currentHandicapIndex ?? null,
        lowHandicapIndex: golfer.lowHandicapIndex ?? null,
        lowHandicapDate: golfer.lowHandicapDate ?? null,
      };
    },
    async update(id, data) {
      return GolferRepository.update(id, data as Partial<IGolfer>);
    },
  },
  {
    async getLastNDifferentials(golferId, limit) {
      return ScoreRepository.getLastNDifferentials(golferId, limit);
    },
    async getRecentScoresWithDifferentials(golferId) {
      return ScoreRepository.getRecentScoresWithDifferentials(golferId);
    },
  }
);

function validateScoreInput(input: PostScoreInput): void {
  if (![9, 18].includes(input.holes)) {
    throw new AppError("Holes must be 9 or 18.", ErrorCodes.VALIDATION_ERROR, 400);
  }

  if (input.grossScore < 1) {
    throw new AppError(
      "Gross score must be a positive number.",
      ErrorCodes.VALIDATION_ERROR,
      400
    );
  }

  if (input.slopeRating < 55 || input.slopeRating > 155) {
    throw new AppError(
      "Slope rating must be between 55 and 155.",
      ErrorCodes.VALIDATION_ERROR,
      400
    );
  }

  if (!input.datePlayed) {
    throw new AppError("Date played is required.", ErrorCodes.VALIDATION_ERROR, 400);
  }

  if (input.entryMode === "HOLE_BY_HOLE") {
    if (!input.holeScores || input.holeScores.length !== input.holes) {
      throw new AppError(
        `Exactly ${input.holes} hole scores required.`,
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }

    const holeScoreTotal = input.holeScores.reduce((sum, score) => sum + score, 0);
    if (holeScoreTotal !== input.grossScore) {
      throw new AppError(
        "Gross score must equal sum of hole scores in hole-by-hole mode.",
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }
  }
}

function calculateScoreDifferential(score: {
  adjustedGrossScore?: number;
  grossScore: number;
  courseRating: number;
  slopeRating: number;
  holes: number;
}): number {
  return handicapEngine.calculateDifferential({
    adjustedGrossScore: score.adjustedGrossScore ?? score.grossScore,
    courseRating: score.courseRating,
    slopeRating: score.slopeRating,
    isNineHole: score.holes === 9,
  });
}

async function resolveAdjustedGrossScore(input: PostScoreInput): Promise<number> {
  if (input.entryMode !== "HOLE_BY_HOLE" || !input.holeScores) {
    return input.adjustedGrossScore ?? input.grossScore;
  }

  if (!input.courseId || !input.teeId) {
    return handicapEngine.computeAdjustedGrossFromHoles({
      holeScores: input.holeScores,
      courseHandicap: 0,
    });
  }

  const course = await CourseRepository.findById(input.courseId);
  if (!course) {
    throw new AppError("Course not found.", ErrorCodes.NOT_FOUND, 404);
  }

  const tee = course.tees.find((item) => item.teeId === input.teeId);
  if (!tee) {
    throw new AppError("Tee not found on selected course.", ErrorCodes.NOT_FOUND, 404);
  }

  return handicapEngine.computeAdjustedGrossFromHoles({
    holeScores: input.holeScores,
    courseHandicap: 0,
    holePars: tee.holePars,
    holeHandicaps: tee.holeHandicaps,
  });
}

async function restorePairedNineHoleScores(score: IScore): Promise<void> {
  if (!score.pairedWithScoreId) {
    return;
  }

  const pairedScore = await ScoreRepository.findById(score.pairedWithScoreId.toString());
  if (!pairedScore) {
    return;
  }

  await ScoreRepository.bulkUpdate([
    {
      id: score._id.toString(),
      data: {
        isNineHole: true,
        pairedWithScoreId: null,
        differential: calculateScoreDifferential(score),
      },
    },
    {
      id: pairedScore._id.toString(),
      data: {
        isNineHole: true,
        pairedWithScoreId: null,
        differential: calculateScoreDifferential(pairedScore),
      },
    },
  ]);
}

async function pairPendingNineHoleScores(golferId: string): Promise<void> {
  const unpairedScores = await ScoreRepository.findUnpairedNineHoleScores(golferId);
  const pairing = pairNineHoleScores(
    unpairedScores.map((score) => ({
      id: score._id.toString(),
      golferId: score.golferId.toString(),
      datePlayed: score.datePlayed,
      differential: score.differential ?? null,
      isNineHole: score.isNineHole,
      pairedWithScoreId: score.pairedWithScoreId?.toString() ?? null,
      status: score.status,
    }))
  );

  if (!pairing) {
    return;
  }

  await ScoreRepository.bulkUpdate([
    {
      id: pairing.updatedOlderScore.id,
      data: {
        differential: pairing.updatedOlderScore.differential ?? undefined,
        pairedWithScoreId: new Types.ObjectId(pairing.updatedOlderScore.pairedWithScoreId!),
        isNineHole: pairing.updatedOlderScore.isNineHole,
      },
    },
    {
      id: pairing.updatedNewerScore.id,
      data: {
        pairedWithScoreId: new Types.ObjectId(pairing.updatedNewerScore.pairedWithScoreId!),
      },
    },
  ]);
}

async function getActiveGolfer(golferId: string): Promise<IGolfer> {
  const golfer = await GolferRepository.findById(golferId);
  if (!golfer) {
    throw new AppError("Golfer not found.", ErrorCodes.NOT_FOUND, 404);
  }

  if (golfer.membershipStatus !== "ACTIVE") {
    throw new AppError(
      "Cannot post score for an inactive golfer.",
      ErrorCodes.VALIDATION_ERROR,
      400
    );
  }

  return golfer;
}

function ensureMemberCanPostForGolfer(context: GraphQLContext, golferId: string): void {
  requireAuth(context);
  if (context.user.role === "MEMBER" && context.user.golferId !== golferId) {
    throw new AppError(
      "Members can only post scores for themselves.",
      ErrorCodes.UNAUTHORIZED,
      403
    );
  }
}

export const scoreService = {
  async getScoreHistory(
    filter: ScoreHistoryFilterInput,
    context: GraphQLContext
  ): Promise<{ scores: IScore[]; total: number }> {
    requireAuth(context);
    requireOwnGolferOrAdmin(context, filter.golferId);

    const golfer = await GolferRepository.findById(filter.golferId);
    if (!golfer) {
      throw new AppError("Golfer not found.", ErrorCodes.NOT_FOUND, 404);
    }

    requireClubAccess(context, golfer.clubId.toString());
    return ScoreRepository.findByGolfer(filter);
  },

  async getById(id: string, context: GraphQLContext): Promise<IScore | null> {
    requireAuth(context);
    const score = await ScoreRepository.findById(id);
    if (!score) {
      return null;
    }

    requireOwnGolferOrAdmin(context, score.golferId.toString());
    requireClubAccess(context, score.clubId.toString());
    return score;
  },

  async postScore(input: PostScoreInput, context: GraphQLContext): Promise<IScore> {
    requireAuth(context);
    requireClubAccess(context, input.clubId);
    ensureMemberCanPostForGolfer(context, input.golferId);
    validateScoreInput(input);

    const golfer = await getActiveGolfer(input.golferId);
    requireClubAccess(context, golfer.clubId.toString());

    const adjustedGrossScore = await resolveAdjustedGrossScore(input);
    const differential = handicapEngine.calculateDifferential({
      adjustedGrossScore,
      courseRating: input.courseRating,
      slopeRating: input.slopeRating,
      isNineHole: input.holes === 9,
    });

    const score = await ScoreRepository.create({
      clubId: new Types.ObjectId(input.clubId),
      golferId: new Types.ObjectId(input.golferId),
      courseId: input.courseId ? new Types.ObjectId(input.courseId) : undefined,
      teeId: input.teeId,
      datePlayed: input.datePlayed,
      scoreType: input.scoreType,
      holes: input.holes,
      entryMode: input.entryMode,
      grossScore: input.grossScore,
      adjustedGrossScore,
      holeScores: input.holeScores,
      courseRating: input.courseRating,
      slopeRating: input.slopeRating,
      par: input.par,
      differential,
      status: "POSTED",
      courseNameSnapshot: input.courseName,
      teeNameSnapshot: input.teeName,
      postedByUserId: new Types.ObjectId(context.user.userId),
      postedByRole: context.user.role,
      isTournamentScore: input.isTournamentScore ?? false,
      tournamentId: input.tournamentId
        ? new Types.ObjectId(input.tournamentId)
        : undefined,
      isNineHole: input.holes === 9,
      pairedWithScoreId: null,
    });

    if (input.holes === 9) {
      await pairPendingNineHoleScores(input.golferId);
    }

    const auditActor = buildAuditActorContext(context, input.clubId);
    await handicapService.recalculateHandicapIndex(input.golferId, {
      audit: {
        ...auditActor,
        summary: "Handicap Index recalculated after score posting.",
      },
    });

    await auditService.log({
      ...auditActor,
      entityType: "SCORE",
      entityId: score._id.toString(),
      action: "SCORE_POSTED",
      summary: `Score ${score.grossScore} posted for golfer on ${score.courseNameSnapshot}.`,
      before: null,
      after: sanitizeAuditRecord({
        grossScore: score.grossScore,
        adjustedGrossScore: score.adjustedGrossScore,
        differential: score.differential,
        datePlayed: score.datePlayed.toISOString(),
        courseNameSnapshot: score.courseNameSnapshot,
        teeNameSnapshot: score.teeNameSnapshot,
        status: score.status,
      }),
    });

    return score;
  },

  async updateScore(
    id: string,
    input: PostScoreInput,
    context: GraphQLContext
  ): Promise<IScore> {
    requireAuth(context);

    const existing = await ScoreRepository.findById(id);
    if (!existing) {
      throw new AppError("Score not found.", ErrorCodes.NOT_FOUND, 404);
    }

    requireClubAccess(context, existing.clubId.toString());
    requireOwnGolferOrAdmin(context, existing.golferId.toString());
    ensureMemberCanPostForGolfer(context, existing.golferId.toString());

    if (input.clubId !== existing.clubId.toString()) {
      throw new AppError(
        "Score club ID cannot be changed.",
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }

    if (input.golferId !== existing.golferId.toString()) {
      throw new AppError(
        "Score golfer ID cannot be changed.",
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }

    validateScoreInput(input);
    await getActiveGolfer(input.golferId);
    await restorePairedNineHoleScores(existing);

    const adjustedGrossScore = await resolveAdjustedGrossScore(input);
    const differential = handicapEngine.calculateDifferential({
      adjustedGrossScore,
      courseRating: input.courseRating,
      slopeRating: input.slopeRating,
      isNineHole: input.holes === 9,
    });

    const updated = await ScoreRepository.update(id, {
      courseId: input.courseId ? new Types.ObjectId(input.courseId) : undefined,
      teeId: input.teeId,
      datePlayed: input.datePlayed,
      scoreType: input.scoreType,
      holes: input.holes,
      entryMode: input.entryMode,
      grossScore: input.grossScore,
      adjustedGrossScore,
      holeScores: input.holeScores,
      courseRating: input.courseRating,
      slopeRating: input.slopeRating,
      par: input.par,
      differential,
      status: "MODIFIED",
      courseNameSnapshot: input.courseName,
      teeNameSnapshot: input.teeName,
      isTournamentScore: input.isTournamentScore ?? false,
      tournamentId: input.tournamentId ? new Types.ObjectId(input.tournamentId) : undefined,
      isNineHole: input.holes === 9,
      pairedWithScoreId: null,
    });

    if (!updated) {
      throw new AppError("Score not found.", ErrorCodes.NOT_FOUND, 404);
    }

    if (input.holes === 9) {
      await pairPendingNineHoleScores(input.golferId);
    }

    const auditActor = buildAuditActorContext(context, input.clubId);
    await handicapService.recalculateHandicapIndex(input.golferId, {
      audit: {
        ...auditActor,
        summary: "Handicap Index recalculated after score modification.",
      },
    });

    await auditService.log({
      ...auditActor,
      entityType: "SCORE",
      entityId: id,
      action: "SCORE_MODIFIED",
      summary: `Score updated for ${updated.courseNameSnapshot}.`,
      before: sanitizeAuditRecord({
        grossScore: existing.grossScore,
        adjustedGrossScore: existing.adjustedGrossScore,
        differential: existing.differential,
        datePlayed: existing.datePlayed.toISOString(),
        courseNameSnapshot: existing.courseNameSnapshot,
        teeNameSnapshot: existing.teeNameSnapshot,
        status: existing.status,
      }),
      after: sanitizeAuditRecord({
        grossScore: updated.grossScore,
        adjustedGrossScore: updated.adjustedGrossScore,
        differential: updated.differential,
        datePlayed: updated.datePlayed.toISOString(),
        courseNameSnapshot: updated.courseNameSnapshot,
        teeNameSnapshot: updated.teeNameSnapshot,
        status: updated.status,
      }),
    });

    return updated;
  },

  async withdrawScore(
    id: string,
    reason: string | undefined,
    context: GraphQLContext
  ): Promise<IScore> {
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN", "HANDICAP_CHAIR"]);

    const score = await ScoreRepository.findById(id);
    if (!score) {
      throw new AppError("Score not found.", ErrorCodes.NOT_FOUND, 404);
    }

    requireClubAccess(context, score.clubId.toString());
    await restorePairedNineHoleScores(score);

    const updated = await ScoreRepository.update(id, {
      status: "WITHDRAWN",
      pairedWithScoreId: null,
      isNineHole: score.holes === 9,
      differential: calculateScoreDifferential(score),
    });

    if (!updated) {
      throw new AppError("Score not found.", ErrorCodes.NOT_FOUND, 404);
    }

    const auditActor = buildAuditActorContext(context, score.clubId.toString());
    await handicapService.recalculateHandicapIndex(score.golferId.toString(), {
      audit: {
        ...auditActor,
        summary: "Handicap Index recalculated after score withdrawal.",
      },
    });

    await auditService.log({
      ...auditActor,
      entityType: "SCORE",
      entityId: id,
      action: "SCORE_WITHDRAWN",
      summary: reason ?? "Score withdrawn by admin.",
      before: sanitizeAuditRecord({
        status: score.status,
        grossScore: score.grossScore,
        differential: score.differential,
      }),
      after: sanitizeAuditRecord({
        status: updated.status,
        grossScore: updated.grossScore,
        differential: updated.differential,
      }),
    });

    return updated;
  },
};

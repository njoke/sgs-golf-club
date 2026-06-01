import type { Gender } from "../models/golfer.model";
import { auditService } from "./audit.service";
import {
  getLowestIndexLast365,
  isLowHandicapWindowExpired,
} from "../handicap/caps";
import {
  HandicapEngine,
  type AdjustedGrossInput,
} from "../handicap/engine";
import type { ExceptionalScoreDifferential } from "../handicap/esr";
import type { AuditActorContext } from "./audit.utils";

export interface HandicapGolferRecord {
  id: string;
  gender: Gender;
  currentHandicapIndex?: number | null;
  lowHandicapIndex?: number | null;
  lowHandicapDate?: Date | null;
}

export interface HandicapGolferUpdate {
  currentHandicapIndex?: number | null;
  lowHandicapIndex?: number | null;
  lowHandicapDate?: Date | null;
}

export interface HandicapGolferRepository {
  findById(id: string): Promise<HandicapGolferRecord | null>;
  update(id: string, data: HandicapGolferUpdate): Promise<unknown>;
}

export interface HandicapScoreRepository {
  getLastNDifferentials(golferId: string, limit: number): Promise<number[]>;
  getRecentScoresWithDifferentials(
    golferId: string
  ): Promise<ExceptionalScoreDifferential[]>;
}

export interface HandicapRecalculationOptions {
  referenceDate?: Date;
  audit?: AuditActorContext & { summary?: string };
}

function shouldRefreshLowHandicapDate(
  storedLowest: number | null | undefined,
  lowestDate: Date | null | undefined,
  newHI: number,
  referenceDate: Date
): boolean {
  if (storedLowest === null || storedLowest === undefined || !lowestDate) {
    return true;
  }

  if (isLowHandicapWindowExpired(lowestDate, referenceDate)) {
    return true;
  }

  return newHI < storedLowest;
}

export class HandicapService {
  constructor(
    private readonly golferRepository: HandicapGolferRepository,
    private readonly scoreRepository: HandicapScoreRepository,
    private readonly engine: HandicapEngine = new HandicapEngine()
  ) {}

  async recalculateHandicapIndex(
    golferId: string,
    referenceDateOrOptions: Date | HandicapRecalculationOptions = new Date()
  ): Promise<void> {
    const referenceDate =
      referenceDateOrOptions instanceof Date
        ? referenceDateOrOptions
        : referenceDateOrOptions.referenceDate ?? new Date();
    const auditContext =
      referenceDateOrOptions instanceof Date ? undefined : referenceDateOrOptions.audit;
    const golfer = await this.golferRepository.findById(golferId);
    if (!golfer) {
      return;
    }

    const previousSnapshot = {
      currentHandicapIndex: golfer.currentHandicapIndex ?? null,
      lowHandicapIndex: golfer.lowHandicapIndex ?? null,
      lowHandicapDate: golfer.lowHandicapDate?.toISOString() ?? null,
    };
    const differentials = await this.scoreRepository.getLastNDifferentials(golferId, 20);
    if (differentials.length < 3) {
      await this.golferRepository.update(golferId, { currentHandicapIndex: null });
      if (auditContext) {
        await auditService.log({
          ...auditContext,
          entityType: "GOLFER",
          entityId: golferId,
          action: "HANDICAP_INDEX_UPDATED",
          summary:
            auditContext.summary ?? "Handicap Index recalculated after score change.",
          before: previousSnapshot,
          after: { ...previousSnapshot, currentHandicapIndex: null },
        });
      }
      return;
    }

    const recentDifferentials =
      await this.scoreRepository.getRecentScoresWithDifferentials(golferId);
    const newHI = this.engine.calculateHandicapIndex({
      differentials,
      recentDifferentials,
      lowestIndexLast365: golfer.lowHandicapIndex ?? null,
      gender: golfer.gender,
    });

    if (newHI === null) {
      await this.golferRepository.update(golferId, { currentHandicapIndex: null });
      return;
    }

    const lowHandicapIndex = getLowestIndexLast365(
      newHI,
      golfer.lowHandicapIndex ?? null,
      golfer.lowHandicapDate ?? null,
      referenceDate
    );
    const lowHandicapDate = shouldRefreshLowHandicapDate(
      golfer.lowHandicapIndex ?? null,
      golfer.lowHandicapDate ?? null,
      newHI,
      referenceDate
    )
      ? referenceDate
      : golfer.lowHandicapDate ?? null;

    await this.golferRepository.update(golferId, {
      currentHandicapIndex: newHI,
      lowHandicapIndex,
      lowHandicapDate,
    });

    if (auditContext) {
      await auditService.log({
        ...auditContext,
        entityType: "GOLFER",
        entityId: golferId,
        action: "HANDICAP_INDEX_UPDATED",
        summary: auditContext.summary ?? "Handicap Index recalculated after score change.",
        before: previousSnapshot,
        after: {
          currentHandicapIndex: newHI,
          lowHandicapIndex,
          lowHandicapDate: lowHandicapDate?.toISOString() ?? null,
        },
      });
    }
  }

  calculateCourseHandicap(
    handicapIndex: number,
    slopeRating: number,
    courseRating: number,
    par: number
  ): number {
    return this.engine.calculateCourseHandicap(
      handicapIndex,
      slopeRating,
      courseRating,
      par
    );
  }

  computeAdjustedGrossFromHoles(input: AdjustedGrossInput): number {
    return this.engine.computeAdjustedGrossFromHoles(input);
  }
}

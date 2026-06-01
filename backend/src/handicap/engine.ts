import type { Gender } from "../models/golfer.model";
import { applyCaps } from "./caps";
import {
  calculate18HoleDifferential,
  calculate9HoleDifferential,
} from "./differential";
import {
  applyESR,
  type ExceptionalScoreDifferential,
} from "./esr";
import { calculateHandicapIndex } from "./indexCalculator";

export const HANDICAP_ENGINE_DISCLAIMER =
  "This application calculates handicap-related values for club management purposes. Official GHIN synchronization and USGA-certified handicap issuance require a certified integration, which is outside the scope of this MVP.";

export interface HandicapIndexCalculationInput {
  differentials: number[];
  recentDifferentials: ExceptionalScoreDifferential[];
  lowestIndexLast365: number | null;
  gender?: Gender;
}

export interface AdjustedGrossInput {
  holeScores: number[];
  courseHandicap: number;
  holePars?: number[];
  holeHandicaps?: number[];
}

export function computeNetDoubleBogeyAdjustment(
  holeScores: number[],
  holePars: number[],
  holeHandicaps: number[],
  courseHandicap: number
): number {
  let adjustedTotal = 0;

  for (let index = 0; index < holeScores.length; index += 1) {
    const holePar = holePars[index];
    const strokeIndex = holeHandicaps[index];

    let strokesReceived = 0;
    if (courseHandicap >= strokeIndex) {
      strokesReceived = 1;
    }
    if (courseHandicap >= 18 + strokeIndex) {
      strokesReceived = 2;
    }

    const maxScore = holePar + 2 + strokesReceived;
    adjustedTotal += Math.min(holeScores[index], maxScore);
  }

  return adjustedTotal;
}

export class HandicapEngine {
  calculateDifferential(input: {
    adjustedGrossScore: number;
    courseRating: number;
    slopeRating: number;
    isNineHole?: boolean;
  }): number {
    if (input.isNineHole) {
      return calculate9HoleDifferential(
        input.adjustedGrossScore,
        input.courseRating,
        input.slopeRating
      );
    }

    return calculate18HoleDifferential(
      input.adjustedGrossScore,
      input.courseRating,
      input.slopeRating
    );
  }

  calculateHandicapIndex(input: HandicapIndexCalculationInput): number | null {
    let newIndex = calculateHandicapIndex(input.differentials);
    if (newIndex === null) {
      return null;
    }

    if (input.gender === "M" || input.gender === "F") {
      newIndex = applyESR(newIndex, input.recentDifferentials, input.gender);
    }

    return applyCaps(newIndex, input.lowestIndexLast365);
  }

  calculateCourseHandicap(
    handicapIndex: number,
    slopeRating: number,
    courseRating: number,
    par: number
  ): number {
    const raw = handicapIndex * (slopeRating / 113) + (courseRating - par);
    return Math.round(raw);
  }

  computeAdjustedGrossFromHoles(input: AdjustedGrossInput): number {
    if (
      !input.holePars ||
      !input.holeHandicaps ||
      input.holePars.length !== input.holeScores.length ||
      input.holeHandicaps.length !== input.holeScores.length
    ) {
      return input.holeScores.reduce((sum, score) => sum + score, 0);
    }

    return computeNetDoubleBogeyAdjustment(
      input.holeScores,
      input.holePars,
      input.holeHandicaps,
      input.courseHandicap
    );
  }
}

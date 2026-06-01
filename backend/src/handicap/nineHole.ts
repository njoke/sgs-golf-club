import { roundToOneDecimal } from "./differential";

export interface NineHoleScoreRecord {
  id: string;
  golferId: string;
  datePlayed: Date;
  differential: number | null;
  isNineHole: boolean;
  pairedWithScoreId: string | null;
  status: string;
}

export interface NineHolePairingResult {
  combinedDifferential: number;
  updatedOlderScore: NineHoleScoreRecord;
  updatedNewerScore: NineHoleScoreRecord;
}

const ELIGIBLE_NINE_HOLE_STATUSES = new Set(["POSTED", "MODIFIED"]);

export function combineNineHoleDifferentials(
  firstDifferential: number,
  secondDifferential: number
): number {
  return roundToOneDecimal(firstDifferential + secondDifferential);
}

export function isNineHoleScoreExpired(
  datePlayed: Date,
  referenceDate: Date = new Date()
): boolean {
  const oneYearAgo = new Date(referenceDate);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return datePlayed < oneYearAgo;
}

export function archiveExpiredNineHoleScores(
  scores: NineHoleScoreRecord[],
  referenceDate: Date = new Date()
): NineHoleScoreRecord[] {
  return scores.map((score) => {
    if (
      !score.isNineHole ||
      score.pairedWithScoreId !== null ||
      !ELIGIBLE_NINE_HOLE_STATUSES.has(score.status) ||
      !isNineHoleScoreExpired(score.datePlayed, referenceDate)
    ) {
      return score;
    }

    return {
      ...score,
      status: "ARCHIVED",
    };
  });
}

export function pairNineHoleScores(
  scores: NineHoleScoreRecord[],
  referenceDate: Date = new Date()
): NineHolePairingResult | null {
  const eligibleScores = archiveExpiredNineHoleScores(scores, referenceDate)
    .filter(
      (score) =>
        score.isNineHole &&
        score.pairedWithScoreId === null &&
        ELIGIBLE_NINE_HOLE_STATUSES.has(score.status)
    )
    .sort((left, right) => left.datePlayed.getTime() - right.datePlayed.getTime());

  if (eligibleScores.length < 2) {
    return null;
  }

  const [olderScore, newerScore] = eligibleScores;
  const combinedDifferential = combineNineHoleDifferentials(
    olderScore.differential ?? 0,
    newerScore.differential ?? 0
  );

  return {
    combinedDifferential,
    updatedOlderScore: {
      ...olderScore,
      differential: combinedDifferential,
      pairedWithScoreId: newerScore.id,
      isNineHole: false,
    },
    updatedNewerScore: {
      ...newerScore,
      pairedWithScoreId: olderScore.id,
    },
  };
}

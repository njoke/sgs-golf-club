import { truncateToOneDecimal } from "./differential";

export interface ExceptionalScoreDifferential {
  differential: number;
  datePlayed: Date;
}

export function applyESR(
  currentHI: number,
  allDifferentials: ExceptionalScoreDifferential[],
  gender: "M" | "F",
  referenceDate: Date = new Date()
): number {
  const oneYearAgo = new Date(referenceDate);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const exceptionalRounds = allDifferentials
    .filter((score) => score.datePlayed >= oneYearAgo)
    .filter((score) => score.differential <= currentHI - 7)
    .sort((left, right) => right.datePlayed.getTime() - left.datePlayed.getTime());

  if (exceptionalRounds.length < 2) {
    return currentHI;
  }

  const averageExceptional =
    (exceptionalRounds[0].differential + exceptionalRounds[1].differential) / 2;
  const reduction = (averageExceptional - currentHI) * 0.5;
  const maxReduction = gender === "F" ? -2 : -1;
  const finalReduction = Math.max(reduction, maxReduction);

  return truncateToOneDecimal(Math.max(0, currentHI + finalReduction));
}

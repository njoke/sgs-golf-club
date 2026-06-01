import { truncateToOneDecimal } from "./differential";

export function getKValue(n: number): number | null {
  if (n < 3) return null;
  if (n <= 5) return 1;
  if (n <= 8) return 2;
  if (n <= 11) return 3;
  if (n <= 14) return 4;
  if (n <= 16) return 5;
  if (n <= 18) return 6;
  if (n === 19) return 7;
  return 8;
}

export function calculateHandicapIndex(differentials: number[]): number | null {
  const kValue = getKValue(differentials.length);
  if (kValue === null) {
    return null;
  }

  const lowestDifferentials = [...differentials]
    .sort((left, right) => left - right)
    .slice(0, kValue);
  const total = lowestDifferentials.reduce((sum, differential) => sum + differential, 0);
  const average = total / kValue;

  return Math.min(truncateToOneDecimal(average), 54);
}

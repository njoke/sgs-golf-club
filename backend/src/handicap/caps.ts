import { truncateToOneDecimal } from "./differential";

export function applyCaps(newIndex: number, lowestIndexLast365: number | null): number {
  if (lowestIndexLast365 === null) {
    return newIndex;
  }

  const softCap = lowestIndexLast365 + 3;
  const hardCap = lowestIndexLast365 + 5;

  if (newIndex <= softCap) {
    return newIndex;
  }

  if (newIndex < hardCap) {
    const excess = newIndex - softCap;
    return truncateToOneDecimal(softCap + excess / 2);
  }

  return hardCap;
}

export function isLowHandicapWindowExpired(
  lowestDate: Date | null | undefined,
  referenceDate: Date = new Date()
): boolean {
  if (!lowestDate) {
    return true;
  }

  const oneYearAgo = new Date(referenceDate);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return lowestDate < oneYearAgo;
}

export function getLowestIndexLast365(
  currentHI: number,
  storedLowest: number | null | undefined,
  lowestDate: Date | null | undefined,
  referenceDate: Date = new Date()
): number {
  if (
    storedLowest === null ||
    storedLowest === undefined ||
    isLowHandicapWindowExpired(lowestDate, referenceDate)
  ) {
    return currentHI;
  }

  return Math.min(currentHI, storedLowest);
}

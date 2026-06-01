export function truncateToOneDecimal(value: number): number {
  return Math.floor(value * 10) / 10;
}

export function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function calculate18HoleDifferential(
  adjustedGrossScore: number,
  courseRating: number,
  slopeRating: number
): number {
  const raw = (adjustedGrossScore - courseRating) * (113 / slopeRating);
  return truncateToOneDecimal(raw);
}

export function calculate9HoleDifferential(
  adjustedGrossScore: number,
  nineHoleCourseRating: number,
  slopeRating: number
): number {
  const raw = ((adjustedGrossScore - nineHoleCourseRating) * (113 / slopeRating)) / 2;
  return roundToOneDecimal(raw);
}

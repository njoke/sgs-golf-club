export function computeCourseHandicap(
  handicapIndex: number | null | undefined,
  slopeRating: number,
  courseRating: number,
  par: number
): number | null {
  if (handicapIndex == null) {
    return null;
  }

  const raw = handicapIndex * (slopeRating / 113) + (courseRating - par);
  return Math.round(raw);
}

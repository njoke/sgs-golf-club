export function formatHandicap(index: number | null | undefined): string {
  if (index == null) return "N/A";
  return index < 0 ? `+${Math.abs(index).toFixed(1)}` : index.toFixed(1);
}

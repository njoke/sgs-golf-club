export function formatScoreDiff(differential: number): string {
  return differential.toFixed(1);
}

export function formatRelativeScore(score: number, par: number): string {
  const diff = score - par;
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff}` : `${diff}`;
}

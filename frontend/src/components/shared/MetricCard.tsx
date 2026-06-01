export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <article className="rounded-panel border bg-ui-card/90 p-5 shadow-panel">
      <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">{label}</p>
      <p className="mt-4 text-4xl font-semibold text-ui-ink">{value}</p>
      {hint ? <p className="mt-2 text-sm text-ui-muted">{hint}</p> : null}
    </article>
  );
}

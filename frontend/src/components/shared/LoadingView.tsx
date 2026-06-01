"use client";

export function LoadingView({
  title = "Loading portal",
  message = "Gathering live club data...",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="w-full max-w-md rounded-panel border bg-ui-card/90 p-8 text-center shadow-panel">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand-gold/35 border-t-brand-green" />
        <h2 className="mt-6 text-2xl font-semibold text-ui-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-ui-muted">{message}</p>
      </div>
    </div>
  );
}

import Link from "next/link";

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel md:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-clay">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight text-ui-ink">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-ui-muted">{description}</p>
        <div className="mt-8">
          <Link
            href={backHref}
            className="inline-flex rounded-full bg-brand-green px-5 py-3 text-sm font-semibold text-white hover:bg-brand-green-light"
          >
            {backLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}

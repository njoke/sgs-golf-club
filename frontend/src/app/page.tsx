import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 md:grid-cols-[1.25fr_0.9fr]">
        <article className="flex flex-col justify-center rounded-panel border bg-ui-card/90 p-8 shadow-panel backdrop-blur md:p-12">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-clay">
            Safari Golf Seattle
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[0.92] text-ui-ink md:text-7xl">
            Club operations,
            <br />
            handicap work,
            <br />
            member access.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ui-muted">
            Admin and member portals now share one sign-in flow, real GraphQL data, and
            a Docker-backed local environment. Use the seeded accounts to jump straight in.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/login"
              className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white hover:bg-brand-green-light"
            >
              Open portal
            </Link>
            <a
              href="/api/graphql"
              className="rounded-full border border-ui-line bg-white/70 px-6 py-3 text-sm font-semibold text-ui-ink hover:border-brand-gold hover:text-brand-green"
            >
              View GraphQL
            </a>
          </div>
        </article>

        <aside className="grid gap-4 self-center">
          <div className="rounded-panel border bg-[#173227] p-6 text-white shadow-panel">
            <p className="text-xs uppercase tracking-[0.28em] text-[#dfc47a]">
              Admin access
            </p>
            <p className="mt-4 text-2xl font-semibold">Club admin</p>
            <p className="mt-2 text-sm text-white/72">Manage roster, account, scores, and tournaments.</p>
            <dl className="mt-6 space-y-2 text-sm">
              <div>
                <dt className="text-white/56">Email</dt>
                <dd>admin@sgs.golf</dd>
              </div>
              <div>
                <dt className="text-white/56">Password</dt>
                <dd>Admin123!</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-panel border bg-brand-sand/80 p-6 shadow-panel">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-clay">
              Member access
            </p>
            <p className="mt-4 text-2xl font-semibold text-ui-ink">Player portal</p>
            <p className="mt-2 text-sm text-ui-muted">
              View your index, recent scores, and open tournaments from the member side.
            </p>
            <dl className="mt-6 space-y-2 text-sm text-ui-ink">
              <div>
                <dt className="text-ui-muted">Email</dt>
                <dd>jared@sgs.golf</dd>
              </div>
              <div>
                <dt className="text-ui-muted">Password</dt>
                <dd>Member123!</dd>
              </div>
            </dl>
          </div>
        </aside>
      </section>
    </main>
  );
}

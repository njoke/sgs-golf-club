"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function LoginPage() {
  const router = useRouter();
  const { authenticate, isLoading, user } = useAuth();
  const [email, setEmail] = useState("admin@sgs.golf");
  const [password, setPassword] = useState("Admin123!");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading || !user) {
      return;
    }

    router.replace(user.role === "MEMBER" ? "/member/dashboard" : "/dashboard");
  }, [isLoading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setErrorMessage("Enter a valid email address.");
      return;
    }

    if (!password.trim()) {
      setErrorMessage("Password is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const nextUser = await authenticate(email, password);
      router.replace(nextUser.role === "MEMBER" ? "/member/dashboard" : "/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-panel border bg-[#163428] p-8 text-white shadow-panel md:p-12">
          <p className="text-xs uppercase tracking-[0.28em] text-[#dfc47a]">Safari Golf Seattle</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[0.95]">
            One sign-in.
            <br />
            Two portals.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/76">
            Club admins manage roster, scores, and tournaments. Members see their own
            handicap, scores, and open events from a simpler mobile-first experience.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/12 bg-white/8 p-5">
              <p className="text-sm font-semibold">Admin demo</p>
              <p className="mt-3 text-sm text-white/70">admin@sgs.golf</p>
              <p className="text-sm text-white/70">Admin123!</p>
            </div>
            <div className="rounded-3xl border border-white/12 bg-white/8 p-5">
              <p className="text-sm font-semibold">Member demo</p>
              <p className="mt-3 text-sm text-white/70">jared@sgs.golf</p>
              <p className="text-sm text-white/70">Member123!</p>
            </div>
          </div>
          <Link
            href="/"
            className="mt-10 inline-flex text-sm font-semibold text-[#dfc47a] hover:text-white"
          >
            Back to landing
          </Link>
        </section>

        <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel md:p-10">
          <p className="text-xs uppercase tracking-[0.28em] text-brand-clay">Portal sign-in</p>
          <h2 className="mt-4 text-3xl font-semibold text-ui-ink">Welcome back</h2>
          <p className="mt-3 text-sm leading-7 text-ui-muted">
            Use your club email and password. Role decides whether you land in the admin
            workspace or the member portal.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ui-ink">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-ui-line bg-white px-4 py-3 text-ui-ink outline-none transition focus:border-brand-gold"
                placeholder="you@club.org"
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ui-ink">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-ui-line bg-white px-4 py-3 text-ui-ink outline-none transition focus:border-brand-gold"
                placeholder="Password"
                autoComplete="current-password"
              />
            </label>

            {errorMessage ? (
              <div className="rounded-2xl border border-status-withdrawn/20 bg-status-withdrawn/8 px-4 py-3 text-sm text-status-withdrawn">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-green-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

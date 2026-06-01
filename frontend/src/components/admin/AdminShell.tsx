"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingView } from "@/components/shared/LoadingView";
import { useAuth } from "@/lib/auth/useAuth";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout, primaryClubId } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
      return;
    }

    if (user?.role === "MEMBER") {
      router.replace("/member/dashboard");
    }
  }, [isLoading, router, user]);

  if (isLoading) {
    return <LoadingView title="Loading admin workspace" message="Restoring your club session..." />;
  }

  if (!user || user.role === "MEMBER") {
    return null;
  }

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    {
      label: "Roster",
      href: primaryClubId ? `/manage/${primaryClubId}/roster` : "/dashboard",
      aliases: primaryClubId ? [`/manage/${primaryClubId}/golfer`] : [],
    },
    {
      label: "Account",
      href: primaryClubId ? `/manage/${primaryClubId}/account` : "/dashboard",
    },
    { label: "Tournaments", href: "/tournaments" },
  ];

  async function handleLogout() {
    await logout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-ui-canvas">
      <header className="border-b border-ui-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-brand-clay">
              Safari Golf Seattle
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-ui-ink">Admin portal</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-ui-line bg-brand-sand/55 px-4 py-2 text-sm text-ui-ink md:block">
              {user.firstName} {user.lastName}
              <span className="ml-2 text-ui-muted">• {user.role.replaceAll("_", " ")}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-light"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 lg:flex-row">
        <aside className="w-full rounded-panel border bg-ui-sidebar p-4 text-white shadow-panel lg:sticky lg:top-6 lg:w-64 lg:self-start">
          <nav className="grid gap-2">
            {navItems.map((item) => {
              const activePrefixes = [item.href, ...(item.aliases ?? [])];
              const active = activePrefixes.some(
                (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
              );
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-white text-ui-ink"
                      : "text-white/78 hover:bg-white/12 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-5 rounded-2xl border border-white/12 bg-white/6 p-4 text-sm text-white/74">
            Club scope: {primaryClubId ?? "Not linked yet"}
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

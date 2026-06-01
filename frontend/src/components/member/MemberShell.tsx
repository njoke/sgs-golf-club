"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingView } from "@/components/shared/LoadingView";
import { useAuth } from "@/lib/auth/useAuth";

export function MemberShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
      return;
    }

    if (user && user.role !== "MEMBER") {
      router.replace("/dashboard");
    }
  }, [isLoading, router, user]);

  if (isLoading) {
    return <LoadingView title="Loading member portal" message="Restoring your golf profile..." />;
  }

  if (!user || user.role !== "MEMBER") {
    return null;
  }

  const navItems = [
    { label: "Home", href: "/member/dashboard" },
    { label: "Profile", href: "/member/profile" },
    { label: "Post score", href: "/member/scores/post" },
    { label: "History", href: "/member/scores/history" },
    { label: "Tournaments", href: "/member/tournaments" },
  ];

  async function handleLogout() {
    await logout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-ui-canvas">
      <header className="border-b border-ui-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Member portal</p>
            <h1 className="mt-1 text-xl font-semibold text-ui-ink">
              {user.firstName} {user.lastName}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-ui-line bg-white px-4 py-2 text-sm font-semibold text-ui-ink hover:border-brand-gold hover:text-brand-green"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-9rem)] w-full max-w-5xl px-4 py-6 md:px-6">
        {children}
      </main>

      <nav className="sticky bottom-0 border-t border-ui-line bg-white/95 px-2 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/member/dashboard" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 rounded-2xl px-2 py-3 text-center text-xs font-semibold transition md:text-sm ${
                  active
                    ? "bg-brand-green text-white"
                    : "text-ui-muted hover:bg-brand-sand/70 hover:text-ui-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

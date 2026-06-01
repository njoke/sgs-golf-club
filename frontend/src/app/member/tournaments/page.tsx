"use client";

import Link from "next/link";
import { gql, useQuery } from "@apollo/client";
import { useSearchParams } from "next/navigation";
import { LoadingView } from "@/components/shared/LoadingView";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/auth/useAuth";
import type { TournamentRecord, TournamentRegistrationRecord } from "@/types";
import { formatDate } from "@/utils/formatDate";

const GET_MEMBER_TOURNAMENTS = gql`
  query GetMemberTournaments($clubId: ID!) {
    openTournaments(clubId: $clubId) {
      id
      name
      startDate
      format
      registeredPlayerCount
      maxPlayers
      entryFee
      registrationCloseAt
      registrationStatus
    }
    myTournamentRegistrations {
      id
      tournamentId
      status
      paymentStatus
    }
  }
`;

function formatCurrency(value?: number | null): string {
  if (value == null) {
    return "Free";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function MemberTournamentsPage() {
  const auth = useAuth();
  const searchParams = useSearchParams();
  const clubId = auth.primaryClubId;

  const { data, loading, error } = useQuery(GET_MEMBER_TOURNAMENTS, {
    skip: auth.isLoading || !clubId,
    variables: { clubId },
  });

  if (auth.isLoading || loading) {
    return <LoadingView title="Loading tournaments" message="Pulling open tournaments and your registrations..." />;
  }

  if (!auth.user || !clubId) {
    return null;
  }

  if (error) {
    return (
      <div className="rounded-panel border border-status-withdrawn/20 bg-ui-card/90 p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-ui-ink">Tournaments unavailable</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">{error.message}</p>
      </div>
    );
  }

  const tournaments = (data?.openTournaments ?? []) as TournamentRecord[];
  const registrations = (data?.myTournamentRegistrations ?? []) as TournamentRegistrationRecord[];
  const registrationMap = new Map(
    registrations.map((registration) => [registration.tournamentId, registration])
  );

  return (
    <div className="space-y-6">
      {searchParams.get("registered") ? (
        <p className="rounded-3xl border border-status-active/20 bg-status-active/8 px-5 py-4 text-sm text-status-active">
          Registration submitted. Status: {searchParams.get("registered")?.replaceAll("_", " ")}.
        </p>
      ) : null}

      <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel">
        <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Open tournaments</p>
        <h2 className="mt-3 text-3xl font-semibold text-ui-ink">Browse and register</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">
          Upcoming events stay here with live registration status, entry fee, and quick access to the registration form.
        </p>
      </section>

      <section className="grid gap-5">
        {tournaments.length ? (
          tournaments.map((tournament) => {
            const registration = registrationMap.get(tournament.id);
            const isRegistered =
              registration && registration.status !== "CANCELLED" ? true : false;
            const isFull =
              tournament.maxPlayers != null &&
              (tournament.registeredPlayerCount ?? 0) >= tournament.maxPlayers;

            return (
              <article key={tournament.id} className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-2xl font-semibold text-ui-ink">{tournament.name}</h3>
                      <StatusBadge
                        status={registration?.status ?? tournament.registrationStatus ?? "OPEN"}
                      />
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-ui-muted md:grid-cols-2">
                      <p>📅 {tournament.startDate ? formatDate(tournament.startDate) : "Date coming"}</p>
                      <p>🏌 {tournament.format?.replaceAll("_", " ") ?? "Format coming"}</p>
                      <p>
                        👥 {tournament.registeredPlayerCount ?? 0} / {tournament.maxPlayers ?? "—"} registered
                      </p>
                      <p>💰 Entry fee: {formatCurrency(tournament.entryFee)}</p>
                      <p>
                        ⏰ Registration closes{" "}
                        {tournament.registrationCloseAt
                          ? formatDate(tournament.registrationCloseAt)
                          : "with event window"}
                      </p>
                    </div>
                  </div>

                  {isRegistered ? (
                    <button
                      type="button"
                      disabled
                      className="rounded-full border border-ui-line bg-white px-5 py-3 text-sm font-semibold text-ui-muted"
                    >
                      Registered
                    </button>
                  ) : (
                    <Link
                      href={`/member/tournaments/${tournament.id}/register`}
                      className="rounded-full bg-brand-green px-5 py-3 text-sm font-semibold text-white hover:bg-brand-green-light"
                    >
                      {isFull ? "Join waitlist" : "Register now"}
                    </Link>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <p className="rounded-panel border bg-ui-card/90 p-8 text-sm text-ui-muted shadow-panel">
            No open tournaments right now.
          </p>
        )}
      </section>
    </div>
  );
}

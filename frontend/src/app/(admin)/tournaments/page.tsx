"use client";

import Link from "next/link";
import { gql, useMutation, useQuery } from "@apollo/client";
import { useState } from "react";
import { LoadingView } from "@/components/shared/LoadingView";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/auth/useAuth";
import type { TournamentRecord } from "@/types";
import { formatDate } from "@/utils/formatDate";

const GET_TOURNAMENTS = gql`
  query GetTournaments($clubId: ID!, $status: TournamentStatus, $registrationStatus: RegistrationStatus) {
    tournaments(clubId: $clubId, status: $status, registrationStatus: $registrationStatus) {
      id
      name
      startDate
      format
      registrationStatus
      registeredPlayerCount
      maxPlayers
      entryFee
      status
      registrationOpenAt
      registrationCloseAt
    }
  }
`;

const OPEN_TOURNAMENT_REGISTRATION = gql`
  mutation OpenTournamentRegistration($id: ID!) {
    openTournamentRegistration(id: $id) {
      id
      registrationStatus
    }
  }
`;

const CLOSE_TOURNAMENT_REGISTRATION = gql`
  mutation CloseTournamentRegistration($id: ID!) {
    closeTournamentRegistration(id: $id) {
      id
      registrationStatus
    }
  }
`;

const CANCEL_TOURNAMENT = gql`
  mutation CancelTournament($id: ID!, $reason: String) {
    cancelTournament(id: $id, reason: $reason) {
      id
      status
      registrationStatus
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

export default function TournamentsPage() {
  const auth = useAuth();
  const clubId = auth.primaryClubId;
  const [status, setStatus] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery(GET_TOURNAMENTS, {
    skip: auth.isLoading || !clubId,
    variables: {
      clubId,
      status: status || undefined,
      registrationStatus: registrationStatus || undefined,
    },
  });

  const [openRegistration, openState] = useMutation(OPEN_TOURNAMENT_REGISTRATION);
  const [closeRegistration, closeState] = useMutation(CLOSE_TOURNAMENT_REGISTRATION);
  const [cancelTournament, cancelState] = useMutation(CANCEL_TOURNAMENT);

  if (auth.isLoading || loading) {
    return <LoadingView title="Loading tournaments" message="Pulling event schedule and registration counts..." />;
  }

  if (!auth.user || !clubId) {
    return null;
  }

  if (error) {
    return (
      <div className="rounded-panel border border-status-withdrawn/20 bg-ui-card/90 p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-ui-ink">Tournament workspace unavailable</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">{error.message}</p>
      </div>
    );
  }

  const tournaments = ((data?.tournaments ?? []) as TournamentRecord[]).filter((tournament) => {
    const startTime = tournament.startDate ? new Date(tournament.startDate).getTime() : null;
    if (dateFrom) {
      const fromTime = new Date(`${dateFrom}T00:00:00.000Z`).getTime();
      if (startTime != null && startTime < fromTime) {
        return false;
      }
    }
    if (dateTo) {
      const toTime = new Date(`${dateTo}T23:59:59.999Z`).getTime();
      if (startTime != null && startTime > toTime) {
        return false;
      }
    }
    return true;
  });
  const isBusy = openState.loading || closeState.loading || cancelState.loading;

  async function runMutation(action: () => Promise<unknown>) {
    setErrorMessage(null);
    try {
      await action();
      await refetch();
    } catch (mutationError) {
      setErrorMessage(
        mutationError instanceof Error ? mutationError.message : "Tournament action failed."
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Tournament workspace</p>
            <h2 className="mt-3 text-3xl font-semibold text-ui-ink">Events and registration status</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ui-muted">
              Manage draft, open, and closed tournaments. Jump from list view straight into registration operations.
            </p>
          </div>

          <Link
            href="/tournaments/create"
            className="rounded-full bg-brand-green px-5 py-3 text-center text-sm font-semibold text-white hover:bg-brand-green-light"
          >
            Create tournament
          </Link>
        </div>
      </section>

      {errorMessage ? (
        <p className="rounded-3xl border border-status-withdrawn/20 bg-status-withdrawn/8 px-5 py-4 text-sm text-status-withdrawn">
          {errorMessage}
        </p>
      ) : null}

      <section className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Tournament status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            >
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Registration</span>
            <select
              value={registrationStatus}
              onChange={(event) => setRegistrationStatus(event.target.value)}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            >
              <option value="">All</option>
              <option value="DRAFT">Draft</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Date from</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Date to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 xl:hidden">
        {tournaments.length ? (
          tournaments.map((tournament) => (
            <article key={tournament.id} className="rounded-panel border bg-ui-card/90 p-5 shadow-panel">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-xl font-semibold text-ui-ink">{tournament.name}</h3>
                <StatusBadge status={tournament.registrationStatus ?? "DRAFT"} />
              </div>
              <div className="mt-4 grid gap-2 text-sm text-ui-muted">
                <p>{tournament.startDate ? formatDate(tournament.startDate) : "Date coming"}</p>
                <p>{tournament.format?.replaceAll("_", " ") ?? "Format coming"}</p>
                <p>
                  {tournament.registeredPlayerCount ?? 0}/{tournament.maxPlayers ?? "—"} registered
                </p>
                <p>{formatCurrency(tournament.entryFee)}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/tournaments/${tournament.id}/registrations`}
                  className="rounded-full border border-ui-line bg-white px-4 py-2 text-xs font-semibold text-ui-ink hover:border-brand-gold"
                >
                  View registrations
                </Link>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-panel border bg-ui-card/90 p-6 text-sm text-ui-muted shadow-panel">
            No tournaments matched current filters.
          </p>
        )}
      </section>

      <section className="hidden overflow-hidden rounded-panel border bg-ui-card/90 shadow-panel xl:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-brand-sand/55 text-ui-muted">
              <tr>
                <th className="px-5 py-4 font-medium">Name</th>
                <th className="px-5 py-4 font-medium">Date</th>
                <th className="px-5 py-4 font-medium">Format</th>
                <th className="px-5 py-4 font-medium">Reg status</th>
                <th className="px-5 py-4 font-medium">Registered / Max</th>
                <th className="px-5 py-4 font-medium">Entry fee</th>
                <th className="px-5 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.length ? (
                tournaments.map((tournament) => (
                  <tr key={tournament.id} className="border-t bg-white/75">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ui-ink">{tournament.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ui-muted">
                        {tournament.status ?? "ACTIVE"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-ui-muted">
                      {tournament.startDate ? formatDate(tournament.startDate) : "Date coming"}
                    </td>
                    <td className="px-5 py-4 text-ui-ink">
                      {tournament.format?.replaceAll("_", " ") ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={tournament.registrationStatus ?? "DRAFT"} />
                    </td>
                    <td className="px-5 py-4 text-ui-ink">
                      {tournament.registeredPlayerCount ?? 0}/{tournament.maxPlayers ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-ui-ink">{formatCurrency(tournament.entryFee)}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {(tournament.registrationStatus === "DRAFT" ||
                          tournament.registrationStatus === "CLOSED") && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              runMutation(() =>
                                openRegistration({ variables: { id: tournament.id } })
                              )
                            }
                            className="rounded-full border border-ui-line bg-white px-4 py-2 text-xs font-semibold text-ui-ink hover:border-brand-gold disabled:opacity-40"
                          >
                            {tournament.registrationStatus === "DRAFT" ? "Open registration" : "Reopen"}
                          </button>
                        )}

                        {tournament.registrationStatus === "OPEN" && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              runMutation(() =>
                                closeRegistration({ variables: { id: tournament.id } })
                              )
                            }
                            className="rounded-full border border-ui-line bg-white px-4 py-2 text-xs font-semibold text-ui-ink hover:border-brand-gold disabled:opacity-40"
                          >
                            Close registration
                          </button>
                        )}

                        <Link
                          href={`/tournaments/${tournament.id}/registrations`}
                          className="rounded-full border border-ui-line bg-white px-4 py-2 text-xs font-semibold text-ui-ink hover:border-brand-gold"
                        >
                          View registrations
                        </Link>

                        {tournament.status !== "CANCELLED" && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              const reason = window.prompt(
                                "Reason for tournament cancellation",
                                "Cancelled by admin"
                              );
                              if (!reason) {
                                return;
                              }
                              void runMutation(() =>
                                cancelTournament({
                                  variables: { id: tournament.id, reason },
                                })
                              );
                            }}
                            className="rounded-full border border-status-withdrawn/30 bg-white px-4 py-2 text-xs font-semibold text-status-withdrawn hover:border-status-withdrawn disabled:opacity-40"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-ui-muted">
                    No tournaments matched current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

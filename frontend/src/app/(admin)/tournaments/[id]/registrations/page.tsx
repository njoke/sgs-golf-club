"use client";

import { gql, useMutation, useQuery } from "@apollo/client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { LoadingView } from "@/components/shared/LoadingView";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/auth/useAuth";
import type { CourseRecord, TournamentRecord, TournamentRegistrationRecord } from "@/types";
import { formatDate } from "@/utils/formatDate";

const GET_TOURNAMENT_REGISTRATIONS = gql`
  query GetTournamentRegistrations($id: ID!, $clubId: ID!) {
    tournament(id: $id) {
      id
      clubId
      name
      startDate
      registrationStatus
      registeredPlayerCount
      maxPlayers
      entryFee
      status
      courseId
    }
    tournamentRegistrations(tournamentId: $id) {
      id
      tournamentId
      golferId
      playerNameSnapshot
      ghinNumberSnapshot
      handicapIndexSnapshot
      preferredTeeId
      status
      paymentStatus
      registeredAt
    }
    clubCourses(clubId: $clubId) {
      id
      courseName
      tees {
        teeId
        teeName
      }
    }
  }
`;

const APPROVE_REGISTRATION = gql`
  mutation ApproveTournamentRegistration($id: ID!) {
    approveTournamentRegistration(id: $id) {
      id
      status
    }
  }
`;

const WAITLIST_REGISTRATION = gql`
  mutation WaitlistTournamentRegistration($id: ID!) {
    waitlistTournamentRegistration(id: $id) {
      id
      status
    }
  }
`;

const CANCEL_REGISTRATION = gql`
  mutation CancelTournamentRegistration($id: ID!, $reason: String) {
    cancelTournamentRegistration(id: $id, reason: $reason) {
      id
      status
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

export default function TournamentRegistrationsPage() {
  const auth = useAuth();
  const params = useParams<{ id: string }>();
  const tournamentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const clubId = auth.primaryClubId;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery(GET_TOURNAMENT_REGISTRATIONS, {
    skip: auth.isLoading || !clubId || !tournamentId,
    variables: {
      id: tournamentId,
      clubId,
    },
  });

  const [approveRegistration, approveState] = useMutation(APPROVE_REGISTRATION);
  const [waitlistRegistration, waitlistState] = useMutation(WAITLIST_REGISTRATION);
  const [cancelRegistration, cancelRegState] = useMutation(CANCEL_REGISTRATION);
  const [closeRegistration, closeState] = useMutation(CLOSE_TOURNAMENT_REGISTRATION);
  const [cancelTournament, cancelTournamentState] = useMutation(CANCEL_TOURNAMENT);

  if (auth.isLoading || loading) {
    return <LoadingView title="Loading registrations" message="Pulling tournament header and player list..." />;
  }

  if (!auth.user || !clubId || !tournamentId) {
    return null;
  }

  if (error) {
    return (
      <div className="rounded-panel border border-status-withdrawn/20 bg-ui-card/90 p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-ui-ink">Registration view unavailable</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">{error.message}</p>
      </div>
    );
  }

  const tournament = (data?.tournament ?? null) as TournamentRecord | null;
  const registrations = (data?.tournamentRegistrations ?? []) as TournamentRegistrationRecord[];
  const courses = (data?.clubCourses ?? []) as CourseRecord[];
  const teeNameMap = new Map(
    courses.flatMap((course) =>
      (course.tees ?? []).map((tee) => [tee.teeId, tee.teeName] as const)
    )
  );
  const isBusy =
    approveState.loading ||
    waitlistState.loading ||
    cancelRegState.loading ||
    closeState.loading ||
    cancelTournamentState.loading;

  async function runMutation(action: () => Promise<unknown>) {
    setErrorMessage(null);
    try {
      await action();
      await refetch();
    } catch (mutationError) {
      setErrorMessage(
        mutationError instanceof Error ? mutationError.message : "Registration action failed."
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Registration management</p>
            <h2 className="mt-3 text-3xl font-semibold text-ui-ink">{tournament?.name ?? "Tournament"}</h2>
            <div className="mt-4 grid gap-2 text-sm text-ui-muted md:grid-cols-2">
              <p>{tournament?.startDate ? formatDate(tournament.startDate) : "Date coming"}</p>
              <p>
                {tournament?.registeredPlayerCount ?? 0}/{tournament?.maxPlayers ?? "—"} registered
              </p>
              <p>Entry fee {formatCurrency(tournament?.entryFee)}</p>
              <p>Status {tournament?.status ?? "ACTIVE"}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={tournament?.registrationStatus ?? "DRAFT"} />
            {tournament?.registrationStatus === "OPEN" ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() =>
                  void runMutation(() => closeRegistration({ variables: { id: tournamentId } }))
                }
                className="rounded-full border border-ui-line bg-white px-4 py-2 text-sm font-semibold text-ui-ink hover:border-brand-gold disabled:opacity-40"
              >
                Close registration
              </button>
            ) : null}
            {tournament?.status !== "CANCELLED" ? (
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
                    cancelTournament({ variables: { id: tournamentId, reason } })
                  );
                }}
                className="rounded-full border border-status-withdrawn/30 bg-white px-4 py-2 text-sm font-semibold text-status-withdrawn hover:border-status-withdrawn disabled:opacity-40"
              >
                Cancel tournament
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {errorMessage ? (
        <p className="rounded-3xl border border-status-withdrawn/20 bg-status-withdrawn/8 px-5 py-4 text-sm text-status-withdrawn">
          {errorMessage}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-panel border bg-ui-card/90 shadow-panel">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-brand-sand/55 text-ui-muted">
              <tr>
                <th className="px-5 py-4 font-medium">Player</th>
                <th className="px-5 py-4 font-medium">GHIN</th>
                <th className="px-5 py-4 font-medium">HI at registration</th>
                <th className="px-5 py-4 font-medium">Preferred tee</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Payment</th>
                <th className="px-5 py-4 font-medium">Registered at</th>
                <th className="px-5 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {registrations.length ? (
                registrations.map((registration) => (
                  <tr key={registration.id} className="border-t bg-white/75">
                    <td className="px-5 py-4 font-semibold text-ui-ink">
                      {registration.playerNameSnapshot ?? "Unknown player"}
                    </td>
                    <td className="px-5 py-4 text-ui-muted">
                      {registration.ghinNumberSnapshot ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-ui-ink">
                      {registration.handicapIndexSnapshot != null
                        ? registration.handicapIndexSnapshot.toFixed(1)
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-ui-ink">
                      {registration.preferredTeeId
                        ? teeNameMap.get(registration.preferredTeeId) ?? registration.preferredTeeId
                        : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={registration.status} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={registration.paymentStatus ?? "NOT_REQUIRED"} />
                    </td>
                    <td className="px-5 py-4 text-ui-muted">
                      {registration.registeredAt ? formatDate(registration.registeredAt) : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {(registration.status === "WAITLISTED" ||
                          registration.status === "PENDING") && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              void runMutation(() =>
                                approveRegistration({ variables: { id: registration.id } })
                              )
                            }
                            className="rounded-full border border-ui-line bg-white px-4 py-2 text-xs font-semibold text-ui-ink hover:border-brand-gold disabled:opacity-40"
                          >
                            Approve
                          </button>
                        )}

                        {registration.status === "REGISTERED" && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              void runMutation(() =>
                                waitlistRegistration({ variables: { id: registration.id } })
                              )
                            }
                            className="rounded-full border border-ui-line bg-white px-4 py-2 text-xs font-semibold text-ui-ink hover:border-brand-gold disabled:opacity-40"
                          >
                            Waitlist
                          </button>
                        )}

                        {(registration.status === "REGISTERED" ||
                          registration.status === "WAITLISTED" ||
                          registration.status === "PENDING") && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              const reason = window.prompt(
                                "Reason for registration cancellation",
                                "Cancelled by admin"
                              );
                              if (!reason) {
                                return;
                              }
                              void runMutation(() =>
                                cancelRegistration({
                                  variables: { id: registration.id, reason },
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
                  <td colSpan={8} className="px-5 py-12 text-center text-ui-muted">
                    No registrations yet.
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

"use client";

import Link from "next/link";
import { gql, useQuery } from "@apollo/client";
import { MetricCard } from "@/components/shared/MetricCard";
import { LoadingView } from "@/components/shared/LoadingView";
import { useAuth } from "@/lib/auth/useAuth";
import { formatDate } from "@/utils/formatDate";
import type { AuditLogRecord, ClubSummary, GolferRecord, TournamentRecord } from "@/types";

const GET_ADMIN_DASHBOARD = gql`
  query GetAdminDashboard($clubId: ID!, $rosterFilter: GolferRosterFilterInput!, $auditFilter: AuditLogFilterInput!) {
    myClubs {
      id
      name
      clubNumber
      status
    }
    golfers(filter: $rosterFilter) {
      nodes {
        id
        membershipStatus
      }
      pageInfo {
        totalCount
      }
    }
    openTournaments(clubId: $clubId) {
      id
      name
      registrationStatus
      registeredPlayerCount
      maxPlayers
    }
    auditLogs(filter: $auditFilter) {
      nodes {
        id
        action
        entityType
        summary
        actorEmail
        createdAt
      }
    }
  }
`;

export default function AdminDashboardPage() {
  const { user, primaryClubId, isLoading: authLoading } = useAuth();
  const { data, loading, error } = useQuery(GET_ADMIN_DASHBOARD, {
    skip: authLoading || !primaryClubId,
    variables: {
      clubId: primaryClubId,
      rosterFilter: {
        clubId: primaryClubId,
        page: 1,
        pageSize: 250,
        includeInactive: true,
      },
      auditFilter: {
        page: 1,
        pageSize: 12,
      },
    },
  });

  if (authLoading) {
    return <LoadingView title="Loading dashboard" message="Gathering club metrics..." />;
  }

  if (!primaryClubId || !user) {
    return null;
  }

  if (loading) {
    return <LoadingView title="Loading dashboard" message="Gathering club metrics..." />;
  }

  if (error) {
    return (
      <div className="rounded-panel border border-status-withdrawn/25 bg-white/85 p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-ui-ink">Dashboard unavailable</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">{error.message}</p>
      </div>
    );
  }

  const clubs = (data?.myClubs ?? []) as ClubSummary[];
  const rosterNodes = (data?.golfers?.nodes ?? []) as GolferRecord[];
  const tournaments = (data?.openTournaments ?? []) as TournamentRecord[];
  const activity = (data?.auditLogs?.nodes ?? []) as AuditLogRecord[];

  const activeMembers = rosterNodes.filter((item) => item.membershipStatus === "ACTIVE").length;
  const recentScores = activity.filter((item) => item.action === "SCORE_POSTED").length;

  return (
    <div className="space-y-6">
      <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel">
        <p className="text-xs uppercase tracking-[0.26em] text-brand-clay">Admin dashboard</p>
        <h2 className="mt-4 text-4xl font-semibold text-ui-ink">Welcome back, {user.firstName}</h2>
        <p className="mt-3 max-w-3xl text-base leading-8 text-ui-muted">
          {clubs[0]?.name ?? "Your club"} is connected. Use this page for quick health checks,
          roster traffic, and recent score or tournament activity.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total members"
          value={data?.golfers?.pageInfo?.totalCount ?? 0}
          hint="Roster records in current club scope"
        />
        <MetricCard label="Active members" value={activeMembers} hint="Members eligible for posting and registration" />
        <MetricCard label="Recent scores" value={recentScores} hint="Recent score-post audit entries in activity feed" />
        <MetricCard label="Open tournaments" value={tournaments.length} hint="Tournaments accepting registrations" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Recent activity</p>
              <h3 className="mt-2 text-2xl font-semibold text-ui-ink">Audit pulse</h3>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {activity.length ? (
              activity.slice(0, 5).map((entry) => (
                <article key={entry.id} className="rounded-3xl border bg-white/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.2em] text-brand-clay">
                      {entry.action.replaceAll("_", " ")}
                    </span>
                    <span className="text-sm text-ui-muted">{formatDate(entry.createdAt)}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-ui-ink">{entry.summary}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ui-muted">
                    {entry.actorEmail}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-3xl border bg-white/60 p-4 text-sm text-ui-muted">
                No recent audit entries yet.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
          <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Quick actions</p>
          <h3 className="mt-2 text-2xl font-semibold text-ui-ink">Move fast</h3>
          <div className="mt-6 grid gap-3">
            <Link
              href={`/manage/${primaryClubId}/roster`}
              className="rounded-3xl border bg-white/70 p-4 hover:border-brand-gold"
            >
              <p className="text-lg font-semibold text-ui-ink">View roster</p>
              <p className="mt-1 text-sm text-ui-muted">Search members, filter status, and trigger activate/deactivate actions.</p>
            </Link>
            <Link href="/tournaments" className="rounded-3xl border bg-white/70 p-4 hover:border-brand-gold">
              <p className="text-lg font-semibold text-ui-ink">Tournament workspace</p>
              <p className="mt-1 text-sm text-ui-muted">Open the tournament lane and continue registration management next.</p>
            </Link>
            <Link
              href={`/manage/${primaryClubId}/account`}
              className="rounded-3xl border bg-white/70 p-4 hover:border-brand-gold"
            >
              <p className="text-lg font-semibold text-ui-ink">Account configuration</p>
              <p className="mt-1 text-sm text-ui-muted">Review club details and prep home-course management screens.</p>
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}

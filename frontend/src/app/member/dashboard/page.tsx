"use client";

import Link from "next/link";
import { gql, useQuery } from "@apollo/client";
import { LoadingView } from "@/components/shared/LoadingView";
import { MetricCard } from "@/components/shared/MetricCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/auth/useAuth";
import { formatDate } from "@/utils/formatDate";
import { formatHandicap } from "@/utils/formatHandicap";
import { formatScoreDiff } from "@/utils/formatScore";
import type { GolferRecord, ScoreRecord, TournamentRecord } from "@/types";

const GET_MEMBER_DASHBOARD = gql`
  query GetMemberDashboard($golferId: ID!, $clubId: ID!, $scoreFilter: ScoreHistoryFilterInput!) {
    golfer(id: $golferId) {
      id
      firstName
      lastName
      ghinNumber
      currentHandicapIndex
      lowHandicapIndex
    }
    golferScores(filter: $scoreFilter) {
      nodes {
        id
        datePlayed
        grossScore
        differential
        status
        courseNameSnapshot
        teeNameSnapshot
      }
      pageInfo {
        totalCount
      }
    }
    openTournaments(clubId: $clubId) {
      id
      name
      startDate
      registrationStatus
      registeredPlayerCount
      maxPlayers
    }
  }
`;

export default function MemberDashboardPage() {
  const auth = useAuth();
  const golferId = auth.user?.golferId ?? null;
  const primaryClubId = auth.primaryClubId;
  const authLoading = auth.isLoading;
  const user = auth.user;

  const { data, loading, error } = useQuery(GET_MEMBER_DASHBOARD, {
    skip: authLoading || !golferId || !primaryClubId,
    variables: {
      golferId,
      clubId: primaryClubId,
      scoreFilter: {
        golferId,
        page: 1,
        pageSize: 3,
      },
    },
  });

  if (authLoading) {
    return <LoadingView title="Loading member dashboard" message="Pulling your latest scores and handicap..." />;
  }

  if (!golferId || !primaryClubId || !user) {
    return null;
  }

  if (loading) {
    return <LoadingView title="Loading member dashboard" message="Pulling your latest scores and handicap..." />;
  }

  if (error) {
    return (
      <div className="rounded-panel border border-status-withdrawn/20 bg-ui-card/90 p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-ui-ink">Member dashboard unavailable</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">{error.message}</p>
      </div>
    );
  }

  const golfer = data?.golfer as GolferRecord | undefined;
  const scores = (data?.golferScores?.nodes ?? []) as ScoreRecord[];
  const tournaments = (data?.openTournaments ?? []) as TournamentRecord[];

  return (
    <div className="space-y-6">
      <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel">
        <p className="text-xs uppercase tracking-[0.26em] text-brand-clay">Member dashboard</p>
        <h2 className="mt-3 text-4xl font-semibold text-ui-ink">
          Welcome back, {golfer?.firstName ?? user.firstName}!
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-ui-muted">
          Your member view stays focused: handicap snapshot, recent posting history, and
          open tournaments you can jump into quickly.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Handicap index"
          value={formatHandicap(golfer?.currentHandicapIndex)}
          hint="WHS-based club calculation"
        />
        <MetricCard
          label="Low HI (365)"
          value={formatHandicap(golfer?.lowHandicapIndex)}
          hint="Rolling low handicap marker"
        />
        <MetricCard
          label="Scores posted"
          value={data?.golferScores?.pageInfo?.totalCount ?? 0}
          hint="Read-only history for members"
        />
      </section>

      <p className="rounded-3xl border bg-brand-sand/60 px-5 py-4 text-sm leading-7 text-ui-muted">
        Handicap values are calculated using WHS formulas for club management purposes.
        Official USGA/GHIN certification requires a certified integration.
      </p>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Recent scores</p>
              <h3 className="mt-2 text-2xl font-semibold text-ui-ink">Latest postings</h3>
            </div>
            <Link href="/member/scores/history" className="text-sm font-semibold text-brand-green hover:text-brand-green-light">
              View all
            </Link>
          </div>
          <div className="mt-6 space-y-3">
            {scores.length ? (
              scores.map((score) => (
                <article key={score.id} className="rounded-3xl border bg-white/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ui-ink">{score.courseNameSnapshot}</p>
                      <p className="text-sm text-ui-muted">{score.teeNameSnapshot}</p>
                    </div>
                    <StatusBadge status={score.status} />
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-ui-muted md:grid-cols-3">
                    <p>{formatDate(score.datePlayed)}</p>
                    <p>Score {score.grossScore}</p>
                    <p>Diff {score.differential != null ? formatScoreDiff(score.differential) : "—"}</p>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-3xl border bg-white/70 p-4 text-sm text-ui-muted">
                No scores posted yet.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Open tournaments</p>
              <h3 className="mt-2 text-2xl font-semibold text-ui-ink">{tournaments.length} available</h3>
            </div>
            <Link href="/member/tournaments" className="text-sm font-semibold text-brand-green hover:text-brand-green-light">
              Browse
            </Link>
          </div>
          <div className="mt-6 space-y-3">
            {tournaments.length ? (
              tournaments.slice(0, 3).map((tournament) => (
                <article key={tournament.id} className="rounded-3xl border bg-white/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-ui-ink">{tournament.name}</p>
                    <StatusBadge status={tournament.registrationStatus ?? "OPEN"} />
                  </div>
                  <p className="mt-3 text-sm text-ui-muted">
                    {tournament.startDate ? formatDate(tournament.startDate) : "Date coming"} •{" "}
                    {tournament.registeredPlayerCount ?? 0}/{tournament.maxPlayers ?? "—"} registered
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-3xl border bg-white/70 p-4 text-sm text-ui-muted">
                No open tournaments right now.
              </p>
            )}
          </div>

          <div className="mt-6 grid gap-3">
            <Link href="/member/scores/post" className="rounded-full bg-brand-green px-5 py-3 text-center text-sm font-semibold text-white hover:bg-brand-green-light">
              Post a score
            </Link>
            <Link href="/member/profile" className="rounded-full border border-ui-line bg-white px-5 py-3 text-center text-sm font-semibold text-ui-ink hover:border-brand-gold">
              Review profile
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}

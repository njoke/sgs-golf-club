"use client";

import { gql, useQuery } from "@apollo/client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { LoadingView } from "@/components/shared/LoadingView";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/auth/useAuth";
import type { ScoreRecord } from "@/types";
import { formatDate } from "@/utils/formatDate";
import { formatScoreDiff } from "@/utils/formatScore";

const GET_MEMBER_SCORE_HISTORY = gql`
  query GetMemberScoreHistory($filter: ScoreHistoryFilterInput!) {
    golferScores(filter: $filter) {
      nodes {
        id
        datePlayed
        scoreType
        courseNameSnapshot
        teeNameSnapshot
        courseRating
        slopeRating
        grossScore
        differential
        status
      }
      pageInfo {
        totalCount
        page
        pageSize
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export default function MemberScoreHistoryPage() {
  const auth = useAuth();
  const searchParams = useSearchParams();
  const golferId = auth.user?.golferId ?? null;
  const [page, setPage] = useState(1);
  const [scoreType, setScoreType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, loading, error } = useQuery(GET_MEMBER_SCORE_HISTORY, {
    skip: auth.isLoading || !golferId,
    variables: {
      filter: {
        golferId,
        page,
        pageSize: 25,
        scoreType: scoreType || undefined,
        dateFrom: dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`).toISOString() : undefined,
        dateTo: dateTo ? new Date(`${dateTo}T23:59:59.999Z`).toISOString() : undefined,
      },
    },
  });

  if (auth.isLoading || loading) {
    return <LoadingView title="Loading history" message="Pulling your posted score timeline..." />;
  }

  if (!auth.user || !golferId) {
    return null;
  }

  if (error) {
    return (
      <div className="rounded-panel border border-status-withdrawn/20 bg-ui-card/90 p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-ui-ink">Score history unavailable</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">{error.message}</p>
      </div>
    );
  }

  const rows = (data?.golferScores?.nodes ?? []) as ScoreRecord[];
  const pageInfo = data?.golferScores?.pageInfo;

  return (
    <div className="space-y-6">
      {searchParams.get("posted") ? (
        <p className="rounded-3xl border border-status-active/20 bg-status-active/8 px-5 py-4 text-sm text-status-active">
          Score posted. Handicap index recalculation is in motion.
        </p>
      ) : null}

      <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel">
        <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Score history</p>
        <h2 className="mt-3 text-3xl font-semibold text-ui-ink">Read-only posting timeline</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">
          Withdrawn scores remain visible here, but they are excluded from handicap calculation.
        </p>
      </section>

      <section className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Score type</span>
            <select
              value={scoreType}
              onChange={(event) => {
                setScoreType(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            >
              <option value="">All</option>
              <option value="HOME">Home</option>
              <option value="AWAY">Away</option>
              <option value="COMPETITION">Competition</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Date from</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Date to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 lg:hidden">
        {rows.length ? (
          rows.map((score) => (
            <article key={score.id} className="rounded-panel border bg-ui-card/90 p-5 shadow-panel">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ui-ink">{score.courseNameSnapshot}</p>
                  <p className="mt-1 text-sm text-ui-muted">{score.teeNameSnapshot}</p>
                </div>
                <StatusBadge status={score.status} />
              </div>
              <div className="mt-4 grid gap-2 text-sm text-ui-muted">
                <p>{formatDate(score.datePlayed)}</p>
                <p>{score.scoreType?.replaceAll("_", " ") ?? "—"}</p>
                <p>
                  C.R./Slope {score.courseRating ?? "—"} / {score.slopeRating ?? "—"}
                </p>
                <p>Score {score.grossScore}</p>
                <p>Diff {score.differential != null ? formatScoreDiff(score.differential) : "—"}</p>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-panel border bg-ui-card/90 p-6 text-sm text-ui-muted shadow-panel">
            No scores matched current filters.
          </p>
        )}
      </section>

      <section className="hidden overflow-hidden rounded-panel border bg-ui-card/90 shadow-panel lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-brand-sand/55 text-ui-muted">
              <tr>
                <th className="px-5 py-4 font-medium">Date</th>
                <th className="px-5 py-4 font-medium">Type</th>
                <th className="px-5 py-4 font-medium">Course / Tee</th>
                <th className="px-5 py-4 font-medium">C.R. / Slope</th>
                <th className="px-5 py-4 font-medium">Score</th>
                <th className="px-5 py-4 font-medium">Diff</th>
                <th className="px-5 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((score) => (
                  <tr key={score.id} className="border-t bg-white/75">
                    <td className="px-5 py-4 text-ui-muted">{formatDate(score.datePlayed)}</td>
                    <td className="px-5 py-4 text-ui-ink">
                      {score.scoreType?.replaceAll("_", " ") ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ui-ink">{score.courseNameSnapshot}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ui-muted">
                        {score.teeNameSnapshot}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-ui-muted">
                      {score.courseRating ?? "—"} / {score.slopeRating ?? "—"}
                    </td>
                    <td className="px-5 py-4 font-semibold text-ui-ink">{score.grossScore}</td>
                    <td className="px-5 py-4 text-ui-ink">
                      {score.differential != null ? formatScoreDiff(score.differential) : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={score.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-ui-muted">
                    No scores matched current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-panel border bg-ui-card/90 px-5 py-4 text-sm text-ui-muted shadow-panel md:flex-row md:items-center md:justify-between">
        <p>
          Showing {rows.length} of {pageInfo?.totalCount ?? 0} scores
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            disabled={!pageInfo?.hasPreviousPage}
            className="rounded-full border border-ui-line px-4 py-2 disabled:opacity-40"
          >
            Previous
          </button>
          <span>Page {pageInfo?.page ?? 1}</span>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={!pageInfo?.hasNextPage}
            className="rounded-full border border-ui-line px-4 py-2 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}

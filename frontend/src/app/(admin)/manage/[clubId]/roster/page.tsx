"use client";

import { gql, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { LoadingView } from "@/components/shared/LoadingView";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatHandicap } from "@/utils/formatHandicap";
import type { GolferRecord } from "@/types";

const GET_ROSTER = gql`
  query GetRoster($filter: GolferRosterFilterInput!) {
    golfers(filter: $filter) {
      nodes {
        id
        ghinNumber
        localNumber
        firstName
        lastName
        email
        gender
        membershipCode
        membershipStatus
        currentHandicapIndex
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

const ACTIVATE_GOLFER = gql`
  mutation ActivateGolfer($id: ID!) {
    activateGolfer(id: $id) {
      id
      membershipStatus
    }
  }
`;

const DEACTIVATE_GOLFER = gql`
  mutation DeactivateGolfer($id: ID!, $reason: String) {
    deactivateGolfer(id: $id, reason: $reason) {
      id
      membershipStatus
    }
  }
`;

export default function RosterPage() {
  const params = useParams<{ clubId: string }>();
  const clubId = Array.isArray(params.clubId) ? params.clubId[0] : params.clubId;
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [membershipStatus, setMembershipStatus] = useState("");
  const [gender, setGender] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);

  const { data, loading, error, refetch } = useQuery(GET_ROSTER, {
    skip: !clubId,
    variables: {
      filter: {
        clubId,
        page,
        pageSize: 25,
        searchText: searchText || undefined,
        membershipStatus: membershipStatus || undefined,
        gender: gender || undefined,
        includeInactive,
        sortBy: "lastName",
        sortDirection: "ASC",
      },
    },
  });
  const [activateGolfer, activateState] = useMutation(ACTIVATE_GOLFER);
  const [deactivateGolfer, deactivateState] = useMutation(DEACTIVATE_GOLFER);

  if (!clubId) {
    return null;
  }

  if (loading) {
    return <LoadingView title="Loading roster" message="Pulling member records from GraphQL..." />;
  }

  if (error) {
    return (
      <div className="rounded-panel border border-status-withdrawn/25 bg-ui-card/90 p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-ui-ink">Roster unavailable</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">{error.message}</p>
      </div>
    );
  }

  const rows = (data?.golfers?.nodes ?? []) as GolferRecord[];
  const pageInfo = data?.golfers?.pageInfo;
  const isBusy = activateState.loading || deactivateState.loading;

  async function handleToggle(golfer: GolferRecord) {
    if (golfer.membershipStatus === "ACTIVE") {
      const reason = window.prompt("Reason for deactivation", "Moved out of active club roster");
      if (!reason) {
        return;
      }
      await deactivateGolfer({ variables: { id: golfer.id, reason } });
    } else {
      await activateGolfer({ variables: { id: golfer.id } });
    }

    await refetch();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-brand-clay">Manage roster</p>
            <h2 className="mt-3 text-4xl font-semibold text-ui-ink">Club membership</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ui-muted">
              Search seeded golfers, inspect active vs inactive records, and run the
              club-state activate/deactivate workflow directly from this table.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="rounded-full border border-ui-line bg-white px-5 py-3 text-sm font-semibold text-ui-muted"
          >
            Add golfer flow next
          </button>
        </div>
      </section>

      <section className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-ui-muted">Search</span>
            <input
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
                setPage(1);
              }}
              placeholder="Name, GHIN, email"
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-ui-muted">Status</span>
            <select
              value={membershipStatus}
              onChange={(event) => {
                setMembershipStatus(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            >
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-ui-muted">Gender</span>
            <select
              value={gender}
              onChange={(event) => {
                setGender(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            >
              <option value="">All</option>
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="OTHER">Other</option>
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-sm text-ui-ink">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => {
                setIncludeInactive(event.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 accent-[#204733]"
            />
            Include inactive members
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-panel border bg-ui-card/90 shadow-panel">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-brand-sand/55 text-ui-muted">
              <tr>
                <th className="px-5 py-4 font-medium">GHIN</th>
                <th className="px-5 py-4 font-medium">Local #</th>
                <th className="px-5 py-4 font-medium">Name</th>
                <th className="px-5 py-4 font-medium">Handicap</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Membership</th>
                <th className="px-5 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((golfer) => (
                  <tr key={golfer.id} className="border-t bg-white/75">
                    <td className="px-5 py-4 text-ui-muted">{golfer.ghinNumber ?? "—"}</td>
                    <td className="px-5 py-4 text-ui-muted">{golfer.localNumber ?? "—"}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ui-ink">
                        <Link
                          href={`/manage/${clubId}/golfer/${golfer.id}`}
                          className="hover:text-brand-green"
                        >
                          {golfer.lastName}, {golfer.firstName}
                        </Link>
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ui-muted">
                        {golfer.email ?? "No email"}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-semibold text-ui-ink">
                      {formatHandicap(golfer.currentHandicapIndex)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={golfer.membershipStatus ?? "UNKNOWN"} />
                    </td>
                    <td className="px-5 py-4 text-ui-ink">{golfer.membershipCode ?? "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/manage/${clubId}/golfer/${golfer.id}`}
                          className="rounded-full border border-ui-line bg-white px-4 py-2 text-xs font-semibold text-ui-ink hover:border-brand-gold"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleToggle(golfer)}
                          disabled={isBusy}
                          className="rounded-full border border-ui-line bg-white px-4 py-2 text-xs font-semibold text-ui-ink hover:border-brand-gold disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {golfer.membershipStatus === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-ui-muted">
                    No roster records matched the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t bg-white/70 px-5 py-4 text-sm text-ui-muted md:flex-row md:items-center md:justify-between">
          <p>
            Showing {rows.length} of {pageInfo?.totalCount ?? 0} golfers
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
        </div>
      </section>
    </div>
  );
}

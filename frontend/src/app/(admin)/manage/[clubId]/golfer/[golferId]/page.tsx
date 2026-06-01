"use client";

import { gql, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminGolferScorePanel } from "@/components/admin/AdminGolferScorePanel";
import { LoadingView } from "@/components/shared/LoadingView";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { AddressRecord, CourseRecord, GolferRecord } from "@/types";
import { formatDate } from "@/utils/formatDate";
import { formatHandicap } from "@/utils/formatHandicap";
import { formatScoreDiff } from "@/utils/formatScore";

const GET_ADMIN_GOLFER_DETAIL = gql`
  query GetAdminGolferDetail($golferId: ID!, $clubId: ID!, $scoreFilter: ScoreHistoryFilterInput!) {
    golfer(id: $golferId) {
      id
      clubId
      ghinNumber
      localNumber
      firstName
      middleName
      lastName
      suffix
      gender
      dateOfBirth
      email
      phone
      address {
        addressLine1
        addressLine2
        city
        state
        postalCode
        country
      }
      membershipCode
      membershipStatus
      digitalProfileStatus
      currentHandicapIndex
      lowHandicapIndex
      lowHandicapDate
      createdAt
      updatedAt
    }
    clubCourses(clubId: $clubId) {
      id
      clubId
      facilityName
      courseName
      city
      state
      isPrimaryFacility
      defaultMaleTeeId
      defaultFemaleTeeId
      tees {
        teeId
        teeName
        gender
        par
        courseRating
        slopeRating
        frontNine {
          rating
          slope
          par
        }
        backNine {
          rating
          slope
          par
        }
        holePars
        holeHandicaps
      }
    }
    golferScores(filter: $scoreFilter) {
      nodes {
        id
        datePlayed
        scoreType
        grossScore
        adjustedGrossScore
        courseRating
        slopeRating
        par
        differential
        pcc
        esr
        courseNameSnapshot
        teeNameSnapshot
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

const GET_GOLFER_AUDIT_LOG = gql`
  query GetGolferAuditLog($filter: AuditLogFilterInput!) {
    auditLogs(filter: $filter) {
      nodes {
        id
        entityType
        action
        summary
        actorEmail
        actorRole
        createdAt
        before
        after
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

const UPDATE_GOLFER = gql`
  mutation UpdateAdminGolfer($id: ID!, $input: UpdateGolferInput!) {
    updateGolfer(id: $id, input: $input) {
      id
      firstName
      middleName
      lastName
      suffix
      gender
      dateOfBirth
      email
      phone
      localNumber
      membershipCode
      address {
        addressLine1
        addressLine2
        city
        state
        postalCode
        country
      }
      updatedAt
    }
  }
`;

const ACTIVATE_GOLFER = gql`
  mutation ActivateAdminGolfer($id: ID!) {
    activateGolfer(id: $id) {
      id
      membershipStatus
      statusDate
    }
  }
`;

const DEACTIVATE_GOLFER = gql`
  mutation DeactivateAdminGolfer($id: ID!, $reason: String) {
    deactivateGolfer(id: $id, reason: $reason) {
      id
      membershipStatus
      statusDate
    }
  }
`;

const WITHDRAW_SCORE = gql`
  mutation WithdrawAdminGolferScore($id: ID!, $reason: String) {
    withdrawScore(id: $id, reason: $reason) {
      id
      status
    }
  }
`;

type TabId = "handicap" | "post-score" | "profile" | "audit";

interface AdminScoreRecord {
  id: string;
  datePlayed: string;
  scoreType?: string;
  grossScore: number;
  adjustedGrossScore?: number | null;
  courseRating?: number | null;
  slopeRating?: number | null;
  par?: number | null;
  differential?: number | null;
  pcc?: number | null;
  esr?: number | null;
  courseNameSnapshot: string;
  teeNameSnapshot: string;
  status: string;
}

interface AdminAuditLogRecord {
  id: string;
  entityType: string;
  action: string;
  summary: string;
  actorEmail: string;
  actorRole: string;
  createdAt: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

interface ProfileFormState {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  gender: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  localNumber: string;
  membershipCode: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "handicap", label: "Handicap" },
  { id: "post-score", label: "Post score" },
  { id: "profile", label: "Profile" },
  { id: "audit", label: "Audit log" },
];

const auditActionLabels: Record<string, string> = {
  GOLFER_CREATED: "Golfer created",
  GOLFER_UPDATED: "Profile updated",
  GOLFER_ACTIVATED: "Activated",
  GOLFER_DEACTIVATED: "Deactivated",
  HANDICAP_INDEX_UPDATED: "Handicap index updated",
  SCORE_POSTED: "Score posted",
  SCORE_MODIFIED: "Score modified",
  SCORE_WITHDRAWN: "Score withdrawn",
};

function mapProfileFormState(golfer?: GolferRecord | null): ProfileFormState {
  return {
    firstName: golfer?.firstName ?? "",
    middleName: golfer?.middleName ?? "",
    lastName: golfer?.lastName ?? "",
    suffix: golfer?.suffix ?? "",
    gender: golfer?.gender ?? "M",
    dateOfBirth: golfer?.dateOfBirth ? new Date(golfer.dateOfBirth).toISOString().slice(0, 10) : "",
    email: golfer?.email ?? "",
    phone: golfer?.phone ?? "",
    localNumber: golfer?.localNumber ?? "",
    membershipCode: golfer?.membershipCode ?? "",
    addressLine1: golfer?.address?.addressLine1 ?? "",
    addressLine2: golfer?.address?.addressLine2 ?? "",
    city: golfer?.address?.city ?? "",
    state: golfer?.address?.state ?? "",
    postalCode: golfer?.address?.postalCode ?? "",
    country: golfer?.address?.country ?? "",
  };
}

function toAddressInput(formState: ProfileFormState): AddressRecord {
  return {
    addressLine1: formState.addressLine1 || undefined,
    addressLine2: formState.addressLine2 || undefined,
    city: formState.city || undefined,
    state: formState.state || undefined,
    postalCode: formState.postalCode || undefined,
    country: formState.country || undefined,
  };
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatJsonPreview(value: Record<string, unknown> | null | undefined): string {
  if (!value) {
    return "—";
  }

  const text = JSON.stringify(value, null, 2);
  return text.length > 360 ? `${text.slice(0, 360)}...` : text;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-ui-muted">{label}</p>
      <p className="mt-2 text-sm text-ui-ink">{value || "—"}</p>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "date";
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border bg-white px-4 py-3 text-sm text-ui-ink outline-none focus:border-brand-gold"
      />
    </label>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-brand-green text-white"
          : "border border-ui-line bg-white text-ui-ink hover:border-brand-gold"
      }`}
    >
      {label}
    </button>
  );
}

export default function AdminGolferDetailPage() {
  const params = useParams<{ clubId: string; golferId: string }>();
  const clubId = Array.isArray(params.clubId) ? params.clubId[0] : params.clubId;
  const golferId = Array.isArray(params.golferId) ? params.golferId[0] : params.golferId;

  const [activeTab, setActiveTab] = useState<TabId>("handicap");
  const [scorePage, setScorePage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(mapProfileFormState());

  const scoreFilter = useMemo(
    () => ({
      golferId,
      page: scorePage,
      pageSize: 10,
    }),
    [golferId, scorePage]
  );
  const auditFilter = useMemo(
    () => ({
      entityType: "GOLFER",
      entityId: golferId,
      page: auditPage,
      pageSize: 20,
    }),
    [auditPage, golferId]
  );

  const {
    data,
    loading,
    error,
    refetch: refetchMain,
  } = useQuery(GET_ADMIN_GOLFER_DETAIL, {
    skip: !clubId || !golferId,
    variables: {
      golferId,
      clubId,
      scoreFilter,
    },
  });

  const {
    data: auditData,
    loading: auditLoading,
    error: auditError,
    refetch: refetchAudit,
  } = useQuery(GET_GOLFER_AUDIT_LOG, {
    skip: !golferId || activeTab !== "audit",
    variables: {
      filter: auditFilter,
    },
  });

  const [updateGolfer, updateState] = useMutation(UPDATE_GOLFER);
  const [activateGolfer, activateState] = useMutation(ACTIVATE_GOLFER);
  const [deactivateGolfer, deactivateState] = useMutation(DEACTIVATE_GOLFER);
  const [withdrawScore, withdrawState] = useMutation(WITHDRAW_SCORE);

  const golfer = (data?.golfer ?? null) as GolferRecord | null;
  const courses = (data?.clubCourses ?? []) as CourseRecord[];
  const scoreRows = (data?.golferScores?.nodes ?? []) as AdminScoreRecord[];
  const scorePageInfo = data?.golferScores?.pageInfo;
  const auditRows = (auditData?.auditLogs?.nodes ?? []) as AdminAuditLogRecord[];
  const auditPageInfo = auditData?.auditLogs?.pageInfo;
  const isBusy =
    updateState.loading ||
    activateState.loading ||
    deactivateState.loading ||
    withdrawState.loading;

  useEffect(() => {
    if (golfer && !isEditingProfile) {
      setProfileForm(mapProfileFormState(golfer));
    }
  }, [golfer, isEditingProfile]);

  if (!clubId || !golferId) {
    return null;
  }

  if (loading) {
    return <LoadingView title="Loading golfer workspace" message="Pulling golfer detail, scores, and courses..." />;
  }

  if (error) {
    return (
      <div className="rounded-panel border border-status-withdrawn/20 bg-ui-card/90 p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-ui-ink">Golfer workspace unavailable</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">{error.message}</p>
      </div>
    );
  }

  if (!golfer) {
    return (
      <div className="rounded-panel border border-status-withdrawn/20 bg-ui-card/90 p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-ui-ink">Golfer not found</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">
          This roster record is missing or outside current club scope.
        </p>
      </div>
    );
  }

  async function refreshAll() {
    await refetchMain();
    if (activeTab === "audit") {
      await refetchAudit();
    }
  }

  async function handleProfileSave() {
    setFeedback(null);
    setErrorMessage(null);

    try {
      await updateGolfer({
        variables: {
          id: golfer.id,
          input: {
            firstName: profileForm.firstName,
            middleName: profileForm.middleName || undefined,
            lastName: profileForm.lastName,
            suffix: profileForm.suffix || undefined,
            gender: profileForm.gender,
            dateOfBirth: profileForm.dateOfBirth
              ? new Date(`${profileForm.dateOfBirth}T12:00:00.000Z`).toISOString()
              : undefined,
            email: profileForm.email || undefined,
            phone: profileForm.phone || undefined,
            localNumber: profileForm.localNumber || undefined,
            membershipCode: profileForm.membershipCode || undefined,
            address: toAddressInput(profileForm),
          },
        },
      });
      await refreshAll();
      setIsEditingProfile(false);
      setFeedback("Golfer profile updated.");
    } catch (mutationError) {
      setErrorMessage(
        mutationError instanceof Error ? mutationError.message : "Golfer update failed."
      );
    }
  }

  async function handleMembershipToggle() {
    setFeedback(null);
    setErrorMessage(null);

    try {
      if (golfer.membershipStatus === "ACTIVE") {
        const reason = window.prompt("Reason for deactivation", "Moved out of active club roster");
        if (!reason) {
          return;
        }

        await deactivateGolfer({
          variables: {
            id: golfer.id,
            reason,
          },
        });
        setFeedback("Golfer deactivated.");
      } else {
        await activateGolfer({
          variables: {
            id: golfer.id,
          },
        });
        setFeedback("Golfer activated.");
      }

      await refreshAll();
    } catch (mutationError) {
      setErrorMessage(
        mutationError instanceof Error ? mutationError.message : "Membership update failed."
      );
    }
  }

  async function handleWithdrawScore(score: AdminScoreRecord) {
    const reason = window.prompt("Reason for withdrawal", "Incorrect posted score");
    if (!reason) {
      return;
    }

    setFeedback(null);
    setErrorMessage(null);

    try {
      await withdrawScore({
        variables: {
          id: score.id,
          reason,
        },
      });
      await refreshAll();
      setFeedback("Score withdrawn and handicap recalculation triggered.");
    } catch (mutationError) {
      setErrorMessage(
        mutationError instanceof Error ? mutationError.message : "Score withdrawal failed."
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green text-xl font-semibold text-white">
              {golfer.firstName[0]}
              {golfer.lastName[0]}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Golfer workspace</p>
              <h2 className="mt-2 text-3xl font-semibold text-ui-ink">
                {[golfer.firstName, golfer.middleName, golfer.lastName].filter(Boolean).join(" ")}
              </h2>
              <p className="mt-2 text-sm text-ui-muted">
                GHIN {golfer.ghinNumber ?? "—"} • Local #{golfer.localNumber ?? "—"} • Added{" "}
                {golfer.createdAt ? formatDate(golfer.createdAt) : "—"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={golfer.membershipStatus ?? "ACTIVE"} />
              <StatusBadge status={golfer.digitalProfileStatus ?? "NONE"} />
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/manage/${clubId}/roster`}
                className="rounded-full border border-ui-line bg-white px-4 py-2 text-sm font-semibold text-ui-ink hover:border-brand-gold"
              >
                Back to roster
              </Link>
              <button
                type="button"
                onClick={() => void handleMembershipToggle()}
                disabled={isBusy}
                className="rounded-full bg-brand-green px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-light disabled:opacity-60"
              >
                {golfer.membershipStatus === "ACTIVE" ? "Deactivate golfer" : "Activate golfer"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              label={tab.label}
              onClick={() => {
                setErrorMessage(null);
                setFeedback(null);
                setActiveTab(tab.id);
              }}
            />
          ))}
        </div>
      </section>

      {feedback ? (
        <p className="rounded-3xl border border-status-active/20 bg-status-active/8 px-5 py-4 text-sm text-status-active">
          {feedback}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-3xl border border-status-withdrawn/20 bg-status-withdrawn/8 px-5 py-4 text-sm text-status-withdrawn">
          {errorMessage}
        </p>
      ) : null}

      {activeTab === "handicap" ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-panel border bg-ui-card/90 p-5 shadow-panel">
              <p className="text-xs uppercase tracking-[0.2em] text-brand-clay">Current HI</p>
              <p className="mt-3 text-3xl font-semibold text-ui-ink">
                {formatHandicap(golfer.currentHandicapIndex)}
              </p>
            </article>
            <article className="rounded-panel border bg-ui-card/90 p-5 shadow-panel">
              <p className="text-xs uppercase tracking-[0.2em] text-brand-clay">Low HI</p>
              <p className="mt-3 text-3xl font-semibold text-ui-ink">
                {formatHandicap(golfer.lowHandicapIndex)}
              </p>
            </article>
            <article className="rounded-panel border bg-ui-card/90 p-5 shadow-panel">
              <p className="text-xs uppercase tracking-[0.2em] text-brand-clay">Low HI date</p>
              <p className="mt-3 text-lg font-semibold text-ui-ink">
                {golfer.lowHandicapDate ? formatDate(golfer.lowHandicapDate) : "—"}
              </p>
            </article>
            <article className="rounded-panel border bg-ui-card/90 p-5 shadow-panel">
              <p className="text-xs uppercase tracking-[0.2em] text-brand-clay">Membership</p>
              <p className="mt-3 text-lg font-semibold text-ui-ink">
                {golfer.membershipCode ?? "—"} • {golfer.membershipStatus ?? "—"}
              </p>
            </article>
          </section>

          <section className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-brand-clay">Score history</p>
                <p className="mt-2 text-sm leading-7 text-ui-muted">
                  Withdraw incorrect rounds here. Withdrawn scores remain visible but stop affecting handicap.
                </p>
              </div>
              <p className="text-sm text-ui-muted">
                {scorePageInfo?.totalCount ?? 0} total scores
              </p>
            </div>

            <div className="mt-6 space-y-4 lg:hidden">
              {scoreRows.length ? (
                scoreRows.map((score) => (
                  <article key={score.id} className="rounded-3xl border bg-white/75 p-4">
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
                        Score {score.grossScore} • Adj {score.adjustedGrossScore ?? "—"}
                      </p>
                      <p>
                        Diff {score.differential != null ? formatScoreDiff(score.differential) : "—"}
                      </p>
                    </div>
                    {score.status !== "WITHDRAWN" ? (
                      <button
                        type="button"
                        onClick={() => void handleWithdrawScore(score)}
                        disabled={withdrawState.loading}
                        className="mt-4 rounded-full border border-status-withdrawn/30 bg-white px-4 py-2 text-xs font-semibold text-status-withdrawn disabled:opacity-40"
                      >
                        Withdraw
                      </button>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="rounded-3xl border bg-white/75 p-4 text-sm text-ui-muted">
                  No scores on file for this golfer yet.
                </p>
              )}
            </div>

            <div className="mt-6 hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-brand-sand/55 text-ui-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                    <th className="px-4 py-3 font-medium">C.R. / Slope</th>
                    <th className="px-4 py-3 font-medium">PCC</th>
                    <th className="px-4 py-3 font-medium">Diff</th>
                    <th className="px-4 py-3 font-medium">ESR</th>
                    <th className="px-4 py-3 font-medium">Adj</th>
                    <th className="px-4 py-3 font-medium">Course / Tee</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreRows.length ? (
                    scoreRows.map((score) => (
                      <tr key={score.id} className="border-t bg-white/75">
                        <td className="px-4 py-3 text-ui-ink">
                          {score.scoreType?.replaceAll("_", " ") ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-ui-muted">{formatDate(score.datePlayed)}</td>
                        <td className="px-4 py-3 font-semibold text-ui-ink">{score.grossScore}</td>
                        <td className="px-4 py-3 text-ui-muted">
                          {score.courseRating ?? "—"} / {score.slopeRating ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-ui-muted">{score.pcc ?? "—"}</td>
                        <td className="px-4 py-3 text-ui-ink">
                          {score.differential != null ? formatScoreDiff(score.differential) : "—"}
                        </td>
                        <td className="px-4 py-3 text-ui-muted">{score.esr ?? "—"}</td>
                        <td className="px-4 py-3 text-ui-muted">{score.adjustedGrossScore ?? "—"}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ui-ink">{score.courseNameSnapshot}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ui-muted">
                            {score.teeNameSnapshot}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={score.status} />
                        </td>
                        <td className="px-4 py-3">
                          {score.status !== "WITHDRAWN" ? (
                            <button
                              type="button"
                              onClick={() => void handleWithdrawScore(score)}
                              disabled={withdrawState.loading}
                              className="rounded-full border border-status-withdrawn/30 bg-white px-4 py-2 text-xs font-semibold text-status-withdrawn disabled:opacity-40"
                            >
                              Withdraw
                            </button>
                          ) : (
                            <span className="text-xs text-ui-muted">Read only</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="px-4 py-10 text-center text-ui-muted">
                        No scores on file for this golfer yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col gap-3 text-sm text-ui-muted md:flex-row md:items-center md:justify-between">
              <p>
                Showing {scoreRows.length} of {scorePageInfo?.totalCount ?? 0} scores
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setScorePage((current) => Math.max(current - 1, 1))}
                  disabled={!scorePageInfo?.hasPreviousPage}
                  className="rounded-full border border-ui-line px-4 py-2 disabled:opacity-40"
                >
                  Previous
                </button>
                <span>Page {scorePageInfo?.page ?? 1}</span>
                <button
                  type="button"
                  onClick={() => setScorePage((current) => current + 1)}
                  disabled={!scorePageInfo?.hasNextPage}
                  className="rounded-full border border-ui-line px-4 py-2 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "post-score" ? (
        <AdminGolferScorePanel
          clubId={clubId}
          golfer={golfer}
          courses={courses}
          onPosted={async (message) => {
            await refreshAll();
            setFeedback(message);
            setErrorMessage(null);
            setActiveTab("handicap");
          }}
        />
      ) : null}

      {activeTab === "profile" ? (
        <div className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-[1fr_20rem]">
            <div className="space-y-6">
              <article className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-brand-clay">Profile</p>
                  {isEditingProfile ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileForm(mapProfileFormState(golfer));
                          setIsEditingProfile(false);
                          setErrorMessage(null);
                        }}
                        className="rounded-full border border-ui-line bg-white px-4 py-2 text-sm font-semibold text-ui-ink hover:border-brand-gold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleProfileSave()}
                        disabled={updateState.loading}
                        className="rounded-full bg-brand-green px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-light disabled:opacity-60"
                      >
                        {updateState.loading ? "Saving..." : "Save"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setFeedback(null);
                        setErrorMessage(null);
                        setIsEditingProfile(true);
                      }}
                      className="rounded-full bg-brand-green px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-light"
                    >
                      Edit profile
                    </button>
                  )}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {isEditingProfile ? (
                    <>
                      <EditableField
                        label="First name"
                        value={profileForm.firstName}
                        onChange={(value) => setProfileForm((current) => ({ ...current, firstName: value }))}
                      />
                      <EditableField
                        label="Middle name"
                        value={profileForm.middleName}
                        onChange={(value) => setProfileForm((current) => ({ ...current, middleName: value }))}
                      />
                      <EditableField
                        label="Last name"
                        value={profileForm.lastName}
                        onChange={(value) => setProfileForm((current) => ({ ...current, lastName: value }))}
                      />
                      <EditableField
                        label="Suffix"
                        value={profileForm.suffix}
                        onChange={(value) => setProfileForm((current) => ({ ...current, suffix: value }))}
                      />
                      <label className="block">
                        <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Gender</span>
                        <select
                          value={profileForm.gender}
                          onChange={(event) =>
                            setProfileForm((current) => ({ ...current, gender: event.target.value }))
                          }
                          className="w-full rounded-2xl border bg-white px-4 py-3 text-sm text-ui-ink outline-none focus:border-brand-gold"
                        >
                          <option value="M">M</option>
                          <option value="F">F</option>
                          <option value="OTHER">OTHER</option>
                          <option value="PREFER_NOT_TO_SAY">PREFER_NOT_TO_SAY</option>
                        </select>
                      </label>
                      <EditableField
                        label="Date of birth"
                        type="date"
                        value={profileForm.dateOfBirth}
                        onChange={(value) => setProfileForm((current) => ({ ...current, dateOfBirth: value }))}
                      />
                      <EditableField
                        label="Email"
                        type="email"
                        value={profileForm.email}
                        onChange={(value) => setProfileForm((current) => ({ ...current, email: value }))}
                      />
                      <EditableField
                        label="Phone"
                        value={profileForm.phone}
                        onChange={(value) => setProfileForm((current) => ({ ...current, phone: value }))}
                      />
                      <EditableField
                        label="Local number"
                        value={profileForm.localNumber}
                        onChange={(value) => setProfileForm((current) => ({ ...current, localNumber: value }))}
                      />
                      <EditableField
                        label="Membership code"
                        value={profileForm.membershipCode}
                        onChange={(value) => setProfileForm((current) => ({ ...current, membershipCode: value }))}
                      />
                      <ReadOnlyField label="GHIN number" value={golfer.ghinNumber ?? "—"} />
                    </>
                  ) : (
                    <>
                      <ReadOnlyField label="First name" value={golfer.firstName} />
                      <ReadOnlyField label="Middle name" value={golfer.middleName ?? "—"} />
                      <ReadOnlyField label="Last name" value={golfer.lastName} />
                      <ReadOnlyField label="Suffix" value={golfer.suffix ?? "—"} />
                      <ReadOnlyField label="Gender" value={golfer.gender ?? "—"} />
                      <ReadOnlyField
                        label="Date of birth"
                        value={golfer.dateOfBirth ? formatDate(golfer.dateOfBirth) : "—"}
                      />
                      <ReadOnlyField label="Email" value={golfer.email ?? "—"} />
                      <ReadOnlyField label="Phone" value={golfer.phone ?? "—"} />
                      <ReadOnlyField label="Local number" value={golfer.localNumber ?? "—"} />
                      <ReadOnlyField label="Membership code" value={golfer.membershipCode ?? "—"} />
                      <ReadOnlyField label="GHIN number" value={golfer.ghinNumber ?? "—"} />
                    </>
                  )}
                </div>
              </article>

              <article className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
                <p className="text-xs uppercase tracking-[0.22em] text-brand-clay">Address</p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {isEditingProfile ? (
                    <>
                      <EditableField
                        label="Address line 1"
                        value={profileForm.addressLine1}
                        onChange={(value) => setProfileForm((current) => ({ ...current, addressLine1: value }))}
                      />
                      <EditableField
                        label="Address line 2"
                        value={profileForm.addressLine2}
                        onChange={(value) => setProfileForm((current) => ({ ...current, addressLine2: value }))}
                      />
                      <EditableField
                        label="City"
                        value={profileForm.city}
                        onChange={(value) => setProfileForm((current) => ({ ...current, city: value }))}
                      />
                      <EditableField
                        label="State"
                        value={profileForm.state}
                        onChange={(value) => setProfileForm((current) => ({ ...current, state: value }))}
                      />
                      <EditableField
                        label="Postal code"
                        value={profileForm.postalCode}
                        onChange={(value) => setProfileForm((current) => ({ ...current, postalCode: value }))}
                      />
                      <EditableField
                        label="Country"
                        value={profileForm.country}
                        onChange={(value) => setProfileForm((current) => ({ ...current, country: value }))}
                      />
                    </>
                  ) : (
                    <>
                      <ReadOnlyField label="Address line 1" value={golfer.address?.addressLine1 ?? "—"} />
                      <ReadOnlyField label="Address line 2" value={golfer.address?.addressLine2 ?? "—"} />
                      <ReadOnlyField label="City" value={golfer.address?.city ?? "—"} />
                      <ReadOnlyField label="State" value={golfer.address?.state ?? "—"} />
                      <ReadOnlyField label="Postal code" value={golfer.address?.postalCode ?? "—"} />
                      <ReadOnlyField label="Country" value={golfer.address?.country ?? "—"} />
                    </>
                  )}
                </div>
              </article>
            </div>

            <aside className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
              <p className="text-xs uppercase tracking-[0.22em] text-brand-clay">Read only</p>
              <div className="mt-5 space-y-4">
                <ReadOnlyField label="Membership status" value={golfer.membershipStatus ?? "—"} />
                <ReadOnlyField
                  label="Digital profile"
                  value={golfer.digitalProfileStatus ?? "—"}
                />
                <ReadOnlyField
                  label="Current handicap"
                  value={formatHandicap(golfer.currentHandicapIndex)}
                />
                <ReadOnlyField label="Created" value={golfer.createdAt ? formatDate(golfer.createdAt) : "—"} />
                <ReadOnlyField label="Updated" value={golfer.updatedAt ? formatDate(golfer.updatedAt) : "—"} />
              </div>
            </aside>
          </section>
        </div>
      ) : null}

      {activeTab === "audit" ? (
        <section className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-brand-clay">Golfer audit log</p>
              <p className="mt-2 text-sm leading-7 text-ui-muted">
                Showing golfer lifecycle and handicap recalculation entries for this roster record.
              </p>
            </div>
            <p className="text-sm text-ui-muted">
              {auditPageInfo?.totalCount ?? 0} total log entries
            </p>
          </div>

          {auditLoading ? (
            <div className="mt-6">
              <LoadingView title="Loading audit log" message="Pulling golfer activity trail..." />
            </div>
          ) : auditError ? (
            <p className="mt-6 rounded-3xl border border-status-withdrawn/20 bg-status-withdrawn/8 px-5 py-4 text-sm text-status-withdrawn">
              {auditError.message}
            </p>
          ) : (
            <>
              <div className="mt-6 space-y-4">
                {auditRows.length ? (
                  auditRows.map((log) => (
                    <article key={log.id} className="rounded-3xl border bg-white/75 p-5">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-brand-clay">
                            {auditActionLabels[log.action] ?? log.action.replaceAll("_", " ")}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-ui-ink">{log.summary}</p>
                          <p className="mt-2 text-sm text-ui-muted">
                            {formatDateTime(log.createdAt)} • {log.actorEmail} • {log.actorRole}
                          </p>
                        </div>
                        <StatusBadge status={auditActionLabels[log.action] ?? log.action} />
                      </div>

                      <div className="mt-4 grid gap-4 xl:grid-cols-2">
                        <div className="rounded-3xl border bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-ui-muted">Before</p>
                          <pre className="mt-3 whitespace-pre-wrap break-words text-xs text-ui-muted">
                            {formatJsonPreview(log.before)}
                          </pre>
                        </div>
                        <div className="rounded-3xl border bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-ui-muted">After</p>
                          <pre className="mt-3 whitespace-pre-wrap break-words text-xs text-ui-muted">
                            {formatJsonPreview(log.after)}
                          </pre>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-3xl border bg-white/75 p-5 text-sm text-ui-muted">
                    No golfer audit entries matched current scope.
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-3 text-sm text-ui-muted md:flex-row md:items-center md:justify-between">
                <p>
                  Showing {auditRows.length} of {auditPageInfo?.totalCount ?? 0} logs
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAuditPage((current) => Math.max(current - 1, 1))}
                    disabled={!auditPageInfo?.hasPreviousPage}
                    className="rounded-full border border-ui-line px-4 py-2 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span>Page {auditPageInfo?.page ?? 1}</span>
                  <button
                    type="button"
                    onClick={() => setAuditPage((current) => current + 1)}
                    disabled={!auditPageInfo?.hasNextPage}
                    className="rounded-full border border-ui-line px-4 py-2 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}

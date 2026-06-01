"use client";

import { gql, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingView } from "@/components/shared/LoadingView";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/auth/useAuth";
import type {
  CourseRecord,
  GolferRecord,
  TeeRecord,
  TournamentRecord,
  TournamentRegistrationRecord,
} from "@/types";
import { computeCourseHandicap } from "@/utils/computeCourseHandicap";
import { formatDate } from "@/utils/formatDate";

const GET_TOURNAMENT_REGISTRATION_CONTEXT = gql`
  query GetTournamentRegistrationContext($tournamentId: ID!, $golferId: ID!) {
    tournament(id: $tournamentId) {
      id
      name
      startDate
      format
      courseId
      registrationStatus
      registrationCloseAt
      maxPlayers
      registeredPlayerCount
      entryFee
      eligibility {
        minHandicapIndex
        maxHandicapIndex
        gender
        membershipCodes
      }
    }
    golfer(id: $golferId) {
      id
      firstName
      lastName
      email
      phone
      gender
      membershipCode
      currentHandicapIndex
    }
    myTournamentRegistrations {
      id
      tournamentId
      status
      paymentStatus
    }
  }
`;

const GET_TOURNAMENT_COURSE = gql`
  query GetTournamentCourse($id: ID!) {
    course(id: $id) {
      id
      courseName
      tees {
        teeId
        teeName
        gender
        par
        courseRating
        slopeRating
      }
    }
  }
`;

const REGISTER_FOR_TOURNAMENT = gql`
  mutation RegisterForTournament($input: RegisterForTournamentInput!) {
    registerForTournament(input: $input) {
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

function getEligibilityMessage(tournament: TournamentRecord | null, golfer: GolferRecord | null): string | null {
  if (!tournament?.eligibility || !golfer) {
    return null;
  }

  const eligibility = tournament.eligibility;
  const handicapIndex = golfer.currentHandicapIndex;

  if (
    eligibility.minHandicapIndex != null &&
    (handicapIndex == null || handicapIndex < eligibility.minHandicapIndex)
  ) {
    return `Minimum Handicap Index ${eligibility.minHandicapIndex} required.`;
  }

  if (
    eligibility.maxHandicapIndex != null &&
    (handicapIndex == null || handicapIndex > eligibility.maxHandicapIndex)
  ) {
    return `Maximum Handicap Index ${eligibility.maxHandicapIndex} allowed.`;
  }

  if (
    eligibility.gender &&
    eligibility.gender !== "ALL" &&
    golfer.gender &&
    eligibility.gender !== golfer.gender
  ) {
    return "Tournament eligibility does not match your gender restriction.";
  }

  if (
    eligibility.membershipCodes?.length &&
    golfer.membershipCode &&
    !eligibility.membershipCodes.includes(golfer.membershipCode)
  ) {
    return "Tournament eligibility does not include your membership type.";
  }

  return null;
}

export default function MemberTournamentRegisterPage() {
  const auth = useAuth();
  const router = useRouter();
  const params = useParams<{ tournamentId: string }>();
  const tournamentId = Array.isArray(params.tournamentId)
    ? params.tournamentId[0]
    : params.tournamentId;
  const golferId = auth.user?.golferId ?? null;
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [preferredTeeId, setPreferredTeeId] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, loading, error } = useQuery(GET_TOURNAMENT_REGISTRATION_CONTEXT, {
    skip: auth.isLoading || !golferId || !tournamentId,
    variables: { tournamentId, golferId },
  });

  const tournament = (data?.tournament ?? null) as TournamentRecord | null;
  const golfer = (data?.golfer ?? null) as GolferRecord | null;

  useEffect(() => {
    if (golfer) {
      setEmail(golfer.email ?? "");
      setPhone(golfer.phone ?? "");
    }
  }, [golfer]);

  const { data: courseData } = useQuery(GET_TOURNAMENT_COURSE, {
    skip: !tournament?.courseId,
    variables: { id: tournament?.courseId },
  });

  const [registerForTournament, registerState] = useMutation(REGISTER_FOR_TOURNAMENT);

  if (auth.isLoading || loading) {
    return <LoadingView title="Loading registration" message="Checking tournament eligibility and tees..." />;
  }

  if (!auth.user || !golferId || !tournamentId) {
    return null;
  }

  if (error) {
    return (
      <div className="rounded-panel border border-status-withdrawn/20 bg-ui-card/90 p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-ui-ink">Registration unavailable</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">{error.message}</p>
      </div>
    );
  }

  const course = (courseData?.course ?? null) as CourseRecord | null;
  const registrations = (data?.myTournamentRegistrations ?? []) as TournamentRegistrationRecord[];
  const existingRegistration = registrations.find(
    (registration) =>
      registration.tournamentId === tournamentId && registration.status !== "CANCELLED"
  );
  const eligibilityMessage = getEligibilityMessage(tournament, golfer);
  const filteredTees = (course?.tees ?? []).filter((tee) => {
    if (!golfer?.gender || (golfer.gender !== "M" && golfer.gender !== "F")) {
      return true;
    }
    return tee.gender === golfer.gender;
  });
  const selectedTee =
    filteredTees.find((tee) => tee.teeId === preferredTeeId) ??
    null;
  const courseHandicap = selectedTee
    ? computeCourseHandicap(
        golfer?.currentHandicapIndex,
        selectedTee.slopeRating,
        selectedTee.courseRating,
        selectedTee.par
      )
    : null;

  async function handleSubmit() {
    if (!golferId || !tournamentId) {
      return;
    }

    setErrorMessage(null);

    try {
      const result = await registerForTournament({
        variables: {
          input: {
            tournamentId,
            golferId,
            preferredTeeId: preferredTeeId || undefined,
            email,
            phone: phone || undefined,
            notes: notes || undefined,
            agreedToTerms,
          },
        },
      });

      const status = result.data?.registerForTournament?.status ?? "REGISTERED";
      router.push(`/member/tournaments?registered=${status}`);
    } catch (mutationError) {
      setErrorMessage(
        mutationError instanceof Error ? mutationError.message : "Registration failed."
      );
    }
  }

  const submitDisabled =
    !tournament ||
    !golfer ||
    !!existingRegistration ||
    !!eligibilityMessage ||
    !agreedToTerms ||
    registerState.loading;

  return (
    <div className="space-y-6">
      <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Tournament registration</p>
            <h2 className="mt-3 text-3xl font-semibold text-ui-ink">{tournament?.name ?? "Tournament"}</h2>
            <div className="mt-4 grid gap-2 text-sm text-ui-muted md:grid-cols-2">
              <p>📅 {tournament?.startDate ? formatDate(tournament.startDate) : "Date coming"}</p>
              <p>🏌 {tournament?.format?.replaceAll("_", " ") ?? "Format coming"}</p>
              <p>💰 Entry fee: {formatCurrency(tournament?.entryFee)}</p>
              <p>
                👥 {tournament?.registeredPlayerCount ?? 0} / {tournament?.maxPlayers ?? "—"} registered
              </p>
            </div>
          </div>
          <StatusBadge status={existingRegistration?.status ?? tournament?.registrationStatus ?? "OPEN"} />
        </div>
      </section>

      {existingRegistration ? (
        <p className="rounded-3xl border border-status-open/20 bg-status-open/8 px-5 py-4 text-sm text-status-open">
          You are already registered for this tournament.
        </p>
      ) : null}

      {eligibilityMessage ? (
        <p className="rounded-3xl border border-status-withdrawn/20 bg-status-withdrawn/8 px-5 py-4 text-sm text-status-withdrawn">
          {eligibilityMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-3xl border border-status-withdrawn/20 bg-status-withdrawn/8 px-5 py-4 text-sm text-status-withdrawn">
          {errorMessage}
        </p>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <article className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
          <p className="text-xs uppercase tracking-[0.22em] text-brand-clay">Registration form</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Preferred tee</span>
              <select
                value={preferredTeeId}
                onChange={(event) => setPreferredTeeId(event.target.value)}
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
              >
                <option value="">No preference</option>
                {filteredTees.map((tee: TeeRecord) => (
                  <option key={tee.teeId} value={tee.teeId}>
                    {tee.teeName} • {tee.courseRating}/{tee.slopeRating}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Phone</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Notes</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="w-full rounded-3xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
              />
            </label>
          </div>

          <label className="mt-5 flex items-start gap-3 rounded-3xl border bg-white px-4 py-4 text-sm text-ui-ink">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(event) => setAgreedToTerms(event.target.checked)}
              className="mt-1 h-4 w-4 accent-[#204733]"
            />
            <span>I agree to tournament terms and conditions.</span>
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitDisabled}
              className="rounded-full bg-brand-green px-5 py-3 text-sm font-semibold text-white hover:bg-brand-green-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              {registerState.loading ? "Submitting..." : "Register"}
            </button>
            <Link
              href="/member/tournaments"
              className="rounded-full border border-ui-line bg-white px-5 py-3 text-sm font-semibold text-ui-ink hover:border-brand-gold"
            >
              Back
            </Link>
          </div>
        </article>

        <aside className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
          <p className="text-xs uppercase tracking-[0.22em] text-brand-clay">Summary</p>
          <div className="mt-5 space-y-4 text-sm text-ui-muted">
            <p>
              Your HI:{" "}
              <span className="font-semibold text-ui-ink">
                {golfer?.currentHandicapIndex != null ? golfer.currentHandicapIndex.toFixed(1) : "N/A"}
              </span>
            </p>
            <p>
              Course handicap:{" "}
              <span className="font-semibold text-ui-ink">
                {courseHandicap != null ? courseHandicap : "Select tee"}
              </span>
            </p>
            <p>
              Entry fee: <span className="font-semibold text-ui-ink">{formatCurrency(tournament?.entryFee)}</span>
            </p>
            <p>
              Registration closes:{" "}
              <span className="font-semibold text-ui-ink">
                {tournament?.registrationCloseAt
                  ? formatDate(tournament.registrationCloseAt)
                  : "With tournament window"}
              </span>
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

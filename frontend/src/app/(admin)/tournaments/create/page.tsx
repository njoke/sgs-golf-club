"use client";

import { gql, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadingView } from "@/components/shared/LoadingView";
import { useAuth } from "@/lib/auth/useAuth";
import type { CourseRecord } from "@/types";

const GET_TOURNAMENT_CREATE_CONTEXT = gql`
  query GetTournamentCreateContext($clubId: ID!) {
    clubCourses(clubId: $clubId) {
      id
      courseName
      facilityName
    }
  }
`;

const CREATE_TOURNAMENT = gql`
  mutation CreateTournament($input: CreateTournamentInput!) {
    createTournament(input: $input) {
      id
      name
      registrationStatus
    }
  }
`;

const TOURNAMENT_FORMATS = [
  "STROKE_PLAY",
  "STABLEFORD",
  "SCRAMBLE",
  "MATCH_PLAY",
  "OTHER",
] as const;

interface FormState {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  courseId: string;
  format: (typeof TOURNAMENT_FORMATS)[number];
  registrationOpenAt: string;
  registrationCloseAt: string;
  maxPlayers: string;
  entryFee: string;
  membersOnly: boolean;
  allowGuests: boolean;
  minHandicapIndex: string;
  maxHandicapIndex: string;
  gender: string;
  membershipCodes: string;
}

const initialFormState: FormState = {
  name: "",
  description: "",
  startDate: "",
  endDate: "",
  courseId: "",
  format: "STROKE_PLAY",
  registrationOpenAt: "",
  registrationCloseAt: "",
  maxPlayers: "",
  entryFee: "",
  membersOnly: true,
  allowGuests: false,
  minHandicapIndex: "",
  maxHandicapIndex: "",
  gender: "",
  membershipCodes: "",
};

function toIsoDate(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

export default function CreateTournamentPage() {
  const auth = useAuth();
  const router = useRouter();
  const clubId = auth.primaryClubId;
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, loading, error } = useQuery(GET_TOURNAMENT_CREATE_CONTEXT, {
    skip: auth.isLoading || !clubId,
    variables: { clubId },
  });

  const [createTournament, createState] = useMutation(CREATE_TOURNAMENT);

  if (auth.isLoading || loading) {
    return <LoadingView title="Loading tournament form" message="Pulling home-course options..." />;
  }

  if (!auth.user || !clubId) {
    return null;
  }

  if (error) {
    return (
      <div className="rounded-panel border border-status-withdrawn/20 bg-ui-card/90 p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-ui-ink">Tournament form unavailable</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">{error.message}</p>
      </div>
    );
  }

  const courses = (data?.clubCourses ?? []) as CourseRecord[];

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function validate(publishOpen: boolean): string | null {
    if (!formState.name.trim()) {
      return "Tournament name required.";
    }
    if (!formState.startDate) {
      return "Start date required.";
    }
    if (publishOpen) {
      if (!formState.registrationOpenAt || !formState.registrationCloseAt) {
        return "Open and close dates required when publishing open.";
      }
      if (
        new Date(formState.registrationOpenAt).getTime() >
        new Date(formState.registrationCloseAt).getTime()
      ) {
        return "Registration open date must be before close date.";
      }
    }
    return null;
  }

  async function handleSubmit(publishOpen: boolean) {
    const validationError = validate(publishOpen);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);

    try {
      const result = await createTournament({
        variables: {
          input: {
            clubId,
            name: formState.name,
            description: formState.description || undefined,
            startDate: toIsoDate(formState.startDate),
            endDate: toIsoDate(formState.endDate),
            courseId: formState.courseId || undefined,
            format: formState.format,
            registrationStatus: publishOpen ? "OPEN" : "DRAFT",
            registrationOpenAt: toIsoDate(formState.registrationOpenAt),
            registrationCloseAt: toIsoDate(formState.registrationCloseAt),
            maxPlayers: formState.maxPlayers ? Number(formState.maxPlayers) : undefined,
            entryFee: formState.entryFee ? Number(formState.entryFee) : undefined,
            membersOnly: formState.membersOnly,
            allowGuests: formState.allowGuests,
            eligibility:
              formState.minHandicapIndex ||
              formState.maxHandicapIndex ||
              formState.gender ||
              formState.membershipCodes
                ? {
                    minHandicapIndex: formState.minHandicapIndex
                      ? Number(formState.minHandicapIndex)
                      : undefined,
                    maxHandicapIndex: formState.maxHandicapIndex
                      ? Number(formState.maxHandicapIndex)
                      : undefined,
                    gender: formState.gender || undefined,
                    membershipCodes: formState.membershipCodes
                      ? formState.membershipCodes
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean)
                      : undefined,
                  }
                : undefined,
          },
        },
      });

      const tournamentId = result.data?.createTournament?.id;
      router.push(tournamentId ? `/tournaments/${tournamentId}/registrations` : "/tournaments");
    } catch (mutationError) {
      setErrorMessage(
        mutationError instanceof Error ? mutationError.message : "Tournament create failed."
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel">
        <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Create tournament</p>
        <h2 className="mt-3 text-3xl font-semibold text-ui-ink">Set event, window, eligibility</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-ui-muted">
          Save draft first or publish directly into open registration if dates are ready.
        </p>
      </section>

      {errorMessage ? (
        <p className="rounded-3xl border border-status-withdrawn/20 bg-status-withdrawn/8 px-5 py-4 text-sm text-status-withdrawn">
          {errorMessage}
        </p>
      ) : null}

      <section className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Name</span>
            <input
              value={formState.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Description</span>
            <textarea
              rows={4}
              value={formState.description}
              onChange={(event) => updateField("description", event.target.value)}
              className="w-full rounded-3xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Start date</span>
            <input
              type="date"
              value={formState.startDate}
              onChange={(event) => updateField("startDate", event.target.value)}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">End date</span>
            <input
              type="date"
              value={formState.endDate}
              onChange={(event) => updateField("endDate", event.target.value)}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Course</span>
            <select
              value={formState.courseId}
              onChange={(event) => updateField("courseId", event.target.value)}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            >
              <option value="">Optional</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.courseName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Format</span>
            <select
              value={formState.format}
              onChange={(event) =>
                updateField("format", event.target.value as FormState["format"])
              }
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            >
              {TOURNAMENT_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Registration open</span>
            <input
              type="date"
              value={formState.registrationOpenAt}
              onChange={(event) => updateField("registrationOpenAt", event.target.value)}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Registration close</span>
            <input
              type="date"
              value={formState.registrationCloseAt}
              onChange={(event) => updateField("registrationCloseAt", event.target.value)}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Max players</span>
            <input
              type="number"
              min={1}
              value={formState.maxPlayers}
              onChange={(event) => updateField("maxPlayers", event.target.value)}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Entry fee</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={formState.entryFee}
              onChange={(event) => updateField("entryFee", event.target.value)}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-sm text-ui-ink">
            <input
              type="checkbox"
              checked={formState.membersOnly}
              onChange={(event) => updateField("membersOnly", event.target.checked)}
              className="h-4 w-4 accent-[#204733]"
            />
            Members only
          </label>

          <label className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-sm text-ui-ink">
            <input
              type="checkbox"
              checked={formState.allowGuests}
              onChange={(event) => updateField("allowGuests", event.target.checked)}
              className="h-4 w-4 accent-[#204733]"
            />
            Allow guests
          </label>
        </div>
      </section>

      <section className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
        <p className="text-xs uppercase tracking-[0.22em] text-brand-clay">Eligibility</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Min HI</span>
            <input
              type="number"
              step="0.1"
              value={formState.minHandicapIndex}
              onChange={(event) => updateField("minHandicapIndex", event.target.value)}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Max HI</span>
            <input
              type="number"
              step="0.1"
              value={formState.maxHandicapIndex}
              onChange={(event) => updateField("maxHandicapIndex", event.target.value)}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Gender restriction</span>
            <select
              value={formState.gender}
              onChange={(event) => updateField("gender", event.target.value)}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            >
              <option value="">None</option>
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="ALL">ALL</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Membership codes</span>
            <input
              value={formState.membershipCodes}
              onChange={(event) => updateField("membershipCodes", event.target.value)}
              placeholder="R, JR, ASSOC"
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
            />
          </label>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleSubmit(false)}
          disabled={createState.loading}
          className="rounded-full border border-ui-line bg-white px-5 py-3 text-sm font-semibold text-ui-ink hover:border-brand-gold disabled:opacity-60"
        >
          Save as draft
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit(true)}
          disabled={createState.loading}
          className="rounded-full bg-brand-green px-5 py-3 text-sm font-semibold text-white hover:bg-brand-green-light disabled:opacity-60"
        >
          Publish and open
        </button>
        <Link
          href="/tournaments"
          className="rounded-full border border-ui-line bg-white px-5 py-3 text-sm font-semibold text-ui-ink hover:border-brand-gold"
        >
          Back
        </Link>
      </section>
    </div>
  );
}

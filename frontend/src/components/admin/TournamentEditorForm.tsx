"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CourseRecord, TournamentRecord } from "@/types";

const TOURNAMENT_FORMATS = [
  "STROKE_PLAY",
  "STABLEFORD",
  "SCRAMBLE",
  "MATCH_PLAY",
  "OTHER",
] as const;

type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];
type SubmitMode = "draft" | "open" | "save";

interface TournamentEditorFormState {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  courseId: string;
  format: TournamentFormat;
  registrationOpenAt: string;
  registrationCloseAt: string;
  maxPlayers: string;
  entryFee: string;
  membersOnly: boolean;
  allowGuests: boolean;
  minHandicapIndex: string;
  maxHandicapIndex: string;
  gender: string;
  membershipCodes: string[];
}

export interface TournamentEditorPayload {
  clubId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  courseId?: string;
  format: TournamentFormat;
  registrationStatus: "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";
  registrationOpenAt?: string;
  registrationCloseAt?: string;
  maxPlayers?: number;
  entryFee?: number;
  membersOnly: boolean;
  allowGuests: boolean;
  eligibility?: {
    minHandicapIndex?: number;
    maxHandicapIndex?: number;
    gender?: string;
    membershipCodes?: string[];
  };
}

interface TournamentEditorFormProps {
  mode: "create" | "edit";
  clubId: string;
  courses: CourseRecord[];
  membershipTypeOptions: string[];
  tournament?: TournamentRecord | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  backHref: string;
  onSubmit: (payload: TournamentEditorPayload, submitMode: SubmitMode) => Promise<void>;
}

const initialFormState: TournamentEditorFormState = {
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
  membershipCodes: [],
};

function toDateInputValue(value?: string | null): string {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function toIsoDate(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function mapFormState(tournament?: TournamentRecord | null): TournamentEditorFormState {
  if (!tournament) {
    return initialFormState;
  }

  return {
    name: tournament.name ?? "",
    description: tournament.description ?? "",
    startDate: toDateInputValue(tournament.startDate),
    endDate: toDateInputValue(tournament.endDate),
    courseId: tournament.courseId ?? "",
    format:
      tournament.format && TOURNAMENT_FORMATS.includes(tournament.format as TournamentFormat)
        ? (tournament.format as TournamentFormat)
        : "STROKE_PLAY",
    registrationOpenAt: toDateInputValue(tournament.registrationOpenAt),
    registrationCloseAt: toDateInputValue(tournament.registrationCloseAt),
    maxPlayers: tournament.maxPlayers != null ? String(tournament.maxPlayers) : "",
    entryFee: tournament.entryFee != null ? String(tournament.entryFee) : "",
    membersOnly: tournament.membersOnly ?? true,
    allowGuests: tournament.allowGuests ?? false,
    minHandicapIndex:
      tournament.eligibility?.minHandicapIndex != null
        ? String(tournament.eligibility.minHandicapIndex)
        : "",
    maxHandicapIndex:
      tournament.eligibility?.maxHandicapIndex != null
        ? String(tournament.eligibility.maxHandicapIndex)
        : "",
    gender: tournament.eligibility?.gender ?? "",
    membershipCodes: tournament.eligibility?.membershipCodes?.filter(Boolean) ?? [],
  };
}

export function TournamentEditorForm({
  mode,
  clubId,
  courses,
  membershipTypeOptions,
  tournament,
  isSubmitting,
  errorMessage,
  backHref,
  onSubmit,
}: TournamentEditorFormProps) {
  const [formState, setFormState] = useState<TournamentEditorFormState>(() => mapFormState(tournament));
  const [customMembershipCode, setCustomMembershipCode] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormState(mapFormState(tournament));
  }, [tournament]);

  function updateField<K extends keyof TournamentEditorFormState>(
    key: K,
    value: TournamentEditorFormState[K]
  ) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function toggleMembershipCode(value: string) {
    const normalizedValue = normalizeCode(value);
    if (!normalizedValue) {
      return;
    }

    setFormState((current) => ({
      ...current,
      membershipCodes: current.membershipCodes.includes(normalizedValue)
        ? current.membershipCodes.filter((code) => code !== normalizedValue)
        : [...current.membershipCodes, normalizedValue],
    }));
  }

  function addCustomMembershipCode() {
    const normalizedValue = normalizeCode(customMembershipCode);
    if (!normalizedValue) {
      return;
    }

    setFormState((current) => ({
      ...current,
      membershipCodes: current.membershipCodes.includes(normalizedValue)
        ? current.membershipCodes
        : [...current.membershipCodes, normalizedValue],
    }));
    setCustomMembershipCode("");
  }

  function getNextRegistrationStatus(submitMode: SubmitMode): TournamentEditorPayload["registrationStatus"] {
    if (submitMode === "open") {
      return "OPEN";
    }

    if (mode === "create") {
      return "DRAFT";
    }

    const currentStatus = tournament?.registrationStatus;
    if (currentStatus === "OPEN" || currentStatus === "CLOSED" || currentStatus === "CANCELLED") {
      return currentStatus;
    }

    return "DRAFT";
  }

  function validate(submitMode: SubmitMode): string | null {
    if (!formState.name.trim()) {
      return "Tournament name required.";
    }
    if (!formState.startDate) {
      return "Start date required.";
    }
    if (
      formState.endDate &&
      new Date(`${formState.endDate}T12:00:00.000Z`).getTime() <
        new Date(`${formState.startDate}T12:00:00.000Z`).getTime()
    ) {
      return "End date must be on or after start date.";
    }

    const nextRegistrationStatus = getNextRegistrationStatus(submitMode);
    if (nextRegistrationStatus === "OPEN") {
      if (!formState.registrationOpenAt || !formState.registrationCloseAt) {
        return "Open and close dates required when publishing open.";
      }
      if (
        new Date(`${formState.registrationOpenAt}T12:00:00.000Z`).getTime() >
        new Date(`${formState.registrationCloseAt}T12:00:00.000Z`).getTime()
      ) {
        return "Registration open date must be before close date.";
      }
    }

    return null;
  }

  async function handleSubmit(submitMode: SubmitMode) {
    const message = validate(submitMode);
    if (message) {
      setValidationMessage(message);
      return;
    }

    setValidationMessage(null);

    const membershipCodes = Array.from(
      new Set(formState.membershipCodes.map(normalizeCode).filter(Boolean))
    );
    const payload: TournamentEditorPayload = {
      clubId,
      name: formState.name.trim(),
      description: formState.description.trim() || undefined,
      startDate: toIsoDate(formState.startDate) ?? new Date().toISOString(),
      endDate: toIsoDate(formState.endDate),
      courseId: formState.courseId || undefined,
      format: formState.format,
      registrationStatus: getNextRegistrationStatus(submitMode),
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
        membershipCodes.length
          ? {
              minHandicapIndex: formState.minHandicapIndex
                ? Number(formState.minHandicapIndex)
                : undefined,
              maxHandicapIndex: formState.maxHandicapIndex
                ? Number(formState.maxHandicapIndex)
                : undefined,
              gender: formState.gender || undefined,
              membershipCodes: membershipCodes.length ? membershipCodes : undefined,
            }
          : undefined,
    };

    await onSubmit(payload, submitMode);
  }

  const canOpenRegistration =
    mode === "create" ||
    (tournament?.status !== "CANCELLED" && tournament?.registrationStatus !== "OPEN");

  return (
    <div className="space-y-6">
      <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel">
        <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">
          {mode === "create" ? "Create tournament" : "Edit tournament"}
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-ui-ink">
          {mode === "create" ? "Set event, window, eligibility" : "Tune event, window, eligibility"}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-ui-muted">
          {mode === "create"
            ? "Save draft first or publish directly into open registration if dates are ready."
            : "Update event details here, then return to registration operations when you are ready."}
        </p>
      </section>

      {validationMessage ? (
        <p className="rounded-3xl border border-status-withdrawn/20 bg-status-withdrawn/8 px-5 py-4 text-sm text-status-withdrawn">
          {validationMessage}
        </p>
      ) : null}

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
              onChange={(event) => updateField("format", event.target.value as TournamentFormat)}
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

          <div className="rounded-3xl border bg-white/70 p-4 md:col-span-2">
            <span className="mb-3 block text-xs uppercase tracking-[0.2em] text-ui-muted">Membership codes</span>
            {membershipTypeOptions.length ? (
              <div className="flex flex-wrap gap-2">
                {membershipTypeOptions.map((membershipType) => {
                  const active = formState.membershipCodes.includes(membershipType);
                  return (
                    <button
                      key={membershipType}
                      type="button"
                      onClick={() => toggleMembershipCode(membershipType)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-brand-green text-white"
                          : "border border-ui-line bg-white text-ui-ink hover:border-brand-gold"
                      }`}
                    >
                      {membershipType}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-ui-muted">No club membership types configured yet. Add custom codes below.</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {formState.membershipCodes.length ? (
                formState.membershipCodes.map((membershipCode) => (
                  <button
                    key={membershipCode}
                    type="button"
                    onClick={() => toggleMembershipCode(membershipCode)}
                    className="rounded-full border border-brand-gold/40 bg-brand-sand/50 px-4 py-2 text-sm font-semibold text-ui-ink hover:border-status-withdrawn"
                  >
                    {membershipCode} ×
                  </button>
                ))
              ) : (
                <p className="text-sm text-ui-muted">No membership eligibility filter set.</p>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={customMembershipCode}
                onChange={(event) => setCustomMembershipCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomMembershipCode();
                  }
                }}
                placeholder="Add custom code"
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
              />
              <button
                type="button"
                onClick={addCustomMembershipCode}
                className="rounded-full border border-ui-line bg-white px-5 py-3 text-sm font-semibold text-ui-ink hover:border-brand-gold"
              >
                Add code
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        {mode === "create" ? (
          <button
            type="button"
            onClick={() => void handleSubmit("draft")}
            disabled={isSubmitting}
            className="rounded-full border border-ui-line bg-white px-5 py-3 text-sm font-semibold text-ui-ink hover:border-brand-gold disabled:opacity-60"
          >
            Save as draft
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleSubmit("save")}
            disabled={isSubmitting}
            className="rounded-full border border-ui-line bg-white px-5 py-3 text-sm font-semibold text-ui-ink hover:border-brand-gold disabled:opacity-60"
          >
            Save changes
          </button>
        )}

        {canOpenRegistration ? (
          <button
            type="button"
            onClick={() => void handleSubmit("open")}
            disabled={isSubmitting}
            className="rounded-full bg-brand-green px-5 py-3 text-sm font-semibold text-white hover:bg-brand-green-light disabled:opacity-60"
          >
            {mode === "create" ? "Publish and open" : "Save and open registration"}
          </button>
        ) : null}

        <Link
          href={backHref}
          className="rounded-full border border-ui-line bg-white px-5 py-3 text-sm font-semibold text-ui-ink hover:border-brand-gold"
        >
          Back
        </Link>
      </section>
    </div>
  );
}

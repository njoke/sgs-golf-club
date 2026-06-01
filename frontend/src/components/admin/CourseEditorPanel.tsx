"use client";

import { useEffect, useState } from "react";
import type { CourseRecord } from "@/types";

type TeeGender = "M" | "F";

export interface CourseMutationInput {
  clubId: string;
  facilityName: string;
  courseName: string;
  city: string;
  state: string;
  isPrimaryFacility: boolean;
  defaultMaleTeeId?: string;
  defaultFemaleTeeId?: string;
  tees: Array<{
    teeId: string;
    teeName: string;
    gender: TeeGender;
    par: number;
    courseRating: number;
    bogeyRating?: number;
    slopeRating: number;
    yardage?: number;
    frontNine?: {
      rating: number;
      slope: number;
      par?: number;
    };
    backNine?: {
      rating: number;
      slope: number;
      par?: number;
    };
  }>;
}

interface CourseEditorPanelProps {
  clubId: string;
  mode: "add" | "edit";
  course?: CourseRecord | null;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (input: CourseMutationInput) => Promise<void>;
}

interface TeeFormState {
  key: string;
  teeId: string;
  teeName: string;
  gender: TeeGender;
  par: string;
  courseRating: string;
  bogeyRating: string;
  slopeRating: string;
  yardage: string;
  frontNineRating: string;
  frontNineSlope: string;
  frontNinePar: string;
  backNineRating: string;
  backNineSlope: string;
  backNinePar: string;
}

interface CourseFormState {
  facilityName: string;
  courseName: string;
  city: string;
  state: string;
  isPrimaryFacility: boolean;
  defaultMaleTeeId: string;
  defaultFemaleTeeId: string;
  tees: TeeFormState[];
}

const inputClassName =
  "w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold";
const labelClassName = "mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted";

let teeFormCounter = 0;

function nextTeeKey() {
  teeFormCounter += 1;
  return `tee-form-${teeFormCounter}`;
}

function createEmptyTee(gender: TeeGender = "M"): TeeFormState {
  return {
    key: nextTeeKey(),
    teeId: "",
    teeName: "",
    gender,
    par: "",
    courseRating: "",
    bogeyRating: "",
    slopeRating: "",
    yardage: "",
    frontNineRating: "",
    frontNineSlope: "",
    frontNinePar: "",
    backNineRating: "",
    backNineSlope: "",
    backNinePar: "",
  };
}

function normalizeDefaultTeeIds(
  tees: TeeFormState[],
  defaultMaleTeeId: string,
  defaultFemaleTeeId: string
) {
  const maleIds = tees
    .filter((tee) => tee.gender === "M")
    .map((tee) => tee.teeId.trim())
    .filter(Boolean);
  const femaleIds = tees
    .filter((tee) => tee.gender === "F")
    .map((tee) => tee.teeId.trim())
    .filter(Boolean);

  return {
    defaultMaleTeeId: maleIds.includes(defaultMaleTeeId) ? defaultMaleTeeId : "",
    defaultFemaleTeeId: femaleIds.includes(defaultFemaleTeeId) ? defaultFemaleTeeId : "",
  };
}

function mapCourseToFormState(course?: CourseRecord | null): CourseFormState {
  if (!course) {
    return {
      facilityName: "",
      courseName: "",
      city: "",
      state: "",
      isPrimaryFacility: false,
      defaultMaleTeeId: "",
      defaultFemaleTeeId: "",
      tees: [createEmptyTee("M"), createEmptyTee("F")],
    };
  }

  return {
    facilityName: course.facilityName,
    courseName: course.courseName,
    city: course.city,
    state: course.state,
    isPrimaryFacility: course.isPrimaryFacility,
    defaultMaleTeeId: course.defaultMaleTeeId ?? "",
    defaultFemaleTeeId: course.defaultFemaleTeeId ?? "",
    tees: course.tees.map((tee) => ({
      key: nextTeeKey(),
      teeId: tee.teeId,
      teeName: tee.teeName,
      gender: tee.gender === "F" ? "F" : "M",
      par: String(tee.par),
      courseRating: String(tee.courseRating),
      bogeyRating: tee.bogeyRating != null ? String(tee.bogeyRating) : "",
      slopeRating: String(tee.slopeRating),
      yardage: tee.yardage != null ? String(tee.yardage) : "",
      frontNineRating: tee.frontNine?.rating != null ? String(tee.frontNine.rating) : "",
      frontNineSlope: tee.frontNine?.slope != null ? String(tee.frontNine.slope) : "",
      frontNinePar: tee.frontNine?.par != null ? String(tee.frontNine.par) : "",
      backNineRating: tee.backNine?.rating != null ? String(tee.backNine.rating) : "",
      backNineSlope: tee.backNine?.slope != null ? String(tee.backNine.slope) : "",
      backNinePar: tee.backNine?.par != null ? String(tee.backNine.par) : "",
    })),
  };
}

function parseRequiredNumber(
  label: string,
  value: string,
  options: { integer?: boolean } = {}
) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }

  const parsed = options.integer ? Number.parseInt(trimmed, 10) : Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || (options.integer && !Number.isInteger(parsed))) {
    throw new Error(`${label} must be ${options.integer ? "whole number" : "number"}.`);
  }

  return parsed;
}

function parseOptionalNumber(
  label: string,
  value: string,
  options: { integer?: boolean } = {}
) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = options.integer ? Number.parseInt(trimmed, 10) : Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || (options.integer && !Number.isInteger(parsed))) {
    throw new Error(`${label} must be ${options.integer ? "whole number" : "number"}.`);
  }

  return parsed;
}

function buildNineHoleInput(
  label: string,
  ratingValue: string,
  slopeValue: string,
  parValue: string
) {
  const hasAnyValue = [ratingValue, slopeValue, parValue].some((value) => value.trim());
  if (!hasAnyValue) {
    return undefined;
  }

  return {
    rating: parseRequiredNumber(`${label} rating`, ratingValue),
    slope: parseRequiredNumber(`${label} slope`, slopeValue, { integer: true }),
    par: parseOptionalNumber(`${label} par`, parValue, { integer: true }),
  };
}

function buildCourseInput(clubId: string, formState: CourseFormState): CourseMutationInput {
  const facilityName = formState.facilityName.trim();
  const courseName = formState.courseName.trim();
  const city = formState.city.trim();
  const state = formState.state.trim();

  if (!facilityName) {
    throw new Error("Facility name is required.");
  }
  if (!courseName) {
    throw new Error("Course name is required.");
  }
  if (!city) {
    throw new Error("City is required.");
  }
  if (!state) {
    throw new Error("State is required.");
  }
  if (!formState.tees.length) {
    throw new Error("Add at least one tee.");
  }

  const tees = formState.tees.map((tee, index) => {
    const teeNumber = index + 1;
    const teeId = tee.teeId.trim();
    const teeName = tee.teeName.trim();

    if (!teeId) {
      throw new Error(`Tee ${teeNumber}: tee ID is required.`);
    }
    if (!teeName) {
      throw new Error(`Tee ${teeNumber}: tee name is required.`);
    }

    return {
      teeId,
      teeName,
      gender: tee.gender,
      par: parseRequiredNumber(`Tee ${teeNumber}: par`, tee.par, { integer: true }),
      courseRating: parseRequiredNumber(`Tee ${teeNumber}: course rating`, tee.courseRating),
      bogeyRating: parseOptionalNumber(`Tee ${teeNumber}: bogey rating`, tee.bogeyRating),
      slopeRating: parseRequiredNumber(`Tee ${teeNumber}: slope rating`, tee.slopeRating, {
        integer: true,
      }),
      yardage: parseOptionalNumber(`Tee ${teeNumber}: yardage`, tee.yardage, { integer: true }),
      frontNine: buildNineHoleInput(
        `Tee ${teeNumber}: front 9`,
        tee.frontNineRating,
        tee.frontNineSlope,
        tee.frontNinePar
      ),
      backNine: buildNineHoleInput(
        `Tee ${teeNumber}: back 9`,
        tee.backNineRating,
        tee.backNineSlope,
        tee.backNinePar
      ),
    };
  });

  const teeIds = tees.map((tee) => tee.teeId);
  if (new Set(teeIds).size !== teeIds.length) {
    throw new Error("Tee IDs must be unique within course.");
  }

  const maleTeeIds = tees.filter((tee) => tee.gender === "M").map((tee) => tee.teeId);
  const femaleTeeIds = tees.filter((tee) => tee.gender === "F").map((tee) => tee.teeId);

  if (formState.defaultMaleTeeId && !maleTeeIds.includes(formState.defaultMaleTeeId)) {
    throw new Error("Default male tee must match male tee in form.");
  }
  if (formState.defaultFemaleTeeId && !femaleTeeIds.includes(formState.defaultFemaleTeeId)) {
    throw new Error("Default female tee must match female tee in form.");
  }

  return {
    clubId,
    facilityName,
    courseName,
    city,
    state,
    isPrimaryFacility: formState.isPrimaryFacility,
    defaultMaleTeeId: formState.defaultMaleTeeId || undefined,
    defaultFemaleTeeId: formState.defaultFemaleTeeId || undefined,
    tees,
  };
}

export function CourseEditorPanel({
  clubId,
  mode,
  course,
  isSaving,
  onCancel,
  onSave,
}: CourseEditorPanelProps) {
  const [formState, setFormState] = useState<CourseFormState>(() => mapCourseToFormState(course));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormState(mapCourseToFormState(course));
    setErrorMessage(null);
  }, [course, mode]);

  function updateField<K extends keyof CourseFormState>(key: K, value: CourseFormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function updateTee(key: string, field: keyof TeeFormState, value: string) {
    setFormState((current) => {
      const tees = current.tees.map((tee) =>
        tee.key === key ? { ...tee, [field]: value } : tee
      );
      const normalizedDefaults = normalizeDefaultTeeIds(
        tees,
        current.defaultMaleTeeId,
        current.defaultFemaleTeeId
      );

      return {
        ...current,
        tees,
        ...normalizedDefaults,
      };
    });
  }

  function addTee(gender: TeeGender) {
    setFormState((current) => ({
      ...current,
      tees: [...current.tees, createEmptyTee(gender)],
    }));
  }

  function removeTee(key: string) {
    setFormState((current) => {
      const tees = current.tees.filter((tee) => tee.key !== key);
      const normalizedDefaults = normalizeDefaultTeeIds(
        tees,
        current.defaultMaleTeeId,
        current.defaultFemaleTeeId
      );

      return {
        ...current,
        tees,
        ...normalizedDefaults,
      };
    });
  }

  async function handleSubmit() {
    setErrorMessage(null);

    try {
      const input = buildCourseInput(clubId, formState);
      await onSave(input);
    } catch (saveError) {
      setErrorMessage(saveError instanceof Error ? saveError.message : "Course save failed.");
    }
  }

  const maleTees = formState.tees
    .filter((tee) => tee.gender === "M" && tee.teeId.trim())
    .map((tee) => ({ teeId: tee.teeId.trim(), teeName: tee.teeName.trim() || tee.teeId.trim() }));
  const femaleTees = formState.tees
    .filter((tee) => tee.gender === "F" && tee.teeId.trim())
    .map((tee) => ({ teeId: tee.teeId.trim(), teeName: tee.teeName.trim() || tee.teeId.trim() }));

  return (
    <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">
            {mode === "add" ? "Add home course" : "Edit home course"}
          </p>
          <h3 className="mt-3 text-3xl font-semibold text-ui-ink">
            {mode === "add" ? "Create course and tee setup" : `Editing ${course?.courseName ?? "course"}`}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-ui-muted">
            Add front and back 9 values when members will post 9-hole rounds from this tee.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-full border border-ui-line bg-white px-5 py-3 text-sm font-semibold text-ui-ink hover:border-brand-gold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving}
            className="rounded-full bg-brand-green px-5 py-3 text-sm font-semibold text-white hover:bg-brand-green-light disabled:opacity-50"
          >
            {isSaving ? "Saving..." : mode === "add" ? "Save course" : "Save changes"}
          </button>
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-6 rounded-3xl border border-status-withdrawn/20 bg-status-withdrawn/8 px-5 py-4 text-sm text-status-withdrawn">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-8 space-y-8">
        <fieldset disabled={isSaving} className="space-y-8">
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="block">
              <span className={labelClassName}>Facility name</span>
              <input
                value={formState.facilityName}
                onChange={(event) => updateField("facilityName", event.target.value)}
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Course name</span>
              <input
                value={formState.courseName}
                onChange={(event) => updateField("courseName", event.target.value)}
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>City</span>
              <input
                value={formState.city}
                onChange={(event) => updateField("city", event.target.value)}
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>State</span>
              <input
                value={formState.state}
                onChange={(event) => updateField("state", event.target.value.toUpperCase())}
                maxLength={2}
                className={inputClassName}
              />
            </label>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="block">
              <span className={labelClassName}>Default male tee</span>
              <select
                value={formState.defaultMaleTeeId}
                onChange={(event) => updateField("defaultMaleTeeId", event.target.value)}
                className={inputClassName}
              >
                <option value="">None</option>
                {maleTees.map((tee) => (
                  <option key={tee.teeId} value={tee.teeId}>
                    {tee.teeName} ({tee.teeId})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={labelClassName}>Default female tee</span>
              <select
                value={formState.defaultFemaleTeeId}
                onChange={(event) => updateField("defaultFemaleTeeId", event.target.value)}
                className={inputClassName}
              >
                <option value="">None</option>
                {femaleTees.map((tee) => (
                  <option key={tee.teeId} value={tee.teeId}>
                    {tee.teeName} ({tee.teeId})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-sm text-ui-ink lg:self-end">
              <input
                type="checkbox"
                checked={formState.isPrimaryFacility}
                onChange={(event) => updateField("isPrimaryFacility", event.target.checked)}
                className="h-4 w-4 accent-[#204733]"
              />
              Set as primary facility
            </label>
          </div>

          <div className="rounded-3xl border bg-white/70 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-brand-clay">Tee setup</p>
                <p className="mt-2 text-sm text-ui-muted">
                  Keep tee IDs unique. Example: `white-m`, `red-f`.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => addTee("M")}
                  className="rounded-full border border-ui-line bg-white px-4 py-2 text-xs font-semibold text-ui-ink hover:border-brand-gold"
                >
                  Add male tee
                </button>
                <button
                  type="button"
                  onClick={() => addTee("F")}
                  className="rounded-full border border-ui-line bg-white px-4 py-2 text-xs font-semibold text-ui-ink hover:border-brand-gold"
                >
                  Add female tee
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {formState.tees.map((tee, index) => (
                <article key={tee.key} className="rounded-3xl border bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-brand-clay">
                        Tee {index + 1}
                      </p>
                      <p className="mt-2 text-sm text-ui-muted">
                        Base values required. Front/back 9 values optional but recommended.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTee(tee.key)}
                      disabled={formState.tees.length === 1}
                      className="rounded-full border border-status-withdrawn/30 bg-white px-4 py-2 text-xs font-semibold text-status-withdrawn hover:border-status-withdrawn disabled:opacity-40"
                    >
                      Remove tee
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-4">
                    <label className="block">
                      <span className={labelClassName}>Tee id</span>
                      <input
                        value={tee.teeId}
                        onChange={(event) => updateTee(tee.key, "teeId", event.target.value)}
                        className={inputClassName}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClassName}>Tee name</span>
                      <input
                        value={tee.teeName}
                        onChange={(event) => updateTee(tee.key, "teeName", event.target.value)}
                        className={inputClassName}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClassName}>Gender</span>
                      <select
                        value={tee.gender}
                        onChange={(event) =>
                          updateTee(tee.key, "gender", event.target.value as TeeGender)
                        }
                        className={inputClassName}
                      >
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className={labelClassName}>Par</span>
                      <input
                        value={tee.par}
                        onChange={(event) => updateTee(tee.key, "par", event.target.value)}
                        className={inputClassName}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClassName}>Course rating</span>
                      <input
                        value={tee.courseRating}
                        onChange={(event) => updateTee(tee.key, "courseRating", event.target.value)}
                        className={inputClassName}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClassName}>Bogey rating</span>
                      <input
                        value={tee.bogeyRating}
                        onChange={(event) => updateTee(tee.key, "bogeyRating", event.target.value)}
                        className={inputClassName}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClassName}>Slope rating</span>
                      <input
                        value={tee.slopeRating}
                        onChange={(event) => updateTee(tee.key, "slopeRating", event.target.value)}
                        className={inputClassName}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClassName}>Yardage</span>
                      <input
                        value={tee.yardage}
                        onChange={(event) => updateTee(tee.key, "yardage", event.target.value)}
                        className={inputClassName}
                      />
                    </label>
                  </div>

                  <div className="mt-6 grid gap-5 xl:grid-cols-2">
                    <div className="rounded-3xl border bg-brand-sand/35 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-brand-clay">Front 9</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <label className="block">
                          <span className={labelClassName}>Rating</span>
                          <input
                            value={tee.frontNineRating}
                            onChange={(event) =>
                              updateTee(tee.key, "frontNineRating", event.target.value)
                            }
                            className={inputClassName}
                          />
                        </label>
                        <label className="block">
                          <span className={labelClassName}>Slope</span>
                          <input
                            value={tee.frontNineSlope}
                            onChange={(event) =>
                              updateTee(tee.key, "frontNineSlope", event.target.value)
                            }
                            className={inputClassName}
                          />
                        </label>
                        <label className="block">
                          <span className={labelClassName}>Par</span>
                          <input
                            value={tee.frontNinePar}
                            onChange={(event) =>
                              updateTee(tee.key, "frontNinePar", event.target.value)
                            }
                            className={inputClassName}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="rounded-3xl border bg-brand-sand/35 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-brand-clay">Back 9</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <label className="block">
                          <span className={labelClassName}>Rating</span>
                          <input
                            value={tee.backNineRating}
                            onChange={(event) =>
                              updateTee(tee.key, "backNineRating", event.target.value)
                            }
                            className={inputClassName}
                          />
                        </label>
                        <label className="block">
                          <span className={labelClassName}>Slope</span>
                          <input
                            value={tee.backNineSlope}
                            onChange={(event) =>
                              updateTee(tee.key, "backNineSlope", event.target.value)
                            }
                            className={inputClassName}
                          />
                        </label>
                        <label className="block">
                          <span className={labelClassName}>Par</span>
                          <input
                            value={tee.backNinePar}
                            onChange={(event) =>
                              updateTee(tee.key, "backNinePar", event.target.value)
                            }
                            className={inputClassName}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </fieldset>
      </div>
    </section>
  );
}

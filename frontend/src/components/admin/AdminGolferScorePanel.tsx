"use client";

import { gql, useMutation } from "@apollo/client";
import { useEffect, useState } from "react";
import type { CourseRecord, GolferRecord } from "@/types";
import { computeCourseHandicap } from "@/utils/computeCourseHandicap";

const POST_SCORE = gql`
  mutation PostAdminGolferScore($input: PostScoreInput!) {
    postScore(input: $input) {
      id
      grossScore
      differential
      status
    }
  }
`;

type Step = 1 | 2 | 3;
type NineSide = "FRONT" | "BACK";

interface AdminGolferScorePanelProps {
  clubId: string;
  golfer: GolferRecord;
  courses: CourseRecord[];
  onPosted: (message: string) => Promise<void> | void;
}

function getTodayValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function createHoleScoreState(holeCount: number): string[] {
  return Array.from({ length: holeCount }, () => "");
}

function toNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function AdminGolferScorePanel({
  clubId,
  golfer,
  courses,
  onPosted,
}: AdminGolferScorePanelProps) {
  const [step, setStep] = useState<Step>(1);
  const [datePlayed, setDatePlayed] = useState(getTodayValue());
  const [scoreType, setScoreType] = useState("HOME");
  const [holes, setHoles] = useState<9 | 18>(18);
  const [nineSide, setNineSide] = useState<NineSide>("FRONT");
  const [courseId, setCourseId] = useState("");
  const [teeId, setTeeId] = useState("");
  const [entryMode, setEntryMode] = useState("TOTAL_SCORE");
  const [grossScore, setGrossScore] = useState("");
  const [holeScores, setHoleScores] = useState<string[]>(createHoleScoreState(18));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [postScore, postState] = useMutation(POST_SCORE);

  const selectedCourse = courses.find((course) => course.id === courseId) ?? null;
  const availableTees = (selectedCourse?.tees ?? []).filter((tee) => {
    if (!golfer.gender || (golfer.gender !== "M" && golfer.gender !== "F")) {
      return true;
    }

    return tee.gender === golfer.gender;
  });
  const selectedTee = availableTees.find((tee) => tee.teeId === teeId) ?? null;

  useEffect(() => {
    setHoleScores(createHoleScoreState(holes));
    setGrossScore("");
  }, [holes, entryMode]);

  useEffect(() => {
    if (!selectedCourse || teeId) {
      return;
    }

    const defaultTeeId =
      golfer.gender === "F" ? selectedCourse.defaultFemaleTeeId : selectedCourse.defaultMaleTeeId;
    const nextTeeId =
      availableTees.find((tee) => tee.teeId === defaultTeeId)?.teeId ?? availableTees[0]?.teeId;

    if (nextTeeId) {
      setTeeId(nextTeeId);
    }
  }, [availableTees, golfer.gender, selectedCourse, teeId]);

  useEffect(() => {
    if (!selectedCourse) {
      setTeeId("");
    }
  }, [selectedCourse]);

  const ratingPackage = (() => {
    if (!selectedTee) {
      return null;
    }

    if (holes === 18) {
      return {
        courseRating: selectedTee.courseRating,
        slopeRating: selectedTee.slopeRating,
        par: selectedTee.par,
        holePars: selectedTee.holePars ?? [],
        holeHandicaps: selectedTee.holeHandicaps ?? [],
      };
    }

    const nine = nineSide === "FRONT" ? selectedTee.frontNine : selectedTee.backNine;
    const holeOffset = nineSide === "FRONT" ? 0 : 9;
    return nine
      ? {
          courseRating: nine.rating,
          slopeRating: nine.slope,
          par: nine.par ?? Math.round(selectedTee.par / 2),
          holePars: selectedTee.holePars?.slice(holeOffset, holeOffset + 9) ?? [],
          holeHandicaps: selectedTee.holeHandicaps?.slice(holeOffset, holeOffset + 9) ?? [],
        }
      : null;
  })();

  const numericHoleScores = holeScores
    .map((value) => toNumber(value))
    .filter((value): value is number => value != null);
  const grossScoreValue =
    entryMode === "HOLE_BY_HOLE"
      ? numericHoleScores.reduce((sum, value) => sum + value, 0)
      : toNumber(grossScore);
  const courseHandicap =
    ratingPackage && selectedTee
      ? computeCourseHandicap(
          golfer.currentHandicapIndex,
          ratingPackage.slopeRating,
          ratingPackage.courseRating,
          ratingPackage.par
        )
      : null;

  function resetForm() {
    setStep(1);
    setDatePlayed(getTodayValue());
    setScoreType("HOME");
    setHoles(18);
    setNineSide("FRONT");
    setCourseId("");
    setTeeId("");
    setEntryMode("TOTAL_SCORE");
    setGrossScore("");
    setHoleScores(createHoleScoreState(18));
    setErrorMessage(null);
  }

  function validateStepOne(): string | null {
    if (!datePlayed) {
      return "Date played required.";
    }
    if (!selectedCourse) {
      return "Select course.";
    }
    if (!selectedTee) {
      return "Select tee.";
    }
    if (!ratingPackage) {
      return "Selected tee does not have required rating data for this hole setting.";
    }
    return null;
  }

  function validateStepTwo(): string | null {
    if (entryMode === "TOTAL_SCORE") {
      if (grossScoreValue == null || grossScoreValue < 1) {
        return "Enter valid gross score.";
      }
      return null;
    }

    if (numericHoleScores.length !== holes) {
      return `Enter all ${holes} hole scores.`;
    }

    return null;
  }

  function goNext() {
    const stepError = step === 1 ? validateStepOne() : validateStepTwo();
    if (stepError) {
      setErrorMessage(stepError);
      return;
    }

    setErrorMessage(null);
    setStep((current) => Math.min(current + 1, 3) as Step);
  }

  function goBack() {
    setErrorMessage(null);
    setStep((current) => Math.max(current - 1, 1) as Step);
  }

  async function handleSubmit() {
    if (golfer.membershipStatus !== "ACTIVE") {
      setErrorMessage("Cannot post score for inactive golfer.");
      return;
    }

    const stepOneError = validateStepOne();
    const stepTwoError = validateStepTwo();

    if (
      stepOneError ||
      stepTwoError ||
      !selectedCourse ||
      !selectedTee ||
      !ratingPackage ||
      grossScoreValue == null
    ) {
      setErrorMessage(stepOneError ?? stepTwoError ?? "Score form incomplete.");
      return;
    }

    setErrorMessage(null);

    try {
      await postScore({
        variables: {
          input: {
            clubId,
            golferId: golfer.id,
            datePlayed: new Date(`${datePlayed}T12:00:00.000Z`).toISOString(),
            scoreType,
            holes,
            entryMode,
            courseId: selectedCourse.id,
            teeId: selectedTee.teeId,
            courseName: selectedCourse.courseName,
            teeName:
              holes === 9
                ? `${selectedTee.teeName} (${nineSide === "FRONT" ? "Front 9" : "Back 9"})`
                : selectedTee.teeName,
            grossScore: grossScoreValue,
            holeScores:
              entryMode === "HOLE_BY_HOLE"
                ? holeScores.map((value) => Number(value))
                : undefined,
            courseRating: ratingPackage.courseRating,
            slopeRating: ratingPackage.slopeRating,
            par: ratingPackage.par,
          },
        },
      });

      resetForm();
      await onPosted(`Score posted for ${golfer.firstName} ${golfer.lastName}.`);
    } catch (mutationError) {
      setErrorMessage(mutationError instanceof Error ? mutationError.message : "Score post failed.");
    }
  }

  function renderSegmentButton(
    label: string,
    active: boolean,
    onClick: () => void
  ) {
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

  return (
    <div className="space-y-6">
      <section className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Post score</p>
            <h3 className="mt-3 text-3xl font-semibold text-ui-ink">Admin posting flow</h3>
            <p className="mt-3 text-sm leading-7 text-ui-muted">
              Post home, away, or competition scores on behalf of this golfer.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((value) => (
              <div
                key={value}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  step === value
                    ? "bg-brand-green text-white"
                    : "border border-ui-line bg-white text-ui-muted"
                }`}
              >
                Step {value}
              </div>
            ))}
          </div>
        </div>
      </section>

      {errorMessage ? (
        <p className="rounded-3xl border border-status-withdrawn/20 bg-status-withdrawn/8 px-5 py-4 text-sm text-status-withdrawn">
          {errorMessage}
        </p>
      ) : null}

      {step === 1 ? (
        <section className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Date played</span>
              <input
                type="date"
                max={getTodayValue()}
                value={datePlayed}
                onChange={(event) => setDatePlayed(event.target.value)}
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
              />
            </label>

            <div>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Score type</span>
              <div className="flex flex-wrap gap-2">
                {renderSegmentButton("Home", scoreType === "HOME", () => setScoreType("HOME"))}
                {renderSegmentButton("Away", scoreType === "AWAY", () => setScoreType("AWAY"))}
                {renderSegmentButton(
                  "Competition",
                  scoreType === "COMPETITION",
                  () => setScoreType("COMPETITION")
                )}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Holes</span>
              <div className="flex gap-2">
                {renderSegmentButton("18", holes === 18, () => setHoles(18))}
                {renderSegmentButton("9", holes === 9, () => setHoles(9))}
              </div>
            </div>

            {holes === 9 ? (
              <div>
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Nine played</span>
                <div className="flex gap-2">
                  {renderSegmentButton("Front 9", nineSide === "FRONT", () => setNineSide("FRONT"))}
                  {renderSegmentButton("Back 9", nineSide === "BACK", () => setNineSide("BACK"))}
                </div>
              </div>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Course</span>
              <select
                value={courseId}
                onChange={(event) => {
                  setCourseId(event.target.value);
                  setTeeId("");
                }}
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
              >
                <option value="">Select course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.courseName} • {course.city}, {course.state}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Tee</span>
              <select
                value={teeId}
                onChange={(event) => setTeeId(event.target.value)}
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
              >
                <option value="">Select tee</option>
                {availableTees.map((tee) => (
                  <option key={tee.teeId} value={tee.teeId}>
                    {tee.teeName} • {tee.courseRating}/{tee.slopeRating} • Par {tee.par}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-clay">Entry mode</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {renderSegmentButton(
                  "Total score",
                  entryMode === "TOTAL_SCORE",
                  () => setEntryMode("TOTAL_SCORE")
                )}
                {renderSegmentButton(
                  "Hole by hole",
                  entryMode === "HOLE_BY_HOLE",
                  () => setEntryMode("HOLE_BY_HOLE")
                )}
              </div>
            </div>
            <div className="rounded-3xl border bg-brand-sand/35 px-4 py-3 text-sm text-ui-muted">
              Course handicap: <span className="font-semibold text-ui-ink">{courseHandicap ?? "—"}</span>
            </div>
          </div>

          {entryMode === "TOTAL_SCORE" ? (
            <div className="mt-6 max-w-sm">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Gross score</span>
                <input
                  value={grossScore}
                  onChange={(event) => setGrossScore(event.target.value)}
                  className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
                />
              </label>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              {holeScores.map((value, index) => (
                <label key={`${holes}-${index}`} className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-ui-muted">
                    Hole {index + 1}
                  </span>
                  <input
                    value={value}
                    onChange={(event) => {
                      const next = [...holeScores];
                      next[index] = event.target.value;
                      setHoleScores(next);
                    }}
                    className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
                  />
                </label>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {step === 3 ? (
        <section className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-clay">Review</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-ui-muted">Golfer</p>
              <p className="mt-2 text-sm font-semibold text-ui-ink">
                {golfer.firstName} {golfer.lastName}
              </p>
            </div>
            <div className="rounded-3xl border bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-ui-muted">Course / Tee</p>
              <p className="mt-2 text-sm font-semibold text-ui-ink">
                {selectedCourse?.courseName ?? "—"} / {selectedTee?.teeName ?? "—"}
              </p>
            </div>
            <div className="rounded-3xl border bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-ui-muted">Gross score</p>
              <p className="mt-2 text-sm font-semibold text-ui-ink">{grossScoreValue ?? "—"}</p>
            </div>
            <div className="rounded-3xl border bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-ui-muted">Rating package</p>
              <p className="mt-2 text-sm font-semibold text-ui-ink">
                {ratingPackage
                  ? `${ratingPackage.courseRating} / ${ratingPackage.slopeRating} / Par ${ratingPackage.par}`
                  : "—"}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="flex items-center justify-between rounded-panel border bg-ui-card/90 px-5 py-4 shadow-panel">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 1 || postState.loading}
          className="rounded-full border border-ui-line px-4 py-2 text-sm font-semibold text-ui-ink disabled:opacity-40"
        >
          Back
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={goNext}
            className="rounded-full bg-brand-green px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-light"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={postState.loading}
            className="rounded-full bg-brand-green px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-light disabled:opacity-60"
          >
            {postState.loading ? "Posting..." : "Post score"}
          </button>
        )}
      </section>
    </div>
  );
}

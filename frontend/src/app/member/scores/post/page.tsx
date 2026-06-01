"use client";

import { gql, useMutation, useQuery } from "@apollo/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingView } from "@/components/shared/LoadingView";
import { useAuth } from "@/lib/auth/useAuth";
import type { CourseRecord, GolferRecord, TeeRecord } from "@/types";
import { computeCourseHandicap } from "@/utils/computeCourseHandicap";

const GET_SCORE_POST_CONTEXT = gql`
  query GetScorePostContext($golferId: ID!, $clubId: ID!) {
    golfer(id: $golferId) {
      id
      firstName
      gender
      currentHandicapIndex
    }
    clubCourses(clubId: $clubId) {
      id
      facilityName
      courseName
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
  }
`;

const POST_SCORE = gql`
  mutation PostScore($input: PostScoreInput!) {
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

export default function MemberPostScorePage() {
  const auth = useAuth();
  const router = useRouter();
  const golferId = auth.user?.golferId ?? null;
  const clubId = auth.primaryClubId;

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

  const { data, loading, error } = useQuery(GET_SCORE_POST_CONTEXT, {
    skip: auth.isLoading || !golferId || !clubId,
    variables: {
      golferId,
      clubId,
    },
  });

  const [postScore, postState] = useMutation(POST_SCORE);

  const golfer = (data?.golfer ?? null) as GolferRecord | null;
  const courses = (data?.clubCourses ?? []) as CourseRecord[];
  const selectedCourse = courses.find((course) => course.id === courseId) ?? null;
  const availableTees = (selectedCourse?.tees ?? []).filter((tee) => {
    if (!golfer?.gender || (golfer.gender !== "M" && golfer.gender !== "F")) {
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
      golfer?.gender === "F"
        ? selectedCourse.defaultFemaleTeeId
        : selectedCourse.defaultMaleTeeId;
    const nextTeeId = availableTees.find((tee) => tee.teeId === defaultTeeId)?.teeId ?? availableTees[0]?.teeId;
    if (nextTeeId) {
      setTeeId(nextTeeId);
    }
  }, [availableTees, golfer?.gender, selectedCourse, teeId]);

  useEffect(() => {
    if (!selectedCourse) {
      setTeeId("");
    }
  }, [selectedCourse]);

  if (auth.isLoading || loading) {
    return <LoadingView title="Loading score form" message="Pulling your golfer record and home courses..." />;
  }

  if (!auth.user || !golferId || !clubId) {
    return null;
  }

  if (error) {
    return (
      <div className="rounded-panel border border-status-withdrawn/20 bg-ui-card/90 p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-ui-ink">Score form unavailable</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">{error.message}</p>
      </div>
    );
  }

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
    ratingPackage &&
    selectedTee
      ? computeCourseHandicap(
          golfer?.currentHandicapIndex,
          ratingPackage.slopeRating,
          ratingPackage.courseRating,
          ratingPackage.par
        )
      : null;

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
    const stepOneError = validateStepOne();
    const stepTwoError = validateStepTwo();
    if (stepOneError || stepTwoError || !selectedCourse || !selectedTee || !ratingPackage || grossScoreValue == null) {
      setErrorMessage(stepOneError ?? stepTwoError ?? "Score form incomplete.");
      return;
    }

    setErrorMessage(null);

    try {
      await postScore({
        variables: {
          input: {
            clubId,
            golferId,
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

      router.push("/member/scores/history?posted=1");
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
      <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel">
        <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Post score</p>
        <h2 className="mt-3 text-3xl font-semibold text-ui-ink">Member posting flow</h2>
        <div className="mt-5 flex flex-wrap gap-2">
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
                {renderSegmentButton("Competition", scoreType === "COMPETITION", () => setScoreType("COMPETITION"))}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Holes</span>
              <div className="flex flex-wrap gap-2">
                {renderSegmentButton("18", holes === 18, () => setHoles(18))}
                {renderSegmentButton("9", holes === 9, () => setHoles(9))}
              </div>
            </div>

            {holes === 9 ? (
              <div>
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Nine played</span>
                <div className="flex flex-wrap gap-2">
                  {renderSegmentButton("Front 9", nineSide === "FRONT", () => setNineSide("FRONT"))}
                  {renderSegmentButton("Back 9", nineSide === "BACK", () => setNineSide("BACK"))}
                </div>
              </div>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Facility</span>
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
                    {course.courseName}
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
                    {tee.teeName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {ratingPackage ? (
            <div className="mt-6 rounded-3xl border bg-white/70 p-5 text-sm text-ui-muted">
              <div className="grid gap-3 md:grid-cols-4">
                <p>C.R. <span className="font-semibold text-ui-ink">{ratingPackage.courseRating}</span></p>
                <p>Slope <span className="font-semibold text-ui-ink">{ratingPackage.slopeRating}</span></p>
                <p>Par <span className="font-semibold text-ui-ink">{ratingPackage.par}</span></p>
                <p>
                  Course handicap{" "}
                  <span className="font-semibold text-ui-ink">
                    {courseHandicap != null ? courseHandicap : "N/A"}
                  </span>
                </p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
          <div>
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Entry mode</span>
            <div className="flex flex-wrap gap-2">
              {renderSegmentButton("Total score", entryMode === "TOTAL_SCORE", () => setEntryMode("TOTAL_SCORE"))}
              {renderSegmentButton("Hole by hole", entryMode === "HOLE_BY_HOLE", () => setEntryMode("HOLE_BY_HOLE"))}
            </div>
          </div>

          {entryMode === "TOTAL_SCORE" ? (
            <label className="mt-6 block max-w-sm">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Gross score</span>
              <input
                type="number"
                min={1}
                value={grossScore}
                onChange={(event) => setGrossScore(event.target.value)}
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
              />
            </label>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {holeScores.map((value, index) => {
                  const par = ratingPackage?.holePars?.[index];
                  const strokeIndex = ratingPackage?.holeHandicaps?.[index];
                  return (
                    <label key={`${holes}-${index}`} className="rounded-3xl border bg-white/70 p-4">
                      <span className="block text-xs uppercase tracking-[0.2em] text-ui-muted">
                        Hole {index + 1}
                      </span>
                      <span className="mt-2 block text-xs text-ui-muted">
                        Par {par ?? "—"} • SI {strokeIndex ?? "—"}
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={value}
                        onChange={(event) =>
                          setHoleScores((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? event.target.value : item
                            )
                          )
                        }
                        className="mt-3 w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
                      />
                    </label>
                  );
                })}
              </div>
              <p className="text-sm text-ui-muted">
                Running total <span className="font-semibold text-ui-ink">{grossScoreValue ?? 0}</span>
              </p>
            </div>
          )}
        </section>
      ) : null}

      {step === 3 ? (
        <section className="grid gap-6 xl:grid-cols-[1fr_20rem]">
          <article className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
            <p className="text-xs uppercase tracking-[0.22em] text-brand-clay">Review</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <p className="text-sm text-ui-muted">
                Date <span className="font-semibold text-ui-ink">{datePlayed}</span>
              </p>
              <p className="text-sm text-ui-muted">
                Course <span className="font-semibold text-ui-ink">{selectedCourse?.courseName ?? "—"}</span>
              </p>
              <p className="text-sm text-ui-muted">
                Tee{" "}
                <span className="font-semibold text-ui-ink">
                  {selectedTee
                    ? holes === 9
                      ? `${selectedTee.teeName} (${nineSide === "FRONT" ? "Front 9" : "Back 9"})`
                      : selectedTee.teeName
                    : "—"}
                </span>
              </p>
              <p className="text-sm text-ui-muted">
                Entry mode <span className="font-semibold text-ui-ink">{entryMode.replaceAll("_", " ")}</span>
              </p>
              <p className="text-sm text-ui-muted">
                C.R. / Slope{" "}
                <span className="font-semibold text-ui-ink">
                  {ratingPackage?.courseRating ?? "—"} / {ratingPackage?.slopeRating ?? "—"}
                </span>
              </p>
              <p className="text-sm text-ui-muted">
                Par <span className="font-semibold text-ui-ink">{ratingPackage?.par ?? "—"}</span>
              </p>
              <p className="text-sm text-ui-muted">
                Gross score <span className="font-semibold text-ui-ink">{grossScoreValue ?? "—"}</span>
              </p>
              <p className="text-sm text-ui-muted">
                Score type <span className="font-semibold text-ui-ink">{scoreType}</span>
              </p>
            </div>
          </article>

          <aside className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
            <p className="text-xs uppercase tracking-[0.22em] text-brand-clay">WHS notice</p>
            <p className="mt-4 text-sm leading-7 text-ui-muted">
              Handicap values are calculated using WHS formulas for club management purposes.
              Official USGA/GHIN certification requires a certified integration.
            </p>
          </aside>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={goBack}
            className="rounded-full border border-ui-line bg-white px-5 py-3 text-sm font-semibold text-ui-ink hover:border-brand-gold"
          >
            Back
          </button>
        ) : null}
        {step < 3 ? (
          <button
            type="button"
            onClick={goNext}
            className="rounded-full bg-brand-green px-5 py-3 text-sm font-semibold text-white hover:bg-brand-green-light"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={postState.loading}
            className="rounded-full bg-brand-green px-5 py-3 text-sm font-semibold text-white hover:bg-brand-green-light disabled:opacity-60"
          >
            {postState.loading ? "Posting..." : "Post score"}
          </button>
        )}
      </section>
    </div>
  );
}

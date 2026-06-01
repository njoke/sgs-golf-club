"use client";

import { gql, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  CourseEditorPanel,
  type CourseMutationInput,
} from "@/components/admin/CourseEditorPanel";
import { LoadingView } from "@/components/shared/LoadingView";
import type { CourseRecord } from "@/types";

const GET_HOME_COURSES = gql`
  query GetHomeCourses($clubId: ID!) {
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
        bogeyRating
        slopeRating
        yardage
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
      }
    }
  }
`;

const ADD_HOME_COURSE = gql`
  mutation AddHomeCourse($input: AddCourseInput!) {
    addHomeCourse(input: $input) {
      id
      courseName
    }
  }
`;

const UPDATE_HOME_COURSE = gql`
  mutation UpdateHomeCourse($id: ID!, $input: AddCourseInput!) {
    updateHomeCourse(id: $id, input: $input) {
      id
      courseName
    }
  }
`;

const SET_PRIMARY_FACILITY = gql`
  mutation SetPrimaryFacility($courseId: ID!) {
    setPrimaryFacility(courseId: $courseId) {
      id
      isPrimaryFacility
    }
  }
`;

const SET_DEFAULT_TEES = gql`
  mutation SetDefaultTees($courseId: ID!, $maleTeeId: ID, $femaleTeeId: ID) {
    setDefaultTees(courseId: $courseId, maleTeeId: $maleTeeId, femaleTeeId: $femaleTeeId) {
      id
      defaultMaleTeeId
      defaultFemaleTeeId
    }
  }
`;

const REMOVE_HOME_COURSE = gql`
  mutation RemoveHomeCourse($id: ID!) {
    removeHomeCourse(id: $id) {
      success
      message
    }
  }
`;

type EditorState =
  | { mode: "add" }
  | { mode: "edit"; courseId: string }
  | null;

export default function HomeCoursesPage() {
  const params = useParams<{ clubId: string }>();
  const clubId = Array.isArray(params.clubId) ? params.clubId[0] : params.clubId;
  const [editorState, setEditorState] = useState<EditorState>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery(GET_HOME_COURSES, {
    skip: !clubId,
    variables: { clubId },
  });

  const [addHomeCourse, addState] = useMutation(ADD_HOME_COURSE);
  const [updateHomeCourse, updateState] = useMutation(UPDATE_HOME_COURSE);
  const [setPrimaryFacility, setPrimaryState] = useMutation(SET_PRIMARY_FACILITY);
  const [setDefaultTees, setDefaultState] = useMutation(SET_DEFAULT_TEES);
  const [removeHomeCourse, removeState] = useMutation(REMOVE_HOME_COURSE);

  if (!clubId) {
    return null;
  }

  if (loading) {
    return <LoadingView title="Loading home courses" message="Pulling course list and tee defaults..." />;
  }

  if (error) {
    return (
      <div className="rounded-panel border border-status-withdrawn/20 bg-ui-card/90 p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-ui-ink">Home courses unavailable</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">{error.message}</p>
      </div>
    );
  }

  const courses = (data?.clubCourses ?? []) as CourseRecord[];
  const editorCourse =
    editorState?.mode === "edit"
      ? courses.find((course) => course.id === editorState.courseId) ?? null
      : null;
  const isMutating =
    addState.loading ||
    updateState.loading ||
    setPrimaryState.loading ||
    setDefaultState.loading ||
    removeState.loading;

  async function runMutation(action: () => Promise<unknown>) {
    setFeedback(null);
    setErrorMessage(null);

    try {
      await action();
      await refetch();
    } catch (mutationError) {
      setErrorMessage(
        mutationError instanceof Error ? mutationError.message : "Course action failed."
      );
    }
  }

  function openAddEditor() {
    setFeedback(null);
    setErrorMessage(null);
    setEditorState({ mode: "add" });
  }

  function openEditEditor(courseIdToEdit: string) {
    setFeedback(null);
    setErrorMessage(null);
    setEditorState({ mode: "edit", courseId: courseIdToEdit });
  }

  async function handleCourseSave(input: CourseMutationInput) {
    setFeedback(null);
    setErrorMessage(null);

    if (editorState?.mode === "edit") {
      if (!editorCourse) {
        throw new Error("Course record no longer available.");
      }

      await updateHomeCourse({
        variables: {
          id: editorCourse.id,
          input,
        },
      });
      setFeedback(`${input.courseName} updated.`);
    } else {
      await addHomeCourse({
        variables: {
          input,
        },
      });
      setFeedback(`${input.courseName} added.`);
    }

    await refetch();
    setEditorState(null);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Home courses</p>
            <h2 className="mt-3 text-3xl font-semibold text-ui-ink">Facility and tee defaults</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ui-muted">
              Manage primary facility, default tees, and full course setup from one admin lane.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/manage/${clubId}/account`}
              className="rounded-full border border-ui-line bg-white px-5 py-3 text-sm font-semibold text-ui-ink hover:border-brand-gold"
            >
              Basic info
            </Link>
            <button
              type="button"
              onClick={openAddEditor}
              className="rounded-full bg-brand-green px-5 py-3 text-sm font-semibold text-white hover:bg-brand-green-light"
            >
              Add course
            </button>
          </div>
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

      {editorState ? (
        <CourseEditorPanel
          clubId={clubId}
          mode={editorState.mode}
          course={editorCourse}
          isSaving={addState.loading || updateState.loading}
          onCancel={() => setEditorState(null)}
          onSave={handleCourseSave}
        />
      ) : null}

      <section className="space-y-5">
        {courses.length ? (
          courses.map((course) => {
            const maleTees = course.tees.filter((tee) => tee.gender === "M");
            const femaleTees = course.tees.filter((tee) => tee.gender === "F");

            return (
              <article key={course.id} className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-brand-clay">{course.facilityName}</p>
                    <h3 className="mt-2 text-2xl font-semibold text-ui-ink">{course.courseName}</h3>
                    <p className="mt-2 text-sm text-ui-muted">
                      {course.city}, {course.state} • {course.tees.length} tees
                    </p>
                    {course.isPrimaryFacility ? (
                      <p className="mt-3 inline-flex rounded-full bg-status-active/10 px-3 py-1 text-xs font-semibold text-status-active">
                        Primary facility
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => openEditEditor(course.id)}
                      className="rounded-full border border-ui-line bg-white px-4 py-2 text-xs font-semibold text-ui-ink hover:border-brand-gold disabled:opacity-40"
                    >
                      Edit
                    </button>

                    {!course.isPrimaryFacility ? (
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() =>
                          void runMutation(() =>
                            setPrimaryFacility({ variables: { courseId: course.id } })
                          )
                        }
                        className="rounded-full border border-ui-line bg-white px-4 py-2 text-xs font-semibold text-ui-ink hover:border-brand-gold disabled:opacity-40"
                      >
                        Set primary
                      </button>
                    ) : null}

                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => {
                        const confirmed = window.confirm(`Remove ${course.courseName}?`);
                        if (!confirmed) {
                          return;
                        }
                        void runMutation(() =>
                          removeHomeCourse({ variables: { id: course.id } })
                        );
                      }}
                      className="rounded-full border border-status-withdrawn/30 bg-white px-4 py-2 text-xs font-semibold text-status-withdrawn hover:border-status-withdrawn disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_18rem]">
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Default male tee</span>
                    <select
                      value={course.defaultMaleTeeId ?? ""}
                      onChange={(event) =>
                        void runMutation(() =>
                          setDefaultTees({
                            variables: {
                              courseId: course.id,
                              maleTeeId: event.target.value || null,
                              femaleTeeId: course.defaultFemaleTeeId ?? null,
                            },
                          })
                        )
                      }
                      className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
                    >
                      <option value="">None</option>
                      {maleTees.map((tee) => (
                        <option key={tee.teeId} value={tee.teeId}>
                          {tee.teeName} • {tee.courseRating}/{tee.slopeRating}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Default female tee</span>
                    <select
                      value={course.defaultFemaleTeeId ?? ""}
                      onChange={(event) =>
                        void runMutation(() =>
                          setDefaultTees({
                            variables: {
                              courseId: course.id,
                              maleTeeId: course.defaultMaleTeeId ?? null,
                              femaleTeeId: event.target.value || null,
                            },
                          })
                        )
                      }
                      className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
                    >
                      <option value="">None</option>
                      {femaleTees.map((tee) => (
                        <option key={tee.teeId} value={tee.teeId}>
                          {tee.teeName} • {tee.courseRating}/{tee.slopeRating}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="rounded-3xl border bg-brand-sand/35 p-4 text-sm text-ui-muted">
                    <p className="text-xs uppercase tracking-[0.18em] text-brand-clay">9-hole note</p>
                    <p className="mt-2 leading-6">
                      New course forms can store front/back 9 values so score posting keeps accurate
                      9-hole differentials.
                    </p>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <p className="rounded-panel border bg-ui-card/90 p-8 text-sm text-ui-muted shadow-panel">
            No home courses configured yet. Use add course to create first facility and tee setup.
          </p>
        )}
      </section>
    </div>
  );
}

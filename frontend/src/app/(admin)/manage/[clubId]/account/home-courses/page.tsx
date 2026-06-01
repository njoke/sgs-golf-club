"use client";

import { gql, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
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
        slopeRating
      }
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

export default function HomeCoursesPage() {
  const params = useParams<{ clubId: string }>();
  const clubId = Array.isArray(params.clubId) ? params.clubId[0] : params.clubId;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery(GET_HOME_COURSES, {
    skip: !clubId,
    variables: { clubId },
  });

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
  const isBusy = setPrimaryState.loading || setDefaultState.loading || removeState.loading;

  async function runMutation(action: () => Promise<unknown>) {
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

  return (
    <div className="space-y-6">
      <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Home courses</p>
            <h2 className="mt-3 text-3xl font-semibold text-ui-ink">Facility and tee defaults</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ui-muted">
              Manage which facility is primary and which tees are defaults for male and female members.
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
              disabled
              className="rounded-full border border-ui-line bg-white px-5 py-3 text-sm font-semibold text-ui-muted"
            >
              Add course next
            </button>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <p className="rounded-3xl border border-status-withdrawn/20 bg-status-withdrawn/8 px-5 py-4 text-sm text-status-withdrawn">
          {errorMessage}
        </p>
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
                    {!course.isPrimaryFacility ? (
                      <button
                        type="button"
                        disabled={isBusy}
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
                      disabled={isBusy}
                      onClick={() => {
                        const confirmed = window.confirm(
                          `Remove ${course.courseName}?`
                        );
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

                <div className="mt-6 grid gap-5 lg:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Default male tee</span>
                    <select
                      defaultValue={course.defaultMaleTeeId ?? ""}
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
                      defaultValue={course.defaultFemaleTeeId ?? ""}
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
                </div>
              </article>
            );
          })
        ) : (
          <p className="rounded-panel border bg-ui-card/90 p-8 text-sm text-ui-muted shadow-panel">
            No home courses configured yet.
          </p>
        )}
      </section>
    </div>
  );
}

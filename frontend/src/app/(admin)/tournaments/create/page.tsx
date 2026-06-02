"use client";

import { gql, useMutation, useQuery } from "@apollo/client";
import { useRouter } from "next/navigation";
import { TournamentEditorForm, type TournamentEditorPayload } from "@/components/admin/TournamentEditorForm";
import { LoadingView } from "@/components/shared/LoadingView";
import { useAuth } from "@/lib/auth/useAuth";
import type { ClubRecord, CourseRecord } from "@/types";

const GET_TOURNAMENT_CREATE_CONTEXT = gql`
  query GetTournamentCreateContext($clubId: ID!) {
    club(id: $clubId) {
      id
      membershipTypes
    }
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

export default function CreateTournamentPage() {
  const auth = useAuth();
  const router = useRouter();
  const clubId = auth.primaryClubId;

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
  const club = (data?.club ?? null) as ClubRecord | null;

  async function handleSubmit(payload: TournamentEditorPayload) {
    const result = await createTournament({
      variables: {
        input: payload,
      },
    });

    const tournamentId = result.data?.createTournament?.id;
    router.push(tournamentId ? `/tournaments/${tournamentId}/registrations` : "/tournaments");
  }

  return (
    <TournamentEditorForm
      mode="create"
      clubId={clubId}
      courses={courses}
      membershipTypeOptions={club?.membershipTypes ?? []}
      isSubmitting={createState.loading}
      errorMessage={createState.error?.message ?? null}
      backHref="/tournaments"
      onSubmit={handleSubmit}
    />
  );
}

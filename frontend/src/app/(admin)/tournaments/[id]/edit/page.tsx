"use client";

import { gql, useMutation, useQuery } from "@apollo/client";
import { useParams, useRouter } from "next/navigation";
import { TournamentEditorForm, type TournamentEditorPayload } from "@/components/admin/TournamentEditorForm";
import { LoadingView } from "@/components/shared/LoadingView";
import { useAuth } from "@/lib/auth/useAuth";
import type { ClubRecord, CourseRecord, TournamentRecord } from "@/types";

const GET_TOURNAMENT_EDIT_CONTEXT = gql`
  query GetTournamentEditContext($id: ID!, $clubId: ID!) {
    tournament(id: $id) {
      id
      clubId
      name
      description
      startDate
      endDate
      courseId
      format
      registrationStatus
      registrationOpenAt
      registrationCloseAt
      maxPlayers
      entryFee
      membersOnly
      allowGuests
      status
      eligibility {
        minHandicapIndex
        maxHandicapIndex
        gender
        membershipCodes
      }
    }
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

const UPDATE_TOURNAMENT = gql`
  mutation UpdateTournament($id: ID!, $input: CreateTournamentInput!) {
    updateTournament(id: $id, input: $input) {
      id
      name
      registrationStatus
    }
  }
`;

export default function EditTournamentPage() {
  const auth = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const tournamentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const clubId = auth.primaryClubId;

  const { data, loading, error } = useQuery(GET_TOURNAMENT_EDIT_CONTEXT, {
    skip: auth.isLoading || !clubId || !tournamentId,
    variables: {
      id: tournamentId,
      clubId,
    },
  });

  const [updateTournament, updateState] = useMutation(UPDATE_TOURNAMENT);

  if (auth.isLoading || loading) {
    return <LoadingView title="Loading tournament editor" message="Pulling event, club, and course data..." />;
  }

  if (!auth.user || !clubId || !tournamentId) {
    return null;
  }

  if (error) {
    return (
      <div className="rounded-panel border border-status-withdrawn/20 bg-ui-card/90 p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-ui-ink">Tournament editor unavailable</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">{error.message}</p>
      </div>
    );
  }

  const tournament = (data?.tournament ?? null) as TournamentRecord | null;
  const club = (data?.club ?? null) as ClubRecord | null;
  const courses = (data?.clubCourses ?? []) as CourseRecord[];

  if (!tournament) {
    return (
      <div className="rounded-panel border border-status-withdrawn/20 bg-ui-card/90 p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-ui-ink">Tournament not found</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">
          This tournament is missing or outside current club scope.
        </p>
      </div>
    );
  }

  async function handleSubmit(payload: TournamentEditorPayload) {
    await updateTournament({
      variables: {
        id: tournamentId,
        input: payload,
      },
    });

    router.push(`/tournaments/${tournamentId}/registrations?updated=1`);
  }

  return (
    <TournamentEditorForm
      mode="edit"
      clubId={clubId}
      courses={courses}
      membershipTypeOptions={club?.membershipTypes ?? []}
      tournament={tournament}
      isSubmitting={updateState.loading}
      errorMessage={updateState.error?.message ?? null}
      backHref={`/tournaments/${tournamentId}/registrations`}
      onSubmit={handleSubmit}
    />
  );
}

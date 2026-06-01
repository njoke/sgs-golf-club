"use client";

import { gql, useMutation, useQuery } from "@apollo/client";
import { useEffect, useState } from "react";
import { LoadingView } from "@/components/shared/LoadingView";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/auth/useAuth";
import type { AddressRecord, GolferRecord } from "@/types";
import { formatDate } from "@/utils/formatDate";

const GET_MEMBER_PROFILE = gql`
  query GetMemberProfile($id: ID!) {
    golfer(id: $id) {
      id
      ghinNumber
      firstName
      middleName
      lastName
      suffix
      gender
      dateOfBirth
      email
      phone
      address {
        addressLine1
        addressLine2
        city
        state
        postalCode
        country
      }
      membershipCode
      membershipStatus
      digitalProfileStatus
      currentHandicapIndex
      createdAt
    }
  }
`;

const UPDATE_MEMBER_PROFILE = gql`
  mutation UpdateMemberProfile($id: ID!, $input: UpdateGolferInput!) {
    updateGolfer(id: $id, input: $input) {
      id
      firstName
      middleName
      lastName
      phone
      address {
        addressLine1
        addressLine2
        city
        state
        postalCode
        country
      }
    }
  }
`;

interface ProfileFormState {
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

function mapFormState(golfer?: GolferRecord | null): ProfileFormState {
  return {
    firstName: golfer?.firstName ?? "",
    middleName: golfer?.middleName ?? "",
    lastName: golfer?.lastName ?? "",
    phone: golfer?.phone ?? "",
    addressLine1: golfer?.address?.addressLine1 ?? "",
    addressLine2: golfer?.address?.addressLine2 ?? "",
    city: golfer?.address?.city ?? "",
    state: golfer?.address?.state ?? "",
    postalCode: golfer?.address?.postalCode ?? "",
    country: golfer?.address?.country ?? "",
  };
}

function toAddressInput(formState: ProfileFormState): AddressRecord {
  return {
    addressLine1: formState.addressLine1 || undefined,
    addressLine2: formState.addressLine2 || undefined,
    city: formState.city || undefined,
    state: formState.state || undefined,
    postalCode: formState.postalCode || undefined,
    country: formState.country || undefined,
  };
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-ui-muted">{label}</p>
      <p className="mt-2 text-sm text-ui-ink">{value || "—"}</p>
    </div>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: keyof ProfileFormState;
  value: string;
  onChange: (name: keyof ProfileFormState, value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className="w-full rounded-2xl border bg-white px-4 py-3 text-sm text-ui-ink outline-none focus:border-brand-gold"
      />
    </label>
  );
}

export default function MemberProfilePage() {
  const auth = useAuth();
  const user = auth.user;
  const golferId = auth.user?.golferId ?? null;
  const authLoading = auth.isLoading;
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProfileFormState>(mapFormState());

  const { data, loading, error, refetch } = useQuery(GET_MEMBER_PROFILE, {
    skip: authLoading || !golferId,
    variables: { id: golferId },
  });

  const [updateProfile, updateState] = useMutation(UPDATE_MEMBER_PROFILE);
  const golfer = (data?.golfer ?? null) as GolferRecord | null;

  useEffect(() => {
    if (golfer && !isEditing) {
      setFormState(mapFormState(golfer));
    }
  }, [golfer, isEditing]);

  function updateField(name: keyof ProfileFormState, value: string) {
    setFormState((current) => ({ ...current, [name]: value }));
  }

  async function handleSave() {
    if (!golferId) {
      return;
    }

    setFeedback(null);
    setErrorMessage(null);

    try {
      await updateProfile({
        variables: {
          id: golferId,
          input: {
            firstName: formState.firstName,
            middleName: formState.middleName || undefined,
            lastName: formState.lastName,
            phone: formState.phone || undefined,
            address: toAddressInput(formState),
          },
        },
      });
      await refetch();
      setIsEditing(false);
      setFeedback("Profile updated.");
    } catch (mutationError) {
      setErrorMessage(
        mutationError instanceof Error ? mutationError.message : "Profile update failed."
      );
    }
  }

  if (authLoading || loading) {
    return <LoadingView title="Loading profile" message="Restoring your member details..." />;
  }

  if (!user || !golferId) {
    return null;
  }

  if (error) {
    return (
      <div className="rounded-panel border border-status-withdrawn/20 bg-ui-card/90 p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-ui-ink">Profile unavailable</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green text-xl font-semibold text-white">
              {golfer?.firstName?.[0] ?? user.firstName[0]}
              {golfer?.lastName?.[0] ?? user.lastName[0]}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Member profile</p>
              <h2 className="mt-2 text-3xl font-semibold text-ui-ink">
                {[golfer?.firstName, golfer?.middleName, golfer?.lastName].filter(Boolean).join(" ")}
              </h2>
              <p className="mt-2 text-sm text-ui-muted">
                GHIN {golfer?.ghinNumber ?? "—"} • Member since{" "}
                {golfer?.createdAt ? formatDate(golfer.createdAt) : "—"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={golfer?.membershipStatus ?? "ACTIVE"} />
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setFormState(mapFormState(golfer));
                    setIsEditing(false);
                    setErrorMessage(null);
                  }}
                  className="rounded-full border border-ui-line bg-white px-4 py-2 text-sm font-semibold text-ui-ink hover:border-brand-gold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={updateState.loading}
                  className="rounded-full bg-brand-green px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-light disabled:opacity-60"
                >
                  {updateState.loading ? "Saving..." : "Save"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setErrorMessage(null);
                  setIsEditing(true);
                }}
                className="rounded-full bg-brand-green px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-light"
              >
                Edit profile
              </button>
            )}
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

      <section className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <article className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
            <p className="text-xs uppercase tracking-[0.22em] text-brand-clay">Personal information</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {isEditing ? (
                <>
                  <TextField label="First name" name="firstName" value={formState.firstName} onChange={updateField} />
                  <TextField label="Middle name" name="middleName" value={formState.middleName} onChange={updateField} />
                  <TextField label="Last name" name="lastName" value={formState.lastName} onChange={updateField} />
                  <ReadOnlyField label="Gender" value={golfer?.gender ?? "—"} />
                  <ReadOnlyField
                    label="Date of birth"
                    value={golfer?.dateOfBirth ? formatDate(golfer.dateOfBirth) : "—"}
                  />
                  <ReadOnlyField label="Suffix" value={golfer?.suffix ?? "—"} />
                </>
              ) : (
                <>
                  <ReadOnlyField label="First name" value={golfer?.firstName ?? "—"} />
                  <ReadOnlyField label="Middle name" value={golfer?.middleName ?? "—"} />
                  <ReadOnlyField label="Last name" value={golfer?.lastName ?? "—"} />
                  <ReadOnlyField label="Gender" value={golfer?.gender ?? "—"} />
                  <ReadOnlyField
                    label="Date of birth"
                    value={golfer?.dateOfBirth ? formatDate(golfer.dateOfBirth) : "—"}
                  />
                  <ReadOnlyField label="Suffix" value={golfer?.suffix ?? "—"} />
                </>
              )}
            </div>
          </article>

          <article className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
            <p className="text-xs uppercase tracking-[0.22em] text-brand-clay">Contact information</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <ReadOnlyField label="Email" value={golfer?.email ?? "—"} />
              {isEditing ? (
                <TextField label="Phone" name="phone" value={formState.phone} onChange={updateField} />
              ) : (
                <ReadOnlyField label="Phone" value={golfer?.phone ?? "—"} />
              )}
            </div>
          </article>

          <article className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
            <p className="text-xs uppercase tracking-[0.22em] text-brand-clay">Address</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {isEditing ? (
                <>
                  <TextField label="Street" name="addressLine1" value={formState.addressLine1} onChange={updateField} />
                  <TextField label="Line 2" name="addressLine2" value={formState.addressLine2} onChange={updateField} />
                  <TextField label="City" name="city" value={formState.city} onChange={updateField} />
                  <TextField label="State" name="state" value={formState.state} onChange={updateField} />
                  <TextField label="Postal code" name="postalCode" value={formState.postalCode} onChange={updateField} />
                  <TextField label="Country" name="country" value={formState.country} onChange={updateField} />
                </>
              ) : (
                <>
                  <ReadOnlyField label="Street" value={golfer?.address?.addressLine1 ?? "—"} />
                  <ReadOnlyField label="Line 2" value={golfer?.address?.addressLine2 ?? "—"} />
                  <ReadOnlyField label="City" value={golfer?.address?.city ?? "—"} />
                  <ReadOnlyField label="State" value={golfer?.address?.state ?? "—"} />
                  <ReadOnlyField label="Postal code" value={golfer?.address?.postalCode ?? "—"} />
                  <ReadOnlyField label="Country" value={golfer?.address?.country ?? "—"} />
                </>
              )}
            </div>
          </article>
        </div>

        <aside className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
          <p className="text-xs uppercase tracking-[0.22em] text-brand-clay">Membership</p>
          <div className="mt-5 space-y-4">
            <ReadOnlyField label="Status" value={golfer?.membershipStatus ?? "—"} />
            <ReadOnlyField label="Code" value={golfer?.membershipCode ?? "—"} />
            <ReadOnlyField
              label="Digital profile"
              value={golfer?.digitalProfileStatus ?? "NONE"}
            />
          </div>
        </aside>
      </section>
    </div>
  );
}

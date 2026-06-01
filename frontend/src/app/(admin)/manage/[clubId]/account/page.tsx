"use client";

import { gql, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingView } from "@/components/shared/LoadingView";
import type { ClubContactRecord, ClubRecord } from "@/types";

const GET_CLUB_ACCOUNT = gql`
  query GetClubAccount($id: ID!) {
    club(id: $id) {
      id
      clubNumber
      ghpId
      name
      shortName
      associationName
      status
      clubCategory
      clubType
      isTestClub
      authorized
      isDac
      frontEndProvider
      usgaAgaClub
      phone
      email
      website
      hubspotCompanyId
      handicapChairperson
      contacts {
        contactType
        name
        email
        phone
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

const UPDATE_CLUB = gql`
  mutation UpdateClub($id: ID!, $input: UpdateClubInput!) {
    updateClub(id: $id, input: $input) {
      id
      name
      shortName
      phone
      email
      website
      hubspotCompanyId
      handicapChairperson
      contacts {
        contactType
        name
        email
        phone
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

interface ClubFormState {
  name: string;
  shortName: string;
  phone: string;
  email: string;
  website: string;
  hubspotCompanyId: string;
  handicapChairperson: string;
  contacts: ClubContactRecord[];
}

function mapFormState(club?: ClubRecord | null): ClubFormState {
  return {
    name: club?.name ?? "",
    shortName: club?.shortName ?? "",
    phone: club?.phone ?? "",
    email: club?.email ?? "",
    website: club?.website ?? "",
    hubspotCompanyId: club?.hubspotCompanyId ?? "",
    handicapChairperson: club?.handicapChairperson ?? "",
    contacts: club?.contacts?.length
      ? club.contacts.map((contact) => ({ ...contact }))
      : [],
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

export default function AccountPage() {
  const params = useParams<{ clubId: string }>();
  const clubId = Array.isArray(params.clubId) ? params.clubId[0] : params.clubId;
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<ClubFormState>(mapFormState());

  const { data, loading, error, refetch } = useQuery(GET_CLUB_ACCOUNT, {
    skip: !clubId,
    variables: { id: clubId },
  });

  const [updateClub, updateState] = useMutation(UPDATE_CLUB);
  const club = (data?.club ?? null) as ClubRecord | null;

  useEffect(() => {
    if (club && !isEditing) {
      setFormState(mapFormState(club));
    }
  }, [club, isEditing]);

  if (!clubId) {
    return null;
  }

  if (loading) {
    return <LoadingView title="Loading account" message="Pulling club profile and contacts..." />;
  }

  if (error) {
    return (
      <div className="rounded-panel border border-status-withdrawn/20 bg-ui-card/90 p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-ui-ink">Account workspace unavailable</h2>
        <p className="mt-3 text-sm leading-7 text-ui-muted">{error.message}</p>
      </div>
    );
  }

  function updateField<K extends keyof ClubFormState>(key: K, value: ClubFormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function updateContact(index: number, key: keyof ClubContactRecord, value: string) {
    setFormState((current) => ({
      ...current,
      contacts: current.contacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [key]: value } : contact
      ),
    }));
  }

  async function handleSave() {
    if (!clubId) {
      return;
    }

    setFeedback(null);
    setErrorMessage(null);

    try {
      await updateClub({
        variables: {
          id: clubId,
          input: {
            name: formState.name,
            shortName: formState.shortName || undefined,
            phone: formState.phone || undefined,
            email: formState.email || undefined,
            website: formState.website || undefined,
            hubspotCompanyId: formState.hubspotCompanyId || undefined,
            handicapChairperson: formState.handicapChairperson || undefined,
            contacts: formState.contacts.map((contact) => ({
              contactType: contact.contactType,
              name: contact.name || undefined,
              email: contact.email || undefined,
              phone: contact.phone || undefined,
              addressLine1: contact.addressLine1 || undefined,
              addressLine2: contact.addressLine2 || undefined,
              city: contact.city || undefined,
              state: contact.state || undefined,
              postalCode: contact.postalCode || undefined,
              country: contact.country || undefined,
            })),
          },
        },
      });
      await refetch();
      setIsEditing(false);
      setFeedback("Club account updated.");
    } catch (mutationError) {
      setErrorMessage(
        mutationError instanceof Error ? mutationError.message : "Club update failed."
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Account workspace</p>
            <h2 className="mt-3 text-3xl font-semibold text-ui-ink">{club?.name ?? "Club account"}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ui-muted">
              Update editable club identity fields here. Home course controls live in separate lane.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/manage/${clubId}/account`}
              className="rounded-full bg-brand-green px-5 py-3 text-sm font-semibold text-white hover:bg-brand-green-light"
            >
              Basic info
            </Link>
            <Link
              href={`/manage/${clubId}/account/home-courses`}
              className="rounded-full border border-ui-line bg-white px-5 py-3 text-sm font-semibold text-ui-ink hover:border-brand-gold"
            >
              Home courses
            </Link>
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
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.22em] text-brand-clay">Basic information</p>
              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormState(mapFormState(club));
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
                    className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-light disabled:opacity-60"
                  >
                    {updateState.loading ? "Saving..." : "Save"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setFeedback(null);
                    setErrorMessage(null);
                    setIsEditing(true);
                  }}
                  className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-light"
                >
                  Edit
                </button>
              )}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {isEditing ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Name</span>
                    <input
                      value={formState.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Short name</span>
                    <input
                      value={formState.shortName}
                      onChange={(event) => updateField("shortName", event.target.value)}
                      className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Phone</span>
                    <input
                      value={formState.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Email</span>
                    <input
                      value={formState.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Website</span>
                    <input
                      value={formState.website}
                      onChange={(event) => updateField("website", event.target.value)}
                      className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">HubSpot company id</span>
                    <input
                      value={formState.hubspotCompanyId}
                      onChange={(event) => updateField("hubspotCompanyId", event.target.value)}
                      className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted">Handicap chairperson</span>
                    <input
                      value={formState.handicapChairperson}
                      onChange={(event) => updateField("handicapChairperson", event.target.value)}
                      className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
                    />
                  </label>
                </>
              ) : (
                <>
                  <ReadOnlyField label="Name" value={club?.name ?? "—"} />
                  <ReadOnlyField label="Short name" value={club?.shortName ?? "—"} />
                  <ReadOnlyField label="Phone" value={club?.phone ?? "—"} />
                  <ReadOnlyField label="Email" value={club?.email ?? "—"} />
                  <ReadOnlyField label="Website" value={club?.website ?? "—"} />
                  <ReadOnlyField label="HubSpot company id" value={club?.hubspotCompanyId ?? "—"} />
                  <ReadOnlyField
                    label="Handicap chairperson"
                    value={club?.handicapChairperson ?? "—"}
                  />
                </>
              )}
            </div>
          </article>

          <article className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
            <p className="text-xs uppercase tracking-[0.22em] text-brand-clay">Contacts</p>
            <div className="mt-5 space-y-4">
              {(isEditing ? formState.contacts : club?.contacts ?? []).length ? (
                (isEditing ? formState.contacts : club?.contacts ?? []).map((contact, index) => (
                  <article key={`${contact.contactType}-${index}`} className="rounded-3xl border bg-white/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-brand-clay">{contact.contactType}</p>
                    {isEditing ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <input
                          value={contact.name ?? ""}
                          onChange={(event) => updateContact(index, "name", event.target.value)}
                          placeholder="Name"
                          className="rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
                        />
                        <input
                          value={contact.email ?? ""}
                          onChange={(event) => updateContact(index, "email", event.target.value)}
                          placeholder="Email"
                          className="rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
                        />
                        <input
                          value={contact.phone ?? ""}
                          onChange={(event) => updateContact(index, "phone", event.target.value)}
                          placeholder="Phone"
                          className="rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
                        />
                        <input
                          value={contact.city ?? ""}
                          onChange={(event) => updateContact(index, "city", event.target.value)}
                          placeholder="City"
                          className="rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold"
                        />
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-2 text-sm text-ui-muted md:grid-cols-2">
                        <p>{contact.name ?? "—"}</p>
                        <p>{contact.email ?? "—"}</p>
                        <p>{contact.phone ?? "—"}</p>
                        <p>
                          {[contact.city, contact.state].filter(Boolean).join(", ") || "—"}
                        </p>
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <p className="rounded-3xl border bg-white/70 p-4 text-sm text-ui-muted">
                  No club contacts on file.
                </p>
              )}
            </div>
          </article>
        </div>

        <aside className="rounded-panel border bg-ui-card/90 p-6 shadow-panel">
          <p className="text-xs uppercase tracking-[0.22em] text-brand-clay">Read-only</p>
          <div className="mt-5 space-y-4">
            <ReadOnlyField label="Club number" value={club?.clubNumber ?? "—"} />
            <ReadOnlyField label="GHP id" value={club?.ghpId ?? "—"} />
            <ReadOnlyField label="Association" value={club?.associationName ?? "—"} />
            <ReadOnlyField label="Status" value={club?.status ?? "—"} />
            <ReadOnlyField label="Front-end provider" value={club?.frontEndProvider ?? "—"} />
          </div>
        </aside>
      </section>
    </div>
  );
}

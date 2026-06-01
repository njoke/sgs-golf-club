"use client";

import { gql, useLazyQuery, useMutation } from "@apollo/client";
import { useState } from "react";
import type { GolferSearchResultRecord } from "@/types";

const SEARCH_EXISTING_GOLFERS = gql`
  query SearchExistingGolfers($input: ExistingGolferSearchInput!) {
    searchExistingGolfers(input: $input) {
      ghinNumber
      firstName
      lastName
      email
      city
      state
      currentClubName
      canAddToClub
    }
  }
`;

const ADD_EXISTING_GOLFER = gql`
  mutation AddExistingGolferToClub($input: AddExistingGolferToClubInput!) {
    addExistingGolferToClub(input: $input) {
      id
      firstName
      lastName
      membershipStatus
    }
  }
`;

const ADD_NEW_GOLFER = gql`
  mutation AddNewGolfer($input: AddNewGolferInput!) {
    addNewGolfer(input: $input) {
      id
      firstName
      lastName
      membershipStatus
    }
  }
`;

type Mode = "existing" | "new";

interface ExistingSearchFormState {
  ghinOrEmail: string;
  firstName: string;
  lastName: string;
  membershipCode: string;
  localNumber: string;
}

interface NewGolferFormState {
  ghinNumber: string;
  localNumber: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  gender: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  membershipCode: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface AdminGolferAddPanelProps {
  clubId: string;
  onCancel: () => void;
  onAdded: (message: string) => Promise<void> | void;
}

const inputClassName =
  "w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold";
const labelClassName = "mb-2 block text-xs uppercase tracking-[0.2em] text-ui-muted";

function createExistingSearchState(): ExistingSearchFormState {
  return {
    ghinOrEmail: "",
    firstName: "",
    lastName: "",
    membershipCode: "R",
    localNumber: "",
  };
}

function createNewGolferState(): NewGolferFormState {
  return {
    ghinNumber: "",
    localNumber: "",
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    gender: "M",
    dateOfBirth: "",
    email: "",
    phone: "",
    membershipCode: "R",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "United States",
  };
}

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
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

export function AdminGolferAddPanel({
  clubId,
  onCancel,
  onAdded,
}: AdminGolferAddPanelProps) {
  const [mode, setMode] = useState<Mode>("existing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [existingForm, setExistingForm] = useState<ExistingSearchFormState>(
    createExistingSearchState()
  );
  const [newGolferForm, setNewGolferForm] = useState<NewGolferFormState>(
    createNewGolferState()
  );

  const [runSearch, searchState] = useLazyQuery(SEARCH_EXISTING_GOLFERS, {
    fetchPolicy: "no-cache",
  });
  const [addExistingGolfer, addExistingState] = useMutation(ADD_EXISTING_GOLFER);
  const [addNewGolfer, addNewState] = useMutation(ADD_NEW_GOLFER);

  const searchResults = (searchState.data?.searchExistingGolfers ?? []) as GolferSearchResultRecord[];
  const isBusy = searchState.loading || addExistingState.loading || addNewState.loading;

  function resetMessages() {
    setErrorMessage(null);
  }

  async function handleSearch() {
    resetMessages();

    if (!existingForm.ghinOrEmail.trim() && !existingForm.lastName.trim()) {
      setErrorMessage("Provide GHIN, email, or last name to search.");
      return;
    }

    if (existingForm.firstName.trim() && !existingForm.lastName.trim()) {
      setErrorMessage("Last name required when searching by first name.");
      return;
    }

    try {
      await runSearch({
        variables: {
          input: {
            clubId,
            ghinOrEmail: existingForm.ghinOrEmail.trim() || undefined,
            firstName: existingForm.firstName.trim() || undefined,
            lastName: existingForm.lastName.trim() || undefined,
          },
        },
      });
    } catch (searchError) {
      setErrorMessage(searchError instanceof Error ? searchError.message : "Search failed.");
    }
  }

  async function handleAddExisting(result: GolferSearchResultRecord) {
    resetMessages();

    if (!result.ghinNumber) {
      setErrorMessage("Selected search result has no GHIN number. Use add new golfer instead.");
      return;
    }

    try {
      await addExistingGolfer({
        variables: {
          input: {
            clubId,
            ghinNumber: result.ghinNumber,
            membershipCode: existingForm.membershipCode.trim() || "R",
            localNumber: existingForm.localNumber.trim() || undefined,
          },
        },
      });
      setExistingForm(createExistingSearchState());
      await onAdded(`Golfer ${result.firstName} ${result.lastName} added to roster.`);
    } catch (mutationError) {
      setErrorMessage(
        mutationError instanceof Error ? mutationError.message : "Existing golfer add failed."
      );
    }
  }

  async function handleAddNew() {
    resetMessages();

    if (!newGolferForm.firstName.trim()) {
      setErrorMessage("First name required.");
      return;
    }
    if (!newGolferForm.lastName.trim()) {
      setErrorMessage("Last name required.");
      return;
    }
    if (!newGolferForm.email.trim()) {
      setErrorMessage("Email required.");
      return;
    }
    if (!newGolferForm.membershipCode.trim()) {
      setErrorMessage("Membership code required.");
      return;
    }

    try {
      await addNewGolfer({
        variables: {
          input: {
            clubId,
            ghinNumber: newGolferForm.ghinNumber.trim() || undefined,
            localNumber: newGolferForm.localNumber.trim() || undefined,
            firstName: newGolferForm.firstName.trim(),
            middleName: newGolferForm.middleName.trim() || undefined,
            lastName: newGolferForm.lastName.trim(),
            suffix: newGolferForm.suffix.trim() || undefined,
            gender: newGolferForm.gender,
            dateOfBirth: newGolferForm.dateOfBirth
              ? new Date(`${newGolferForm.dateOfBirth}T12:00:00.000Z`).toISOString()
              : undefined,
            email: newGolferForm.email.trim(),
            phone: newGolferForm.phone.trim() || undefined,
            membershipCode: newGolferForm.membershipCode.trim(),
            address: {
              addressLine1: newGolferForm.addressLine1.trim() || undefined,
              addressLine2: newGolferForm.addressLine2.trim() || undefined,
              city: newGolferForm.city.trim() || undefined,
              state: newGolferForm.state.trim() || undefined,
              postalCode: newGolferForm.postalCode.trim() || undefined,
              country: newGolferForm.country.trim() || undefined,
            },
          },
        },
      });
      setNewGolferForm(createNewGolferState());
      await onAdded(
        `Golfer ${newGolferForm.firstName.trim()} ${newGolferForm.lastName.trim()} created.`
      );
    } catch (mutationError) {
      setErrorMessage(
        mutationError instanceof Error ? mutationError.message : "New golfer add failed."
      );
    }
  }

  return (
    <section className="rounded-panel border bg-ui-card/90 p-8 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-brand-clay">Add golfer</p>
          <h3 className="mt-3 text-3xl font-semibold text-ui-ink">Search existing or create new</h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-ui-muted">
            Use existing search when golfer already has GHIN record. Create new when club needs fresh roster entry.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="rounded-full border border-ui-line bg-white px-5 py-3 text-sm font-semibold text-ui-ink hover:border-brand-gold disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <ModeButton
          active={mode === "existing"}
          label="Search existing"
          onClick={() => {
            resetMessages();
            setMode("existing");
          }}
        />
        <ModeButton
          active={mode === "new"}
          label="Add new golfer"
          onClick={() => {
            resetMessages();
            setMode("new");
          }}
        />
      </div>

      {errorMessage ? (
        <p className="mt-6 rounded-3xl border border-status-withdrawn/20 bg-status-withdrawn/8 px-5 py-4 text-sm text-status-withdrawn">
          {errorMessage}
        </p>
      ) : null}

      {mode === "existing" ? (
        <div className="mt-8 space-y-6">
          <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-5">
            <label className="block xl:col-span-2">
              <span className={labelClassName}>GHIN or email</span>
              <input
                value={existingForm.ghinOrEmail}
                onChange={(event) =>
                  setExistingForm((current) => ({ ...current, ghinOrEmail: event.target.value }))
                }
                placeholder="GHIN or email"
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>First name</span>
              <input
                value={existingForm.firstName}
                onChange={(event) =>
                  setExistingForm((current) => ({ ...current, firstName: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Last name</span>
              <input
                value={existingForm.lastName}
                onChange={(event) =>
                  setExistingForm((current) => ({ ...current, lastName: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={searchState.loading}
                className="w-full rounded-full bg-brand-green px-5 py-3 text-sm font-semibold text-white hover:bg-brand-green-light disabled:opacity-60"
              >
                {searchState.loading ? "Searching..." : "Search"}
              </button>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <label className="block">
              <span className={labelClassName}>Membership code</span>
              <input
                value={existingForm.membershipCode}
                onChange={(event) =>
                  setExistingForm((current) => ({ ...current, membershipCode: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Local number</span>
              <input
                value={existingForm.localNumber}
                onChange={(event) =>
                  setExistingForm((current) => ({ ...current, localNumber: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
          </section>

          <section className="space-y-4">
            {searchResults.length ? (
              searchResults.map((result, index) => (
                <article key={`${result.ghinNumber ?? result.email ?? "result"}-${index}`} className="rounded-3xl border bg-white/75 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-ui-ink">
                        {result.firstName} {result.lastName}
                      </p>
                      <div className="mt-2 grid gap-2 text-sm text-ui-muted md:grid-cols-2">
                        <p>GHIN: {result.ghinNumber ?? "—"}</p>
                        <p>Email: {result.email ?? "—"}</p>
                        <p>City: {[result.city, result.state].filter(Boolean).join(", ") || "—"}</p>
                        <p>Club: {result.currentClubName ?? "External / unknown"}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-2 lg:items-end">
                      <span className="rounded-full bg-brand-sand/60 px-3 py-1 text-xs font-semibold text-brand-clay">
                        {result.canAddToClub ? "Marked addable" : "Needs admin review"}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleAddExisting(result)}
                        disabled={addExistingState.loading || !result.ghinNumber}
                        className="rounded-full bg-brand-green px-4 py-2 text-xs font-semibold text-white hover:bg-brand-green-light disabled:opacity-50"
                      >
                        {addExistingState.loading ? "Adding..." : "Add to club"}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : searchState.called && !searchState.loading ? (
              <p className="rounded-3xl border bg-white/75 p-5 text-sm text-ui-muted">
                No matching golfers found.
              </p>
            ) : (
              <p className="rounded-3xl border bg-white/75 p-5 text-sm text-ui-muted">
                Search by GHIN, email, or last name to find existing golfer records.
              </p>
            )}
          </section>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className={labelClassName}>First name</span>
              <input
                value={newGolferForm.firstName}
                onChange={(event) =>
                  setNewGolferForm((current) => ({ ...current, firstName: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Middle name</span>
              <input
                value={newGolferForm.middleName}
                onChange={(event) =>
                  setNewGolferForm((current) => ({ ...current, middleName: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Last name</span>
              <input
                value={newGolferForm.lastName}
                onChange={(event) =>
                  setNewGolferForm((current) => ({ ...current, lastName: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Email</span>
              <input
                type="email"
                value={newGolferForm.email}
                onChange={(event) =>
                  setNewGolferForm((current) => ({ ...current, email: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Phone</span>
              <input
                value={newGolferForm.phone}
                onChange={(event) =>
                  setNewGolferForm((current) => ({ ...current, phone: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Gender</span>
              <select
                value={newGolferForm.gender}
                onChange={(event) =>
                  setNewGolferForm((current) => ({ ...current, gender: event.target.value }))
                }
                className={inputClassName}
              >
                <option value="M">M</option>
                <option value="F">F</option>
                <option value="OTHER">OTHER</option>
                <option value="PREFER_NOT_TO_SAY">PREFER_NOT_TO_SAY</option>
              </select>
            </label>
            <label className="block">
              <span className={labelClassName}>GHIN number</span>
              <input
                value={newGolferForm.ghinNumber}
                onChange={(event) =>
                  setNewGolferForm((current) => ({ ...current, ghinNumber: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Local number</span>
              <input
                value={newGolferForm.localNumber}
                onChange={(event) =>
                  setNewGolferForm((current) => ({ ...current, localNumber: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Membership code</span>
              <input
                value={newGolferForm.membershipCode}
                onChange={(event) =>
                  setNewGolferForm((current) => ({ ...current, membershipCode: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Date of birth</span>
              <input
                type="date"
                value={newGolferForm.dateOfBirth}
                onChange={(event) =>
                  setNewGolferForm((current) => ({ ...current, dateOfBirth: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Suffix</span>
              <input
                value={newGolferForm.suffix}
                onChange={(event) =>
                  setNewGolferForm((current) => ({ ...current, suffix: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
          </section>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className={labelClassName}>Address line 1</span>
              <input
                value={newGolferForm.addressLine1}
                onChange={(event) =>
                  setNewGolferForm((current) => ({ ...current, addressLine1: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Address line 2</span>
              <input
                value={newGolferForm.addressLine2}
                onChange={(event) =>
                  setNewGolferForm((current) => ({ ...current, addressLine2: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>City</span>
              <input
                value={newGolferForm.city}
                onChange={(event) =>
                  setNewGolferForm((current) => ({ ...current, city: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>State</span>
              <input
                value={newGolferForm.state}
                onChange={(event) =>
                  setNewGolferForm((current) => ({ ...current, state: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Postal code</span>
              <input
                value={newGolferForm.postalCode}
                onChange={(event) =>
                  setNewGolferForm((current) => ({ ...current, postalCode: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Country</span>
              <input
                value={newGolferForm.country}
                onChange={(event) =>
                  setNewGolferForm((current) => ({ ...current, country: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
          </section>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleAddNew()}
              disabled={addNewState.loading}
              className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white hover:bg-brand-green-light disabled:opacity-60"
            >
              {addNewState.loading ? "Creating..." : "Create golfer"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

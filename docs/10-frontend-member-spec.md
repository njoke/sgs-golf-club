# 10 — Frontend: Member Portal
**Domain:** Frontend — Member  
**Version:** 1.0  
**Screens:** 15 Login | 16 Dashboard | 17 Profile | 18 Post Score | 19 Score History | 20 Open Tournaments | 21 Tournament Registration

---

## Table of Contents
1. [Member Portal Strategy](#1-member-portal-strategy)
2. [MemberShell Layout](#2-membershell-layout)
3. [Screen Specifications](#7-screen-specifications)
4. [Member GraphQL Queries & Mutations](#4-member-graphql-queries--mutations)
5. [Responsive Design Rules](#5-responsive-design-rules)
6. [Verification](#6-verification)
7. [Acceptance Criteria](#7-acceptance-criteria)

---

## 1. Member Portal Strategy

The member portal is a **simplified, mobile-friendly** interface. Members can:
- View their own handicap and profile
- Post scores for themselves only
- View their own score history
- Browse and register for open tournaments

**Key constraints:**
- All GraphQL operations are scoped to `context.user.golferId`
- Members cannot view other golfers' data
- `currentHandicapIndex` always shows WHS disclaimer
- The member portal shares `/login` with the admin portal — role determines redirect

---

## 2. MemberShell Layout

File: `src/app/(member)/layout.tsx`

```tsx
import { MemberShell } from '@/components/member/MemberShell';
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <MemberShell>{children}</MemberShell>;
}
```

File: `src/components/member/MemberShell.tsx`

```tsx
'use client';
export function MemberShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MemberHeader />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {children}
      </main>
      <MemberNav />   {/* Bottom nav on mobile */}
    </div>
  );
}
```

**MemberHeader:**
- Left: Logo / Club name
- Right: User name + Logout

**MemberNav (bottom on mobile, sidebar on tablet+):**

| Icon | Label | Route |
|---|---|---|
| Home | Dashboard | `/member/dashboard` |
| User | My Profile | `/member/profile` |
| Golf | Post Score | `/member/scores/post` |
| Clock | Score History | `/member/scores/history` |
| Trophy | Tournaments | `/member/tournaments` |

---

## 3. Screen Specifications

---

### Screen 15 — Login (`/login`)

Shared with admin portal. Role determines redirect on success:
- `MEMBER` → `/member/dashboard`
- All admin roles → `/dashboard`

See `09-frontend-admin-spec.md` Screen 01 for implementation details.

---

### Screen 16 — Member Dashboard (`/member/dashboard`)

**Route:** `/member/dashboard`  
**Component:** `src/app/(member)/dashboard/page.tsx`

```
Queries:
  golfer(id: context.golferId) → load current HI + name
  openTournaments(clubId) → upcoming tournaments count
  golferScores(filter: { golferId, pageSize: 3 }) → last 3 scores

Layout:
  Welcome: "Welcome back, {firstName}!"

  Stat Cards (MemberStatCards component):
  ┌─────────────────┬──────────────────┬────────────────────┐
  │  Handicap Index │   Low HI (365)   │  Scores Posted     │
  │     13.1*       │      12.0        │       5            │
  └─────────────────┴──────────────────┴────────────────────┘
  * WHS disclaimer footnote below cards

  Recent Scores (last 3):
    Mini table: Date | Course | Score | Diff

  Upcoming Tournaments:
    Open tournaments count + "View All" link

  Quick Action Buttons:
    [Post a Score] → /member/scores/post
    [View My Scores] → /member/scores/history
    [Browse Tournaments] → /member/tournaments
```

**WHS Disclaimer text (always shown below HI stats):**
> "Handicap values are calculated using WHS formulas for club management purposes. Official USGA/GHIN certification requires a certified integration."

---

### Screen 17 — Member Profile (`/member/profile`)

**Route:** `/member/profile`  
**Component:** `src/app/(member)/profile/page.tsx`

```
Query: golfer(id: context.golferId)

Layout:
  Profile header: Avatar initials | Full Name | GHIN | Member Since

  Sections (view mode by default):
  ┌──────────────────────────────────┐
  │  Personal Information             │
  │  First | Middle | Last | Suffix  │
  │  Gender | Date of Birth          │
  ├──────────────────────────────────┤
  │  Contact Information              │
  │  Email | Phone                   │
  ├──────────────────────────────────┤
  │  Address                         │
  │  Street | City | State | Zip     │
  └──────────────────────────────────┘

  [Edit Profile] button → toggles to edit mode
    Editable: firstName, lastName, middleName, phone, address
    Non-editable: ghinNumber, email, membershipCode, membershipStatus

  [Save] → updateGolfer mutation (own record only)
  [Cancel] → revert to view mode

  Read-only card:
  ┌─────────────────────────────┐
  │  Membership                 │
  │  Status: Active             │
  │  Code: Regular (R)          │
  │  Digital Profile: None      │
  └─────────────────────────────┘
```

---

### Screen 18 — Member Post Score (`/member/scores/post`)

**Route:** `/member/scores/post`  
**Component:** `src/app/(member)/scores/post/page.tsx`

```
Pre-conditions:
  context.golferId is always used — member cannot post for others

Queries (on page load):
  golfer(id: golferId) → load current HI for course handicap display
  clubCourses(clubId) → home courses + tees

State:
  step: 1 | 2 | 3 (progressive form)

Step 1 — Course & Date:
  Date Played (date picker, max = today)
  Score Type: HOME | AWAY | COMPETITION (segmented control)
  Holes: 18 | 9 (segmented control)
  Course Lookup: Home Courses/Tees
    → Facility dropdown (from clubCourses)
    → Tee dropdown (filtered by gender + holes)
    → Auto-fill: C.R., Slope, Par
    → Compute + display: Course Handicap = HI × (Slope/113) + (CR - Par)

Step 2 — Score Entry:
  Entry Mode: Total Score | Hole by Hole (segmented)
  Total Score: single input for gross score
  Hole by Hole: responsive grid
    Row format: Hole # | Par | Stroke Index | Score input
    Running total shown below grid

Step 3 — Review & Submit:
  Summary card:
    Date | Course | Tee | C.R. | Slope | Par | Gross Score | Entry Mode
  [Post Score] button
  WHS disclaimer text

Mutation: postScore(input)
On success:
  Toast: "Score posted! Your handicap index has been updated."
  Navigate → /member/scores/history
On error: inline error message, stay on Step 3
```

---

### Screen 19 — Member Score History (`/member/scores/history`)

**Route:** `/member/scores/history`  
**Component:** `src/app/(member)/scores/history/page.tsx`

```
Query: golferScores(filter: { golferId: context.golferId, pageSize: 25 })

Filters (collapsible):
  Score Type (HOME | AWAY | COMPETITION | All)
  Date range (date pickers)

Table / Card list (cards on mobile, table on tablet+):
  Date | Type | Course/Tee | C.R./Slope | Score | Diff | Status

Status badges:
  POSTED → green
  WITHDRAWN → red
  MODIFIED → amber

Pagination: 25 per page, newest first

Note at top: "Withdrawn scores are shown but excluded from handicap calculation."

No withdraw/edit actions for members — read-only view
```

---

### Screen 20 — Open Tournaments (`/member/tournaments`)

**Route:** `/member/tournaments`  
**Component:** `src/app/(member)/tournaments/page.tsx`

```
Query: openTournaments(clubId)

Each tournament displayed as a TournamentCard component:
┌──────────────────────────────────┐
│  Spring Classic                  │
│  📅 June 15, 2026                │
│  🏌 Stroke Play                  │
│  👥 42 / 72 registered           │
│  💰 Entry Fee: $50               │
│  ⏰ Registration closes June 10  │
│  [Register Now]                  │
└──────────────────────────────────┘

Registration button states:
  Available → [Register Now] → /member/tournaments/[id]/register
  Already registered → [Registered ✓] (disabled, links to registration detail)
  Full → [Join Waitlist] → registration mutation with status WAITLISTED

For each tournament, also query:
  myTournamentRegistrations → check if member is already registered
```

---

### Screen 21 — Tournament Registration (`/member/tournaments/[id]/register`)

**Route:** `/member/tournaments/[id]/register`  
**Component:** `src/app/(member)/tournaments/[tournamentId]/register/page.tsx`

```
Queries:
  tournament(id) → load tournament details + eligibility rules
  golfer(id: golferId) → load current HI for eligibility check

Layout:
  Tournament header: Name | Date | Format | Entry Fee

  Pre-eligibility check (client-side, before form):
    If member's HI is outside min/maxHandicapIndex → show warning
    If gender restriction mismatch → show ineligible banner + disable form
    If already registered → show "Already Registered" state

  Registration Form:
    Preferred Tee (dropdown from course tees, filtered by gender)
    Email (pre-filled from golfer.email, editable)
    Phone (optional)
    Notes (optional text area)

    Summary card:
      Your HI: 13.1
      Course Handicap: (auto-calculated when tee selected)
      Entry Fee: $50.00

    [ ] I agree to the tournament terms and conditions (required checkbox)

    [Register] button (disabled until terms checked)

Mutation: registerForTournament(input)
On success:
  Toast: "Registration submitted! Status: Registered / Waitlisted"
  Navigate → /member/tournaments
On error:
  REGISTRATION_CLOSED → "Registration is no longer open."
  NOT_ELIGIBLE → "You do not meet the eligibility requirements."
  REGISTRATION_DUPLICATE → "You are already registered."
```

---

## 4. Member GraphQL Queries & Mutations

File: `src/graphql/queries/member.queries.ts`

```typescript
export const GET_MY_PROFILE = gql`
  query GetMyProfile($id: ID!) {
    golfer(id: $id) {
      id firstName middleName lastName suffix gender dateOfBirth
      email phone ghinNumber localNumber membershipCode membershipStatus
      currentHandicapIndex lowHandicapIndex lowHandicapDate
      address { addressLine1 addressLine2 city state postalCode country }
      createdAt
    }
  }
`;

export const GET_MEMBER_DASHBOARD = gql`
  query GetMemberDashboard($golferId: ID!, $clubId: ID!) {
    golfer(id: $golferId) {
      currentHandicapIndex lowHandicapIndex lowHandicapDate firstName
    }
    openTournaments(clubId: $clubId) { id name startDate }
    golferScores(filter: { golferId: $golferId, pageSize: 3 }) {
      nodes { datePlayed courseNameSnapshot grossScore differential status }
    }
  }
`;

export const GET_OPEN_TOURNAMENTS = gql`
  query GetOpenTournaments($clubId: ID!) {
    openTournaments(clubId: $clubId) {
      id name startDate format registrationCloseAt
      maxPlayers registeredPlayerCount entryFee
    }
  }
`;

export const GET_MY_REGISTRATIONS = gql`
  query GetMyRegistrations {
    myTournamentRegistrations {
      id tournamentId status paymentStatus registeredAt
    }
  }
`;
```

File: `src/graphql/mutations/member.mutations.ts`

```typescript
export const UPDATE_MY_PROFILE = gql`
  mutation UpdateMyProfile($id: ID!, $input: UpdateGolferInput!) {
    updateGolfer(id: $id, input: $input) {
      id firstName lastName phone
      address { addressLine1 city state postalCode }
    }
  }
`;

export const POST_SCORE = gql`
  mutation PostScore($input: PostScoreInput!) {
    postScore(input: $input) {
      id grossScore differential status datePlayed courseNameSnapshot
    }
  }
`;

export const REGISTER_FOR_TOURNAMENT = gql`
  mutation RegisterForTournament($input: RegisterForTournamentInput!) {
    registerForTournament(input: $input) {
      id status paymentStatus registeredAt
    }
  }
`;

export const CANCEL_REGISTRATION = gql`
  mutation CancelRegistration($id: ID!) {
    cancelTournamentRegistration(id: $id) { id status }
  }
`;
```

---

## 5. Responsive Design Rules

| Breakpoint | Layout |
|---|---|
| `< 640px` (mobile) | Single column, card-based lists, bottom nav |
| `640px–1024px` (tablet) | Two-column stat cards, sidebar nav |
| `> 1024px` (desktop) | Full table layout, sidebar nav |

**Mobile-specific rules:**
- Score history: cards instead of table rows
- Tournament list: full-width cards with tap targets ≥ 44px
- Post Score hole-by-hole: horizontal scroll grid or accordion per hole
- Bottom nav stays fixed on mobile (z-index: 50)
- Form inputs: font-size ≥ 16px to prevent iOS zoom on focus

**Shared patterns:**
- Max content width: `max-w-2xl` (672px) centered on member pages
- Use `Skeleton` loading states for data fetches
- Optimistic UI for score submission (show immediately, confirm on response)

---

## 6. Verification

```bash
# 1. Member login
open http://localhost:3000/login
# Log in as jared@safarigolfseattle.org / Member123!
# Expect: redirect to /member/dashboard

# 2. Dashboard shows correct HI and recent scores
open http://localhost:3000/member/dashboard
# Expect: HI = 13.1, last 3 scores from seed data, WHS disclaimer

# 3. Post a score
open http://localhost:3000/member/scores/post
# Select Cedar Irons / White (M) tee → gross 79 → post
# Expect: success toast + redirect to score history + HI recalculated

# 4. Score history
open http://localhost:3000/member/scores/history
# Expect: 6 scores (5 seeded + 1 just posted), newest first

# 5. Tournament registration
open http://localhost:3000/member/tournaments
# Expect: Spring Classic card with [Register Now]
# Click → fill form → check terms → Register
# Expect: "Registration submitted!" + status badge

# 6. Member cannot access admin routes
open http://localhost:3000/dashboard
# Expect: redirect to /login (or 403 page)
```

---

## 7. Acceptance Criteria

- [ ] Member login redirects to `/member/dashboard`
- [ ] Dashboard shows correct `currentHandicapIndex` with WHS disclaimer
- [ ] Dashboard shows last 3 scores
- [ ] Profile page is pre-populated with golfer data
- [ ] Profile edit saves successfully via `updateGolfer`
- [ ] Member cannot edit GHIN, email, or membershipStatus
- [ ] Post Score: Date Played defaults to today
- [ ] Post Score: Tee selection auto-fills C.R., Slope, Par
- [ ] Post Score: Hole-by-Hole requires exact number of scores matching `holes`
- [ ] Post Score: on success shows toast + navigates to history
- [ ] Post Score: member cannot set `golferId` to another member's ID
- [ ] Score History shows all statuses (POSTED, WITHDRAWN) but notes withdrawn
- [ ] Score History filters by type and date
- [ ] Open Tournaments shows only OPEN, non-expired tournaments
- [ ] Registration form shows eligibility warning if HI is outside bounds
- [ ] Registration form requires terms checkbox before enabling submit
- [ ] Duplicate registration shows "You are already registered."
- [ ] Full tournament shows "Join Waitlist" instead of "Register Now"
- [ ] Member portal is usable on a 375px mobile viewport

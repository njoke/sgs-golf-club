# 09 — Frontend: Admin Portal
**Domain:** Frontend — Admin  
**Version:** 1.0  
**Framework:** Next.js 14 App Router + TypeScript + Tailwind CSS + Apollo Client  
**Screens:** 01 Login | 02 Dashboard | 03 Roster | 04–06 Add Golfer | 07 Handicap Mgmt | 08 Post Score | 09 Profile | 10 Basic Info | 11 Home Courses | 12 Tournaments | 13 Create Tournament | 14 Registrations

---

## Table of Contents
1. [Apollo Client Setup](#1-apollo-client-setup)
2. [Auth Context & useAuth Hook](#2-auth-context--useauth-hook)
3. [Next.js Middleware](#3-nextjs-middleware)
4. [AdminShell Layout](#4-adminshell-layout)
5. [Color Palette & Tailwind Config](#5-color-palette--tailwind-config)
6. [Shared Components](#6-shared-components)
7. [Screen Specifications](#7-screen-specifications)
8. [Admin GraphQL Queries & Mutations](#8-admin-graphql-queries--mutations)
9. [Verification](#9-verification)
10. [Acceptance Criteria](#10-acceptance-criteria)

---

## 1. Apollo Client Setup

File: `src/lib/apollo/client.ts`

```typescript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
  credentials: 'include',  // httpOnly cookie sent automatically
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          golfers: { keyArgs: ['filter', ['clubId']] },  // Cache per club
          golferScores: { keyArgs: ['filter', ['golferId']] },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
    query:      { fetchPolicy: 'network-only' },  // Always fresh data for admin
  },
});
```

File: `src/lib/apollo/ApolloProvider.tsx`

```tsx
'use client';
import { ApolloProvider as BaseApolloProvider } from '@apollo/client';
import { apolloClient } from './client';

export function ApolloProvider({ children }: { children: React.ReactNode }) {
  return <BaseApolloProvider client={apolloClient}>{children}</BaseApolloProvider>;
}
```

---

## 2. Auth Context & useAuth Hook

File: `src/lib/auth/authContext.tsx`

```tsx
'use client';
import { createContext, useContext, useState, useEffect } from 'react';

interface AuthUser {
  userId: string;
  email: string;
  role: string;
  clubIds: string[];
  golferId?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  isMember: () => boolean;
  primaryClubId: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore user from localStorage (non-sensitive: userId, role, clubIds only)
    const stored = localStorage.getItem('sgs_user');
    if (stored) setUser(JSON.parse(stored));
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Call Apollo mutation → on success, store user in context + localStorage
    // JWT stored in httpOnly cookie by backend (Set-Cookie header)
  };

  const logout = () => {
    localStorage.removeItem('sgs_user');
    setUser(null);
    // Call logout mutation + redirect to /login
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      isAdmin: () => !!user && user.role !== 'MEMBER',
      isMember: () => user?.role === 'MEMBER',
      primaryClubId: user?.clubIds[0] ?? null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

---

## 3. Next.js Middleware

File: `frontend/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_PATHS  = ['/dashboard', '/manage', '/tournaments'];
const MEMBER_PATHS = ['/member'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('sgs_token')?.value;
  const { pathname } = request.nextUrl;

  const isAdminPath  = ADMIN_PATHS.some(p => pathname.startsWith(p));
  const isMemberPath = MEMBER_PATHS.some(p => pathname.startsWith(p));

  if ((isAdminPath || isMemberPath) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/manage/:path*', '/tournaments/:path*', '/member/:path*'],
};
```

---

## 4. AdminShell Layout

File: `src/app/(admin)/layout.tsx`

```tsx
import { AdminShell } from '@/components/admin/AdminShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
```

File: `src/components/admin/AdminShell.tsx`

```tsx
'use client';
export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopHeader />           {/* Logo + Club Selector + User Menu */}
      <div className="flex flex-1">
        <PrimaryNav />        {/* Manage | Account | Tournaments */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**TopHeader Props:**
- Logo: "SGS Golf Club"
- Center: Club dropdown (only shows if SUPER_ADMIN)
- Right: User name + role badge + Logout button

**PrimaryNav items:**

| Label | Route | Roles |
|---|---|---|
| Dashboard | `/dashboard` | All admin roles |
| Manage | `/manage/[clubId]/roster` | All admin roles |
| Account | `/manage/[clubId]/account` | CLUB_ADMIN, SUPER_ADMIN |
| Tournaments | `/tournaments` | All admin roles |

---

## 5. Color Palette & Tailwind Config

File: `frontend/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green:       '#2D5016',  // Primary — nav, buttons
          'green-light':'#4A7C23', // Hover states
          gold:        '#C8A951',  // Accent — badges, highlights
          'gold-light':'#DFC47A',  // Secondary accent
        },
        ui: {
          sidebar:     '#1E3A0F',  // Dark green sidebar
          'sidebar-hover': '#2D5016',
          header:      '#FFFFFF',
          surface:     '#F9FAFB',  // Page background
          card:        '#FFFFFF',
          border:      '#E5E7EB',
          muted:       '#6B7280',
        },
        status: {
          active:      '#15803D',  // Green
          inactive:    '#9CA3AF',  // Gray
          waitlisted:  '#D97706',  // Amber
          withdrawn:   '#DC2626',  // Red
          draft:       '#6B7280',
          open:        '#16A34A',
          closed:      '#DC2626',
          cancelled:   '#6B7280',
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

---

## 6. Shared Components

All shared components live in `src/components/shared/`.

### DataTable

```tsx
interface DataTableProps<T> {
  columns: Array<{ key: keyof T | string; header: string; render?: (row: T) => React.ReactNode }>;
  data: T[];
  isLoading: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}
```

### StatusBadge

```tsx
// Renders colored pill for membershipStatus, registrationStatus, scoreStatus
interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}
// Color mapping from status → Tailwind class via statusColorMap object
```

### Modal

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}
```

### Pagination

```tsx
interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}
```

### FilterPanel

```tsx
interface FilterPanelProps {
  filters: FilterConfig[];  // { label, type: 'text'|'select'|'date', key, options? }
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onClear: () => void;
}
```

### ConfirmDialog

```tsx
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
```

---

## 7. Screen Specifications

---

### Screen 01 — Login (`/login`)

**Component:** `src/app/(auth)/login/page.tsx`

```
State:
  email: string
  password: string
  isLoading: boolean
  errorMessage: string | null

Behavior:
  onSubmit → call login mutation
  On success → decode role from response
    MEMBER → router.push('/member/dashboard')
    All other → router.push('/dashboard')
  On failure → show "Invalid email or password."

Validation:
  Email: required, valid format
  Password: required, min 1 char
```

---

### Screen 02 — Dashboard (`/dashboard`)

**Component:** `src/app/(admin)/dashboard/page.tsx`

```
State: loaded club data, recent activity (from auditLogs)

Queries:
  myClubs → show club name + number
  auditLogs(filter: { pageSize: 5 }) → recent activity

Layout:
  Welcome banner: "Welcome back, {firstName}"
  Stat cards: Total Members | Active Members | Recent Scores | Open Tournaments
  Quick links: View Roster | Post Score | Create Tournament
```

---

### Screen 03 — Roster (`/manage/[clubId]/roster`)

**Component:** `RosterTable.tsx`

```
State:
  filters: { searchText, membershipStatus, membershipCode, gender, includeInactive }
  pagination: { page, pageSize: 25 }
  sortBy: 'lastName', sortDirection: 'ASC'

Query: golfers(filter: GolferRosterFilterInput)

Columns: GHIN | Local # | Name | Handicap Index | Status | Membership Code | Actions
Actions per row: View Detail | Deactivate (if ACTIVE) | Activate (if INACTIVE)

Header actions:
  + Add Golfer → opens AddGolferModal (Screen 04)
  Filter panel (collapsible)
  Export CSV (future)

Row click → navigate to /manage/[clubId]/golfer/[golferId]
```

---

### Screen 04 — Add Golfer Modal

```
Modal with two buttons:
  [Search for Existing Member] → Screen 05
  [Add New Member] → Screen 06

No query — UI only
```

---

### Screen 05 — Search Existing Golfer

```
Replaces modal content after clicking "Search for Existing Member"

Form fields:
  GHIN / Email (text)
  First Name (text)
  Last Name (text)

Validation: at least GHIN/Email OR Last Name must be filled

Query on submit: searchExistingGolfers(input)

Results table:
  Name | GHIN | Email | City | State | Can Add?

Button: [Add to Club] per eligible result
  → calls addExistingGolferToClub mutation
  → closes modal + refreshes roster
```

---

### Screen 06 — Add New Golfer

```
Replaces modal content after clicking "Add New Member"

Form sections:
  Personal: First Name*, Middle, Last Name*, Suffix, Gender*, Date of Birth
  Contact: Email*, Phone
  Membership: Membership Code*, GHIN Number, Local Number, Status

Required fields marked *

Mutation: addNewGolfer(input)

On success: close modal + refresh roster + show toast "Golfer added successfully"
On duplicate email/GHIN: show inline error below field
```

---

### Screen 07 — Handicap Management (`/manage/[clubId]/golfer/[golferId]`)

```
Query: golfer(id) + golferScores(filter: { golferId })

Layout:
  Page header: "{FirstName} {LastName}" + GHIN + Handicap Index badge
  4 tabs: [Handicap Management] [Post a Score] [Profile] [Audit Log]

Handicap Management tab:
  Stat bar: Current HI | Low HI | Low HI Date | Member Since
  Score history table:
    Columns: Flag | Type | Date | Score | C.R./Slope | PCC | Diff | ESR | Adj | Course/Tee | Actions
    Actions: Withdraw | Edit (CLUB_ADMIN only)
  Pagination: 25 per page
  WHS disclaimer text below table

Audit Log tab:
  Query: auditLogs(filter: { entityId: golferId })
  Table: Date | Action | Summary | Actor | Before/After
```

---

### Screen 08 — Post a Score (Admin) — Tab on Screen 07

```
Replaces content of "Post a Score" tab

State:
  form: { golferId, datePlayed, scoreType, holes, entryMode, courseSelection, ... }

Form flow:
  1. Date Played (date picker, default today)
  2. Score Type (segmented: HOME | AWAY | COMPETITION)
  3. Holes (segmented: 18 | 9)
  4. Course Lookup (radio: Home Courses/Tees | Search Course)
     → If Home: load clubCourses → select facility → select tee
     → Tee selection auto-fills C.R., Slope, Par
  5. Score Entry (segmented: Total Score | Hole by Hole)
     → Total: single gross score input
     → Hole by Hole: grid of 9 or 18 inputs
  6. [Post Score] button

Mutation: postScore(input)
On success: refresh score history tab + show toast
```

---

### Screen 09 — Golfer Profile — Tab on Screen 07

```
Replaces content of "Profile" tab

Displays full golfer record with edit mode toggle

Editable sections (inline edit):
  Personal: firstName, middleName, lastName, suffix, gender, dateOfBirth
  Contact: email, phone
  Address: addressLine1, addressLine2, city, state, postalCode
  Membership: membershipCode, localNumber, digitalProfileStatus

Read-only:
  GHIN Number | Membership Status | Status Date | Current HI | Low HI

Edit button → enable form inputs
Save → updateGolfer mutation
Cancel → revert to display mode
```

---

### Screen 10 — Account > Basic Information (`/manage/[clubId]/account`)

```
Query: club(id)

Sections:
  Basic Info: name, shortName, phone, email, website, hubspotCompanyId, handicapChairperson
  Read-only: clubNumber, ghpId, associationName, status, frontEndProvider
  Contacts section: list of contacts with contactType, name, email, phone, address

Edit mode → updateClub mutation → show toast on success

Left nav: [Primary] [Home Courses] [Membership Types]
```

---

### Screen 11 — Account > Home Courses (`/manage/[clubId]/account/home-courses`)

```
Query: clubCourses(clubId)

Table: Facility | Course | City | State | Default Male Tee | Default Female Tee | Primary | Actions
Actions: Edit | Set as Primary | Set Default Tees | Remove

[+ Add Home Course] button → inline form or modal:
  facilityName, courseName, city, state, isPrimaryFacility
  Tees: repeatable section with teeId, teeName, gender, par, courseRating, slopeRating
  defaultMaleTeeId (dropdown of M tees), defaultFemaleTeeId (dropdown of F tees)

Mutations: addHomeCourse | updateHomeCourse | removeHomeCourse | setPrimaryFacility | setDefaultTees
```

---

### Screen 12 — Tournament List (`/tournaments`)

```
Query: tournaments(clubId)

Filters: status, registrationStatus, date range

Table: Name | Date | Format | Reg Status | Registered/Max | Entry Fee | Actions
Actions:
  DRAFT → [Open Registration] | [Edit] | [Cancel]
  OPEN  → [Close Registration] | [View Registrations] | [Cancel]
  CLOSED → [View Registrations] | [Reopen] | [Cancel]

[+ Create Tournament] → /tournaments/create

Row click → /tournaments/[id]/registrations
```

---

### Screen 13 — Create Tournament (`/tournaments/create`)

```
Form fields:
  Name*, Description
  Start Date*, End Date
  Course (optional — link to a home course)
  Format* (Stroke Play | Stableford | Scramble | Match Play | Other)
  Registration Status (Draft | Open)
  Registration Open Date, Registration Close Date
  Max Players, Entry Fee
  Members Only toggle, Allow Guests toggle
  Eligibility section: Min HI, Max HI, Gender restriction, Membership Codes

[Save as Draft] → createTournament with status DRAFT
[Publish & Open] → createTournament with status OPEN (validates dates)
```

---

### Screen 14 — Registration Management (`/tournaments/[id]/registrations`)

```
Query: tournamentRegistrations(tournamentId) + tournament(id)

Header: Tournament name | Date | Reg Status | Registered count / Max

Registrations table:
  Player Name | GHIN | HI at Registration | Preferred Tee | Status | Payment | Registered At | Actions

Actions per row:
  WAITLISTED → [Approve] → approveTournamentRegistration
  REGISTERED → [Waitlist] | [Cancel Registration]
  PENDING    → [Approve] | [Cancel]

[Close Registration] button → closeTournamentRegistration mutation
[Cancel Tournament] button → cancelTournament mutation (with confirmation dialog)
```

---

## 8. Admin GraphQL Queries & Mutations

All query/mutation files in `src/graphql/queries/` and `src/graphql/mutations/`.

Key operations used by admin screens:

```typescript
// queries/golfer.queries.ts
export const GET_ROSTER = gql`
  query GetRoster($filter: GolferRosterFilterInput!) {
    golfers(filter: $filter) {
      nodes { id ghinNumber localNumber firstName lastName currentHandicapIndex membershipStatus membershipCode }
      pageInfo { totalCount page pageSize hasNextPage }
    }
  }
`;

export const GET_GOLFER = gql`
  query GetGolfer($id: ID!) {
    golfer(id: $id) {
      id ghinNumber localNumber firstName middleName lastName suffix
      gender dateOfBirth email phone membershipCode membershipStatus
      currentHandicapIndex lowHandicapIndex lowHandicapDate digitalProfileStatus
      address { addressLine1 addressLine2 city state postalCode country }
      createdAt updatedAt
    }
  }
`;
```

---

## 9. Verification

```bash
# 1. Admin login → check redirect to /dashboard
open http://localhost:3000/login
# Log in as admin@safarigolfseattle.org / Admin123!
# Expect: redirect to /dashboard

# 2. Access roster
open http://localhost:3000/manage/<clubId>/roster
# Expect: table showing seeded golfers (Abwawo, Aguko, Bryan, Gichuru, Kamau, Karanja)

# 3. Add a golfer (UI test)
# Click + Add Golfer → Add New Member → fill form → submit
# Expect: new row in roster, toast notification

# 4. Post a score
open http://localhost:3000/manage/<clubId>/golfer/<jared-id>
# Click Post a Score tab → select Cedar Irons / White tee → enter 82 → Post Score
# Expect: score appears in Handicap Management tab, HI recalculated

# 5. Unauthenticated access
open http://localhost:3000/dashboard  (without login)
# Expect: redirect to /login
```

---

## 10. Acceptance Criteria

- [ ] Login page collects email + password and shows "Invalid email or password." on failure
- [ ] Successful admin login redirects to `/dashboard`
- [ ] Unauthenticated access to any admin route redirects to `/login`
- [ ] Roster loads and displays seeded golfers with correct HI and status
- [ ] Roster search filters by name, GHIN, and email
- [ ] Add Golfer modal shows two choices: Search Existing and Add New
- [ ] Add New Golfer form validates required fields before submitting
- [ ] Golfer Detail page shows 4 tabs: Handicap Mgmt | Post Score | Profile | Audit Log
- [ ] Post Score form auto-fills C.R., Slope, Par from tee selection
- [ ] Score history in Handicap Management tab sorts newest first
- [ ] Account > Basic Information loads club data and allows saving editable fields
- [ ] Home Courses screen lists Cedar Irons with all 8 tees
- [ ] Tournament List shows Spring Classic with OPEN status and registered count
- [ ] Create Tournament validates open/close dates when status is OPEN
- [ ] Registration Management table shows waitlist/approve actions correctly

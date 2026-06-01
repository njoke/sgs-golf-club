# SGS Golf Club — Developer Handoff

**Date:** 2026-06-01  
**Project:** Safari Golf Seattle — Club Management Portal  
**Stack:** Node.js 20 / TypeScript / Apollo Server 4 / MongoDB 7 / Next.js 14 App Router / Tailwind / Apollo Client  
**Dev environment:** Docker Compose

---

## Current Snapshot

Repo no longer at skeleton stage.

- Backend core for specs 01–08 is implemented.
- Frontend has real auth, admin, and member routes for main MVP flows.
- Docker dev stack boots cleanly for backend/frontend/Mongo.
- Unit tests and containerized frontend compile/build checks have passed.

Main remaining work is feature depth, authenticated browser smoke, and finishing a few admin CRUD lanes.

---

## Quick Start

```bash
# Start dev stack
docker compose -f docker-compose.dev.yml up --build

# Seed/reset database after containers are up
docker exec sgs_backend_dev npm run seed -- --reset

# Restart services after code changes
docker compose -f docker-compose.dev.yml restart backend
docker compose -f docker-compose.dev.yml restart frontend
```

| Service | URL |
|---|---|
| GraphQL API | http://localhost:4000/graphql |
| Frontend | http://localhost:3000 |
| Health | http://localhost:4000/health |
| Mongo Express | http://localhost:8081 |

---

## Test Credentials

| User | Email | Password | Role |
|---|---|---|---|
| Ken Njonge | `admin@sgs.golf` | `Admin123!` | `CLUB_ADMIN` |
| Jared Abwawo | `jared@sgs.golf` | `Member123!` | `MEMBER` |

---

## Seed Baseline

Current seed flow includes:

- Safari Golf Seattle club
- admin + member users
- 6 roster golfers
- Cedar Irons Golf Club course with 8 tees
- Jared score history
- Spring Classic tournament
- 5 seeded tournament registrations

Important note:

- Live smoke was run earlier and DB was reset back to seeded baseline afterward.

---

## Implemented By Spec

| Spec | Domain | Status | Notes |
|---|---|---|---|
| 01 | Authentication | ✅ | JWT auth, login/logout, role + club access permissions |
| 02 | Club Management | ✅ | Queries + update mutation + audit writes |
| 03 | Golfer / Roster | ✅ | Roster filters, add/reactivate/update/activate/deactivate |
| 04 | Courses | ✅ | Course + tee models, repo, service, resolver, seed data |
| 05 | Score Posting | ✅ | Post/update/withdraw/history, 9-hole pairing, member self-post only |
| 06 | Handicap Engine | ✅ | Differential math, caps, ESR, 9-hole combine, recalculation service |
| 07 | Tournaments | ✅ | Tournament CRUD, registration workflow, waitlist/approve/cancel |
| 08 | Audit Logging | ✅ | Non-blocking audit writes across auth/club/golfer/course/score/tournament flows |
| 09 | Admin Frontend | 🟡 | Major MVP routes built; golfer detail/add-course/add-golfer flows still incomplete |
| 10 | Member Frontend | 🟡 | Main MVP routes built; needs authenticated browser smoke |
| 11 | Testing | 🟡 | Strong unit coverage + build checks; Karate/Cypress mostly scaffolding |

---

## Backend Status

### Built

- Auth stack:
  - `backend/src/auth/*`
  - `backend/src/services/auth.service.ts`
  - `backend/src/graphql/resolvers/auth.resolver.ts`
- Clubs:
  - `backend/src/models/club.model.ts`
  - `backend/src/services/club.service.ts`
  - `backend/src/graphql/resolvers/club.resolver.ts`
- Golfers:
  - `backend/src/models/golfer.model.ts`
  - `backend/src/services/golfer.service.ts`
  - `backend/src/graphql/resolvers/golfer.resolver.ts`
- Courses:
  - `backend/src/models/course.model.ts`
  - `backend/src/services/course.service.ts`
  - `backend/src/graphql/resolvers/course.resolver.ts`
- Scores + handicap:
  - `backend/src/models/score.model.ts`
  - `backend/src/services/score.service.ts`
  - `backend/src/services/handicap.service.ts`
  - `backend/src/handicap/*`
  - `backend/src/graphql/resolvers/score.resolver.ts`
- Tournaments + registrations:
  - `backend/src/models/tournament*.ts`
  - `backend/src/services/tournament.service.ts`
  - `backend/src/services/tournamentRegistration.service.ts`
  - `backend/src/graphql/resolvers/tournament.resolver.ts`
- Audit:
  - `backend/src/models/auditLog.model.ts`
  - `backend/src/services/audit.service.ts`
  - `backend/src/graphql/resolvers/auditLog.resolver.ts`

### Important backend rules

- Permissions live in service layer.
- `toPlainObject.ts` was added to avoid GraphQL returning raw Mongoose docs directly.
- Members can only:
  - post scores for themselves
  - register themselves for tournaments
  - view their own score history
  - edit only safe profile fields

### Member profile edit policy

`golferService.updateGolfer()` now allows member self-edit for only:

- `firstName`
- `middleName`
- `lastName`
- `phone`
- `address`

Restricted fields like `email`, `membershipCode`, `ghinNumber`, `gender`, etc. remain blocked for members.

### 9-hole score note

Frontend now asks `Front 9` vs `Back 9`.

Reason:

- backend differential math for 9-hole scores expects correct 9-hole rating/slope/par values
- full 18-hole tee values would be wrong for 9-hole posting

---

## Frontend Status

### Core foundation built

- cookie/localStorage auth session restore
- Apollo auth header wiring
- middleware route protection
- landing page + shared login page
- shared shells for admin/member
- shared loading/status/metric components

Key files:

- `frontend/src/lib/auth/authContext.tsx`
- `frontend/src/lib/auth/session.ts`
- `frontend/src/lib/apollo/client.ts`
- `frontend/src/middleware.ts`
- `frontend/src/app/layout.tsx`

### Admin routes built

- `/login`
- `/dashboard`
- `/manage/[clubId]/roster`
- `/manage/[clubId]/account`
- `/manage/[clubId]/account/home-courses`
- `/tournaments`
- `/tournaments/create`
- `/tournaments/[id]/registrations`

Key admin files:

- `frontend/src/app/(admin)/dashboard/page.tsx`
- `frontend/src/app/(admin)/manage/[clubId]/roster/page.tsx`
- `frontend/src/app/(admin)/manage/[clubId]/account/page.tsx`
- `frontend/src/app/(admin)/manage/[clubId]/account/home-courses/page.tsx`
- `frontend/src/app/(admin)/tournaments/page.tsx`
- `frontend/src/app/(admin)/tournaments/create/page.tsx`
- `frontend/src/app/(admin)/tournaments/[id]/registrations/page.tsx`

### Member routes built

- `/member/dashboard`
- `/member/profile`
- `/member/scores/post`
- `/member/scores/history`
- `/member/tournaments`
- `/member/tournaments/[tournamentId]/register`

Key member files:

- `frontend/src/app/member/dashboard/page.tsx`
- `frontend/src/app/member/profile/page.tsx`
- `frontend/src/app/member/scores/post/page.tsx`
- `frontend/src/app/member/scores/history/page.tsx`
- `frontend/src/app/member/tournaments/page.tsx`
- `frontend/src/app/member/tournaments/[tournamentId]/register/page.tsx`

### Docker/frontend fixes already done

- `frontend/next.config.ts` replaced with `frontend/next.config.mjs`
- frontend dev binds `0.0.0.0`
- root route exists and serves
- middleware moved to `frontend/src/middleware.ts`
- dev `node_modules` strategy uses baked Linux-native deps inside containers

---

## Verification Done

### Backend

Previously run:

- full backend unit suite: `44` passed
- targeted latest regression suite:
  - `docker exec sgs_backend_dev npm test -- --runInBand tests/unit/golfer.service.test.ts tests/unit/score.service.test.ts`
  - result: `8/8` tests passed

Key backend unit files:

- `backend/tests/unit/audit.service.test.ts`
- `backend/tests/unit/course.service.test.ts`
- `backend/tests/unit/golfer.service.test.ts`
- `backend/tests/unit/handicap.engine.test.ts`
- `backend/tests/unit/score.resolver.test.ts`
- `backend/tests/unit/score.service.test.ts`
- `backend/tests/unit/tournament.service.test.ts`
- `backend/tests/unit/tournamentRegistration.service.test.ts`

### Frontend

Passed in container:

- `docker exec sgs_frontend_dev ./node_modules/.bin/tsc --noEmit`
- `docker exec sgs_frontend_dev npm run build`

`next build` has completed successfully after latest admin/member route additions.

### Route protection smoke

Verified unauthenticated redirects:

- `/dashboard` -> `307 /login`
- `/member/dashboard` -> `307 /login`
- `/member/profile` -> `307 /login`
- `/member/tournaments` -> `307 /login`
- `/member/tournaments/demo/register` -> `307 /login`
- `/tournaments/create` -> `307 /login`
- `/tournaments/demo/registrations` -> `307 /login`
- `/manage/demo/account` -> `307 /login`
- `/manage/demo/account/home-courses` -> `307 /login`

### Earlier live API smoke that passed

Earlier live GraphQL smoke hit:

- admin/member login
- `myClubs`
- `clubCourses`
- `golfers`
- `postScore`
- `registerForTournament`
- `auditLogs`

Then DB reset back to seed baseline.

---

## Known Gaps

### Backend / API

- No major backend TODO block known for MVP core.
- More end-to-end/manual verification still helpful, especially around latest frontend flows.

### Frontend

Still incomplete or shallow:

- admin add golfer modal/flow
- admin golfer detail page with tabs
- admin score-post flow for golfer detail lane
- admin tournament edit flow
- admin add/edit course form
- account screen does not yet manage membership types
- contact editing on club account is basic, not polished

### Testing

- Karate features exist but not actively run against live stack in this latest pass
- Cypress smoke exists but does not cover new frontend flows
- no authenticated browser walkthrough done for latest admin/member pages

---

## Recommended Next Steps

Best next slice:

1. Add authenticated browser/manual smoke for:
   - admin login
   - member login
   - member post score
   - member tournament register
   - admin create tournament
   - admin manage registrations
   - admin update club/home-course defaults

After that:

2. Build admin golfer detail route with tabs:
   - handicap management
   - post score
   - profile
   - audit log

3. Build admin add golfer flow:
   - search existing
   - add new

4. Build add/edit home-course form

5. Expand Cypress/Karate beyond smoke scaffolding

---

## Notes For Next Developer

- Use `docs/*.md` specs as source of truth when behavior is ambiguous.
- If testing score posting, remember 9-hole flow depends on front/back-nine selection.
- If you run live mutations during smoke, reseed afterward if you want clean baseline:

```bash
docker exec sgs_backend_dev npm run seed -- --reset
```

- If frontend route protection seems broken, check `frontend/src/middleware.ts` first, not repo root.

---

## No Open Questions

No blocker question for next developer right now. Main need is execution depth and authenticated end-to-end verification, not missing architecture decisions.

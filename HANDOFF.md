# SGS Golf Club — Developer Handoff

**Date:** 2026-06-02  
**Project:** Safari Golf Seattle — Club Management Portal  
**Stack:** Node.js 20 / TypeScript / Apollo Server 4 / MongoDB 7 / Next.js 14 App Router / Tailwind / Apollo Client  
**Dev environment:** Docker Compose

---

## Current Snapshot

Repo no longer at skeleton stage.

- Backend MVP specs `01`-`08` are implemented.
- Admin and member frontend MVP flows are implemented and wired to live GraphQL.
- Dev stack now includes auto-run Cypress and Karate services on startup.
- Authenticated smoke and live API coverage are passing from containers.
- Original handoff implementation queue is complete.

Main remaining work is now backlog depth and extra polish, not core MVP gaps.

---

## Quick Start

```bash
# Start full dev stack
# This boots Mongo/backend/frontend and also runs Cypress + Karate containers
docker compose -f docker-compose.dev.yml up --build

# Reset DB to known seed baseline
docker exec sgs_backend_dev npm run seed -- --reset

# Restart app services after code changes
docker compose -f docker-compose.dev.yml restart backend
docker compose -f docker-compose.dev.yml restart frontend

# Safe production build check for frontend
# Use this instead of docker exec into live dev frontend container
docker compose -f docker-compose.dev.yml run --rm frontend npm run build
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
- baseline club membership types: `R`, `JR`, `ASSOC`
- admin + member users
- 6 roster golfers
- Cedar Irons Golf Club course with 8 tees
- Jared score history
- Spring Classic tournament
- 5 seeded tournament registrations

Important notes:

- Seed backfills missing `membershipTypes` on existing club docs.
- Latest smoke/live verification was run and DB reset back to seeded baseline afterward.

---

## Implemented By Spec

| Spec | Domain | Status | Notes |
|---|---|---|---|
| 01 | Authentication | ✅ | JWT auth, login/logout, role + club access permissions |
| 02 | Club Management | ✅ | Club update flow, contacts, membership types, audit writes |
| 03 | Golfer / Roster | ✅ | Roster filters, add/reactivate/update/activate/deactivate, golfer detail |
| 04 | Courses | ✅ | Course + tee models, service/resolver, admin add/edit UI |
| 05 | Score Posting | ✅ | Member self-post, admin post for golfer, withdraw/history, 9-hole pairing |
| 06 | Handicap Engine | ✅ | Differential math, caps, ESR, 9-hole combine, recalculation service |
| 07 | Tournaments | ✅ | Tournament CRUD, edit flow, registration workflow, waitlist/approve/cancel |
| 08 | Audit Logging | ✅ | Audit writes across core flows, golfer audit now includes score-linked rows |
| 09 | Admin Frontend | ✅ | Dashboard, account, home-courses, roster, golfer detail, tournaments |
| 10 | Member Frontend | ✅ | Dashboard, profile, score post/history, tournament register |
| 11 | Testing | ✅ | Unit/build checks, Cypress smoke, Karate live API, container auto-run |

---

## Major Completed Work

### Backend

- Club model/schema/service now support `membershipTypes`.
- Club resolver normalizes empty `membershipTypes` and `contacts`.
- Seed backfills membership types for existing seeded club docs.
- Golfer audit query now includes score-linked audit rows by expanding golfer score IDs.
- GraphQL error formatting unwraps Apollo `originalError`, so Karate/live API sees intended app error codes.

Key files:

- `backend/src/models/club.model.ts`
- `backend/src/graphql/schema.ts`
- `backend/src/services/club.service.ts`
- `backend/src/graphql/resolvers/club.resolver.ts`
- `backend/src/graphql/resolvers/auditLog.resolver.ts`
- `backend/src/repositories/auditLog.repository.ts`
- `backend/src/repositories/score.repository.ts`
- `backend/src/errors/formatGraphQLError.ts`
- `backend/seeds/clubs.seed.ts`

### Frontend

Admin:

- Club account page now supports:
  - membership type add/remove/edit
  - full contact add/remove/edit
  - polished read-only address display
- Home-course admin flow now supports:
  - add/edit course
  - tee add/remove
  - default male/female tees
  - primary facility toggle
  - front/back-9 rating data
- Golfer detail route now supports tabs for:
  - handicap snapshot
  - admin score posting
  - profile edit
  - audit log
- Roster now supports:
  - golfer detail links
  - add existing golfer to club
  - create new golfer
- Tournament flow now supports:
  - create
  - edit
  - registration management
  - updated success banners/links

Member:

- Dashboard, profile, score post/history, and tournament registration are implemented.

Infra/frontend:

- Browser GraphQL goes through same-origin `/api/graphql` proxy route.
- Dockerized browser tests now hit app same way real browser does.

Key frontend files:

- `frontend/src/app/(admin)/manage/[clubId]/account/page.tsx`
- `frontend/src/app/(admin)/manage/[clubId]/account/home-courses/page.tsx`
- `frontend/src/app/(admin)/manage/[clubId]/golfer/[golferId]/page.tsx`
- `frontend/src/app/(admin)/manage/[clubId]/roster/page.tsx`
- `frontend/src/app/(admin)/tournaments/page.tsx`
- `frontend/src/app/(admin)/tournaments/create/page.tsx`
- `frontend/src/app/(admin)/tournaments/[id]/edit/page.tsx`
- `frontend/src/app/(admin)/tournaments/[id]/registrations/page.tsx`
- `frontend/src/components/admin/CourseEditorPanel.tsx`
- `frontend/src/components/admin/AdminGolferAddPanel.tsx`
- `frontend/src/components/admin/AdminGolferScorePanel.tsx`
- `frontend/src/components/admin/TournamentEditorForm.tsx`
- `frontend/src/app/api/graphql/route.ts`
- `frontend/src/lib/apollo/client.ts`
- `frontend/src/lib/auth/authContext.tsx`

### Test Automation

- Cypress now auto-runs in dev stack startup.
- Karate now auto-runs in dev stack startup.
- Cypress smoke covers:
  - auth hydration
  - admin login
  - admin dashboard/account/home-course flows
  - membership type/contact management
  - tournament create/edit/manage flow
  - member score post
  - member tournament registration
- Karate live API suite passes against running backend.

Key test files:

- `tests/cypress/e2e/auth.cy.ts`
- `tests/cypress/e2e/admin/login.cy.ts`
- `tests/cypress/e2e/admin/account-management.cy.ts`
- `tests/cypress/e2e/admin/smoke.cy.ts`
- `tests/cypress/e2e/member/smoke.cy.ts`
- `tests/karate/src/test/resources/shared/bootstrap.feature`
- `tests/karate/src/test/resources/tournament/registration.feature`

---

## Verification Done

### Backend

Passed:

- `docker exec sgs_backend_dev npm run build`
- targeted audit regression:
  - `docker exec sgs_backend_dev npm test -- --runInBand tests/unit/audit.service.test.ts tests/unit/auditLog.repository.test.ts`
  - result: `5/5` passed

### Frontend

Passed:

- `docker exec sgs_frontend_dev ./node_modules/.bin/tsc --noEmit`
- isolated production build:
  - `docker compose -f docker-compose.dev.yml run --rm frontend npm run build`
  - result: passed through static generation and build traces

### Cypress

Passed:

- `docker exec sgs_backend_dev npm run seed -- --reset`
- `docker compose -f docker-compose.dev.yml up --force-recreate cypress`

Result:

- `5` specs
- `9` tests
- `9/9` passing
- `0` failing
- runtime about `5m 09s`

### Karate

Passed:

- `docker compose -f docker-compose.dev.yml up --force-recreate karate`

Result:

- `13/13` passing
- `BUILD SUCCESS`

### Route protection / runtime

Verified:

- unauthenticated protected routes redirect to `/login`
- frontend `/login` responds `200`
- `/api/graphql` proxy responds successfully in containerized runtime

---

## One Cave: `next build` In Live Dev Frontend Container

Important dev-only cave:

- `docker exec sgs_frontend_dev npm run build` can fail during `Collecting page data` with `PageNotFoundError` for routes like `/dashboard` or `/manage/[clubId]/account/home-courses`.
- Root cause is not current app code. It is conflict between live `next dev` process and `next build` sharing mounted `.next` volume inside `sgs_frontend_dev`.
- Isolated build works and is current source of truth:

```bash
docker compose -f docker-compose.dev.yml run --rm frontend npm run build
```

If someone wants to use `docker exec ... npm run build`, stop/restart frontend first or expect flaky `.next` state.

---

## Remaining Work

No blocker from original implementation plan remains.

Only optional next-step backlog items:

- expand Cypress beyond current smoke coverage
- add deeper Karate/live API scenarios beyond current MVP regression set
- improve tournament/admin UX polish
- if desired, reduce dev-container `.next` volume interference so live `docker exec sgs_frontend_dev npm run build` becomes reliable

---

## Notes For Next Developer

- Use `docs/*.md` specs as source of truth when behavior is ambiguous.
- For frontend production validation, prefer isolated build command from this handoff, not `docker exec` into live frontend dev container.
- If testing score posting, remember 9-hole flow depends on front/back-nine selection.
- If you run live mutations during manual smoke and want clean baseline afterward:

```bash
docker exec sgs_backend_dev npm run seed -- --reset
```

- If frontend route protection seems broken, check:
  - `frontend/src/middleware.ts`
  - `frontend/src/lib/auth/authContext.tsx`
  - `frontend/src/app/api/graphql/route.ts`

---

## No Open Questions

No blocker question for next developer right now.

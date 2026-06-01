# SGS Golf Club — Developer Handoff

**Date:** 2026-06-01  
**Project:** Safari Golf Seattle — Club Management Portal  
**Stack:** Node.js 20 / TypeScript / Apollo Server 4 / MongoDB 7 / Next.js 14 App Router  
**Dev environment:** Docker Compose  

---

## Quick Start

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up --build

# Seed database (run after containers are up)
docker exec sgs_backend_dev npm run seed -- --reset

# Restart backend after code changes
docker-compose -f docker-compose.dev.yml restart backend
```

| Service        | URL                           |
|----------------|-------------------------------|
| GraphQL API    | http://localhost:4000/graphql |
| Frontend       | http://localhost:3000         |
| Mongo Express  | http://localhost:8081         |

**Test credentials:**

| User               | Email              | Password    | Role        |
|--------------------|--------------------|-------------|-------------|
| Ken Njonge (admin) | admin@sgs.golf     | Admin123!   | CLUB_ADMIN  |
| Jared Abwawo       | jared@sgs.golf     | Member123!  | MEMBER      |

---

## What Is Built

### Spec 01 — Authentication ✅

**Files:**
- `backend/src/models/user.model.ts` — `IUser`, `UserRole`, `UserStatus`, Mongoose schema
- `backend/src/auth/jwt.ts` — `signToken`, `verifyToken`, `extractTokenFromHeader`
- `backend/src/auth/password.ts` — `hashPassword`, `comparePassword` (bcrypt)
- `backend/src/auth/permissions.ts` — `requireAuth`, `requireRole`, `requireClubAccess`, `requireOwnGolferOrAdmin`
- `backend/src/repositories/user.repository.ts` — `findByEmail`, `updateLastLogin`
- `backend/src/services/auth.service.ts` — `AuthService.login()`
- `backend/src/graphql/resolvers/auth.resolver.ts` — `login`, `logout` mutations

**Key rules:**
- JWT payload: `{ userId, email, role, clubIds[], golferId? }`; issuer `sgs-golf-club`; expiry `8h`
- Login failure always returns `"Invalid email or password."` — never reveals which field failed
- Permissions enforced at service layer, not resolver layer

**GraphQL:**
```graphql
mutation { login(input: { email: "...", password: "..." }) { token user { id email role clubIds } } }
mutation { logout { success message } }
```

---

### Spec 02 — Club Management ✅

**Files:**
- `backend/src/models/club.model.ts` — `IClub`, `IClubContact`, schema + 5 indexes
- `backend/src/repositories/club.repository.ts` — `findById`, `findByIds`, `findAllActive`, `update`, `create`
- `backend/src/services/club.service.ts` — `getMyClubs`, `getClubById`, `updateClub`
- `backend/src/graphql/resolvers/club.resolver.ts` — `myClubs`, `club(id)`, `updateClub`

**Seed data:** Safari Golf Seattle — `clubNumber: 16645`, `ghpId: 20793`

**Known stubs:** `updateClub` has a `// TODO: wire audit log (spec 08)` comment — no audit writes yet.

**GraphQL:**
```graphql
query { myClubs { id name clubNumber status } }
query { club(id: "...") { id name phone contacts { contactType name } } }
mutation { updateClub(id: "...", input: { phone: "..." }) { id phone updatedAt } }
```

---

### Spec 03 — Golfer & Roster Management ✅

**Files:**
- `backend/src/models/golfer.model.ts` — `IGolfer`, `IAddress`, Gender/MembershipStatus/DigitalProfileStatus enums
- `backend/src/repositories/golfer.repository.ts` — paginated roster filter, GHIN/email lookup, global search
- `backend/src/services/golfer.service.ts` — full CRUD + activate/deactivate + search
- `backend/src/graphql/resolvers/golfer.resolver.ts` — all queries and mutations

**Seed data:** 6 golfers (Jared Abwawo, Sal Aguko, Rodney Bryan, Maurice Gichuru, Moses Kamau, Lucy Karanja). `jared@sgs.golf` user is linked to Jared Abwawo's golfer record via `golferId`.

**Known stubs:** `addNewGolfer`, `updateGolfer`, `activateGolfer`, `deactivateGolfer` all have `// TODO: wire audit log (spec 08)` comments.

**`addExistingGolferToClub` MVP behavior:**
1. Search globally by GHIN number
2. If found inactive in target club → reactivate
3. If found in another club → clone record into target club
4. If already active in target club → throw `ALREADY_EXISTS`

**GraphQL:**
```graphql
query { golfers(filter: { clubId: "...", pageSize: 25 }) { nodes { id firstName lastName currentHandicapIndex } pageInfo { totalCount } } }
query { golfer(id: "...") { id firstName lastName currentHandicapIndex lowHandicapIndex } }
query { searchExistingGolfers(input: { clubId: "...", lastName: "Smith" }) { firstName lastName ghinNumber canAddToClub } }
mutation { addNewGolfer(input: { clubId: "...", firstName: "...", lastName: "...", gender: M, email: "...", membershipCode: "R" }) { id } }
mutation { activateGolfer(id: "...") { id membershipStatus } }
mutation { deactivateGolfer(id: "...", reason: "...") { id membershipStatus } }
```

---

## What Is NOT Built (Specs 04–11)

| Spec | Domain           | Status  | Notes                                                      |
|------|------------------|---------|------------------------------------------------------------|
| 04   | Courses          | ❌ TODO  | Course model, tee ratings, slope/rating per tee            |
| 05   | Score Posting    | ❌ TODO  | Depends on Course (04)                                     |
| 06   | Handicap Engine  | ❌ TODO  | WHS/GHIN math — suggested starting point (self-contained)  |
| 07   | Tournaments      | ❌ TODO  | Depends on Golfer (03) and Score (05)                      |
| 08   | Audit Logging    | ❌ TODO  | Stubs exist in club.service + golfer.service (3 TODOs)     |
| 09   | Admin Frontend   | ❌ TODO  | Next.js App Router skeleton only                           |
| 10   | Member Frontend  | ❌ TODO  | Skeleton only                                              |
| 11   | Testing          | ❌ TODO  | Karate auth feature stub + Cypress login stub exist        |

> **Suggested start:** Spec 06 (handicap engine) — pure math module, no DB dependencies. Build + unit test before wiring score post.

---

## Architecture Patterns — Follow These

### Layer order

```
Resolver → Service → Repository → Model
```

- **Resolvers:** thin — call service, map `_id → id`, return. No business logic.
- **Services:** auth checks + business rules. Call `requireAuth` / `requireRole` / `requireClubAccess` here.
- **Repositories:** pure DB queries. No auth, no business logic.
- **Permissions:** always call from service, never from resolver directly.

### Adding a new feature

1. Read the relevant `docs/XX-spec.md` first — treat it as ground truth
2. Create: `model` → `repository` → `service` → `resolver`
3. Merge typeDefs into `src/graphql/schema.ts` (single schema file)
4. Merge resolvers into `src/graphql/resolvers/index.ts`
5. Add seed data to `seeds/XX.seed.ts`, call from `seeds/index.ts`

### Error throwing

```typescript
// Always use AppError(message, ErrorCode, httpStatus)
throw new AppError("Club not found.", ErrorCodes.NOT_FOUND, 404);
```

### Resolver ID mapping pattern

```typescript
function mapGolfer(g: IGolfer) {
  return { ...g, id: g._id.toString(), clubId: g.clubId.toString() };
}
```

---

## Project Structure

```
sgs-golf-club/
├── backend/
│   ├── src/
│   │   ├── app.ts                   # Express + Apollo setup
│   │   ├── server.ts                # Entry point
│   │   ├── auth/
│   │   │   ├── jwt.ts
│   │   │   ├── password.ts
│   │   │   └── permissions.ts
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   └── env.ts               # Zod-validated env
│   │   ├── errors/
│   │   │   ├── AppError.ts
│   │   │   ├── errorCodes.ts
│   │   │   └── formatGraphQLError.ts
│   │   ├── graphql/
│   │   │   ├── context.ts           # JWT → user injection
│   │   │   ├── schema.ts            # ALL typeDefs in one file
│   │   │   └── resolvers/
│   │   │       ├── index.ts         # Merge point for all resolvers
│   │   │       ├── auth.resolver.ts
│   │   │       ├── club.resolver.ts
│   │   │       └── golfer.resolver.ts
│   │   ├── models/
│   │   │   ├── user.model.ts
│   │   │   ├── club.model.ts
│   │   │   └── golfer.model.ts
│   │   ├── repositories/
│   │   │   ├── user.repository.ts
│   │   │   ├── club.repository.ts
│   │   │   └── golfer.repository.ts
│   │   └── services/
│   │       ├── auth.service.ts
│   │       ├── club.service.ts
│   │       └── golfer.service.ts
│   └── seeds/
│       ├── index.ts                 # Seed runner (clubs → users → golfers)
│       ├── clubs.seed.ts
│       ├── users.seed.ts
│       └── golfers.seed.ts
├── frontend/
│   └── src/
│       ├── app/                     # Next.js App Router — route folders only, no UI built
│       ├── lib/
│       │   ├── apollo/              # Apollo Client + provider
│       │   └── auth/                # AuthContext + useAuth hook
│       └── utils/                   # formatHandicap, formatDate, formatScore
├── tests/
│   ├── karate/                      # GraphQL API tests (Karate 1.4) — auth login stub
│   ├── cypress/                     # E2E tests (Cypress 13) — admin login stub
│   └── k6/                          # Load tests — roster + post-score scripts
└── docs/                            # Spec files — source of truth for all features
```

---

## Environment Variables

`docker-compose.dev.yml` injects these into `sgs_backend_dev`:

| Variable       | Value (dev)                                        | Notes                    |
|----------------|----------------------------------------------------|--------------------------|
| `MONGODB_URI`  | `mongodb://mongodb:27017/sgs_golf_club`            |                          |
| `JWT_SECRET`   | `dev-secret-replace-in-prod-change-me`             | 42 chars, min 32 required |
| `JWT_EXPIRES_IN` | `8h`                                             |                          |
| `CORS_ORIGIN`  | `http://localhost:3000`                            |                          |
| `BCRYPT_ROUNDS`| `12` (default)                                     | Use `10` in test env     |

---

## Open TODOs

| Location | TODO |
|----------|------|
| `club.service.ts:updateClub` | Wire audit log after spec 08 |
| `golfer.service.ts:addNewGolfer` | Wire audit log after spec 08 |
| `golfer.service.ts:updateGolfer` | Wire audit log after spec 08 |
| `golfer.service.ts:activateGolfer` | Wire audit log after spec 08 |
| `golfer.service.ts:deactivateGolfer` | Wire audit log after spec 08 |
| `frontend/src/app/` | All route pages are empty stubs |
| Karate `karate-config.js` | Login helper needs real endpoint wired |
| Cypress `commands.ts` | `loginAsAdmin` helper stub needs real impl |

# 00 — Project Setup & Infrastructure
**Project:** SGS Golf Club Management Portal  
**Version:** 1.0  
**Date:** 2026-05-30  
**Status:** Greenfield — Start from scratch

---

## Table of Contents
1. [Confirmed Technology Decisions](#1-confirmed-technology-decisions)
2. [Repository Structure](#2-repository-structure)
3. [Full Folder Tree](#3-full-folder-tree)
4. [Environment Variables](#4-environment-variables)
5. [Docker Compose Configuration](#5-docker-compose-configuration)
6. [Initial Setup Commands](#6-initial-setup-commands)
7. [First-Run Verification](#7-first-run-verification)
8. [Acceptance Criteria](#8-acceptance-criteria)

---

## 1. Confirmed Technology Decisions

| Layer | Choice | Version Target |
|---|---|---|
| Frontend Framework | Next.js (App Router) | 14+ |
| Frontend Language | TypeScript | 5+ |
| Frontend Styling | Tailwind CSS | 3+ |
| GraphQL Client | Apollo Client | 3+ |
| Backend Runtime | Node.js | 20 LTS |
| Backend Language | TypeScript | 5+ |
| API Layer | GraphQL — Apollo Server | 4+ |
| Database | MongoDB | 7+ |
| ODM | Mongoose | 8+ |
| Auth | JWT — Email + Password | — |
| Password Hashing | bcrypt | — |
| Validation | Zod | — |
| Containerization | Docker Compose | — |
| E2E Testing | Cypress | 13+ |
| API Testing | Karate | 1.4+ |
| Schema Linting | Rover CLI (Apollo) | — |
| Unit/Integration | Jest + Supertest | — |
| Performance | k6 (portfolio bonus) | — |

> **Handicap Engine:** Full custom GHIN/WHS calculation engine built in-house per the Ghin-calculation.md specification.

---

## 2. Repository Structure

Use a **flat two-app structure**. No monorepo tooling required for MVP.

```
sgs-golf-club/
├── frontend/            # Next.js application
├── backend/             # Node.js + Apollo Server + MongoDB
├── tests/               # All test suites (Karate, Cypress, k6)
├── docker-compose.yml
├── docker-compose.dev.yml
├── .gitignore
└── README.md
```

> **Rule:** Do not introduce Turborepo, Nx, or pnpm workspaces for MVP. Keep the structure flat and approachable.

---

## 3. Full Folder Tree

### 3.1 Backend

```
backend/
├── src/
│   ├── app.ts                         # Apollo + Express app factory
│   ├── server.ts                      # HTTP server entry point
│   │
│   ├── config/
│   │   ├── env.ts                     # Zod-validated env loader
│   │   └── database.ts                # Mongoose connection
│   │
│   ├── graphql/
│   │   ├── schema.ts                  # Merged typeDefs
│   │   ├── context.ts                 # Context builder (auth user injection)
│   │   └── resolvers/
│   │       ├── index.ts               # Merged resolvers
│   │       ├── auth.resolver.ts
│   │       ├── club.resolver.ts
│   │       ├── golfer.resolver.ts
│   │       ├── course.resolver.ts
│   │       ├── score.resolver.ts
│   │       ├── handicap.resolver.ts
│   │       ├── tournament.resolver.ts
│   │       └── registration.resolver.ts
│   │
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── club.model.ts
│   │   ├── golfer.model.ts
│   │   ├── course.model.ts
│   │   ├── score.model.ts
│   │   ├── tournament.model.ts
│   │   ├── tournamentRegistration.model.ts
│   │   └── auditLog.model.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── club.service.ts
│   │   ├── golfer.service.ts
│   │   ├── course.service.ts
│   │   ├── score.service.ts
│   │   ├── handicap.service.ts        # GHIN/WHS engine orchestrator
│   │   ├── tournament.service.ts
│   │   ├── registration.service.ts
│   │   └── audit.service.ts
│   │
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   ├── club.repository.ts
│   │   ├── golfer.repository.ts
│   │   ├── course.repository.ts
│   │   ├── score.repository.ts
│   │   ├── tournament.repository.ts
│   │   ├── registration.repository.ts
│   │   └── auditLog.repository.ts
│   │
│   ├── handicap/                      # Standalone GHIN/WHS engine module
│   │   ├── engine.ts                  # Main orchestrator
│   │   ├── differential.ts            # Score differential calculation
│   │   ├── indexCalculator.ts         # HI table + truncation
│   │   ├── caps.ts                    # Soft + hard cap logic
│   │   ├── esr.ts                     # Exceptional Scoring Reduction
│   │   └── nineHole.ts               # 9-hole pairing
│   │
│   ├── validation/
│   │   ├── auth.validation.ts
│   │   ├── golfer.validation.ts
│   │   ├── course.validation.ts
│   │   ├── score.validation.ts
│   │   └── tournament.validation.ts
│   │
│   ├── auth/
│   │   ├── jwt.ts                     # sign + verify tokens
│   │   ├── password.ts                # bcrypt helpers
│   │   └── permissions.ts             # Role + club boundary checks
│   │
│   └── errors/
│       ├── AppError.ts
│       ├── errorCodes.ts
│       └── formatGraphQLError.ts
│
├── seeds/
│   ├── index.ts                       # Seed runner
│   ├── users.seed.ts
│   ├── clubs.seed.ts
│   ├── golfers.seed.ts
│   ├── courses.seed.ts
│   ├── scores.seed.ts
│   └── tournaments.seed.ts
│
├── tests/
│   ├── unit/
│   │   ├── handicap.engine.test.ts
│   │   ├── golfer.service.test.ts
│   │   ├── score.service.test.ts
│   │   └── tournament.service.test.ts
│   └── integration/
│       ├── auth.test.ts
│       ├── golfer.test.ts
│       ├── score.test.ts
│       └── tournament.test.ts
│
├── .env.example
├── jest.config.ts
├── tsconfig.json
├── package.json
├── Dockerfile
└── Dockerfile.dev
```

### 3.2 Frontend

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                        # Root layout
│   │   ├── globals.css
│   │   │
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx                  # Screen 01 / 15
│   │   │
│   │   ├── (admin)/                          # Admin portal group
│   │   │   ├── layout.tsx                    # AdminShell wrapper + auth guard
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx                  # Screen 02
│   │   │   ├── manage/
│   │   │   │   └── [clubId]/
│   │   │   │       ├── roster/
│   │   │   │       │   └── page.tsx          # Screen 03
│   │   │   │       ├── golfer/
│   │   │   │       │   └── [golferId]/
│   │   │   │       │       ├── page.tsx      # Screen 07 (Handicap Mgmt)
│   │   │   │       │       └── profile/
│   │   │   │       │           └── page.tsx  # Screen 09
│   │   │   │       └── account/
│   │   │   │           ├── page.tsx          # Screen 10 (Basic Info)
│   │   │   │           └── home-courses/
│   │   │   │               └── page.tsx      # Screen 11
│   │   │   └── tournaments/
│   │   │       ├── page.tsx                  # Screen 12
│   │   │       ├── create/
│   │   │       │   └── page.tsx              # Screen 13
│   │   │       └── [tournamentId]/
│   │   │           └── registrations/
│   │   │               └── page.tsx          # Screen 14
│   │   │
│   │   └── (member)/                         # Member portal group
│   │       ├── layout.tsx                    # MemberShell + auth guard
│   │       ├── dashboard/
│   │       │   └── page.tsx                  # Screen 16
│   │       ├── profile/
│   │       │   └── page.tsx                  # Screen 17
│   │       ├── scores/
│   │       │   ├── post/
│   │       │   │   └── page.tsx              # Screen 18
│   │       │   └── history/
│   │       │       └── page.tsx              # Screen 19
│   │       └── tournaments/
│   │           ├── page.tsx                  # Screen 20
│   │           └── [tournamentId]/
│   │               └── register/
│   │                   └── page.tsx          # Screen 21
│   │
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminShell.tsx
│   │   │   ├── TopHeader.tsx
│   │   │   ├── PrimaryNav.tsx
│   │   │   ├── Breadcrumbs.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── RosterTable.tsx
│   │   │   ├── GolferDetailTabs.tsx
│   │   │   ├── ScoreHistoryTable.tsx
│   │   │   ├── PostScoreForm.tsx
│   │   │   ├── AddGolferModal.tsx
│   │   │   ├── SearchGolferForm.tsx
│   │   │   ├── AddGolferForm.tsx
│   │   │   ├── HomeCourseTable.tsx
│   │   │   ├── TournamentTable.tsx
│   │   │   └── RegistrationTable.tsx
│   │   │
│   │   ├── member/
│   │   │   ├── MemberShell.tsx
│   │   │   ├── MemberNav.tsx
│   │   │   ├── MemberStatCards.tsx
│   │   │   ├── MemberScoreHistory.tsx
│   │   │   ├── TournamentCard.tsx
│   │   │   └── RegistrationForm.tsx
│   │   │
│   │   └── shared/
│   │       ├── Tabs.tsx
│   │       ├── DataTable.tsx
│   │       ├── StatCard.tsx
│   │       ├── StatusBadge.tsx
│   │       ├── FilterPanel.tsx
│   │       ├── Modal.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── FormSection.tsx
│   │       ├── FormField.tsx
│   │       ├── SegmentedControl.tsx
│   │       ├── EmptyState.tsx
│   │       ├── ActionMenu.tsx
│   │       └── Pagination.tsx
│   │
│   ├── lib/
│   │   ├── apollo/
│   │   │   ├── client.ts
│   │   │   └── ApolloProvider.tsx
│   │   └── auth/
│   │       ├── useAuth.ts
│   │       └── authContext.tsx
│   │
│   ├── graphql/
│   │   ├── queries/
│   │   │   ├── auth.queries.ts
│   │   │   ├── golfer.queries.ts
│   │   │   ├── course.queries.ts
│   │   │   ├── score.queries.ts
│   │   │   └── tournament.queries.ts
│   │   └── mutations/
│   │       ├── auth.mutations.ts
│   │       ├── golfer.mutations.ts
│   │       ├── score.mutations.ts
│   │       └── tournament.mutations.ts
│   │
│   ├── hooks/
│   │   ├── useRoster.ts
│   │   ├── useGolfer.ts
│   │   ├── useScores.ts
│   │   ├── useTournaments.ts
│   │   └── useCourses.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   └── utils/
│       ├── formatHandicap.ts
│       ├── formatDate.ts
│       └── formatScore.ts
│
├── public/
├── middleware.ts                             # Next.js route protection
├── tailwind.config.ts
├── next.config.ts
├── .env.local.example
├── tsconfig.json
├── package.json
├── Dockerfile
└── Dockerfile.dev
```

### 3.3 Tests

```
tests/
├── karate/                         # GraphQL API testing
│   ├── pom.xml
│   └── src/test/
│       ├── java/sgs/RunnerTest.java
│       └── resources/
│           ├── karate-config.js
│           ├── auth/
│           │   ├── login.feature
│           │   └── logout.feature
│           ├── golfer/
│           │   ├── roster.feature
│           │   ├── add-golfer.feature
│           │   └── update-golfer.feature
│           ├── score/
│           │   ├── post-score.feature
│           │   └── score-history.feature
│           └── tournament/
│               ├── create-tournament.feature
│               └── registration.feature
│
├── cypress/                        # E2E testing
│   ├── cypress.config.ts
│   ├── e2e/
│   │   ├── admin/
│   │   │   ├── login.cy.ts
│   │   │   ├── roster.cy.ts
│   │   │   ├── add-golfer.cy.ts
│   │   │   ├── post-score.cy.ts
│   │   │   └── tournament.cy.ts
│   │   └── member/
│   │       ├── login.cy.ts
│   │       ├── post-score.cy.ts
│   │       └── tournament-registration.cy.ts
│   ├── fixtures/
│   │   ├── admin-user.json
│   │   ├── golfer.json
│   │   └── tournament.json
│   └── support/
│       ├── commands.ts
│       └── e2e.ts
│
└── k6/                             # Performance testing (bonus)
    ├── roster-load.js
    └── post-score-load.js
```

---

## 4. Environment Variables

### 4.1 Backend `.env.example`

```bash
# Server
NODE_ENV=development
PORT=4000

# MongoDB
MONGODB_URI=mongodb://mongodb:27017/sgs_golf_club

# JWT
JWT_SECRET=replace-with-a-long-random-secret-min-32-chars
JWT_EXPIRES_IN=8h

# CORS
CORS_ORIGIN=http://localhost:3000

# Bcrypt
BCRYPT_ROUNDS=12
```

### 4.2 Frontend `.env.local.example`

```bash
# GraphQL API
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql

# App
NEXT_PUBLIC_APP_NAME=SGS Golf Club
```

> **Rule:** Never commit real `.env` files. Commit only `.env.example` / `.env.local.example` with placeholder values.

---

## 5. Docker Compose Configuration

### 5.1 `docker-compose.yml` (production)

```yaml
version: "3.9"

services:
  mongodb:
    image: mongo:7
    container_name: sgs_mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: sgs_golf_club

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: sgs_backend
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://mongodb:27017/sgs_golf_club
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 8h
      CORS_ORIGIN: http://localhost:3000
    depends_on:
      - mongodb

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: sgs_frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_GRAPHQL_URL: http://localhost:4000/graphql
    depends_on:
      - backend

volumes:
  mongo_data:
```

### 5.2 `docker-compose.dev.yml` (local development with hot reload)

```yaml
version: "3.9"

services:
  mongodb:
    image: mongo:7
    container_name: sgs_mongodb_dev
    ports:
      - "27017:27017"
    volumes:
      - mongo_data_dev:/data/db

  mongo-express:
    image: mongo-express
    container_name: sgs_mongo_express
    ports:
      - "8081:8081"
    environment:
      ME_CONFIG_MONGODB_SERVER: mongodb
      ME_CONFIG_BASICAUTH: false
    depends_on:
      - mongodb

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: sgs_backend_dev
    ports:
      - "4000:4000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
      MONGODB_URI: mongodb://mongodb:27017/sgs_golf_club
      JWT_SECRET: dev-secret-replace-in-prod
      JWT_EXPIRES_IN: 8h
      CORS_ORIGIN: http://localhost:3000
    depends_on:
      - mongodb
    command: npm run dev

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: sgs_frontend_dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    environment:
      NEXT_PUBLIC_GRAPHQL_URL: http://localhost:4000/graphql
    depends_on:
      - backend
    command: npm run dev

volumes:
  mongo_data_dev:
```

---

## 6. Initial Setup Commands

### 6.1 Backend `package.json` scripts

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "seed": "ts-node seeds/index.ts",
    "seed:reset": "ts-node seeds/index.ts --reset"
  }
}
```

### 6.2 Frontend `package.json` scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

### 6.3 Docker dev startup (recommended for all development)

```bash
# From project root
docker-compose -f docker-compose.dev.yml up --build

# In a second terminal — run seed data once containers are healthy
docker exec sgs_backend_dev npm run seed

# Tear down (preserves volumes)
docker-compose -f docker-compose.dev.yml down

# Tear down + wipe data
docker-compose -f docker-compose.dev.yml down -v
```

---

## 7. First-Run Verification

### 7.1 GraphQL endpoint responds

```bash
curl -s http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}' | jq
# Expected: { "data": { "__typename": "Query" } }
```

### 7.2 MongoDB accessible

```bash
# Mongo Express UI
open http://localhost:8081
# Expected: sgs_golf_club database visible
```

### 7.3 Seed admin login works

```bash
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(input: { email: \"admin@safarigolfseattle.org\", password: \"Admin123!\" }) { token user { email role } } }"
  }' | jq
# Expected: JWT token + { email, role: "CLUB_ADMIN" }
```

### 7.4 Frontend renders

```bash
open http://localhost:3000
# Expected: /login page renders without errors
# Admin login → redirects to /dashboard
# Member login → redirects to /member/dashboard
```

---

## 8. Acceptance Criteria

- [ ] `docker-compose -f docker-compose.dev.yml up --build` completes without errors
- [ ] MongoDB is accessible on port `27017`
- [ ] GraphQL endpoint returns `200 OK` at `http://localhost:4000/graphql`
- [ ] Frontend renders at `http://localhost:3000/login`
- [ ] `npm run seed` populates Safari Golf Seattle, golfers, Cedar Irons, scores, and Spring Classic
- [ ] Admin login returns a valid JWT
- [ ] Role determines portal redirect: `CLUB_ADMIN` → `/dashboard`, `MEMBER` → `/member/dashboard`
- [ ] Mongo Express accessible at `http://localhost:8081` (dev only)
- [ ] `.env.example` and `.env.local.example` exist; no real secrets committed

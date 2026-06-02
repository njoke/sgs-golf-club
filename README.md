# SGS Golf Club — Club Management Portal

A full-stack golf club management system built for Safari Golf Seattle. Covers member management, WHS-compliant handicap calculation, score posting, tournament administration, and a dual-portal UI for admins and members.

---

## Features

### Admin Portal
- **Club account management** — update club info, home course defaults, and membership settings
- **Roster management** — add, activate, deactivate, and search golfers with filtering
- **Tournament management** — create tournaments, manage registrations, approve waitlisted entries, and edit tournament details
- **Audit log viewer** — searchable, filterable log of all system actions across every domain

### Member Portal
- **Dashboard** — current handicap index, recent round history, and open tournaments at a glance
- **Score posting** — post 18-hole or 9-hole (front/back) scores with course and tee selection
- **Score history** — full history of posted rounds with differentials
- **Tournament registration** — browse open tournaments and register or withdraw
- **Profile management** — self-service update of contact and address info

### Backend / API
- **GraphQL API** — Apollo Server 4, single endpoint, fully typed schema
- **WHS handicap engine** — score differential calculation, low handicap index tracking, exceptional score reduction (ESR), 9-hole pairing, and automatic recalculation on every score change
- **Role-based access control** — `CLUB_ADMIN` and `MEMBER` roles enforced at the service layer
- **Audit logging** — non-blocking audit writes on every mutating operation
- **JWT authentication** — stateless auth with role and club claims

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Apollo Client |
| Backend | Node.js 20, TypeScript, Apollo Server 4, GraphQL |
| Database | MongoDB 7, Mongoose 8 |
| Auth | JWT, bcrypt |
| Validation | Zod |
| Testing | Jest (unit), Cypress (E2E), Karate (API) |
| Infrastructure | Docker Compose |

---

## Architecture

```
sgs-golf-club/
├── frontend/          # Next.js 14 App Router
│   └── src/
│       ├── app/
│       │   ├── (admin)/   # Admin portal routes
│       │   ├── (auth)/    # Login
│       │   └── member/    # Member portal routes
│       └── lib/
│           ├── apollo/    # Apollo Client setup
│           └── auth/      # Auth context + session restore
├── backend/
│   └── src/
│       ├── graphql/       # Schema + resolvers
│       ├── models/        # Mongoose models
│       ├── services/      # Business logic + permissions
│       └── handicap/      # WHS differential engine
├── tests/
│   ├── cypress/           # Browser smoke tests
│   └── karate/            # GraphQL API tests
└── docs/                  # Feature specifications
```

The frontend proxies GraphQL requests through a Next.js API route (`/api/graphql`), keeping the backend off the public network in both dev and production Docker setups.

---

## Quick Start

**Prerequisites:** Docker and Docker Compose

```bash
# Clone and start the dev stack (builds images, seeds the database, starts all services)
git clone <repo-url>
cd sgs-golf-club
docker compose -f docker-compose.dev.yml up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| GraphQL API | http://localhost:4000/graphql |
| Mongo Express | http://localhost:8081 |

The backend auto-seeds a demo club, users, golfers, course, and tournament on first boot.

### Reset to seed baseline

```bash
docker exec sgs_backend_dev npm run seed -- --reset
```

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Club Admin | `admin@sgs.golf` | `Admin123!` |
| Member | `jared@sgs.golf` | `Member123!` |

---

## Running Tests

```bash
# Backend unit tests (inside container)
docker exec sgs_backend_dev npm test

# Cypress E2E (runs automatically on dev stack startup)
docker compose -f docker-compose.dev.yml logs -f cypress

# Karate API tests
docker compose -f docker-compose.dev.yml logs -f karate
```

---

## Handicap Engine

The handicap engine implements the World Handicap System (WHS) rules:

- Score differential: `(113 / Slope) × (Adjusted Gross Score − Course Rating)`
- Handicap Index: best 8 of last 20 differentials, averaged and multiplied by 0.96
- Hard cap: max +5 over low handicap index over rolling 12 months
- Soft cap: above +3 triggers 50% reduction on the excess
- Exceptional Score Reduction (ESR): automatic index adjustment for outstanding rounds
- 9-hole support: scores posted as front or back nine are stored separately and combined into an 18-hole differential once both halves exist

---

## Environment Variables

Copy the example files to get started:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

The Docker dev stack sets all required variables inline — no `.env` file needed for local development.

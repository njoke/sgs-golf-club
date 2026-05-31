# SGS Golf Club Management Portal

Full-stack golf club management system with handicap tracking, tournament management, and member portal.

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS, Apollo Client |
| Backend | Node.js 20 LTS, TypeScript, Apollo Server 4, GraphQL |
| Database | MongoDB 7+, Mongoose 8+ |
| Auth | JWT, bcrypt |
| Validation | Zod |
| Containerization | Docker Compose |

## Quick Start (Development)

```bash
# Start all services with hot reload
docker-compose -f docker-compose.dev.yml up --build

# Seed database (in a second terminal, once containers are healthy)
docker exec sgs_backend_dev npm run seed

# Tear down
docker-compose -f docker-compose.dev.yml down

# Tear down + wipe data
docker-compose -f docker-compose.dev.yml down -v
```

## Services

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| GraphQL API | http://localhost:4000/graphql |
| Mongo Express | http://localhost:8081 (dev only) |
| MongoDB | localhost:27017 |

## Default Seed Credentials

| Role | Email | Password |
|---|---|---|
| Club Admin | admin@safarigolfseattle.org | Admin123! |

## Project Structure

```
sgs-golf-club/
├── frontend/       # Next.js application
├── backend/        # Node.js + Apollo Server + MongoDB
├── tests/          # Karate, Cypress, k6
├── docs/           # Specification documents
└── docker-compose*.yml
```

## Documentation

See `docs/` for full specifications:
- `00-project-setup.md` — Infrastructure & setup
- `01-auth-spec.md` — Authentication
- `02-club-spec.md` — Club management
- `03-golfer-spec.md` — Golfer management
- `04-course-spec.md` — Course management
- `05-score-spec.md` — Score posting
- `06-handicap-engine-spec.md` — GHIN/WHS handicap engine
- `07-tournament-spec.md` — Tournament management
- `08-audit-spec.md` — Audit logging
- `09-frontend-admin-spec.md` — Admin portal UI
- `10-frontend-member-spec.md` — Member portal UI
- `11-testing-spec.md` — Testing strategy

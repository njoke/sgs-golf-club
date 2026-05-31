# 08 — Audit Log
**Domain:** Audit  
**Version:** 1.0  
**Screens:** 07 Handicap Management — Audit Log Tab

---

## Table of Contents
1. [MongoDB AuditLog Model](#1-mongodb-auditlog-model)
2. [Audit Service](#2-audit-service)
3. [Trigger List — What Gets Audited](#3-trigger-list--what-gets-audited)
4. [GraphQL Schema — Audit](#4-graphql-schema--audit)
5. [AuditLog Repository](#5-auditlog-repository)
6. [AuditLog Resolver](#6-auditlog-resolver)
7. [MongoDB Indexes](#7-mongodb-indexes)
8. [Screen Mapping](#8-screen-mapping)
9. [Example Audit Log Entries](#9-example-audit-log-entries)
10. [Verification Commands](#10-verification-commands)
11. [Acceptance Criteria](#11-acceptance-criteria)

---

## 1. MongoDB AuditLog Model

### 1.1 TypeScript Interface

```typescript
// src/models/auditLog.model.ts

export type AuditEntityType =
  | 'GOLFER'
  | 'SCORE'
  | 'CLUB'
  | 'COURSE'
  | 'TOURNAMENT'
  | 'REGISTRATION'
  | 'USER';

export type AuditAction =
  // Golfer
  | 'GOLFER_CREATED'
  | 'GOLFER_UPDATED'
  | 'GOLFER_ACTIVATED'
  | 'GOLFER_DEACTIVATED'
  // Score
  | 'SCORE_POSTED'
  | 'SCORE_MODIFIED'
  | 'SCORE_WITHDRAWN'
  | 'SCORE_DELETED'
  // Handicap
  | 'HANDICAP_INDEX_UPDATED'
  | 'HANDICAP_INDEX_RECALCULATED'
  // Club
  | 'CLUB_UPDATED'
  // Course
  | 'COURSE_ADDED'
  | 'COURSE_UPDATED'
  | 'COURSE_REMOVED'
  // Tournament
  | 'TOURNAMENT_CREATED'
  | 'TOURNAMENT_UPDATED'
  | 'TOURNAMENT_CANCELLED'
  | 'TOURNAMENT_REGISTRATION_OPENED'
  | 'TOURNAMENT_REGISTRATION_CLOSED'
  // Registration
  | 'REGISTRATION_CREATED'
  | 'REGISTRATION_CANCELLED'
  | 'REGISTRATION_APPROVED'
  | 'REGISTRATION_WAITLISTED'
  // User
  | 'USER_LOGIN'
  | 'USER_LOGOUT';

export interface IAuditLog {
  _id: Types.ObjectId;
  clubId?: Types.ObjectId;
  actorUserId: Types.ObjectId;
  actorEmail: string;
  actorRole: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
```

### 1.2 Mongoose Schema

```typescript
const AuditLogSchema = new Schema<IAuditLog>(
  {
    clubId:       { type: Schema.Types.ObjectId, ref: 'Club' },
    actorUserId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorEmail:   { type: String, required: true },
    actorRole:    { type: String, required: true },
    entityType:   { type: String, required: true },
    entityId:     { type: String, required: true },
    action:       { type: String, required: true },
    summary:      { type: String, required: true },
    before:       { type: Schema.Types.Mixed, default: null },
    after:        { type: Schema.Types.Mixed, default: null },
    ipAddress:    String,
    userAgent:    String,
  },
  {
    timestamps: true,
    // Audit logs are append-only — disable updates
  }
);

// TTL index: auto-delete logs older than 3 years (optional — adjust as needed)
// AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 * 3 });

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
```

> **Rule:** Audit logs are **append-only**. Never update or delete individual log entries. Implement a TTL index for long-term retention management if needed.

---

## 2. Audit Service

File: `src/services/audit.service.ts`

```typescript
export interface CreateAuditLogParams {
  clubId?: string;
  actorUserId: string;
  actorEmail: string;
  actorRole: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string;
}

export class AuditService {
  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await AuditLog.create({
        clubId:      params.clubId ? new Types.ObjectId(params.clubId) : undefined,
        actorUserId: new Types.ObjectId(params.actorUserId),
        actorEmail:  params.actorEmail,
        actorRole:   params.actorRole,
        entityType:  params.entityType,
        entityId:    params.entityId,
        action:      params.action,
        summary:     params.summary,
        before:      params.before ?? null,
        after:       params.after ?? null,
        ipAddress:   params.ipAddress,
      });
    } catch (err) {
      // Audit failures should NEVER crash the main operation
      // Log to console or monitoring — do not rethrow
      console.error('[AuditService] Failed to write audit log:', err);
    }
  }
}
```

> **Critical Rule:** Always wrap audit log writes in try/catch. A failed audit log should never cause the parent mutation to fail.

### 2.1 Usage Pattern

Every service method that mutates state must call `auditService.log()` at the end of the operation:

```typescript
// Example in golfer.service.ts
const golfer = await this.repo.create({ ... });

await this.auditService.log({
  clubId: input.clubId,
  actorUserId: context.user!.userId,
  actorEmail:  context.user!.email,
  actorRole:   context.user!.role,
  entityType:  'GOLFER',
  entityId:    golfer._id.toString(),
  action:      'GOLFER_CREATED',
  summary:     `Golfer ${golfer.firstName} ${golfer.lastName} was added to the club.`,
  before: null,
  after:  { firstName: golfer.firstName, lastName: golfer.lastName, email: golfer.email },
});
```

### 2.2 Before/After Data Guidelines

| Action | Before | After |
|---|---|---|
| `GOLFER_CREATED` | `null` | `{ firstName, lastName, email, membershipCode }` |
| `GOLFER_UPDATED` | Selected changed fields only | Same fields, new values |
| `GOLFER_ACTIVATED` | `{ membershipStatus: 'INACTIVE' }` | `{ membershipStatus: 'ACTIVE' }` |
| `GOLFER_DEACTIVATED` | `{ membershipStatus: 'ACTIVE' }` | `{ membershipStatus: 'INACTIVE' }` |
| `SCORE_POSTED` | `null` | `{ grossScore, differential, datePlayed, courseNameSnapshot }` |
| `SCORE_WITHDRAWN` | `{ status: 'POSTED' }` | `{ status: 'WITHDRAWN' }` |
| `HANDICAP_INDEX_UPDATED` | `{ currentHandicapIndex: <old> }` | `{ currentHandicapIndex: <new> }` |
| `CLUB_UPDATED` | Changed fields only | Same fields, new values |
| `TOURNAMENT_CREATED` | `null` | `{ name, startDate, format, registrationStatus }` |

> **Rule:** Do not store sensitive PII in before/after fields. For golfer changes, exclude full address details. For user changes, never store passwords.

---

## 3. Trigger List — What Gets Audited

| Service | Mutation | Action |
|---|---|---|
| GolferService | `addNewGolfer` | `GOLFER_CREATED` |
| GolferService | `updateGolfer` | `GOLFER_UPDATED` |
| GolferService | `activateGolfer` | `GOLFER_ACTIVATED` |
| GolferService | `deactivateGolfer` | `GOLFER_DEACTIVATED` |
| ScoreService | `postScore` | `SCORE_POSTED` |
| ScoreService | `updateScore` | `SCORE_MODIFIED` |
| ScoreService | `withdrawScore` | `SCORE_WITHDRAWN` |
| HandicapService | `recalculateHandicapIndex` | `HANDICAP_INDEX_UPDATED` |
| ClubService | `updateClub` | `CLUB_UPDATED` |
| CourseService | `addHomeCourse` | `COURSE_ADDED` |
| CourseService | `updateHomeCourse` | `COURSE_UPDATED` |
| CourseService | `removeHomeCourse` | `COURSE_REMOVED` |
| TournamentService | `createTournament` | `TOURNAMENT_CREATED` |
| TournamentService | `updateTournament` | `TOURNAMENT_UPDATED` |
| TournamentService | `cancelTournament` | `TOURNAMENT_CANCELLED` |
| TournamentService | `openRegistration` | `TOURNAMENT_REGISTRATION_OPENED` |
| TournamentService | `closeRegistration` | `TOURNAMENT_REGISTRATION_CLOSED` |
| RegistrationService | `registerForTournament` | `REGISTRATION_CREATED` |
| RegistrationService | `cancelRegistration` | `REGISTRATION_CANCELLED` |
| RegistrationService | `approve` | `REGISTRATION_APPROVED` |
| RegistrationService | `waitlist` | `REGISTRATION_WAITLISTED` |

---

## 4. GraphQL Schema — Audit

Audit logs are **admin read-only**. Members cannot access them.

```graphql
type AuditLog {
  id: ID!
  clubId: ID
  actorEmail: String!
  actorRole: String!
  entityType: String!
  entityId: String!
  action: String!
  summary: String!
  before: JSON
  after: JSON
  createdAt: DateTime!
}

input AuditLogFilterInput {
  entityType: String
  entityId: String
  action: String
  actorUserId: ID
  dateFrom: DateTime
  dateTo: DateTime
  page: Int
  pageSize: Int
}

type AuditLogConnection {
  nodes: [AuditLog!]!
  pageInfo: PageInfo!
}

scalar JSON

type Query {
  auditLogs(filter: AuditLogFilterInput!): AuditLogConnection!
}
```

> **Note:** The `JSON` scalar requires installing `graphql-scalars` or a custom scalar definition. Use `graphql-scalars` package for the `JSON` type.

---

## 5. AuditLog Repository

```typescript
export class AuditLogRepository {

  async find(filter: AuditLogFilterInput): Promise<{ logs: IAuditLog[]; total: number }> {
    const query: FilterQuery<IAuditLog> = {};

    if (filter.entityType) query.entityType = filter.entityType;
    if (filter.entityId)   query.entityId   = filter.entityId;
    if (filter.action)     query.action      = filter.action;
    if (filter.actorUserId) query.actorUserId = new Types.ObjectId(filter.actorUserId);
    if (filter.dateFrom || filter.dateTo) {
      query.createdAt = {};
      if (filter.dateFrom) query.createdAt.$gte = filter.dateFrom;
      if (filter.dateTo)   query.createdAt.$lte = filter.dateTo;
    }

    const page = filter.page ?? 1;
    const pageSize = Math.min(filter.pageSize ?? 25, 100);
    const skip = (page - 1) * pageSize;

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      AuditLog.countDocuments(query),
    ]);

    return { logs, total };
  }
}
```

---

## 6. AuditLog Resolver

```typescript
export const auditLogResolvers = {
  Query: {
    auditLogs: async (
      _: unknown,
      { filter }: { filter: AuditLogFilterInput },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ['SUPER_ADMIN', 'CLUB_ADMIN', 'HANDICAP_CHAIR']);
      // If entityId is a golfer, validate club access for that golfer
      const { logs, total } = await auditLogRepo.find(filter);
      const page = filter.page ?? 1;
      const pageSize = filter.pageSize ?? 25;
      return {
        nodes: logs,
        pageInfo: { totalCount: total, page, pageSize,
          hasNextPage: page * pageSize < total, hasPreviousPage: page > 1 },
      };
    },
  },
};
```

---

## 7. MongoDB Indexes

```typescript
await AuditLog.collection.createIndex({ entityType: 1, entityId: 1, createdAt: -1 });
await AuditLog.collection.createIndex({ actorUserId: 1, createdAt: -1 });
await AuditLog.collection.createIndex({ clubId: 1, createdAt: -1 });
await AuditLog.collection.createIndex({ action: 1 });
await AuditLog.collection.createIndex({ createdAt: -1 });
```

---

## 8. Screen Mapping

### Screen 07 — Handicap Management > Audit Log Tab

**Route:** `/manage/[clubId]/golfer/[golferId]` → tab: `Audit Log`

**GraphQL call:**
```graphql
query GetGolferAuditLog($golferId: ID!) {
  auditLogs(filter: { entityId: $golferId, pageSize: 25 }) {
    nodes {
      id action summary actorEmail actorRole createdAt before after
    }
    pageInfo { totalCount page pageSize hasNextPage }
  }
}
```

**Table columns:** Date/Time | Action | Summary | Actor | Before → After

**Action display labels:**

| action | Display |
|---|---|
| `GOLFER_CREATED` | Golfer Created |
| `GOLFER_UPDATED` | Profile Updated |
| `GOLFER_ACTIVATED` | Activated |
| `GOLFER_DEACTIVATED` | Deactivated |
| `SCORE_POSTED` | Score Posted |
| `SCORE_MODIFIED` | Score Modified |
| `SCORE_WITHDRAWN` | Score Withdrawn |
| `HANDICAP_INDEX_UPDATED` | Handicap Index Updated |

---

## 9. Example Audit Log Entries

```json
// GOLFER_CREATED
{
  "entityType": "GOLFER",
  "entityId": "<golfer-id>",
  "action": "GOLFER_CREATED",
  "summary": "Golfer Jared Abwawo was added to the club.",
  "before": null,
  "after": { "firstName": "Jared", "lastName": "Abwawo", "email": "j_midimo@hotmail.com", "membershipCode": "R" },
  "actorEmail": "admin@safarigolfseattle.org",
  "actorRole": "CLUB_ADMIN"
}

// SCORE_POSTED
{
  "entityType": "SCORE",
  "entityId": "<score-id>",
  "action": "SCORE_POSTED",
  "summary": "Score 84 posted for golfer on The Classic Golf Club.",
  "before": null,
  "after": { "grossScore": 84, "differential": 11.9, "datePlayed": "2026-05-17", "courseNameSnapshot": "The Classic Golf Club" }
}

// HANDICAP_INDEX_UPDATED
{
  "entityType": "GOLFER",
  "entityId": "<golfer-id>",
  "action": "HANDICAP_INDEX_UPDATED",
  "summary": "Handicap Index recalculated after score posting.",
  "before": { "currentHandicapIndex": 13.5 },
  "after": { "currentHandicapIndex": 13.1 }
}

// GOLFER_DEACTIVATED
{
  "entityType": "GOLFER",
  "entityId": "<golfer-id>",
  "action": "GOLFER_DEACTIVATED",
  "summary": "Membership expired.",
  "before": { "membershipStatus": "ACTIVE" },
  "after": { "membershipStatus": "INACTIVE" }
}
```

---

## 10. Verification Commands

```bash
TOKEN="<admin-jwt>"
GOLFER_ID="<jared-abwawo-id>"

# 1. Load audit log for a golfer
curl -s -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ auditLogs(filter:{entityId:\\\"$GOLFER_ID\\\",pageSize:25}){nodes{action summary actorEmail actorRole createdAt}pageInfo{totalCount}} }\"}" | jq

# 2. Filter by action
curl -s -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ auditLogs(filter:{entityId:\\\"$GOLFER_ID\\\",action:\\\"SCORE_POSTED\\\"}){nodes{action summary createdAt}} }\"}" | jq

# 3. Member tries to access audit log — expect FORBIDDEN
MEMBER_TOKEN="<member-jwt>"
curl -s -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ auditLogs(filter:{entityId:\\\"$GOLFER_ID\\\"}){nodes{action}} }\"}" | jq
```

---

## 11. Acceptance Criteria

- [ ] Every mutating service call writes an audit log entry
- [ ] Audit log write failures do NOT fail the parent mutation
- [ ] `auditLogs(filter: { entityId: <golferId> })` returns all logs for that golfer, newest first
- [ ] `auditLogs` is accessible only to `SUPER_ADMIN`, `CLUB_ADMIN`, `HANDICAP_CHAIR`
- [ ] `MEMBER` role returns `FORBIDDEN` on `auditLogs`
- [ ] After posting a score, two audit entries exist: `SCORE_POSTED` + `HANDICAP_INDEX_UPDATED`
- [ ] `before` and `after` fields contain only non-sensitive changed data
- [ ] Audit log entries cannot be updated or deleted via the API
- [ ] Paginated — default 25 per page, max 100

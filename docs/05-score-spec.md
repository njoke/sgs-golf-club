# 05 — Score Posting & History
**Domain:** Score  
**Version:** 1.0  
**Screens:** 08 Post Score (Admin) | 07 Handicap Management Score History | 18 Member Post Score | 19 Member Score History

---

## Table of Contents
1. [MongoDB Score Model](#1-mongodb-score-model)
2. [GraphQL Schema — Score](#2-graphql-schema--score)
3. [Score Repository](#3-score-repository)
4. [Score Service — Business Rules](#4-score-service--business-rules)
5. [Score Resolver](#5-score-resolver)
6. [MongoDB Indexes](#6-mongodb-indexes)
7. [Screen Mapping](#7-screen-mapping)
8. [Seed Scores](#8-seed-scores)
9. [Verification Commands](#9-verification-commands)
10. [Acceptance Criteria](#10-acceptance-criteria)

---

## 1. MongoDB Score Model

### 1.1 TypeScript Interface

```typescript
// src/models/score.model.ts

export type ScoreType = 'HOME' | 'AWAY' | 'COMPETITION';
export type ScoreEntryMode = 'TOTAL_SCORE' | 'HOLE_BY_HOLE';
export type ScoreStatus = 'POSTED' | 'MODIFIED' | 'WITHDRAWN' | 'DELETED' | 'PENDING_REVIEW';

export interface IScore {
  _id: Types.ObjectId;
  clubId: Types.ObjectId;
  golferId: Types.ObjectId;
  courseId?: Types.ObjectId;       // Optional — some away scores may not link to a stored course
  teeId?: string;
  datePlayed: Date;
  scoreType: ScoreType;
  holes: number;                   // 9 or 18
  entryMode: ScoreEntryMode;
  grossScore: number;
  adjustedGrossScore?: number;
  holeScores?: number[];           // Array of 9 or 18 hole scores
  courseRating: number;
  slopeRating: number;
  par: number;
  pcc?: number;                    // Playing Conditions Calculation adjustment
  differential?: number;           // Calculated and stored
  esr?: number;                    // Exceptional Score Reduction flag value
  status: ScoreStatus;
  courseNameSnapshot: string;      // Store name at time of posting
  teeNameSnapshot: string;
  postedByUserId: Types.ObjectId;
  postedByRole: string;
  isTournamentScore: boolean;
  tournamentId?: Types.ObjectId;
  isNineHole: boolean;
  pairedWithScoreId?: Types.ObjectId;  // For 9-hole pairing
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.2 Mongoose Schema

```typescript
const ScoreSchema = new Schema<IScore>(
  {
    clubId:              { type: Schema.Types.ObjectId, ref: 'Club', required: true },
    golferId:            { type: Schema.Types.ObjectId, ref: 'Golfer', required: true },
    courseId:            { type: Schema.Types.ObjectId, ref: 'Course' },
    teeId:               String,
    datePlayed:          { type: Date, required: true },
    scoreType:           { type: String, enum: ['HOME','AWAY','COMPETITION'], required: true },
    holes:               { type: Number, enum: [9, 18], required: true },
    entryMode:           { type: String, enum: ['TOTAL_SCORE','HOLE_BY_HOLE'], required: true },
    grossScore:          { type: Number, required: true, min: 1 },
    adjustedGrossScore:  Number,
    holeScores:          [Number],
    courseRating:        { type: Number, required: true },
    slopeRating:         { type: Number, required: true, min: 55, max: 155 },
    par:                 { type: Number, required: true },
    pcc:                 Number,
    differential:        Number,
    esr:                 Number,
    status:              { type: String, enum: ['POSTED','MODIFIED','WITHDRAWN','DELETED','PENDING_REVIEW'], default: 'POSTED' },
    courseNameSnapshot:  { type: String, required: true },
    teeNameSnapshot:     { type: String, required: true },
    postedByUserId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    postedByRole:        { type: String, required: true },
    isTournamentScore:   { type: Boolean, default: false },
    tournamentId:        { type: Schema.Types.ObjectId, ref: 'Tournament' },
    isNineHole:          { type: Boolean, default: false },
    pairedWithScoreId:   { type: Schema.Types.ObjectId, ref: 'Score' },
  },
  { timestamps: true }
);

export const Score = model<IScore>('Score', ScoreSchema);
```

---

## 2. GraphQL Schema — Score

```graphql
enum ScoreType { HOME AWAY COMPETITION }
enum ScoreEntryMode { TOTAL_SCORE HOLE_BY_HOLE }
enum ScoreStatus { POSTED MODIFIED WITHDRAWN DELETED PENDING_REVIEW }

type Score {
  id: ID!
  clubId: ID!
  golferId: ID!
  courseId: ID
  teeId: ID
  datePlayed: DateTime!
  scoreType: ScoreType!
  holes: Int!
  entryMode: ScoreEntryMode!
  grossScore: Int!
  adjustedGrossScore: Int
  holeScores: [Int!]
  courseRating: Float!
  slopeRating: Int!
  par: Int!
  pcc: Float
  differential: Float
  esr: Float
  status: ScoreStatus!
  courseNameSnapshot: String!
  teeNameSnapshot: String!
  postedByRole: String!
  isTournamentScore: Boolean!
  isNineHole: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type ScoreConnection {
  nodes: [Score!]!
  pageInfo: PageInfo!
}

input ScoreHistoryFilterInput {
  golferId: ID!
  status: ScoreStatus
  dateFrom: DateTime
  dateTo: DateTime
  scoreType: ScoreType
  page: Int
  pageSize: Int
}

input PostScoreInput {
  clubId: ID!
  golferId: ID!
  datePlayed: DateTime!
  scoreType: ScoreType!
  holes: Int!
  entryMode: ScoreEntryMode!
  courseId: ID
  teeId: ID
  courseName: String!
  teeName: String!
  grossScore: Int!
  adjustedGrossScore: Int
  holeScores: [Int!]
  courseRating: Float!
  slopeRating: Int!
  par: Int!
  isTournamentScore: Boolean
  tournamentId: ID
}

type Query {
  golferScores(filter: ScoreHistoryFilterInput!): ScoreConnection!
  score(id: ID!): Score
}

type Mutation {
  postScore(input: PostScoreInput!): Score!
  updateScore(id: ID!, input: PostScoreInput!): Score!
  withdrawScore(id: ID!, reason: String): Score!
}
```

---

## 3. Score Repository

File: `src/repositories/score.repository.ts`

```typescript
export class ScoreRepository {

  async findByGolfer(filter: ScoreHistoryFilterInput): Promise<{ scores: IScore[]; total: number }> {
    const query: FilterQuery<IScore> = {
      golferId: filter.golferId,
      status: { $nin: ['DELETED'] },  // Never show deleted scores
    };

    if (filter.status) query.status = filter.status;
    if (filter.scoreType) query.scoreType = filter.scoreType;
    if (filter.dateFrom || filter.dateTo) {
      query.datePlayed = {};
      if (filter.dateFrom) query.datePlayed.$gte = filter.dateFrom;
      if (filter.dateTo) query.datePlayed.$lte = filter.dateTo;
    }

    const page = filter.page ?? 1;
    const pageSize = Math.min(filter.pageSize ?? 25, 100);
    const skip = (page - 1) * pageSize;

    const [scores, total] = await Promise.all([
      Score.find(query).sort({ datePlayed: -1 }).skip(skip).limit(pageSize).lean(),
      Score.countDocuments(query),
    ]);

    return { scores, total };
  }

  // Last N differentials for handicap calculation (excludes withdrawn/deleted)
  async getLastNDifferentials(golferId: string, limit = 20): Promise<number[]> {
    const scores = await Score.find({
      golferId,
      status: { $in: ['POSTED', 'MODIFIED'] },
      differential: { $ne: null },
      isNineHole: false,  // Only paired/full 18-hole
    })
      .sort({ datePlayed: -1 })
      .limit(limit)
      .select('differential')
      .lean();

    return scores.map(s => s.differential!);
  }

  async findById(id: string): Promise<IScore | null> {
    return Score.findById(id).lean();
  }

  async create(data: Partial<IScore>): Promise<IScore> {
    return Score.create(data);
  }

  async update(id: string, data: Partial<IScore>): Promise<IScore | null> {
    return Score.findByIdAndUpdate(id, data, { new: true }).lean();
  }
}
```

---

## 4. Score Service — Business Rules

File: `src/services/score.service.ts`

### 4.1 Post Score

```typescript
async postScore(input: PostScoreInput, context: GraphQLContext): Promise<IScore> {
  requireAuth(context);
  requireClubAccess(context, input.clubId);

  // Members can only post for themselves
  if (context.user!.role === 'MEMBER' && context.user!.golferId !== input.golferId) {
    throw new AppError('FORBIDDEN', 'Members can only post scores for themselves.', 403);
  }

  // Validate required fields
  if (![9, 18].includes(input.holes)) {
    throw new AppError('VALIDATION_ERROR', 'Holes must be 9 or 18.', 400);
  }
  if (input.grossScore < 1) {
    throw new AppError('VALIDATION_ERROR', 'Gross score must be a positive number.', 400);
  }
  if (input.slopeRating < 55 || input.slopeRating > 155) {
    throw new AppError('VALIDATION_ERROR', 'Slope rating must be between 55 and 155.', 400);
  }
  if (!input.datePlayed) {
    throw new AppError('VALIDATION_ERROR', 'Date played is required.', 400);
  }

  // Validate hole scores if HOLE_BY_HOLE
  if (input.entryMode === 'HOLE_BY_HOLE') {
    if (!input.holeScores || input.holeScores.length !== input.holes) {
      throw new AppError('VALIDATION_ERROR', `Exactly ${input.holes} hole scores required.`, 400);
    }
  }

  // Golfer must be active (unless admin override in future)
  const golfer = await this.golferRepo.findById(input.golferId);
  if (!golfer) throw new AppError('GOLFER_NOT_FOUND', 'Golfer not found.', 404);
  if (golfer.membershipStatus !== 'ACTIVE') {
    throw new AppError('VALIDATION_ERROR', 'Cannot post score for an inactive golfer.', 400);
  }

  // Calculate adjusted gross score from hole-by-hole data if provided
  let adjustedGrossScore = input.adjustedGrossScore ?? input.grossScore;
  if (input.entryMode === 'HOLE_BY_HOLE' && input.holeScores) {
    adjustedGrossScore = this.handicapEngine.computeAdjustedGrossFromHoles(
      input.holeScores,
      golfer,
      input.courseId,
      input.teeId
    );
  }

  // Calculate score differential
  const differential = this.handicapEngine.calculateDifferential(
    adjustedGrossScore,
    input.courseRating,
    input.slopeRating,
    input.holes === 9  // isNineHole
  );

  // Create score record
  const score = await this.repo.create({
    ...input,
    adjustedGrossScore,
    differential,
    status: 'POSTED',
    postedByUserId: new Types.ObjectId(context.user!.userId),
    postedByRole: context.user!.role,
    courseNameSnapshot: input.courseName,
    teeNameSnapshot: input.teeName,
    isNineHole: input.holes === 9,
    isTournamentScore: input.isTournamentScore ?? false,
  });

  // Handle 9-hole pairing
  if (input.holes === 9) {
    await this.handicapEngine.tryPairNineHoleScores(input.golferId);
  }

  // Trigger handicap index recalculation
  await this.handicapEngine.recalculateHandicapIndex(input.golferId);

  // Write audit log
  await this.auditService.log({
    clubId: input.clubId,
    actorUserId: context.user!.userId,
    actorRole: context.user!.role,
    entityType: 'SCORE',
    entityId: score._id.toString(),
    action: 'SCORE_POSTED',
    summary: `Score ${input.grossScore} posted for golfer on ${input.courseName}.`,
    before: null,
    after: { grossScore: score.grossScore, differential: score.differential, datePlayed: score.datePlayed },
  });

  return score;
}
```

### 4.2 Withdraw Score

```typescript
async withdrawScore(id: string, reason: string | undefined, context: GraphQLContext): Promise<IScore> {
  requireRole(context, ['SUPER_ADMIN', 'CLUB_ADMIN', 'HANDICAP_CHAIR']);

  const score = await this.repo.findById(id);
  if (!score) throw new AppError('SCORE_NOT_FOUND', 'Score not found.', 404);
  requireClubAccess(context, score.clubId.toString());

  const updated = await this.repo.update(id, { status: 'WITHDRAWN' });

  // Recalculate HI after withdrawal
  await this.handicapEngine.recalculateHandicapIndex(score.golferId.toString());

  await this.auditService.log({
    /* ... */
    action: 'SCORE_WITHDRAWN',
    summary: reason ?? 'Score withdrawn by admin.',
  });

  return updated!;
}
```

---

## 5. Score Resolver

File: `src/graphql/resolvers/score.resolver.ts`

```typescript
export const scoreResolvers = {
  Query: {
    golferScores: async (_, { filter }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      requireOwnGolferOrAdmin(ctx, filter.golferId);
      const { scores, total } = await scoreService.getScoreHistory(filter);
      const page = filter.page ?? 1;
      const pageSize = filter.pageSize ?? 25;
      return {
        nodes: scores,
        pageInfo: { totalCount: total, page, pageSize,
          hasNextPage: page * pageSize < total, hasPreviousPage: page > 1 },
      };
    },
    score: async (_, { id }, ctx) => {
      requireAuth(ctx);
      const score = await scoreService.getById(id);
      if (!score) throw new AppError('SCORE_NOT_FOUND', 'Score not found.', 404);
      requireOwnGolferOrAdmin(ctx, score.golferId.toString());
      return score;
    },
  },
  Mutation: {
    postScore:    async (_, { input }, ctx) => scoreService.postScore(input, ctx),
    updateScore:  async (_, { id, input }, ctx) => scoreService.updateScore(id, input, ctx),
    withdrawScore: async (_, { id, reason }, ctx) => scoreService.withdrawScore(id, reason, ctx),
  },
};
```

---

## 6. MongoDB Indexes

```typescript
await Score.collection.createIndex({ clubId: 1, golferId: 1, datePlayed: -1 });
await Score.collection.createIndex({ golferId: 1, datePlayed: -1 });
await Score.collection.createIndex({ clubId: 1, datePlayed: -1 });
await Score.collection.createIndex({ status: 1 });
await Score.collection.createIndex({ tournamentId: 1 }, { sparse: true });
```

---

## 7. Screen Mapping

### Screen 08 — Post Score (Admin)

**Route:** `/manage/[clubId]/golfer/[golferId]` → tab: `Post a Score`

| Field | Source |
|---|---|
| Date Played | User input (default: today) |
| Score Type | Segmented: Home / Away / Competition |
| Holes | Segmented: 18 / 9 |
| Course Lookup | Home Courses/Tees OR Course Search |
| Course Played | `clubCourses` query or free-text |
| Tee | Dropdown populated from selected course tees |
| C.R. / Slope / Par | Auto-populated from tee selection |
| Hole Scores / Total | User input |
| Post Score | `postScore` mutation |

### Screen 07 — Handicap Management Score History

**Route:** `/manage/[clubId]/golfer/[golferId]` → tab: `Handicap Management`

```graphql
query GetScoreHistory($filter: ScoreHistoryFilterInput!) {
  golferScores(filter: $filter) {
    nodes {
      id datePlayed scoreType grossScore adjustedGrossScore
      courseRating slopeRating par differential pcc esr
      courseNameSnapshot teeNameSnapshot status
    }
    pageInfo { totalCount page pageSize hasNextPage }
  }
}
```

Score table column display: Flag | Type | Date | Score | C.R./Slope | PCC | Diff | ESR | Adj | Course/Tee | Actions

---

## 8. Seed Scores

File: `seeds/scores.seed.ts` — Seed for Jared Abwawo (golferId required)

```typescript
export const jaredScoresSeed = [
  { datePlayed: '2026-05-17', scoreType: 'AWAY', holes: 18, grossScore: 84,
    courseRating: 67.9, slopeRating: 122, par: 72,
    courseName: 'The Classic Golf Club', teeName: 'White' },
  { datePlayed: '2026-05-09', scoreType: 'COMPETITION', holes: 18, grossScore: 93,
    courseRating: 68.5, slopeRating: 121, par: 72,
    courseName: 'Cedar Irons Golf Club', teeName: 'White' },
  { datePlayed: '2026-05-06', scoreType: 'AWAY', holes: 18, grossScore: 87,
    courseRating: 67.9, slopeRating: 122, par: 72,
    courseName: 'The Classic Golf Club', teeName: 'White' },
  { datePlayed: '2026-04-19', scoreType: 'AWAY', holes: 18, grossScore: 81,
    courseRating: 67.9, slopeRating: 122, par: 72,
    courseName: 'The Classic Golf Club', teeName: 'White' },
  { datePlayed: '2026-04-11', scoreType: 'AWAY', holes: 18, grossScore: 92,
    courseRating: 67.1, slopeRating: 112, par: 72,
    courseName: 'Bellevue Golf Course', teeName: 'Blue 2022' },
];
// Differentials are calculated by the handicap engine during seeding
```

---

## 9. Verification Commands

```bash
TOKEN="<jwt>"
GOLFER_ID="<jared-abwawo-id>"

# 1. Post a score
curl -s -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation{postScore(input:{clubId:\\\"$CLUB_ID\\\",golferId:\\\"$GOLFER_ID\\\",datePlayed:\\\"2026-05-30T00:00:00Z\\\",scoreType:HOME,holes:18,entryMode:TOTAL_SCORE,courseId:\\\"$COURSE_ID\\\",teeId:\\\"white-m\\\",courseName:\\\"Cedar Irons Golf Club\\\",teeName:\\\"White\\\",grossScore:82,courseRating:68.5,slopeRating:121,par:72}){id grossScore differential status}}\"}" | jq

# 2. Get score history (newest first)
curl -s -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ golferScores(filter:{golferId:\\\"$GOLFER_ID\\\",pageSize:10}){nodes{datePlayed grossScore differential courseNameSnapshot teeNameSnapshot status}pageInfo{totalCount}} }\"}" | jq

# 3. Withdraw a score
curl -s -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation{withdrawScore(id:\"<score-id>\",reason:\"Test withdrawal\"){id status}}"}' | jq

# 4. Verify differential is calculated
# Expected: differential = (adjustedGrossScore - courseRating) * (113 / slopeRating), truncated 1 decimal
# Example: (82 - 68.5) * (113 / 121) = 13.5 * 0.9339 = 12.6
```

---

## 10. Acceptance Criteria

- [ ] `postScore` requires: datePlayed, scoreType, holes (9 or 18), courseName, teeName, grossScore, courseRating, slopeRating, par
- [ ] `postScore` calculates and stores `differential` automatically
- [ ] `postScore` triggers `recalculateHandicapIndex` on the golfer
- [ ] `postScore` creates an audit log
- [ ] Member can only post a score for their own `golferId`
- [ ] `HOLE_BY_HOLE` mode requires exactly 9 or 18 hole scores matching the `holes` value
- [ ] `grossScore` must be a positive number
- [ ] `slopeRating` must be between 55 and 155
- [ ] `withdrawScore` is restricted to `CLUB_ADMIN`, `HANDICAP_CHAIR`, `SUPER_ADMIN`
- [ ] Withdrawn scores are excluded from handicap calculation
- [ ] Score history sorts newest first by default
- [ ] `DELETED` scores never appear in `golferScores` results
- [ ] Seeded Jared Abwawo scores (5 records) are visible in score history

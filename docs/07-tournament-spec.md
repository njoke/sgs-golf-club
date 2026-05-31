# 07 — Tournament & Registration Management
**Domain:** Tournament + Registration  
**Version:** 1.0  
**Screens:** 12 Tournament List | 13 Create Tournament | 14 Registration Management | 20 Open Tournaments | 21 Member Registration

---

## Table of Contents
1. [MongoDB Tournament Model](#1-mongodb-tournament-model)
2. [MongoDB Registration Model](#2-mongodb-registration-model)
3. [GraphQL Schema — Tournament](#3-graphql-schema--tournament)
4. [GraphQL Schema — Registration](#4-graphql-schema--registration)
5. [Tournament Repository](#5-tournament-repository)
6. [Registration Repository](#6-registration-repository)
7. [Tournament Service](#7-tournament-service)
8. [Registration Service — Business Rules](#8-registration-service--business-rules)
9. [Resolvers](#9-resolvers)
10. [MongoDB Indexes](#10-mongodb-indexes)
11. [Screen Mapping](#11-screen-mapping)
12. [Seed Data](#12-seed-data)
13. [Verification Commands](#13-verification-commands)
14. [Acceptance Criteria](#14-acceptance-criteria)

---

## 1. MongoDB Tournament Model

```typescript
// src/models/tournament.model.ts

export type TournamentFormat = 'STROKE_PLAY' | 'STABLEFORD' | 'SCRAMBLE' | 'MATCH_PLAY' | 'OTHER';
export type TournamentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type RegistrationStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED' | 'COMPLETED';

export interface ITournamentEligibility {
  minHandicapIndex?: number;
  maxHandicapIndex?: number;
  gender?: 'ALL' | 'M' | 'F';
  membershipCodes?: string[];
}

export interface ITournament {
  _id: Types.ObjectId;
  clubId: Types.ObjectId;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  courseId?: Types.ObjectId;
  format: TournamentFormat;
  registrationStatus: RegistrationStatus;
  registrationOpenAt?: Date;
  registrationCloseAt?: Date;
  maxPlayers?: number;
  entryFee?: number;
  membersOnly: boolean;
  allowGuests: boolean;
  eligibility?: ITournamentEligibility;
  status: TournamentStatus;
  createdByUserId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

```typescript
const TournamentEligibilitySchema = new Schema<ITournamentEligibility>({
  minHandicapIndex: Number,
  maxHandicapIndex: Number,
  gender:           { type: String, enum: ['ALL','M','F'], default: 'ALL' },
  membershipCodes:  [String],
}, { _id: false });

const TournamentSchema = new Schema<ITournament>(
  {
    clubId:               { type: Schema.Types.ObjectId, ref: 'Club', required: true },
    name:                 { type: String, required: true, trim: true },
    description:          String,
    startDate:            { type: Date, required: true },
    endDate:              Date,
    courseId:             { type: Schema.Types.ObjectId, ref: 'Course' },
    format:               { type: String, enum: ['STROKE_PLAY','STABLEFORD','SCRAMBLE','MATCH_PLAY','OTHER'], required: true },
    registrationStatus:   { type: String, enum: ['DRAFT','OPEN','CLOSED','CANCELLED','COMPLETED'], default: 'DRAFT' },
    registrationOpenAt:   Date,
    registrationCloseAt:  Date,
    maxPlayers:           Number,
    entryFee:             Number,
    membersOnly:          { type: Boolean, default: true },
    allowGuests:          { type: Boolean, default: false },
    eligibility:          TournamentEligibilitySchema,
    status:               { type: String, enum: ['ACTIVE','COMPLETED','CANCELLED'], default: 'ACTIVE' },
    createdByUserId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Tournament = model<ITournament>('Tournament', TournamentSchema);
```

---

## 2. MongoDB Registration Model

```typescript
// src/models/tournamentRegistration.model.ts

export type RegStatus = 'REGISTERED' | 'PENDING' | 'WAITLISTED' | 'CANCELLED' | 'DECLINED';
export type PaymentStatus = 'NOT_REQUIRED' | 'UNPAID' | 'PAID' | 'REFUNDED' | 'FAILED';

export interface ITournamentRegistration {
  _id: Types.ObjectId;
  tournamentId: Types.ObjectId;
  clubId: Types.ObjectId;
  golferId: Types.ObjectId;
  playerNameSnapshot: string;
  ghinNumberSnapshot?: string;
  emailSnapshot?: string;
  handicapIndexSnapshot?: number;
  preferredTeeId?: string;
  status: RegStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  registeredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

```typescript
const RegistrationSchema = new Schema<ITournamentRegistration>(
  {
    tournamentId:         { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    clubId:               { type: Schema.Types.ObjectId, ref: 'Club', required: true },
    golferId:             { type: Schema.Types.ObjectId, ref: 'Golfer', required: true },
    playerNameSnapshot:   { type: String, required: true },
    ghinNumberSnapshot:   String,
    emailSnapshot:        String,
    handicapIndexSnapshot:Number,
    preferredTeeId:       String,
    status:               { type: String, enum: ['REGISTERED','PENDING','WAITLISTED','CANCELLED','DECLINED'], default: 'REGISTERED' },
    paymentStatus:        { type: String, enum: ['NOT_REQUIRED','UNPAID','PAID','REFUNDED','FAILED'], default: 'NOT_REQUIRED' },
    notes:                String,
    registeredAt:         { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const TournamentRegistration = model<ITournamentRegistration>('TournamentRegistration', RegistrationSchema);
```

---

## 3. GraphQL Schema — Tournament

```graphql
enum TournamentFormat { STROKE_PLAY STABLEFORD SCRAMBLE MATCH_PLAY OTHER }
enum TournamentStatus { ACTIVE COMPLETED CANCELLED }
enum RegistrationStatus { DRAFT OPEN CLOSED CANCELLED COMPLETED }

type TournamentEligibility {
  minHandicapIndex: Float
  maxHandicapIndex: Float
  gender: String
  membershipCodes: [String!]!
}

type Tournament {
  id: ID!
  clubId: ID!
  name: String!
  description: String
  startDate: DateTime!
  endDate: DateTime
  courseId: ID
  format: TournamentFormat!
  registrationStatus: RegistrationStatus!
  registrationOpenAt: DateTime
  registrationCloseAt: DateTime
  maxPlayers: Int
  registeredPlayerCount: Int!
  entryFee: Float
  membersOnly: Boolean!
  allowGuests: Boolean!
  eligibility: TournamentEligibility
  status: TournamentStatus!
  createdAt: DateTime!
  updatedAt: DateTime!
}

input TournamentEligibilityInput {
  minHandicapIndex: Float
  maxHandicapIndex: Float
  gender: String
  membershipCodes: [String!]
}

input CreateTournamentInput {
  clubId: ID!
  name: String!
  description: String
  startDate: DateTime!
  endDate: DateTime
  courseId: ID
  format: TournamentFormat!
  registrationStatus: RegistrationStatus
  registrationOpenAt: DateTime
  registrationCloseAt: DateTime
  maxPlayers: Int
  entryFee: Float
  membersOnly: Boolean
  allowGuests: Boolean
  eligibility: TournamentEligibilityInput
}

type Query {
  tournaments(clubId: ID!, status: TournamentStatus, registrationStatus: RegistrationStatus): [Tournament!]!
  tournament(id: ID!): Tournament
  openTournaments(clubId: ID!): [Tournament!]!   # For member portal
}

type Mutation {
  createTournament(input: CreateTournamentInput!): Tournament!
  updateTournament(id: ID!, input: CreateTournamentInput!): Tournament!
  openTournamentRegistration(id: ID!): Tournament!
  closeTournamentRegistration(id: ID!): Tournament!
  cancelTournament(id: ID!, reason: String): Tournament!
}
```

---

## 4. GraphQL Schema — Registration

```graphql
enum TournamentRegistrationStatus { REGISTERED PENDING WAITLISTED CANCELLED DECLINED }
enum PaymentStatus { NOT_REQUIRED UNPAID PAID REFUNDED FAILED }

type TournamentRegistration {
  id: ID!
  tournamentId: ID!
  clubId: ID!
  golferId: ID!
  playerNameSnapshot: String!
  ghinNumberSnapshot: String
  emailSnapshot: String
  handicapIndexSnapshot: Float
  preferredTeeId: ID
  status: TournamentRegistrationStatus!
  paymentStatus: PaymentStatus!
  notes: String
  registeredAt: DateTime!
  createdAt: DateTime!
  updatedAt: DateTime!
}

input RegisterForTournamentInput {
  tournamentId: ID!
  golferId: ID!
  preferredTeeId: ID
  email: String!
  phone: String
  notes: String
  agreedToTerms: Boolean!
}

type Query {
  tournamentRegistrations(tournamentId: ID!): [TournamentRegistration!]!
  myTournamentRegistrations: [TournamentRegistration!]!
}

type Mutation {
  registerForTournament(input: RegisterForTournamentInput!): TournamentRegistration!
  cancelTournamentRegistration(id: ID!, reason: String): TournamentRegistration!
  approveTournamentRegistration(id: ID!): TournamentRegistration!
  waitlistTournamentRegistration(id: ID!): TournamentRegistration!
}
```

---

## 5. Tournament Repository

```typescript
export class TournamentRepository {

  async findByClub(
    clubId: string,
    status?: TournamentStatus,
    regStatus?: RegistrationStatus
  ): Promise<ITournament[]> {
    const query: FilterQuery<ITournament> = { clubId };
    if (status) query.status = status;
    if (regStatus) query.registrationStatus = regStatus;
    return Tournament.find(query).sort({ startDate: 1 }).lean();
  }

  async findOpenForClub(clubId: string): Promise<ITournament[]> {
    return Tournament.find({
      clubId,
      registrationStatus: 'OPEN',
      status: 'ACTIVE',
      registrationCloseAt: { $gte: new Date() },
    }).sort({ startDate: 1 }).lean();
  }

  async findById(id: string): Promise<ITournament | null> {
    return Tournament.findById(id).lean();
  }

  async create(data: Partial<ITournament>): Promise<ITournament> {
    return Tournament.create(data);
  }

  async update(id: string, data: Partial<ITournament>): Promise<ITournament | null> {
    return Tournament.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async countRegistered(tournamentId: string): Promise<number> {
    return TournamentRegistration.countDocuments({
      tournamentId,
      status: { $in: ['REGISTERED', 'PENDING'] },
    });
  }
}
```

---

## 6. Registration Repository

```typescript
export class RegistrationRepository {

  async findByTournament(tournamentId: string): Promise<ITournamentRegistration[]> {
    return TournamentRegistration.find({ tournamentId })
      .sort({ registeredAt: 1 }).lean();
  }

  async findByGolfer(golferId: string): Promise<ITournamentRegistration[]> {
    return TournamentRegistration.find({ golferId }).sort({ registeredAt: -1 }).lean();
  }

  async findExisting(tournamentId: string, golferId: string): Promise<ITournamentRegistration | null> {
    return TournamentRegistration.findOne({ tournamentId, golferId }).lean();
  }

  async create(data: Partial<ITournamentRegistration>): Promise<ITournamentRegistration> {
    return TournamentRegistration.create(data);
  }

  async update(id: string, data: Partial<ITournamentRegistration>): Promise<ITournamentRegistration | null> {
    return TournamentRegistration.findByIdAndUpdate(id, data, { new: true }).lean();
  }
}
```

---

## 7. Tournament Service

```typescript
export class TournamentService {

  async createTournament(input: CreateTournamentInput, context: GraphQLContext): Promise<ITournament> {
    requireRole(context, ['SUPER_ADMIN', 'CLUB_ADMIN', 'TOURNAMENT_ADMIN']);
    requireClubAccess(context, input.clubId);

    // If publishing as OPEN, require open/close dates
    if (input.registrationStatus === 'OPEN') {
      if (!input.registrationOpenAt || !input.registrationCloseAt) {
        throw new AppError('VALIDATION_ERROR', 'Registration open and close dates are required when opening registration.', 400);
      }
    }

    const tournament = await this.repo.create({
      ...input,
      registrationStatus: input.registrationStatus ?? 'DRAFT',
      membersOnly: input.membersOnly ?? true,
      allowGuests: input.allowGuests ?? false,
      status: 'ACTIVE',
      createdByUserId: new Types.ObjectId(context.user!.userId),
    });

    await this.auditService.log({ /* ... */ action: 'TOURNAMENT_CREATED' });
    return tournament;
  }

  async openRegistration(id: string, context: GraphQLContext): Promise<ITournament> {
    requireRole(context, ['SUPER_ADMIN', 'CLUB_ADMIN', 'TOURNAMENT_ADMIN']);

    const tournament = await this.repo.findById(id);
    if (!tournament) throw new AppError('TOURNAMENT_NOT_FOUND', 'Tournament not found.', 404);
    requireClubAccess(context, tournament.clubId.toString());

    if (!tournament.registrationOpenAt || !tournament.registrationCloseAt) {
      throw new AppError('VALIDATION_ERROR', 'Set registration open and close dates before opening.', 400);
    }

    const updated = await this.repo.update(id, { registrationStatus: 'OPEN' });
    await this.auditService.log({ /* ... */ action: 'TOURNAMENT_REGISTRATION_OPENED' });
    return updated!;
  }

  async cancelTournament(id: string, reason: string | undefined, context: GraphQLContext): Promise<ITournament> {
    requireRole(context, ['SUPER_ADMIN', 'CLUB_ADMIN', 'TOURNAMENT_ADMIN']);

    const tournament = await this.repo.findById(id);
    if (!tournament) throw new AppError('TOURNAMENT_NOT_FOUND', 'Tournament not found.', 404);
    requireClubAccess(context, tournament.clubId.toString());

    const updated = await this.repo.update(id, {
      status: 'CANCELLED',
      registrationStatus: 'CANCELLED',
    });

    await this.auditService.log({ /* ... */ action: 'TOURNAMENT_CANCELLED', summary: reason });
    return updated!;
  }
}
```

---

## 8. Registration Service — Business Rules

```typescript
export class RegistrationService {

  async registerForTournament(
    input: RegisterForTournamentInput,
    context: GraphQLContext
  ): Promise<ITournamentRegistration> {
    requireAuth(context);

    // Members can only register themselves
    if (context.user!.role === 'MEMBER' && context.user!.golferId !== input.golferId) {
      throw new AppError('FORBIDDEN', 'Members can only register themselves.', 403);
    }

    // Terms must be accepted
    if (!input.agreedToTerms) {
      throw new AppError('VALIDATION_ERROR', 'You must agree to the terms to register.', 400);
    }

    // 1. Tournament must exist
    const tournament = await this.tournamentRepo.findById(input.tournamentId);
    if (!tournament) throw new AppError('TOURNAMENT_NOT_FOUND', 'Tournament not found.', 404);

    // 2. Registration must be OPEN
    if (tournament.registrationStatus !== 'OPEN') {
      throw new AppError('REGISTRATION_CLOSED', 'Registration for this tournament is not open.', 400);
    }

    // 3. Registration close date must not be expired
    if (tournament.registrationCloseAt && new Date() > tournament.registrationCloseAt) {
      throw new AppError('REGISTRATION_CLOSED', 'Registration deadline has passed.', 400);
    }

    // 4. Golfer must be active
    const golfer = await this.golferRepo.findById(input.golferId);
    if (!golfer) throw new AppError('GOLFER_NOT_FOUND', 'Golfer not found.', 404);
    if (golfer.membershipStatus !== 'ACTIVE') {
      throw new AppError('VALIDATION_ERROR', 'Inactive golfers cannot register for tournaments.', 400);
    }

    // 5. No duplicate registration
    const existing = await this.regRepo.findExisting(input.tournamentId, input.golferId);
    if (existing && existing.status !== 'CANCELLED') {
      throw new AppError('REGISTRATION_DUPLICATE', 'Golfer is already registered for this tournament.', 409);
    }

    // 6. Eligibility checks
    await this.checkEligibility(tournament, golfer);

    // 7. Capacity check
    const registeredCount = await this.tournamentRepo.countRegistered(input.tournamentId);
    let status: RegStatus = 'REGISTERED';

    if (tournament.maxPlayers && registeredCount >= tournament.maxPlayers) {
      // Tournament is full — waitlist if applicable
      status = 'WAITLISTED';
    }

    // 8. Determine payment status
    const paymentStatus: PaymentStatus = tournament.entryFee && tournament.entryFee > 0
      ? 'UNPAID'
      : 'NOT_REQUIRED';

    const registration = await this.regRepo.create({
      tournamentId: new Types.ObjectId(input.tournamentId),
      clubId: tournament.clubId,
      golferId: new Types.ObjectId(input.golferId),
      playerNameSnapshot: `${golfer.firstName} ${golfer.lastName}`,
      ghinNumberSnapshot: golfer.ghinNumber,
      emailSnapshot: golfer.email,
      handicapIndexSnapshot: golfer.currentHandicapIndex,
      preferredTeeId: input.preferredTeeId,
      status,
      paymentStatus,
      notes: input.notes,
      registeredAt: new Date(),
    });

    await this.auditService.log({ /* ... */ action: 'REGISTRATION_CREATED' });
    return registration;
  }

  private async checkEligibility(
    tournament: ITournament,
    golfer: IGolfer
  ): Promise<void> {
    const e = tournament.eligibility;
    if (!e) return;  // No eligibility restrictions

    // HI minimum check
    if (e.minHandicapIndex !== undefined && e.minHandicapIndex !== null) {
      if (!golfer.currentHandicapIndex || golfer.currentHandicapIndex < e.minHandicapIndex) {
        throw new AppError('NOT_ELIGIBLE', `A minimum Handicap Index of ${e.minHandicapIndex} is required.`, 400);
      }
    }

    // HI maximum check
    if (e.maxHandicapIndex !== undefined && e.maxHandicapIndex !== null) {
      if (!golfer.currentHandicapIndex || golfer.currentHandicapIndex > e.maxHandicapIndex) {
        throw new AppError('NOT_ELIGIBLE', `A maximum Handicap Index of ${e.maxHandicapIndex} is required.`, 400);
      }
    }

    // Gender check
    if (e.gender && e.gender !== 'ALL' && golfer.gender !== e.gender) {
      throw new AppError('NOT_ELIGIBLE', 'This tournament is not open to your gender eligibility.', 400);
    }

    // Membership code check
    if (e.membershipCodes && e.membershipCodes.length > 0) {
      if (!e.membershipCodes.includes(golfer.membershipCode)) {
        throw new AppError('NOT_ELIGIBLE', 'Your membership type is not eligible for this tournament.', 400);
      }
    }
  }
}
```

---

## 9. Resolvers

```typescript
// tournament.resolver.ts
export const tournamentResolvers = {
  Tournament: {
    registeredPlayerCount: async (parent: ITournament) =>
      TournamentRepository.countRegistered(parent._id.toString()),
  },
  Query: {
    tournaments: async (_, { clubId, status, registrationStatus }, ctx) => {
      requireAuth(ctx);
      requireClubAccess(ctx, clubId);
      return tournamentService.getTournaments(clubId, status, registrationStatus);
    },
    tournament: async (_, { id }, ctx) => {
      requireAuth(ctx);
      const t = await tournamentService.getById(id);
      if (!t) throw new AppError('TOURNAMENT_NOT_FOUND', 'Tournament not found.', 404);
      requireClubAccess(ctx, t.clubId.toString());
      return t;
    },
    openTournaments: async (_, { clubId }, ctx) => {
      requireAuth(ctx);
      requireClubAccess(ctx, clubId);
      return tournamentService.getOpenTournaments(clubId);
    },
  },
  Mutation: {
    createTournament:            async (_, { input }, ctx) => tournamentService.createTournament(input, ctx),
    updateTournament:            async (_, { id, input }, ctx) => tournamentService.updateTournament(id, input, ctx),
    openTournamentRegistration:  async (_, { id }, ctx) => tournamentService.openRegistration(id, ctx),
    closeTournamentRegistration: async (_, { id }, ctx) => tournamentService.closeRegistration(id, ctx),
    cancelTournament:            async (_, { id, reason }, ctx) => tournamentService.cancelTournament(id, reason, ctx),
    registerForTournament:            async (_, { input }, ctx) => registrationService.registerForTournament(input, ctx),
    cancelTournamentRegistration:     async (_, { id, reason }, ctx) => registrationService.cancelRegistration(id, reason, ctx),
    approveTournamentRegistration:    async (_, { id }, ctx) => registrationService.approve(id, ctx),
    waitlistTournamentRegistration:   async (_, { id }, ctx) => registrationService.waitlist(id, ctx),
  },
};
```

---

## 10. MongoDB Indexes

```typescript
// tournaments
await Tournament.collection.createIndex({ clubId: 1, startDate: 1 });
await Tournament.collection.createIndex({ clubId: 1, registrationStatus: 1 });
await Tournament.collection.createIndex({ status: 1 });

// tournamentRegistrations
await TournamentRegistration.collection.createIndex(
  { tournamentId: 1, golferId: 1 }, { unique: true }
);
await TournamentRegistration.collection.createIndex({ tournamentId: 1, status: 1 });
await TournamentRegistration.collection.createIndex({ golferId: 1 });
await TournamentRegistration.collection.createIndex({ clubId: 1 });
```

---

## 11. Screen Mapping

| Screen | Query / Mutation | Notes |
|---|---|---|
| Tournament List (12) | `tournaments(clubId)` | All statuses, filterable |
| Create Tournament (13) | `createTournament` | Save as DRAFT or OPEN |
| Open Registration (12 action) | `openTournamentRegistration` | Validates dates exist |
| Registration Management (14) | `tournamentRegistrations(tournamentId)` | Admin view |
| Open Tournaments (20) | `openTournaments(clubId)` | Member view — only OPEN + not expired |
| Member Registration (21) | `registerForTournament` | Full eligibility + capacity check |

---

## 12. Seed Data

```typescript
export const springClassicSeed = {
  name:                'Spring Classic',
  description:         'Club spring tournament — stroke play',
  startDate:           new Date('2026-06-15'),
  format:              'STROKE_PLAY',
  registrationStatus:  'OPEN',
  registrationOpenAt:  new Date('2026-05-30'),
  registrationCloseAt: new Date('2026-06-10T23:59:59.000Z'),
  maxPlayers:          72,
  entryFee:            50,
  membersOnly:         true,
  allowGuests:         false,
  eligibility: {
    gender: 'ALL',
    membershipCodes: ['R'],
  },
  status: 'ACTIVE',
};
// Seed 5 registrations (Jared + 4 other seeded golfers)
```

---

## 13. Verification Commands

```bash
TOKEN="<jwt>"
CLUB_ID="<club-id>"

# 1. List tournaments
curl -s -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ tournaments(clubId:\\\"$CLUB_ID\\\"){id name startDate registrationStatus registeredPlayerCount maxPlayers} }\"}" | jq

# 2. Open registration for a tournament
curl -s -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation{openTournamentRegistration(id:\"<tournament-id>\"){id registrationStatus}}"}' | jq

# 3. Member registers
MEMBER_TOKEN="<member-jwt>"
curl -s -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation{registerForTournament(input:{tournamentId:\"<id>\",golferId:\"<golfer-id>\",email:\"j_midimo@hotmail.com\",agreedToTerms:true}){id status paymentStatus registeredAt}}"}' | jq

# 4. Duplicate registration — expect REGISTRATION_DUPLICATE error
# (run #3 again with same golfer)

# 5. Closed registration — close then attempt register
curl -s -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation{closeTournamentRegistration(id:\"<id>\"){id registrationStatus}}"}' | jq
```

---

## 14. Acceptance Criteria

- [ ] `createTournament` creates a DRAFT tournament by default
- [ ] `createTournament` with `registrationStatus: OPEN` requires `registrationOpenAt` and `registrationCloseAt`
- [ ] `openTournamentRegistration` rejects if open/close dates are missing
- [ ] `openTournaments` returns only `OPEN`, `ACTIVE` tournaments with future close dates
- [ ] `registerForTournament` requires `agreedToTerms: true`
- [ ] Duplicate registration returns `REGISTRATION_DUPLICATE` error
- [ ] Closed tournament registration returns `REGISTRATION_CLOSED` error
- [ ] Expired registration close date returns `REGISTRATION_CLOSED` error
- [ ] Golfer failing HI eligibility returns `NOT_ELIGIBLE` error
- [ ] When `maxPlayers` is reached, registration status is `WAITLISTED`
- [ ] Member cannot register on behalf of another golfer
- [ ] `tournamentRegistrations` is accessible only to admin roles
- [ ] `registeredPlayerCount` is a computed field (count of REGISTERED + PENDING)
- [ ] Seeded Spring Classic shows 5 registrations and `registrationStatus: OPEN`

# 03 — Golfer & Roster Management
**Domain:** Golfer  
**Version:** 1.0  
**Screens:** 03 Roster | 04 Add Golfer Modal | 05 Search Existing | 06 Add New Golfer | 07 Handicap Management | 09 Profile

---

## Table of Contents
1. [MongoDB Golfer Model](#1-mongodb-golfer-model)
2. [GraphQL Schema — Golfer](#2-graphql-schema--golfer)
3. [Golfer Repository](#3-golfer-repository)
4. [Golfer Service — Business Rules](#4-golfer-service--business-rules)
5. [Golfer Resolvers](#5-golfer-resolvers)
6. [MongoDB Indexes](#6-mongodb-indexes)
7. [Screen-to-Query Mapping](#7-screen-to-query-mapping)
8. [Seed Data](#8-seed-data)
9. [Verification Commands](#9-verification-commands)
10. [Acceptance Criteria](#10-acceptance-criteria)

---

## 1. MongoDB Golfer Model

### 1.1 TypeScript Interface

```typescript
// src/models/golfer.model.ts

export type MembershipStatus = 'ACTIVE' | 'INACTIVE';
export type DigitalProfileStatus = 'NONE' | 'PENDING' | 'ACTIVE';
export type Gender = 'M' | 'F' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export interface IAddress {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface IGolfer {
  _id: Types.ObjectId;
  clubId: Types.ObjectId;
  ghinNumber?: string;
  localNumber?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  gender: Gender;
  dateOfBirth?: Date;
  email: string;
  phone?: string;
  address?: IAddress;
  membershipCode: string;          // e.g. 'R' = Regular
  membershipStatus: MembershipStatus;
  statusDate?: Date;
  digitalProfileStatus: DigitalProfileStatus;
  currentHandicapIndex?: number;
  lowHandicapIndex?: number;
  lowHandicapDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.2 Mongoose Schema

```typescript
const AddressSchema = new Schema<IAddress>({
  addressLine1: String,
  addressLine2: String,
  city:         String,
  state:        String,
  postalCode:   String,
  country:      { type: String, default: 'United States' },
}, { _id: false });

const GolferSchema = new Schema<IGolfer>(
  {
    clubId:               { type: Schema.Types.ObjectId, ref: 'Club', required: true },
    ghinNumber:           { type: String, trim: true },
    localNumber:          { type: String, trim: true },
    firstName:            { type: String, required: true, trim: true },
    middleName:           { type: String, trim: true },
    lastName:             { type: String, required: true, trim: true },
    suffix:               { type: String, trim: true },
    gender:               { type: String, enum: ['M','F','OTHER','PREFER_NOT_TO_SAY'], required: true },
    dateOfBirth:          { type: Date },
    email:                { type: String, required: true, lowercase: true, trim: true },
    phone:                { type: String, trim: true },
    address:              { type: AddressSchema },
    membershipCode:       { type: String, required: true, trim: true },
    membershipStatus:     { type: String, enum: ['ACTIVE','INACTIVE'], default: 'ACTIVE' },
    statusDate:           { type: Date, default: Date.now },
    digitalProfileStatus: { type: String, enum: ['NONE','PENDING','ACTIVE'], default: 'NONE' },
    currentHandicapIndex: { type: Number, default: null },
    lowHandicapIndex:     { type: Number, default: null },
    lowHandicapDate:      { type: Date },
  },
  { timestamps: true }
);

export const Golfer = model<IGolfer>('Golfer', GolferSchema);
```

---

## 2. GraphQL Schema — Golfer

```graphql
enum MembershipStatus { ACTIVE INACTIVE }
enum DigitalProfileStatus { NONE PENDING ACTIVE }
enum Gender { M F OTHER PREFER_NOT_TO_SAY }

type Address {
  addressLine1: String
  addressLine2: String
  city: String
  state: String
  postalCode: String
  country: String
}

type Golfer {
  id: ID!
  clubId: ID!
  ghinNumber: String
  localNumber: String
  firstName: String!
  middleName: String
  lastName: String!
  suffix: String
  gender: Gender!
  dateOfBirth: DateTime
  email: String!
  phone: String
  address: Address
  membershipCode: String!
  membershipStatus: MembershipStatus!
  statusDate: DateTime
  digitalProfileStatus: DigitalProfileStatus!
  currentHandicapIndex: Float
  lowHandicapIndex: Float
  lowHandicapDate: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type GolferConnection {
  nodes: [Golfer!]!
  pageInfo: PageInfo!
}

type GolferSearchResult {
  ghinNumber: String
  firstName: String!
  lastName: String!
  email: String
  city: String
  state: String
  currentClubName: String
  canAddToClub: Boolean!
}

# --- Inputs ---

input GolferRosterFilterInput {
  clubId: ID!
  searchText: String
  membershipStatus: MembershipStatus
  membershipCode: String
  gender: Gender
  digitalProfileStatus: DigitalProfileStatus
  includeInactive: Boolean
  page: Int
  pageSize: Int
  sortBy: String
  sortDirection: String
}

input ExistingGolferSearchInput {
  clubId: ID!
  ghinOrEmail: String
  firstName: String
  lastName: String
  association: String
}

input AddNewGolferInput {
  clubId: ID!
  ghinNumber: String
  localNumber: String
  firstName: String!
  middleName: String
  lastName: String!
  suffix: String
  gender: Gender!
  dateOfBirth: DateTime
  email: String!
  phone: String
  membershipCode: String!
  address: AddressInput
}

input AddressInput {
  addressLine1: String
  addressLine2: String
  city: String
  state: String
  postalCode: String
  country: String
}

input AddExistingGolferToClubInput {
  clubId: ID!
  ghinNumber: String!
  membershipCode: String!
  localNumber: String
}

input UpdateGolferInput {
  firstName: String
  middleName: String
  lastName: String
  suffix: String
  gender: Gender
  dateOfBirth: DateTime
  email: String
  phone: String
  localNumber: String
  membershipCode: String
  address: AddressInput
}

# --- Queries & Mutations ---

type Query {
  golfers(filter: GolferRosterFilterInput!): GolferConnection!
  golfer(id: ID!): Golfer
  searchExistingGolfers(input: ExistingGolferSearchInput!): [GolferSearchResult!]!
}

type Mutation {
  addNewGolfer(input: AddNewGolferInput!): Golfer!
  addExistingGolferToClub(input: AddExistingGolferToClubInput!): Golfer!
  updateGolfer(id: ID!, input: UpdateGolferInput!): Golfer!
  activateGolfer(id: ID!): Golfer!
  deactivateGolfer(id: ID!, reason: String): Golfer!
}
```

---

## 3. Golfer Repository

File: `src/repositories/golfer.repository.ts`

```typescript
export class GolferRepository {

  // Paginated roster with filters
  async findByClub(filter: GolferRosterFilterInput): Promise<{ golfers: IGolfer[]; total: number }> {
    const query: FilterQuery<IGolfer> = { clubId: filter.clubId };

    if (!filter.includeInactive) {
      query.membershipStatus = 'ACTIVE';
    }
    if (filter.membershipStatus) {
      query.membershipStatus = filter.membershipStatus;
    }
    if (filter.membershipCode) {
      query.membershipCode = filter.membershipCode;
    }
    if (filter.gender) {
      query.gender = filter.gender;
    }
    if (filter.digitalProfileStatus) {
      query.digitalProfileStatus = filter.digitalProfileStatus;
    }
    if (filter.searchText) {
      const regex = new RegExp(filter.searchText, 'i');
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { ghinNumber: regex },
      ];
    }

    const page = filter.page ?? 1;
    const pageSize = Math.min(filter.pageSize ?? 25, 100);
    const skip = (page - 1) * pageSize;

    const sortField = filter.sortBy ?? 'lastName';
    const sortDir = filter.sortDirection === 'DESC' ? -1 : 1;

    const [golfers, total] = await Promise.all([
      Golfer.find(query).sort({ [sortField]: sortDir }).skip(skip).limit(pageSize).lean(),
      Golfer.countDocuments(query),
    ]);

    return { golfers, total };
  }

  async findById(id: string): Promise<IGolfer | null> {
    return Golfer.findById(id).lean();
  }

  async findByEmail(clubId: string, email: string): Promise<IGolfer | null> {
    return Golfer.findOne({ clubId, email: email.toLowerCase() }).lean();
  }

  async findByGhin(clubId: string, ghinNumber: string): Promise<IGolfer | null> {
    return Golfer.findOne({ clubId, ghinNumber }).lean();
  }

  async create(data: Partial<IGolfer>): Promise<IGolfer> {
    return Golfer.create(data);
  }

  async update(id: string, data: Partial<IGolfer>): Promise<IGolfer | null> {
    return Golfer.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  }
}
```

---

## 4. Golfer Service — Business Rules

File: `src/services/golfer.service.ts`

### 4.1 Add New Golfer

```typescript
async addNewGolfer(input: AddNewGolferInput, context: GraphQLContext): Promise<IGolfer> {
  requireClubAccess(context, input.clubId);
  requireRole(context, ['SUPER_ADMIN', 'CLUB_ADMIN']);

  // 1. Validate required fields (Zod schema runs first in resolver)
  // Required: clubId, firstName, lastName, gender, email, membershipCode

  // 2. Duplicate email check within same club
  const existingByEmail = await this.repo.findByEmail(input.clubId, input.email);
  if (existingByEmail) {
    throw new AppError('DUPLICATE_GOLFER', `A golfer with email ${input.email} already exists in this club.`, 409);
  }

  // 3. Duplicate GHIN check within same club (if provided)
  if (input.ghinNumber) {
    const existingByGhin = await this.repo.findByGhin(input.clubId, input.ghinNumber);
    if (existingByGhin) {
      throw new AppError('DUPLICATE_GOLFER', `GHIN number ${input.ghinNumber} is already registered in this club.`, 409);
    }
  }

  // 4. Create golfer
  const golfer = await this.repo.create({
    ...input,
    email: input.email.toLowerCase(),
    membershipStatus: 'ACTIVE',
    statusDate: new Date(),
    digitalProfileStatus: 'NONE',
  });

  // 5. Write audit log
  await this.auditService.log({
    clubId: input.clubId,
    actorUserId: context.user!.userId,
    actorRole: context.user!.role,
    entityType: 'GOLFER',
    entityId: golfer._id.toString(),
    action: 'GOLFER_CREATED',
    summary: `Golfer ${golfer.firstName} ${golfer.lastName} was added to the club.`,
    before: null,
    after: { firstName: golfer.firstName, lastName: golfer.lastName, email: golfer.email },
  });

  return golfer;
}
```

### 4.2 Search Existing Golfer

```typescript
async searchExistingGolfers(input: ExistingGolferSearchInput): Promise<GolferSearchResult[]> {
  // At least one of: ghinOrEmail OR lastName is required
  if (!input.ghinOrEmail && !input.lastName) {
    throw new AppError('VALIDATION_ERROR', 'Provide a GHIN number, email, or last name to search.', 400);
  }
  if (input.firstName && !input.lastName) {
    throw new AppError('VALIDATION_ERROR', 'Last name is required when searching by name.', 400);
  }

  // For MVP: search within the same club's golfer records
  // Future: search a global GHIN registry
  const query: FilterQuery<IGolfer> = {};

  if (input.ghinOrEmail) {
    const regex = new RegExp(input.ghinOrEmail, 'i');
    query.$or = [{ ghinNumber: input.ghinOrEmail }, { email: regex }];
  }
  if (input.lastName) {
    query.lastName = new RegExp(input.lastName, 'i');
  }
  if (input.firstName) {
    query.firstName = new RegExp(input.firstName, 'i');
  }

  const results = await Golfer.find(query).limit(20).lean();
  return results.map(g => ({
    ghinNumber: g.ghinNumber,
    firstName: g.firstName,
    lastName: g.lastName,
    email: g.email,
    city: g.address?.city,
    state: g.address?.state,
    currentClubName: null,
    canAddToClub: g.membershipStatus === 'INACTIVE',
  }));
}
```

### 4.3 Activate Golfer

```typescript
async activateGolfer(id: string, context: GraphQLContext): Promise<IGolfer> {
  requireRole(context, ['SUPER_ADMIN', 'CLUB_ADMIN']);

  const golfer = await this.repo.findById(id);
  if (!golfer) throw new AppError('GOLFER_NOT_FOUND', 'Golfer not found.', 404);
  requireClubAccess(context, golfer.clubId.toString());

  if (golfer.membershipStatus === 'ACTIVE') {
    throw new AppError('VALIDATION_ERROR', 'Golfer is already active.', 400);
  }

  const updated = await this.repo.update(id, {
    membershipStatus: 'ACTIVE',
    statusDate: new Date(),
  });

  await this.auditService.log({ /* ... */ action: 'GOLFER_ACTIVATED' });
  return updated!;
}
```

### 4.4 Deactivate Golfer

```typescript
async deactivateGolfer(id: string, reason: string | undefined, context: GraphQLContext): Promise<IGolfer> {
  requireRole(context, ['SUPER_ADMIN', 'CLUB_ADMIN']);

  const golfer = await this.repo.findById(id);
  if (!golfer) throw new AppError('GOLFER_NOT_FOUND', 'Golfer not found.', 404);
  requireClubAccess(context, golfer.clubId.toString());

  if (golfer.membershipStatus === 'INACTIVE') {
    throw new AppError('VALIDATION_ERROR', 'Golfer is already inactive.', 400);
  }

  // Frontend must show confirmation dialog before calling this mutation
  const updated = await this.repo.update(id, {
    membershipStatus: 'INACTIVE',
    statusDate: new Date(),
  });

  await this.auditService.log({ /* ... */ action: 'GOLFER_DEACTIVATED', summary: reason });
  return updated!;
}
```

---

## 5. Golfer Resolvers

File: `src/graphql/resolvers/golfer.resolver.ts`

```typescript
export const golferResolvers = {
  Query: {
    golfers: async (_: unknown, { filter }: { filter: GolferRosterFilterInput }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      requireClubAccess(ctx, filter.clubId);
      const { golfers, total } = await golferService.getRoster(filter);
      const page = filter.page ?? 1;
      const pageSize = Math.min(filter.pageSize ?? 25, 100);
      return {
        nodes: golfers,
        pageInfo: {
          totalCount: total,
          page,
          pageSize,
          hasNextPage: page * pageSize < total,
          hasPreviousPage: page > 1,
        },
      };
    },

    golfer: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const golfer = await golferService.getById(id);
      if (!golfer) throw new AppError('GOLFER_NOT_FOUND', 'Golfer not found.', 404);
      requireClubAccess(ctx, golfer.clubId.toString());
      return golfer;
    },

    searchExistingGolfers: async (_: unknown, { input }: { input: ExistingGolferSearchInput }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      requireRole(ctx, ['SUPER_ADMIN', 'CLUB_ADMIN']);
      return golferService.searchExistingGolfers(input);
    },
  },

  Mutation: {
    addNewGolfer: async (_: unknown, { input }: { input: AddNewGolferInput }, ctx: GraphQLContext) => {
      return golferService.addNewGolfer(input, ctx);
    },
    updateGolfer: async (_: unknown, { id, input }: { id: string; input: UpdateGolferInput }, ctx: GraphQLContext) => {
      return golferService.updateGolfer(id, input, ctx);
    },
    activateGolfer: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      return golferService.activateGolfer(id, ctx);
    },
    deactivateGolfer: async (_: unknown, { id, reason }: { id: string; reason?: string }, ctx: GraphQLContext) => {
      return golferService.deactivateGolfer(id, reason, ctx);
    },
  },
};
```

---

## 6. MongoDB Indexes

Apply all of these in `config/database.ts` or in a migration script:

```typescript
// golfers collection
await Golfer.collection.createIndex({ clubId: 1, lastName: 1, firstName: 1 });
await Golfer.collection.createIndex({ clubId: 1, membershipStatus: 1 });
await Golfer.collection.createIndex({ clubId: 1, email: 1 });
await Golfer.collection.createIndex({ ghinNumber: 1 });
await Golfer.collection.createIndex({ email: 1 });
```

---

## 7. Screen-to-Query Mapping

| Screen | GraphQL Operation | Notes |
|---|---|---|
| Roster (03) | `golfers(filter)` | Paginated, filterable |
| Add Golfer Modal (04) | UI only — no query | Shows two button choices |
| Search Existing Golfer (05) | `searchExistingGolfers(input)` | At least one field required |
| Add New Golfer (06) | `addNewGolfer(input)` | Full form mutation |
| Handicap Management (07) | `golfer(id)` + `golferScores(filter)` | See score spec |
| Golfer Profile (09) | `golfer(id)` + `updateGolfer(id, input)` | Edit mode |

---

## 8. Seed Data

File: `seeds/golfers.seed.ts`

```typescript
export const golfersSeed = [
  { firstName: 'Jared',   lastName: 'Abwawo',  ghinNumber: '10750356', gender: 'M', email: 'j_midimo@hotmail.com',  membershipCode: 'R', localNumber: '13',  currentHandicapIndex: 13.1, lowHandicapIndex: 12.0 },
  { firstName: 'Sal',     lastName: 'Aguko',   ghinNumber: '10708328', gender: 'M', email: 'sal.aguko@gmail.com',   membershipCode: 'R', localNumber: '22',  currentHandicapIndex: 19.9, lowHandicapIndex: 18.5 },
  { firstName: 'Rodney',  lastName: 'Bryan',   ghinNumber: '10856275', gender: 'M', email: 'rodney.bryan@gmail.com',membershipCode: 'R', localNumber: '5',   currentHandicapIndex: 8.1,  lowHandicapIndex: 7.2 },
  { firstName: 'Maurice', lastName: 'Gichuru', ghinNumber: '4516031',  gender: 'M', email: 'mg@safarigolfseattle.org', membershipCode: 'R', localNumber: '1', currentHandicapIndex: 9.8,  lowHandicapIndex: 9.0 },
  { firstName: 'Moses',   lastName: 'Kamau',   ghinNumber: '3007264',  gender: 'M', email: 'mkamau@gmail.com',      membershipCode: 'R', localNumber: '8',   currentHandicapIndex: 9.3,  lowHandicapIndex: 8.8 },
  { firstName: 'Lucy',    lastName: 'Karanja', ghinNumber: '10391607', gender: 'F', email: 'lkaranja@gmail.com',    membershipCode: 'R', localNumber: '17',  currentHandicapIndex: 23.3, lowHandicapIndex: 22.0 },
];
```

---

## 9. Verification Commands

```bash
# Set JWT from login
TOKEN=$(curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation{login(input:{email:\"admin@safarigolfseattle.org\",password:\"Admin123!\"}){token}}"}' \
  | jq -r '.data.login.token')

CLUB_ID="<club-id-from-seed>"

# 1. Load roster (active golfers)
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"query\":\"{ golfers(filter:{clubId:\\\"$CLUB_ID\\\",pageSize:25}){nodes{firstName lastName ghinNumber currentHandicapIndex membershipStatus}pageInfo{totalCount}} }\"}" | jq

# 2. Get single golfer
curl -s -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ golfer(id:\"<golfer-id>\"){firstName lastName currentHandicapIndex lowHandicapIndex} }"}' | jq

# 3. Add new golfer
curl -s -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation{addNewGolfer(input:{clubId:\\\"$CLUB_ID\\\",firstName:\\\"Test\\\",lastName:\\\"Player\\\",gender:M,email:\\\"test@example.com\\\",membershipCode:\\\"R\\\"}){id firstName lastName membershipStatus}}\"}" | jq

# 4. Duplicate email test — expect DUPLICATE_GOLFER error
# (run the same add mutation again — should fail)
```

---

## 10. Acceptance Criteria

- [ ] `golfers` query returns paginated roster filtered by `membershipStatus`
- [ ] `golfer(id)` returns single golfer detail including handicap index fields
- [ ] `searchExistingGolfers` requires at least GHIN/email or last name
- [ ] `addNewGolfer` fails if email already exists in same club
- [ ] `addNewGolfer` fails if GHIN already exists in same club
- [ ] `addNewGolfer` creates audit log on success
- [ ] `updateGolfer` creates audit log with before/after values
- [ ] `activateGolfer` only works on INACTIVE golfers
- [ ] `deactivateGolfer` only works on ACTIVE golfers; creates audit log
- [ ] Club Admin cannot access golfers from another club
- [ ] Roster `searchText` filter matches on first name, last name, email, or GHIN
- [ ] Roster supports sorting by `lastName`, `firstName`, `currentHandicapIndex`
- [ ] Default page size is 25; max is 100

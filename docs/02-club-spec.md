# 02 — Club Management
**Domain:** Club  
**Version:** 1.0  
**Screens:** 10 Account > Basic Information

---

## Table of Contents
1. [MongoDB Club Model](#1-mongodb-club-model)
2. [GraphQL Schema — Club](#2-graphql-schema--club)
3. [Club Repository](#3-club-repository)
4. [Club Service](#4-club-service)
5. [Club Resolver](#5-club-resolver)
6. [MongoDB Indexes](#6-mongodb-indexes)
7. [Screen Mapping](#7-screen-mapping)
8. [Seed Data](#8-seed-data)
9. [Verification Commands](#9-verification-commands)
10. [Acceptance Criteria](#10-acceptance-criteria)

---

## 1. MongoDB Club Model

### 1.1 TypeScript Interface

```typescript
// src/models/club.model.ts

export type ClubStatus = 'ACTIVE' | 'INACTIVE';

export interface IClubContact {
  contactType: string;         // 'PRIMARY', 'BILLING', 'EMERGENCY'
  name?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface IClub {
  _id: Types.ObjectId;
  clubNumber?: string;
  ghpId?: string;
  name: string;
  shortName?: string;
  associationName?: string;
  status: ClubStatus;
  clubCategory?: string;       // e.g. 'Affiliate'
  clubType?: string;           // e.g. 'Type 2'
  isTestClub: boolean;
  authorized: boolean;
  isDac: boolean;
  frontEndProvider?: string;   // e.g. 'GHIN'
  usgaAgaClub: boolean;
  phone?: string;
  email?: string;
  website?: string;
  hubspotCompanyId?: string;
  handicapChairperson?: string;
  contacts: IClubContact[];
  lastStatusUpdate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.2 Mongoose Schema

```typescript
const ClubContactSchema = new Schema<IClubContact>({
  contactType:  { type: String, required: true },
  name:         String,
  email:        String,
  phone:        String,
  addressLine1: String,
  addressLine2: String,
  city:         String,
  state:        String,
  postalCode:   String,
  country:      { type: String, default: 'United States' },
}, { _id: false });

const ClubSchema = new Schema<IClub>(
  {
    clubNumber:          { type: String, trim: true },
    ghpId:               { type: String, trim: true },
    name:                { type: String, required: true, trim: true },
    shortName:           { type: String, trim: true },
    associationName:     { type: String, trim: true },
    status:              { type: String, enum: ['ACTIVE','INACTIVE'], default: 'ACTIVE' },
    clubCategory:        String,
    clubType:            String,
    isTestClub:          { type: Boolean, default: false },
    authorized:          { type: Boolean, default: true },
    isDac:               { type: Boolean, default: false },
    frontEndProvider:    String,
    usgaAgaClub:         { type: Boolean, default: false },
    phone:               String,
    email:               String,
    website:             String,
    hubspotCompanyId:    String,
    handicapChairperson: String,
    contacts:            [ClubContactSchema],
    lastStatusUpdate:    { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Club = model<IClub>('Club', ClubSchema);
```

> **Note:** Contacts are embedded because they are small, stable, and always read together with the club document.

---

## 2. GraphQL Schema — Club

```graphql
enum ClubStatus { ACTIVE INACTIVE }

type ClubContact {
  contactType: String!
  name: String
  email: String
  phone: String
  addressLine1: String
  addressLine2: String
  city: String
  state: String
  postalCode: String
  country: String
}

type Club {
  id: ID!
  clubNumber: String
  ghpId: String
  name: String!
  shortName: String
  associationName: String
  status: ClubStatus!
  clubCategory: String
  clubType: String
  isTestClub: Boolean!
  authorized: Boolean!
  isDac: Boolean!
  frontEndProvider: String
  usgaAgaClub: Boolean!
  phone: String
  email: String
  website: String
  hubspotCompanyId: String
  handicapChairperson: String
  contacts: [ClubContact!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

input UpdateClubInput {
  name: String
  shortName: String
  phone: String
  email: String
  website: String
  hubspotCompanyId: String
  handicapChairperson: String
  contacts: [ClubContactInput!]
}

input ClubContactInput {
  contactType: String!
  name: String
  email: String
  phone: String
  addressLine1: String
  addressLine2: String
  city: String
  state: String
  postalCode: String
  country: String
}

type Query {
  myClubs: [Club!]!
  club(id: ID!): Club
}

type Mutation {
  updateClub(id: ID!, input: UpdateClubInput!): Club!
}
```

---

## 3. Club Repository

File: `src/repositories/club.repository.ts`

```typescript
export class ClubRepository {

  async findById(id: string): Promise<IClub | null> {
    return Club.findById(id).lean();
  }

  async findByIds(ids: string[]): Promise<IClub[]> {
    return Club.find({ _id: { $in: ids } }).lean();
  }

  async findByClubNumber(clubNumber: string): Promise<IClub | null> {
    return Club.findOne({ clubNumber }).lean();
  }

  async update(id: string, data: Partial<IClub>): Promise<IClub | null> {
    return Club.findByIdAndUpdate(
      id,
      { ...data, lastStatusUpdate: new Date() },
      { new: true, runValidators: true }
    ).lean();
  }

  async create(data: Partial<IClub>): Promise<IClub> {
    return Club.create(data);
  }
}
```

---

## 4. Club Service

File: `src/services/club.service.ts`

```typescript
export class ClubService {

  async getMyClubs(context: GraphQLContext): Promise<IClub[]> {
    requireAuth(context);
    if (context.user!.role === 'SUPER_ADMIN') {
      return Club.find({ status: 'ACTIVE' }).lean();
    }
    return this.repo.findByIds(context.user!.clubIds);
  }

  async getClubById(id: string, context: GraphQLContext): Promise<IClub | null> {
    requireAuth(context);
    requireClubAccess(context, id);
    return this.repo.findById(id);
  }

  async updateClub(
    id: string,
    input: UpdateClubInput,
    context: GraphQLContext
  ): Promise<IClub> {
    requireRole(context, ['SUPER_ADMIN', 'CLUB_ADMIN']);
    requireClubAccess(context, id);

    const before = await this.repo.findById(id);
    if (!before) throw new AppError('CLUB_NOT_FOUND', 'Club not found.', 404);

    const updated = await this.repo.update(id, input);

    await this.auditService.log({
      clubId: id,
      actorUserId: context.user!.userId,
      actorRole: context.user!.role,
      entityType: 'CLUB',
      entityId: id,
      action: 'CLUB_UPDATED',
      summary: `Club ${before.name} was updated.`,
      before: { name: before.name, phone: before.phone, email: before.email },
      after:  { name: updated!.name, phone: updated!.phone, email: updated!.email },
    });

    return updated!;
  }
}
```

---

## 5. Club Resolver

File: `src/graphql/resolvers/club.resolver.ts`

```typescript
export const clubResolvers = {
  Query: {
    myClubs: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      return clubService.getMyClubs(ctx);
    },
    club: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      return clubService.getClubById(id, ctx);
    },
  },

  Mutation: {
    updateClub: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateClubInput },
      ctx: GraphQLContext
    ) => {
      return clubService.updateClub(id, input, ctx);
    },
  },
};
```

---

## 6. MongoDB Indexes

```typescript
await Club.collection.createIndex({ clubNumber: 1 }, { unique: true, sparse: true });
await Club.collection.createIndex({ ghpId: 1 }, { sparse: true });
await Club.collection.createIndex({ name: 1 });
await Club.collection.createIndex({ status: 1 });
await Club.collection.createIndex({ associationName: 1 });
```

---

## 7. Screen Mapping

### Screen 10 — Account > Basic Information

**Route:** `/manage/[clubId]/account`  
**Layout:** AdminShell → Roster/Account/etc tabs → Account left nav (Primary, Home Courses, Membership Types)

| UI Section | Data Source | Editable |
|---|---|---|
| Club Number | `club.clubNumber` | No |
| GHP ID | `club.ghpId` | No |
| Club Name | `club.name` | Yes |
| Short Name | `club.shortName` | Yes |
| Association | `club.associationName` | No |
| Handicap Chairperson | `club.handicapChairperson` | Yes |
| Phone | `club.phone` | Yes |
| Email | `club.email` | Yes |
| Website | `club.website` | Yes |
| HubSpot ID | `club.hubspotCompanyId` | Yes |
| Status | `club.status` | No (admin-only) |
| Front End Provider | `club.frontEndProvider` | No |

**GraphQL calls for Screen 10:**
```graphql
# On page load
query GetClub($id: ID!) {
  club(id: $id) {
    id clubNumber ghpId name shortName associationName
    status clubCategory clubType isTestClub authorized isDac
    frontEndProvider usgaAgaClub phone email website
    hubspotCompanyId handicapChairperson contacts {
      contactType name email phone addressLine1 city state postalCode
    }
    createdAt updatedAt
  }
}

# On save
mutation UpdateClub($id: ID!, $input: UpdateClubInput!) {
  updateClub(id: $id, input: $input) {
    id name phone email website
  }
}
```

---

## 8. Seed Data

File: `seeds/clubs.seed.ts`

```typescript
export const clubSeed = {
  clubNumber:       '16645',
  ghpId:            '20793',
  name:             'Safari Golf Seattle',
  shortName:        'Safari Golf',
  associationName:  'Washington Golf',
  status:           'ACTIVE',
  clubCategory:     'Affiliate',
  clubType:         'Type 2',
  isTestClub:       false,
  authorized:       true,
  isDac:            false,
  frontEndProvider: 'GHIN',
  usgaAgaClub:      false,
  phone:            '(310) 955-0288',
  email:            'kwalker@safarigolfseattle.org',
  website:          '',
  hubspotCompanyId: '15495027727',
  handicapChairperson: 'Ken Njonge',
  contacts: [
    {
      contactType:  'PRIMARY',
      name:         'Moe Gichuru',
      email:        'mg@safarigolfseattle.org',
      phone:        '(206) 293-4241',
      addressLine1: '230 Auburn Way S STE 1B',
      addressLine2: '1053',
      city:         'Auburn',
      state:        'WA',
      postalCode:   '98002-5451',
      country:      'United States',
    },
  ],
};

export async function seedClub(): Promise<IClub> {
  const existing = await Club.findOne({ clubNumber: clubSeed.clubNumber });
  if (existing) return existing;

  const club = await Club.create(clubSeed);
  console.log(`✓ Club seeded: ${club.name} (${club._id})`);
  return club;
}
```

---

## 9. Verification Commands

```bash
TOKEN="<your-jwt>"
CLUB_ID="<club-id-from-seed>"

# 1. Load my clubs
curl -s -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ myClubs { id name clubNumber status associationName } }"}' | jq

# 2. Load specific club
curl -s -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ club(id:\\\"$CLUB_ID\\\") { id name phone email contacts { contactType name } } }\"}" | jq

# 3. Update club
curl -s -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation{updateClub(id:\\\"$CLUB_ID\\\",input:{phone:\\\"(206) 555-1234\\\"}){id phone updatedAt}}\"}" | jq

# 4. Cross-club access test — use a different club ID; expect FORBIDDEN
```

---

## 10. Acceptance Criteria

- [ ] `myClubs` returns only clubs the logged-in admin is assigned to
- [ ] `SUPER_ADMIN` sees all active clubs via `myClubs`
- [ ] `club(id)` returns full club detail including contacts array
- [ ] `updateClub` modifies editable fields and updates `lastStatusUpdate`
- [ ] `updateClub` creates an audit log with before/after values
- [ ] Club Admin cannot call `club(id)` for a club they are not assigned to (returns `FORBIDDEN`)
- [ ] Non-admin roles cannot call `updateClub` (returns `FORBIDDEN`)
- [ ] Seed creates Safari Golf Seattle with correct `clubNumber: 16645`

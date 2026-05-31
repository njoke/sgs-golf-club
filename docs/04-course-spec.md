# 04 — Course & Tee Management
**Domain:** Course  
**Version:** 1.0  
**Screens:** 11 Account > Home Courses | Post Score (course/tee lookup)

---

## Table of Contents
1. [MongoDB Course Model](#1-mongodb-course-model)
2. [GraphQL Schema — Course](#2-graphql-schema--course)
3. [Course Repository](#3-course-repository)
4. [Course Service](#4-course-service)
5. [Course Resolver](#5-course-resolver)
6. [MongoDB Indexes](#6-mongodb-indexes)
7. [Screen Mapping](#7-screen-mapping)
8. [Cedar Irons Seed Data](#8-cedar-irons-seed-data)
9. [Verification Commands](#9-verification-commands)
10. [Acceptance Criteria](#10-acceptance-criteria)

---

## 1. MongoDB Course Model

### 1.1 TypeScript Interfaces

```typescript
// src/models/course.model.ts

export interface INineHoleRating {
  rating: number;
  slope: number;
  par?: number;
}

export interface ITee {
  teeId: string;              // e.g. 'black-m', 'white-f'
  teeName: string;            // e.g. 'Black', 'White'
  gender: 'M' | 'F';
  par: number;
  courseRating: number;       // e.g. 69.7
  bogeyRating?: number;
  slopeRating: number;        // 55–155
  frontNine?: INineHoleRating;
  backNine?: INineHoleRating;
  yardage?: number;
  holeYardages?: number[];    // Array of 18 values
  holePars?: number[];        // Array of 18 values
  holeHandicaps?: number[];   // Stroke index 1–18 for each hole
}

export interface ICourse {
  _id: Types.ObjectId;
  clubId: Types.ObjectId;
  facilityName: string;
  courseName: string;
  city: string;
  state: string;
  isPrimaryFacility: boolean;
  tees: ITee[];
  defaultMaleTeeId?: string;
  defaultFemaleTeeId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.2 Mongoose Schema

```typescript
const NineHoleRatingSchema = new Schema<INineHoleRating>({
  rating: { type: Number, required: true },
  slope:  { type: Number, required: true },
  par:    Number,
}, { _id: false });

const TeeSchema = new Schema<ITee>({
  teeId:        { type: String, required: true },
  teeName:      { type: String, required: true },
  gender:       { type: String, enum: ['M','F'], required: true },
  par:          { type: Number, required: true },
  courseRating: { type: Number, required: true },
  bogeyRating:  Number,
  slopeRating:  { type: Number, required: true, min: 55, max: 155 },
  frontNine:    NineHoleRatingSchema,
  backNine:     NineHoleRatingSchema,
  yardage:      Number,
  holeYardages: [Number],
  holePars:     [Number],
  holeHandicaps:[Number],
}, { _id: false });

const CourseSchema = new Schema<ICourse>(
  {
    clubId:              { type: Schema.Types.ObjectId, ref: 'Club', required: true },
    facilityName:        { type: String, required: true, trim: true },
    courseName:          { type: String, required: true, trim: true },
    city:                { type: String, required: true, trim: true },
    state:               { type: String, required: true, trim: true },
    isPrimaryFacility:   { type: Boolean, default: false },
    tees:                [TeeSchema],
    defaultMaleTeeId:    String,
    defaultFemaleTeeId:  String,
  },
  { timestamps: true }
);

export const Course = model<ICourse>('Course', CourseSchema);
```

> **Modeling Rule:** Tees are embedded in the course document for MVP because tee data is always read alongside course data and does not grow unboundedly. A typical club has 2–8 tees per course.

---

## 2. GraphQL Schema — Course

```graphql
type NineHoleRating {
  rating: Float!
  slope: Int!
  par: Int
}

type Tee {
  teeId: ID!
  teeName: String!
  gender: Gender!
  par: Int!
  courseRating: Float!
  bogeyRating: Float
  slopeRating: Int!
  frontNine: NineHoleRating
  backNine: NineHoleRating
  yardage: Int
  holeYardages: [Int!]
  holePars: [Int!]
  holeHandicaps: [Int!]
}

type Course {
  id: ID!
  clubId: ID!
  facilityName: String!
  courseName: String!
  city: String!
  state: String!
  isPrimaryFacility: Boolean!
  tees: [Tee!]!
  defaultMaleTeeId: ID
  defaultFemaleTeeId: ID
  createdAt: DateTime!
  updatedAt: DateTime!
}

input NineHoleRatingInput {
  rating: Float!
  slope: Int!
  par: Int
}

input TeeInput {
  teeId: ID!
  teeName: String!
  gender: Gender!
  par: Int!
  courseRating: Float!
  bogeyRating: Float
  slopeRating: Int!
  frontNine: NineHoleRatingInput
  backNine: NineHoleRatingInput
  yardage: Int
  holeYardages: [Int!]
  holePars: [Int!]
  holeHandicaps: [Int!]
}

input AddCourseInput {
  clubId: ID!
  facilityName: String!
  courseName: String!
  city: String!
  state: String!
  isPrimaryFacility: Boolean
  tees: [TeeInput!]!
  defaultMaleTeeId: ID
  defaultFemaleTeeId: ID
}

type Query {
  clubCourses(clubId: ID!): [Course!]!
  course(id: ID!): Course
}

type Mutation {
  addHomeCourse(input: AddCourseInput!): Course!
  updateHomeCourse(id: ID!, input: AddCourseInput!): Course!
  removeHomeCourse(id: ID!): MutationResponse!
  setPrimaryFacility(courseId: ID!): Course!
  setDefaultTees(courseId: ID!, maleTeeId: ID, femaleTeeId: ID): Course!
}
```

---

## 3. Course Repository

File: `src/repositories/course.repository.ts`

```typescript
export class CourseRepository {

  async findByClub(clubId: string): Promise<ICourse[]> {
    return Course.find({ clubId }).sort({ isPrimaryFacility: -1, facilityName: 1 }).lean();
  }

  async findById(id: string): Promise<ICourse | null> {
    return Course.findById(id).lean();
  }

  async create(data: Partial<ICourse>): Promise<ICourse> {
    return Course.create(data);
  }

  async update(id: string, data: Partial<ICourse>): Promise<ICourse | null> {
    return Course.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  }

  async delete(id: string): Promise<void> {
    await Course.findByIdAndDelete(id);
  }

  // Clear primary facility flag for all other courses in the club
  async clearPrimaryFacility(clubId: string, excludeCourseId: string): Promise<void> {
    await Course.updateMany(
      { clubId, _id: { $ne: excludeCourseId } },
      { isPrimaryFacility: false }
    );
  }
}
```

---

## 4. Course Service

File: `src/services/course.service.ts`

### 4.1 Add Home Course

```typescript
async addHomeCourse(input: AddCourseInput, context: GraphQLContext): Promise<ICourse> {
  requireRole(context, ['SUPER_ADMIN', 'CLUB_ADMIN']);
  requireClubAccess(context, input.clubId);

  // Validate: at least one tee required
  if (!input.tees || input.tees.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'At least one tee is required.', 400);
  }

  // Validate tee IDs are unique within the course
  const teeIds = input.tees.map(t => t.teeId);
  if (new Set(teeIds).size !== teeIds.length) {
    throw new AppError('VALIDATION_ERROR', 'Tee IDs must be unique within a course.', 400);
  }

  // Validate defaultMaleTeeId / defaultFemaleTeeId exist in tees list
  if (input.defaultMaleTeeId && !teeIds.includes(input.defaultMaleTeeId)) {
    throw new AppError('VALIDATION_ERROR', 'Default male tee ID not found in provided tees.', 400);
  }
  if (input.defaultFemaleTeeId && !teeIds.includes(input.defaultFemaleTeeId)) {
    throw new AppError('VALIDATION_ERROR', 'Default female tee ID not found in provided tees.', 400);
  }

  // If setting as primary, clear other primary flags first
  if (input.isPrimaryFacility) {
    await this.repo.clearPrimaryFacility(input.clubId, 'none');
  }

  const course = await this.repo.create(input);
  await this.auditService.log({ /* ... */ action: 'COURSE_ADDED' });
  return course;
}
```

### 4.2 Set Default Tees

```typescript
async setDefaultTees(
  courseId: string,
  maleTeeId: string | undefined,
  femaleTeeId: string | undefined,
  context: GraphQLContext
): Promise<ICourse> {
  requireRole(context, ['SUPER_ADMIN', 'CLUB_ADMIN']);

  const course = await this.repo.findById(courseId);
  if (!course) throw new AppError('COURSE_NOT_FOUND', 'Course not found.', 404);
  requireClubAccess(context, course.clubId.toString());

  const teeIds = course.tees.map(t => t.teeId);

  if (maleTeeId && !teeIds.includes(maleTeeId)) {
    throw new AppError('TEE_NOT_FOUND', `Male tee '${maleTeeId}' not found on this course.`, 404);
  }
  if (femaleTeeId && !teeIds.includes(femaleTeeId)) {
    throw new AppError('TEE_NOT_FOUND', `Female tee '${femaleTeeId}' not found on this course.`, 404);
  }

  return this.repo.update(courseId, {
    defaultMaleTeeId: maleTeeId,
    defaultFemaleTeeId: femaleTeeId,
  })!;
}
```

---

## 5. Course Resolver

File: `src/graphql/resolvers/course.resolver.ts`

```typescript
export const courseResolvers = {
  Query: {
    clubCourses: async (_: unknown, { clubId }: { clubId: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      requireClubAccess(ctx, clubId);
      return courseService.getCoursesByClub(clubId);
    },
    course: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const course = await courseService.getById(id);
      if (!course) throw new AppError('COURSE_NOT_FOUND', 'Course not found.', 404);
      requireClubAccess(ctx, course.clubId.toString());
      return course;
    },
  },

  Mutation: {
    addHomeCourse:    async (_, { input }, ctx) => courseService.addHomeCourse(input, ctx),
    updateHomeCourse: async (_, { id, input }, ctx) => courseService.updateHomeCourse(id, input, ctx),
    removeHomeCourse: async (_, { id }, ctx) => courseService.removeHomeCourse(id, ctx),
    setPrimaryFacility: async (_, { courseId }, ctx) => courseService.setPrimaryFacility(courseId, ctx),
    setDefaultTees:   async (_, { courseId, maleTeeId, femaleTeeId }, ctx) =>
      courseService.setDefaultTees(courseId, maleTeeId, femaleTeeId, ctx),
  },
};
```

---

## 6. MongoDB Indexes

```typescript
await Course.collection.createIndex({ clubId: 1 });
await Course.collection.createIndex({ clubId: 1, isPrimaryFacility: 1 });
await Course.collection.createIndex({ facilityName: 1 });
await Course.collection.createIndex({ courseName: 1 });
```

---

## 7. Screen Mapping

### Screen 11 — Account > Home Courses

**Route:** `/manage/[clubId]/account/home-courses`

**Page Load:**
```graphql
query GetClubCourses($clubId: ID!) {
  clubCourses(clubId: $clubId) {
    id facilityName courseName city state isPrimaryFacility
    defaultMaleTeeId defaultFemaleTeeId
    tees {
      teeId teeName gender par courseRating slopeRating
      frontNine { rating slope } backNine { rating slope }
    }
  }
}
```

**Table columns displayed:** Facility Name | Course Name | City | State | Default Male Tee | Default Female Tee | Actions

**Actions per row:** Edit | Set as Primary | Set Default Tees | Remove

**Add Home Course flow:**
```
Click "Add Home Course"
→ Search/select facility name (text input)
→ Enter course details (name, city, state)
→ Add tees one by one (or import from scorecard in future)
→ Select default male tee
→ Select default female tee
→ Save → calls addHomeCourse mutation
```

### Post Score — Course/Tee Lookup (Screens 08 / 18)

When "Home Courses/Tees" is selected as the lookup method:
```graphql
query GetClubCourses($clubId: ID!) {
  clubCourses(clubId: $clubId) {
    id facilityName courseName
    tees { teeId teeName gender par courseRating slopeRating }
    defaultMaleTeeId defaultFemaleTeeId
  }
}
```

The tee dropdown format must be:
```
White — C.R. 68.5 / Slope 121 / Par 72
```

Auto-populate `courseRating`, `slopeRating`, `par` when tee is selected.

---

## 8. Cedar Irons Seed Data

File: `seeds/courses.seed.ts`

```typescript
export const cedarIronsSeed = {
  facilityName:      'Cedar Irons Golf Club',
  courseName:        'Cedar Irons Golf Club',
  city:              'Tacoma',
  state:             'WA',
  isPrimaryFacility: true,
  defaultMaleTeeId:  'white-m',
  defaultFemaleTeeId:'red-f',
  tees: [
    // --- MALE TEES ---
    {
      teeId: 'black-m', teeName: 'Black', gender: 'M', par: 72,
      courseRating: 69.7, slopeRating: 126, bogeyRating: 93.0,
      frontNine: { rating: 35.0, slope: 119, par: 36 },
      backNine:  { rating: 34.7, slope: 131, par: 36 },
      yardage: 6109,
      holeYardages:  [320,398,373,180,486,147,309,376,511,509,294,431,163,342,358,165,263,484],
      holePars:      [4,4,4,3,5,3,4,4,5,5,4,4,3,4,4,3,4,5],
      holeHandicaps: [15,7,1,5,13,17,11,3,9,8,12,4,14,10,2,6,18,16],
    },
    {
      teeId: 'white-m', teeName: 'White', gender: 'M', par: 72,
      courseRating: 68.5, slopeRating: 121,
      frontNine: { rating: 34.4, slope: 116, par: 36 },
      backNine:  { rating: 34.1, slope: 125, par: 36 },
    },
    {
      teeId: 'red-m',  teeName: 'Red',  gender: 'M', par: 72,
      courseRating: 66.3, slopeRating: 115,
      frontNine: { rating: 33.2, slope: 116, par: 36 },
      backNine:  { rating: 33.1, slope: 113, par: 36 },
    },
    {
      teeId: 'yellow-m', teeName: 'Yellow', gender: 'M', par: 72,
      courseRating: 62.1, slopeRating: 104,
      frontNine: { rating: 31.0, slope: 102, par: 36 },
      backNine:  { rating: 31.1, slope: 107, par: 36 },
    },
    // --- FEMALE TEES ---
    {
      teeId: 'black-f', teeName: 'Black', gender: 'F', par: 73,
      courseRating: 75.3, slopeRating: 136,
      frontNine: { rating: 37.7, slope: 131, par: 37 },
      backNine:  { rating: 37.6, slope: 141, par: 36 },
    },
    {
      teeId: 'white-f', teeName: 'White', gender: 'F', par: 73,
      courseRating: 73.6, slopeRating: 131,
      frontNine: { rating: 36.9, slope: 128, par: 37 },
      backNine:  { rating: 36.7, slope: 134, par: 36 },
    },
    {
      teeId: 'red-f', teeName: 'Red', gender: 'F', par: 73,
      courseRating: 71.1, slopeRating: 124,
      frontNine: { rating: 35.8, slope: 120, par: 37 },
      backNine:  { rating: 35.3, slope: 127, par: 36 },
    },
    {
      teeId: 'yellow-f', teeName: 'Yellow', gender: 'F', par: 73,
      courseRating: 66.6, slopeRating: 115,
      frontNine: { rating: 33.4, slope: 112, par: 37 },
      backNine:  { rating: 33.2, slope: 117, par: 36 },
    },
  ],
};
```

---

## 9. Verification Commands

```bash
TOKEN="<your-jwt>"
CLUB_ID="<club-id>"

# 1. Load club courses
curl -s -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ clubCourses(clubId:\\\"$CLUB_ID\\\"){id facilityName courseName isPrimaryFacility defaultMaleTeeId tees{teeId teeName gender par courseRating slopeRating}} }\"}" | jq

# 2. Load specific course
curl -s -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ course(id:\"<course-id>\"){facilityName tees{teeId teeName courseRating slopeRating}} }"}' | jq

# 3. Set default tees
curl -s -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation{setDefaultTees(courseId:\"<id>\",maleTeeId:\"white-m\",femaleTeeId:\"red-f\"){id defaultMaleTeeId defaultFemaleTeeId}}"}' | jq

# 4. Verify Cedar Irons seed: 8 tees (4 male + 4 female), white-m is default male
```

---

## 10. Acceptance Criteria

- [ ] `clubCourses` returns all courses for a club, primary facility listed first
- [ ] Each course includes all embedded tee data (teeId, teeName, gender, par, courseRating, slopeRating)
- [ ] `addHomeCourse` requires at least one tee
- [ ] `addHomeCourse` validates that `defaultMaleTeeId` matches a tee in the provided tees array
- [ ] `setPrimaryFacility` clears the primary flag on all other courses for the club
- [ ] `setDefaultTees` validates tee IDs exist on the course
- [ ] `removeHomeCourse` deletes the course and returns `{ success: true }`
- [ ] Club Admin cannot manage courses for another club
- [ ] Cedar Irons seed: 8 tees present, `defaultMaleTeeId = 'white-m'`, `defaultFemaleTeeId = 'red-f'`
- [ ] Post Score screen can load home courses and auto-populate rating/slope/par on tee select

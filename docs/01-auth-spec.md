# 01 — Authentication & Authorization
**Domain:** Auth  
**Version:** 1.0  
**Portals:** Admin + Member  
**Method:** Email + Password (JWT)

---

## Table of Contents
1. [User Roles](#1-user-roles)
2. [MongoDB User Model](#2-mongodb-user-model)
3. [Password Hashing](#3-password-hashing)
4. [JWT Configuration](#4-jwt-configuration)
5. [GraphQL Schema — Auth](#5-graphql-schema--auth)
6. [GraphQL Context](#6-graphql-context)
7. [Auth Service](#7-auth-service)
8. [Auth Resolver](#8-auth-resolver)
9. [Next.js Route Protection](#9-nextjs-route-protection)
10. [Frontend Auth Flow](#10-frontend-auth-flow)
11. [Permissions Module](#11-permissions-module)
12. [Seed Admin User](#12-seed-admin-user)
13. [Verification Commands](#13-verification-commands)
14. [Acceptance Criteria](#14-acceptance-criteria)

---

## 1. User Roles

| Role | Description | Portal |
|---|---|---|
| `SUPER_ADMIN` | Full system access, all clubs | Admin |
| `CLUB_ADMIN` | Full access within assigned club | Admin |
| `HANDICAP_CHAIR` | Score + handicap management | Admin |
| `TOURNAMENT_ADMIN` | Tournament + registration management | Admin |
| `MEMBER` | Own profile, scores, and registrations only | Member |
| `READ_ONLY` | View-only access within assigned club | Admin |

> **MVP Rule:** Build for `CLUB_ADMIN` and `MEMBER` first. Other roles should be defined in enums and permission checks but may not be fully tested until Phase 2 hardening.

---

## 2. MongoDB User Model

### 2.1 TypeScript Interface

```typescript
// src/models/user.model.ts

export type UserRole =
  | 'SUPER_ADMIN'
  | 'CLUB_ADMIN'
  | 'HANDICAP_CHAIR'
  | 'TOURNAMENT_ADMIN'
  | 'MEMBER'
  | 'READ_ONLY';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  clubIds: Types.ObjectId[];   // Clubs this user can access
  golferId?: Types.ObjectId;   // Linked golfer record (MEMBER role only)
  status: UserStatus;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 Mongoose Schema

```typescript
const UserSchema = new Schema<IUser>(
  {
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    firstName:    { type: String, required: true, trim: true },
    lastName:     { type: String, required: true, trim: true },
    role:         { type: String, enum: ['SUPER_ADMIN','CLUB_ADMIN','HANDICAP_CHAIR','TOURNAMENT_ADMIN','MEMBER','READ_ONLY'], required: true },
    clubIds:      [{ type: Schema.Types.ObjectId, ref: 'Club' }],
    golferId:     { type: Schema.Types.ObjectId, ref: 'Golfer', default: null },
    status:       { type: String, enum: ['ACTIVE','INACTIVE','LOCKED'], default: 'ACTIVE' },
    lastLoginAt:  { type: Date },
  },
  { timestamps: true }
);

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ clubIds: 1 });
UserSchema.index({ golferId: 1 });
UserSchema.index({ status: 1 });

export const User = model<IUser>('User', UserSchema);
```

---

## 3. Password Hashing

File: `src/auth/password.ts`

```typescript
import bcrypt from 'bcrypt';
import { env } from '../config/env';

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, env.BCRYPT_ROUNDS);
}

export async function comparePassword(
  plainText: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}
```

> **Rule:** BCRYPT_ROUNDS = 12 in production, 10 in test (for speed).

---

## 4. JWT Configuration

File: `src/auth/jwt.ts`

```typescript
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  clubIds: string[];
  golferId?: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,  // '8h'
    issuer: 'sgs-golf-club',
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
```

**Token extraction from request:**

```typescript
export function extractTokenFromHeader(
  authHeader?: string
): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}
```

---

## 5. GraphQL Schema — Auth

File: `src/graphql/schema.ts` (auth section)

```graphql
scalar DateTime

enum UserRole {
  SUPER_ADMIN
  CLUB_ADMIN
  HANDICAP_CHAIR
  TOURNAMENT_ADMIN
  MEMBER
  READ_ONLY
}

enum UserStatus {
  ACTIVE
  INACTIVE
  LOCKED
}

type AuthUser {
  id: ID!
  email: String!
  firstName: String!
  lastName: String!
  role: UserRole!
  clubIds: [ID!]!
  golferId: ID
  status: UserStatus!
}

type AuthPayload {
  token: String!
  user: AuthUser!
}

type MutationResponse {
  success: Boolean!
  message: String
}

input LoginInput {
  email: String!
  password: String!
}

type Mutation {
  login(input: LoginInput!): AuthPayload!
  logout: MutationResponse!
}
```

---

## 6. GraphQL Context

File: `src/graphql/context.ts`

The context builder extracts and validates the JWT on every request. Protected resolvers check `context.user`.

```typescript
import { Request } from 'express';
import { verifyToken, extractTokenFromHeader, JwtPayload } from '../auth/jwt';

export interface GraphQLContext {
  user: JwtPayload | null;
}

export async function buildContext(req: Request): Promise<GraphQLContext> {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) return { user: null };

  try {
    const payload = verifyToken(token);
    return { user: payload };
  } catch {
    return { user: null };  // Expired or invalid token — resolver enforces auth
  }
}
```

**Apollo Server setup:**

```typescript
// src/app.ts
const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: formatGraphQLError,
});

app.use('/graphql', expressMiddleware(server, {
  context: async ({ req }) => buildContext(req),
}));
```

---

## 7. Auth Service

File: `src/services/auth.service.ts`

```typescript
export class AuthService {
  async login(email: string, password: string): Promise<AuthPayload> {
    // 1. Find user by email (case-insensitive)
    const user = await UserRepository.findByEmail(email.toLowerCase());
    if (!user) throw new AppError('UNAUTHENTICATED', 'Invalid email or password.', 401);

    // 2. Check status
    if (user.status !== 'ACTIVE') {
      throw new AppError('FORBIDDEN', 'Account is inactive or locked.', 403);
    }

    // 3. Compare password
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw new AppError('UNAUTHENTICATED', 'Invalid email or password.', 401);

    // 4. Update lastLoginAt
    await UserRepository.updateLastLogin(user._id);

    // 5. Sign token
    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      clubIds: user.clubIds.map(String),
      golferId: user.golferId?.toString(),
    });

    return { token, user };
  }
}
```

> **Rule:** Never reveal whether the email or password was wrong. Always return: `"Invalid email or password."` for both failure modes.

---

## 8. Auth Resolver

File: `src/graphql/resolvers/auth.resolver.ts`

```typescript
export const authResolvers = {
  Mutation: {
    login: async (_: unknown, { input }: { input: LoginInput }) => {
      return authService.login(input.email, input.password);
    },

    logout: async (_: unknown, __: unknown, context: GraphQLContext) => {
      // JWT is stateless — logout is client-side token discard
      // Optionally implement a token denylist (Redis) in a future phase
      return { success: true, message: 'Logged out successfully.' };
    },
  },
};
```

---

## 9. Next.js Route Protection

File: `frontend/middleware.ts`

This runs on the edge before every request. It checks for a valid token cookie and redirects unauthenticated users to `/login`.

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_PREFIX  = '/dashboard';
const MEMBER_PREFIX = '/member';
const LOGIN_PATH    = '/login';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('sgs_token')?.value;
  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith(ADMIN_PREFIX) ||
    pathname.startsWith('/manage') ||
    pathname.startsWith('/tournaments') ||
    pathname.startsWith(MEMBER_PREFIX);

  if (isProtected && !token) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/manage/:path*', '/tournaments/:path*', '/member/:path*'],
};
```

> **Token storage:** Store the JWT in an `httpOnly` cookie on login. Do NOT store in `localStorage`. The Apollo Client reads it via the cookie header automatically when using `credentials: 'include'`.

---

## 10. Frontend Auth Flow

### 10.1 Login Page Behavior (`/login`)

```
User submits email + password
  → POST to GraphQL: login mutation
  → On success:
      - Store token in httpOnly cookie (via Set-Cookie or client cookie)
      - Store user role in React context / localStorage (non-sensitive)
      - Redirect based on role:
          CLUB_ADMIN / HANDICAP_CHAIR / TOURNAMENT_ADMIN / READ_ONLY → /dashboard
          MEMBER → /member/dashboard
  → On failure:
      - Display inline error: "Invalid email or password."
      - Do NOT clear the email field
```

### 10.2 Auth Context

File: `src/lib/auth/authContext.tsx`

```typescript
interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  isMember: () => boolean;
}
```

### 10.3 Apollo Client — Auth Header

File: `src/lib/apollo/client.ts`

```typescript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
  credentials: 'include',  // sends cookies automatically
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});
```

---

## 11. Permissions Module

File: `src/auth/permissions.ts`

This module is used inside service-layer methods — never inside resolvers directly.

```typescript
import { GraphQLContext } from '../graphql/context';
import { AppError } from '../errors/AppError';

export function requireAuth(context: GraphQLContext): void {
  if (!context.user) {
    throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
  }
}

export function requireRole(
  context: GraphQLContext,
  roles: UserRole[]
): void {
  requireAuth(context);
  if (!roles.includes(context.user!.role)) {
    throw new AppError('FORBIDDEN', 'You do not have permission to perform this action.', 403);
  }
}

export function requireClubAccess(
  context: GraphQLContext,
  clubId: string
): void {
  requireAuth(context);
  if (context.user!.role === 'SUPER_ADMIN') return; // Super admin bypasses
  if (!context.user!.clubIds.includes(clubId)) {
    throw new AppError('FORBIDDEN', 'Access to this club is not authorized.', 403);
  }
}

export function requireOwnGolferOrAdmin(
  context: GraphQLContext,
  golferId: string
): void {
  requireAuth(context);
  const { role, golferId: contextGolferId } = context.user!;
  const adminRoles: UserRole[] = ['SUPER_ADMIN','CLUB_ADMIN','HANDICAP_CHAIR'];
  if (adminRoles.includes(role)) return;
  if (role === 'MEMBER' && contextGolferId === golferId) return;
  throw new AppError('FORBIDDEN', 'Access denied.', 403);
}
```

---

## 12. Seed Admin User

File: `seeds/users.seed.ts`

```typescript
import { hashPassword } from '../src/auth/password';

export const adminUserSeed = {
  email: 'admin@sgs.golf',
  password: 'Admin123!',     // Only used for seeding; hashed before save
  firstName: 'Ken',
  lastName: 'Njonge',
  role: 'CLUB_ADMIN',
  status: 'ACTIVE',
};

export async function seedUsers(clubId: string) {
  const existing = await User.findOne({ email: adminUserSeed.email });
  if (existing) return; // Idempotent

  await User.create({
    ...adminUserSeed,
    passwordHash: await hashPassword(adminUserSeed.password),
    clubIds: [clubId],
  });

  console.log('✓ Admin user seeded: admin@sgs.golf / Admin123!');
}
```

> **Note:** Also seed a member user linked to Jared Abwawo's golfer record for member portal testing.
>
> ```
> Member email: jared@sgs.golf
> Member password: Member123!
> Role: MEMBER
> ```

---

## 13. Verification Commands

```bash
# 1. Login as admin — expect token + CLUB_ADMIN role
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(input: { email: \"admin@sgs.golf\", password: \"Admin123!\" }) { token user { email role clubIds } } }"
  }' | jq

# 2. Login as member — expect token + MEMBER role
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(input: { email: \"jared@sgs.golf\", password: \"Member123!\" }) { token user { email role golferId } } }"
  }' | jq

# 3. Invalid credentials — expect UNAUTHENTICATED error
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(input: { email: \"admin@sgs.golf\", password: \"wrong\" }) { token } }"
  }' | jq

# 4. Protected query without token — expect UNAUTHENTICATED
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ golfers(filter: { clubId: \"any\" }) { nodes { id } } }"}' | jq
```

---

## 14. Acceptance Criteria

- [ ] Admin can log in with `admin@sgs.golf` / `Admin123!`
- [ ] Member can log in with `jared@sgs.golf` / `Member123!`
- [ ] Wrong password returns `"Invalid email or password."` — does not reveal which field failed
- [ ] Inactive user returns `"Account is inactive or locked."`
- [ ] JWT contains `userId`, `email`, `role`, `clubIds`
- [ ] Protected GraphQL queries without a token return `UNAUTHENTICATED`
- [ ] MEMBER role cannot access `CLUB_ADMIN` operations
- [ ] `requireClubAccess` blocks a Club Admin from accessing another club's data
- [ ] Token is stored in `httpOnly` cookie — not exposed in `localStorage`
- [ ] Frontend redirects admin to `/dashboard`, member to `/member/dashboard`
- [ ] Unauthenticated Next.js routes redirect to `/login`

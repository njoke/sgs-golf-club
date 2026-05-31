# 11 — Testing Strategy
**Domain:** Testing  
**Version:** 1.0  
**Portfolio Goal:** Demonstrate full-stack testing breadth on GitHub

---

## Table of Contents
1. [Testing Stack Overview](#1-testing-stack-overview)
2. [Test Pyramid](#2-test-pyramid)
3. [Rover CLI — Schema Validation](#3-rover-cli--schema-validation)
4. [Karate — GraphQL API Testing](#4-karate--graphql-api-testing)
5. [Jest + Supertest — Unit & Integration](#5-jest--supertest--unit--integration)
6. [React Testing Library — Frontend Unit](#6-react-testing-library--frontend-unit)
7. [Cypress — End-to-End Testing](#7-cypress--end-to-end-testing)
8. [k6 — Performance Testing (Bonus)](#8-k6--performance-testing-bonus)
9. [GitHub Portfolio Structure](#9-github-portfolio-structure)
10. [CI Pipeline Placeholder](#10-ci-pipeline-placeholder)
11. [Acceptance Criteria](#11-acceptance-criteria)

---

## 1. Testing Stack Overview

| Layer | Tool | What It Tests | Portfolio Value |
|---|---|---|---|
| Schema Validation | Rover CLI (Apollo) | GraphQL schema linting + breaking change detection | DevOps/API quality |
| GraphQL API Functional | Karate 1.4 | All queries + mutations via HTTP | BDD, API-first |
| Backend Unit | Jest | Handicap engine, service logic, validators | Core correctness |
| Backend Integration | Jest + Supertest | Resolvers + MongoDB via test DB | Full stack |
| Frontend Unit | Jest + RTL | React components, hooks | UI correctness |
| E2E | Cypress 13 | Full user workflows admin + member | Real user flows |
| Performance | k6 | Roster load, score post load | Production readiness |

> **Order of implementation:** Backend Unit → Karate API → Cypress E2E → Frontend Unit → k6 (last)

---

## 2. Test Pyramid

```
              ┌─────────────┐
              │     k6      │  ← Performance (2 scripts)
           ┌──┴─────────────┴──┐
           │  Cypress E2E      │  ← 8 workflows
        ┌──┴───────────────────┴──┐
        │    Karate GraphQL       │  ← 20+ scenarios
     ┌──┴─────────────────────────┴──┐
     │   Jest Unit + Integration     │  ← 60+ tests
  ┌──┴───────────────────────────────┴──┐
  │    Rover CLI Schema Validation       │  ← Run on every commit
  └──────────────────────────────────────┘
```

---

## 3. Rover CLI — Schema Validation

### 3.1 Install

```bash
npm install -g @apollo/rover
```

### 3.2 Usage

```bash
# Introspect schema from running backend
rover graph introspect http://localhost:4000/graphql > schema.graphql

# Check schema for composition errors
rover graph check --schema schema.graphql

# Run before every PR merge
```

### 3.3 NPM Script

Add to `backend/package.json`:

```json
{
  "scripts": {
    "schema:validate": "rover graph introspect http://localhost:4000/graphql > schema.graphql && echo 'Schema exported successfully'"
  }
}
```

> **Portfolio Note:** Rover CLI shows awareness of schema-first development and breaking-change detection — a strong differentiator for backend API testing portfolios.

---

## 4. Karate — GraphQL API Testing

### 4.1 Project Setup

File: `tests/karate/pom.xml`

```xml
<project>
  <groupId>sgs.golf</groupId>
  <artifactId>karate-tests</artifactId>
  <version>1.0.0</version>
  <dependencies>
    <dependency>
      <groupId>io.karatelabs</groupId>
      <artifactId>karate-junit5</artifactId>
      <version>1.4.1</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
  <build>
    <testSourceDirectory>src/test/java</testSourceDirectory>
  </build>
</project>
```

### 4.2 karate-config.js

File: `tests/karate/src/test/resources/karate-config.js`

```javascript
function fn() {
  var env = karate.env || 'local';
  var config = {
    baseUrl: 'http://localhost:4000/graphql',
    adminEmail: 'admin@safarigolfseattle.org',
    adminPassword: 'Admin123!',
    memberEmail: 'jared@safarigolfseattle.org',
    memberPassword: 'Member123!',
  };

  // Shared login function — reused across features
  config.login = function(email, password) {
    var result = karate.call('classpath:shared/login.feature', {
      email: email, password: password
    });
    return result.token;
  };

  return config;
}
```

### 4.3 Shared Login Feature

File: `tests/karate/src/test/resources/shared/login.feature`

```gherkin
Feature: Login helper

  Scenario: Login and return token
    Given url baseUrl
    And request
      """
      {
        "query": "mutation Login($email: String!, $password: String!) { login(input: { email: $email, password: $password }) { token } }",
        "variables": { "email": "#(email)", "password": "#(password)" }
      }
      """
    When method POST
    Then status 200
    And def token = response.data.login.token
```

### 4.4 Auth Feature

File: `tests/karate/src/test/resources/auth/login.feature`

```gherkin
Feature: Authentication

  Background:
    Given url baseUrl
    And header Content-Type = 'application/json'

  Scenario: Admin login — valid credentials
    And request
      """
      {
        "query": "mutation { login(input: { email: \"admin@safarigolfseattle.org\", password: \"Admin123!\" }) { token user { email role } } }"
      }
      """
    When method POST
    Then status 200
    And match response.data.login.token == '#notnull'
    And match response.data.login.user.role == 'CLUB_ADMIN'

  Scenario: Login — wrong password returns generic error
    And request
      """
      {
        "query": "mutation { login(input: { email: \"admin@safarigolfseattle.org\", password: \"wrong\" }) { token } }"
      }
      """
    When method POST
    Then status 200
    And match response.errors[0].message == 'Invalid email or password.'

  Scenario: Member login — expect MEMBER role
    And request
      """
      {
        "query": "mutation { login(input: { email: \"jared@safarigolfseattle.org\", password: \"Member123!\" }) { token user { role golferId } } }"
      }
      """
    When method POST
    Then status 200
    And match response.data.login.user.role == 'MEMBER'
    And match response.data.login.user.golferId == '#notnull'

  Scenario: Protected query without token — expect UNAUTHENTICATED
    And request { "query": "{ myClubs { id } }" }
    When method POST
    Then status 200
    And match response.errors[0].extensions.code == 'UNAUTHENTICATED'
```

### 4.5 Golfer Feature

File: `tests/karate/src/test/resources/golfer/roster.feature`

```gherkin
Feature: Golfer Roster

  Background:
    Given url baseUrl
    And header Content-Type = 'application/json'
    * def adminToken = call login({ email: adminEmail, password: adminPassword })
    * header Authorization = 'Bearer ' + adminToken

  Scenario: Load roster — returns seeded golfers
    And request
      """
      {
        "query": "query { golfers(filter: { clubId: \"#(clubId)\", pageSize: 25 }) { nodes { firstName lastName ghinNumber membershipStatus } pageInfo { totalCount } } }"
      }
      """
    When method POST
    Then status 200
    And match response.data.golfers.nodes[*].membershipStatus contains 'ACTIVE'
    And match response.data.golfers.pageInfo.totalCount >= 6

  Scenario: Search by name filter
    And request
      """
      {
        "query": "query { golfers(filter: { clubId: \"#(clubId)\", searchText: \"Abwawo\" }) { nodes { firstName lastName } } }"
      }
      """
    When method POST
    Then status 200
    And match response.data.golfers.nodes[0].lastName == 'Abwawo'

  Scenario: Add new golfer — success
    * def email = 'test_' + java.util.UUID.randomUUID() + '@example.com'
    And request
      """
      {
        "query": "mutation AddGolfer($input: AddNewGolferInput!) { addNewGolfer(input: $input) { id firstName lastName email membershipStatus } }",
        "variables": {
          "input": { "clubId": "#(clubId)", "firstName": "Test", "lastName": "Player", "gender": "M", "email": "#(email)", "membershipCode": "R" }
        }
      }
      """
    When method POST
    Then status 200
    And match response.data.addNewGolfer.membershipStatus == 'ACTIVE'
    And match response.data.addNewGolfer.email == email

  Scenario: Add golfer — duplicate email fails
    And request
      """
      {
        "query": "mutation { addNewGolfer(input: { clubId: \"#(clubId)\", firstName: \"Dup\", lastName: \"User\", gender: \"M\", email: \"j_midimo@hotmail.com\", membershipCode: \"R\" }) { id } }"
      }
      """
    When method POST
    Then status 200
    And match response.errors[0].extensions.code == 'DUPLICATE_GOLFER'
```

### 4.6 Score Feature

File: `tests/karate/src/test/resources/score/post-score.feature`

```gherkin
Feature: Score Posting

  Background:
    * def adminToken = call login({ email: adminEmail, password: adminPassword })
    Given url baseUrl
    And header Authorization = 'Bearer ' + adminToken
    And header Content-Type = 'application/json'

  Scenario: Post 18-hole score — calculates differential
    And request
      """
      {
        "query": "mutation PostScore($input: PostScoreInput!) { postScore(input: $input) { id grossScore differential status } }",
        "variables": {
          "input": {
            "clubId": "#(clubId)", "golferId": "#(jaredGolferId)",
            "datePlayed": "2026-05-30T00:00:00.000Z",
            "scoreType": "HOME", "holes": 18, "entryMode": "TOTAL_SCORE",
            "courseId": "#(cedarIronsCourseId)", "teeId": "white-m",
            "courseName": "Cedar Irons Golf Club", "teeName": "White",
            "grossScore": 85, "courseRating": 68.5, "slopeRating": 121, "par": 72
          }
        }
      }
      """
    When method POST
    Then status 200
    And match response.data.postScore.status == 'POSTED'
    And def diff = response.data.postScore.differential
    # Expected: (85 - 68.5) * (113/121) = 15.4 (truncated)
    And match diff == 15.4

  Scenario: Post score — invalid slope fails
    And request
      """
      {
        "query": "mutation { postScore(input: { clubId: \"#(clubId)\", golferId: \"#(jaredGolferId)\", datePlayed: \"2026-05-30T00:00:00Z\", scoreType: HOME, holes: 18, entryMode: TOTAL_SCORE, courseName: \"Test\", teeName: \"Blue\", grossScore: 80, courseRating: 68.5, slopeRating: 200, par: 72 }) { id } }"
      }
      """
    When method POST
    Then status 200
    And match response.errors[0].message contains 'Slope rating must be between 55 and 155'

  Scenario: Member posts score for another golfer — expect FORBIDDEN
    * def memberToken = call login({ email: memberEmail, password: memberPassword })
    Given header Authorization = 'Bearer ' + memberToken
    And request
      """
      {
        "query": "mutation { postScore(input: { clubId: \"#(clubId)\", golferId: \"#(anotherGolferId)\", datePlayed: \"2026-05-30T00:00:00Z\", scoreType: HOME, holes: 18, entryMode: TOTAL_SCORE, courseName: \"Test\", teeName: \"Blue\", grossScore: 80, courseRating: 68.5, slopeRating: 121, par: 72 }) { id } }"
      }
      """
    When method POST
    Then status 200
    And match response.errors[0].extensions.code == 'FORBIDDEN'
```

### 4.7 Tournament Feature

File: `tests/karate/src/test/resources/tournament/registration.feature`

```gherkin
Feature: Tournament Registration

  Background:
    * def adminToken = call login({ email: adminEmail, password: adminPassword })
    * def memberToken = call login({ email: memberEmail, password: memberPassword })

  Scenario: Member registers for open tournament
    Given url baseUrl
    And header Authorization = 'Bearer ' + memberToken
    And header Content-Type = 'application/json'
    And request
      """
      {
        "query": "mutation { registerForTournament(input: { tournamentId: \"#(springClassicId)\", golferId: \"#(jaredGolferId)\", email: \"j_midimo@hotmail.com\", agreedToTerms: true }) { id status paymentStatus } }"
      }
      """
    When method POST
    Then status 200
    And match response.data.registerForTournament.status == 'REGISTERED'
    And match response.data.registerForTournament.paymentStatus == 'UNPAID'

  Scenario: Duplicate registration — expect error
    # (Run same request as above — second call)
    Then match response.errors[0].extensions.code == 'REGISTRATION_DUPLICATE'

  Scenario: Register without terms accepted — expect error
    And request { "query": "mutation { registerForTournament(input: { tournamentId: \"#(springClassicId)\", golferId: \"#(jaredGolferId)\", email: \"j@example.com\", agreedToTerms: false }) { id } }" }
    When method POST
    Then match response.errors[0].message contains 'must agree to the terms'
```

### 4.8 Running Karate

```bash
cd tests/karate

# Run all tests
mvn test

# Run specific feature
mvn test -Dkarate.options="classpath:auth/login.feature"

# Run with env config
mvn test -Dkarate.env=staging

# View HTML reports
open target/karate-reports/karate-summary.html
```

---

## 5. Jest + Supertest — Unit & Integration

### 5.1 Jest Config

File: `backend/jest.config.ts`

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterFramework: ['<rootDir>/tests/setup.ts'],
  coverageThreshold: {
    global: { statements: 70, branches: 70, functions: 70, lines: 70 },
  },
};
export default config;
```

### 5.2 Handicap Engine Unit Tests

File: `backend/tests/unit/handicap.engine.test.ts`

```typescript
import {
  calculate18HoleDifferential,
  calculateHandicapIndex,
  getKValue,
} from '../../src/handicap/differential';
import { applyCaps } from '../../src/handicap/caps';
import { applyESR } from '../../src/handicap/esr';

describe('Handicap Engine — Differential', () => {
  it('calculates 18-hole differential correctly (truncates not rounds)', () => {
    // (85 - 71.5) × (113/128) = 11.918... → truncate → 11.9
    expect(calculate18HoleDifferential(85, 71.5, 128)).toBe(11.9);
  });

  it('does NOT round up 11.98 to 12.0', () => {
    // Rounding would give 12.0; truncation gives 11.9
    const result = calculate18HoleDifferential(85, 71.0, 127);
    expect(result).toBeLessThan(12.0);
  });
});

describe('Handicap Engine — K Value Table', () => {
  const table = [
    [3, 1], [4, 1], [5, 1], [6, 2], [7, 2], [8, 2],
    [9, 3], [10, 3], [11, 3], [12, 4], [13, 4], [14, 4],
    [15, 5], [16, 5], [17, 6], [18, 6], [19, 7], [20, 8],
  ];
  test.each(table)('n=%i → k=%i', (n, k) => {
    expect(getKValue(n)).toBe(k);
  });

  it('returns null for fewer than 3 differentials', () => {
    expect(getKValue(2)).toBeNull();
    expect(getKValue(0)).toBeNull();
  });
});

describe('Handicap Engine — Index Calculation', () => {
  it('calculates from 3 rounds: uses 1 lowest', () => {
    expect(calculateHandicapIndex([12.5, 14.0, 18.2])).toBe(12.5);
  });

  it('calculates from 20 rounds: uses 8 lowest, truncates', () => {
    const diffs = [10.1,10.2,10.3,10.4,10.5,10.6,10.7,10.8, 14,15,16,17,18,19,20,21,22,23,24,25];
    const result = calculateHandicapIndex(diffs);
    // avg of 8 lowest = (10.1+10.2+10.3+10.4+10.5+10.6+10.7+10.8)/8 = 10.45 → truncated → 10.4
    expect(result).toBe(10.4);
  });

  it('caps at 54.0 maximum', () => {
    const highDiffs = Array(20).fill(60.0);
    expect(calculateHandicapIndex(highDiffs)).toBe(54.0);
  });

  it('returns null for fewer than 3 differentials', () => {
    expect(calculateHandicapIndex([14.0, 16.0])).toBeNull();
  });
});

describe('Handicap Engine — Caps', () => {
  it('no cap applied when HI is below soft cap', () => {
    // lowestIndex365 = 5.0, newHI = 7.0 → below softCap (8.0) → no cap
    expect(applyCaps(7.0, 5.0)).toBe(7.0);
  });

  it('soft cap: excess halved', () => {
    // lowestIndex365 = 5.0, newHI = 9.0 → softCap = 8.0, excess = 1.0 → result = 8.5
    expect(applyCaps(9.0, 5.0)).toBe(8.5);
  });

  it('hard cap: ceiling enforced', () => {
    // lowestIndex365 = 5.0, newHI = 11.0 → hardCap = 10.0
    expect(applyCaps(11.0, 5.0)).toBe(10.0);
  });

  it('no cap applied when no prior history', () => {
    expect(applyCaps(20.0, null)).toBe(20.0);
  });
});

describe('Handicap Engine — ESR', () => {
  const makeScore = (diff: number, daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return { differential: diff, datePlayed: d };
  };

  it('does not apply ESR with fewer than 2 exceptional rounds', () => {
    const scores = [makeScore(10.0, 10)];  // Only 1 exceptional vs HI 20
    expect(applyESR(20.0, scores, 'M')).toBe(20.0);
  });

  it('applies ESR for male — max reduction -1.0', () => {
    // currentHI = 20.0 → threshold = 13.0 → exceptional = [8.0, 9.0]
    const scores = [makeScore(8.0, 10), makeScore(9.0, 20), makeScore(15.0, 30)];
    const result = applyESR(20.0, scores, 'M');
    expect(result).toBe(19.0);  // -1.0 max for male
  });

  it('applies ESR for female — max reduction -2.0', () => {
    const scores = [makeScore(5.0, 10), makeScore(6.0, 20)];
    const result = applyESR(20.0, scores, 'F');
    expect(result).toBeLessThan(20.0);
    expect(result).toBeGreaterThanOrEqual(18.0);  // -2.0 max for female
  });
});
```

### 5.3 Integration Test Example

File: `backend/tests/integration/golfer.test.ts`

```typescript
import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { seedTestData } from '../helpers/seed';

describe('GraphQL — Golfer Integration', () => {
  let app: Express;
  let adminToken: string;
  let clubId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const seeds = await seedTestData();
    adminToken = seeds.adminToken;
    clubId = seeds.clubId;
  });

  afterAll(async () => {
    await clearTestDatabase();
  });

  it('GET roster — returns paginated golfers for club', async () => {
    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        query: `{ golfers(filter: { clubId: "${clubId}", pageSize: 25 }) { nodes { firstName } pageInfo { totalCount } } }`,
      });

    expect(res.body.data.golfers.nodes.length).toBeGreaterThan(0);
    expect(res.body.errors).toBeUndefined();
  });

  it('POST addNewGolfer — creates golfer', async () => {
    const email = `test_${Date.now()}@example.com`;
    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        query: `
          mutation {
            addNewGolfer(input: { clubId: "${clubId}", firstName: "Test", lastName: "Player",
              gender: M, email: "${email}", membershipCode: "R" }) { id email membershipStatus }
          }`,
      });

    expect(res.body.data.addNewGolfer.membershipStatus).toBe('ACTIVE');
    expect(res.body.data.addNewGolfer.email).toBe(email);
  });
});
```

---

## 6. React Testing Library — Frontend Unit

### 6.1 Setup

```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

File: `frontend/jest.config.ts`

```typescript
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['./tests/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
export default config;
```

### 6.2 Component Test Example

File: `frontend/tests/components/StatusBadge.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/shared/StatusBadge';

describe('StatusBadge', () => {
  it('renders ACTIVE status', () => {
    render(<StatusBadge status="ACTIVE" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders WITHDRAWN with correct color class', () => {
    const { container } = render(<StatusBadge status="WITHDRAWN" />);
    expect(container.firstChild).toHaveClass('text-red-700');
  });
});
```

### 6.3 Hook Test Example

File: `frontend/tests/hooks/useAuth.test.tsx`

```tsx
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/lib/auth/authContext';

describe('useAuth', () => {
  it('isAdmin returns false for MEMBER role', () => {
    // Mock context with MEMBER role
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });
    expect(result.current.isMember()).toBe(false);  // No user yet
  });
});
```

---

## 7. Cypress — End-to-End Testing

### 7.1 Setup

```bash
cd tests/cypress
npm init -y
npm install cypress --save-dev
npx cypress open
```

File: `tests/cypress/cypress.config.ts`

```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    env: {
      adminEmail:    'admin@safarigolfseattle.org',
      adminPassword: 'Admin123!',
      memberEmail:   'jared@safarigolfseattle.org',
      memberPassword:'Member123!',
      apiUrl:        'http://localhost:4000/graphql',
    },
  },
});
```

### 7.2 Custom Commands

File: `tests/cypress/support/commands.ts`

```typescript
// Login via API (faster than UI login each time)
Cypress.Commands.add('loginAsAdmin', () => {
  cy.request({
    method: 'POST',
    url: Cypress.env('apiUrl'),
    body: {
      query: `mutation { login(input: { email: "${Cypress.env('adminEmail')}", password: "${Cypress.env('adminPassword')}" }) { token } }`,
    },
  }).then((res) => {
    const token = res.body.data.login.token;
    cy.setCookie('sgs_token', token);
    window.localStorage.setItem('sgs_user', JSON.stringify({ role: 'CLUB_ADMIN' }));
  });
});

Cypress.Commands.add('loginAsMember', () => {
  cy.request({
    method: 'POST',
    url: Cypress.env('apiUrl'),
    body: {
      query: `mutation { login(input: { email: "${Cypress.env('memberEmail')}", password: "${Cypress.env('memberPassword')}" }) { token user { role golferId clubIds } } }`,
    },
  }).then((res) => {
    const { token, user } = res.body.data.login;
    cy.setCookie('sgs_token', token);
    window.localStorage.setItem('sgs_user', JSON.stringify(user));
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginAsAdmin(): Chainable<void>;
      loginAsMember(): Chainable<void>;
    }
  }
}
```

### 7.3 Admin E2E — Login

File: `tests/cypress/e2e/admin/login.cy.ts`

```typescript
describe('Admin — Login', () => {
  beforeEach(() => cy.visit('/login'));

  it('logs in with valid credentials and redirects to /dashboard', () => {
    cy.get('[data-testid="email-input"]').type('admin@safarigolfseattle.org');
    cy.get('[data-testid="password-input"]').type('Admin123!');
    cy.get('[data-testid="login-button"]').click();
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome back');
  });

  it('shows error for wrong password', () => {
    cy.get('[data-testid="email-input"]').type('admin@safarigolfseattle.org');
    cy.get('[data-testid="password-input"]').type('wrongpass');
    cy.get('[data-testid="login-button"]').click();
    cy.contains('Invalid email or password.');
    cy.url().should('include', '/login');
  });

  it('redirects to /login when accessing /dashboard unauthenticated', () => {
    cy.visit('/dashboard');
    cy.url().should('include', '/login');
  });
});
```

### 7.4 Admin E2E — Roster

File: `tests/cypress/e2e/admin/roster.cy.ts`

```typescript
describe('Admin — Roster', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
    cy.visit('/manage/<clubId>/roster');
  });

  it('loads roster with seeded golfers', () => {
    cy.get('[data-testid="roster-table"]').should('be.visible');
    cy.contains('Abwawo').should('exist');
    cy.contains('Karanja').should('exist');
  });

  it('filters by search text', () => {
    cy.get('[data-testid="search-input"]').type('Abwawo');
    cy.get('[data-testid="roster-row"]').should('have.length', 1);
    cy.contains('Jared').should('be.visible');
  });

  it('opens Add Golfer modal', () => {
    cy.get('[data-testid="add-golfer-button"]').click();
    cy.get('[data-testid="add-golfer-modal"]').should('be.visible');
    cy.contains('Search for Existing Member');
    cy.contains('Add New Member');
  });
});
```

### 7.5 Admin E2E — Post Score

File: `tests/cypress/e2e/admin/post-score.cy.ts`

```typescript
describe('Admin — Post Score', () => {
  before(() => {
    cy.loginAsAdmin();
    cy.visit('/manage/<clubId>/golfer/<jared-id>');
  });

  it('posts a score and updates handicap index', () => {
    cy.contains('Post a Score').click();

    cy.get('[data-testid="date-played"]').type('2026-05-30');
    cy.get('[data-testid="score-type-HOME"]').click();
    cy.get('[data-testid="holes-18"]').click();
    cy.get('[data-testid="course-select"]').select('Cedar Irons Golf Club');
    cy.get('[data-testid="tee-select"]').select('White — C.R. 68.5 / Slope 121 / Par 72');

    // Verify auto-populated fields
    cy.get('[data-testid="course-rating"]').should('have.value', '68.5');
    cy.get('[data-testid="slope-rating"]').should('have.value', '121');

    cy.get('[data-testid="gross-score"]').type('82');
    cy.get('[data-testid="post-score-button"]').click();

    cy.contains('Score posted!');
    cy.contains('82').should('be.visible');  // Score appears in history
  });
});
```

### 7.6 Member E2E — Post Score & Tournament

File: `tests/cypress/e2e/member/post-score.cy.ts`

```typescript
describe('Member — Post Score', () => {
  before(() => {
    cy.loginAsMember();
    cy.visit('/member/scores/post');
  });

  it('completes full post score flow', () => {
    // Step 1 — Course & Date
    cy.get('[data-testid="date-played"]').type('2026-05-30');
    cy.get('[data-testid="score-type-AWAY"]').click();
    cy.get('[data-testid="holes-18"]').click();
    cy.get('[data-testid="next-step"]').click();

    // Step 2 — Score Entry
    cy.get('[data-testid="gross-score"]').type('88');
    cy.get('[data-testid="next-step"]').click();

    // Step 3 — Review & Submit
    cy.contains('88');  // Score visible in summary
    cy.get('[data-testid="post-score-button"]').click();

    cy.contains('Score posted!');
    cy.url().should('include', '/member/scores/history');
  });
});
```

File: `tests/cypress/e2e/member/tournament-registration.cy.ts`

```typescript
describe('Member — Tournament Registration', () => {
  before(() => {
    cy.loginAsMember();
    cy.visit('/member/tournaments');
  });

  it('shows Spring Classic with Register Now button', () => {
    cy.contains('Spring Classic').should('exist');
    cy.contains('Register Now').should('exist');
  });

  it('completes registration flow', () => {
    cy.contains('Register Now').first().click();
    cy.url().should('include', '/register');

    cy.get('[data-testid="preferred-tee"]').select('White');
    cy.get('[data-testid="agree-terms"]').check();
    cy.get('[data-testid="register-button"]').click();

    cy.contains('Registration submitted!');
  });
});
```

### 7.7 Running Cypress

```bash
# Interactive mode
cd tests/cypress && npx cypress open

# Headless (CI)
npx cypress run --browser chrome

# Run specific spec
npx cypress run --spec "e2e/admin/post-score.cy.ts"
```

---

## 8. k6 — Performance Testing (Bonus)

### 8.1 Install

```bash
brew install k6
# or: https://k6.io/docs/getting-started/installation/
```

### 8.2 Roster Load Test

File: `tests/k6/roster-load.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const rosterDuration = new Trend('roster_duration');
const errorRate = new Rate('error_rate');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 10 },    // Stay at 10
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    roster_duration: ['p(95)<500'],    // 95% of responses < 500ms
    error_rate: ['rate<0.01'],         // Error rate < 1%
  },
};

const TOKEN = __ENV.ADMIN_TOKEN;
const CLUB_ID = __ENV.CLUB_ID;
const API_URL = __ENV.API_URL || 'http://localhost:4000/graphql';

export default function () {
  const payload = JSON.stringify({
    query: `{ golfers(filter: { clubId: "${CLUB_ID}", pageSize: 25 }) { nodes { id firstName lastName currentHandicapIndex } pageInfo { totalCount } } }`,
  });

  const res = http.post(API_URL, payload, {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
  });

  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'no errors in response': (r) => !JSON.parse(r.body).errors,
  });

  rosterDuration.add(res.timings.duration);
  errorRate.add(!ok);

  sleep(1);
}
```

### 8.3 Post Score Load Test

File: `tests/k6/post-score-load.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,          // 5 virtual users
  duration: '30s', // Run for 30 seconds
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // Post score < 1 second at p95
  },
};

const TOKEN = __ENV.ADMIN_TOKEN;
const CLUB_ID = __ENV.CLUB_ID;
const GOLFER_ID = __ENV.GOLFER_ID;

export default function () {
  const mutation = `
    mutation {
      postScore(input: {
        clubId: "${CLUB_ID}", golferId: "${GOLFER_ID}",
        datePlayed: "${new Date().toISOString()}",
        scoreType: AWAY, holes: 18, entryMode: TOTAL_SCORE,
        courseName: "Test Course", teeName: "Blue",
        grossScore: 85, courseRating: 68.5, slopeRating: 121, par: 72
      }) { id differential }
    }
  `;

  const res = http.post(
    __ENV.API_URL || 'http://localhost:4000/graphql',
    JSON.stringify({ query: mutation }),
    { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` } }
  );

  check(res, {
    'score posted successfully': (r) => !JSON.parse(r.body).errors,
    'response time < 1s': (r) => r.timings.duration < 1000,
  });

  sleep(2);
}
```

### 8.4 Running k6

```bash
# Set variables and run
ADMIN_TOKEN="<jwt>" CLUB_ID="<id>" GOLFER_ID="<id>" k6 run tests/k6/roster-load.js

# Generate HTML report
k6 run --out json=results.json tests/k6/roster-load.js
k6 report results.json
```

---

## 9. GitHub Portfolio Structure

```
sgs-golf-club/
├── README.md                  ← Project overview + tech stack + screenshots
├── docs/
│   └── dev-spec/              ← All 12 spec files (what you're reading)
│
├── tests/
│   ├── README.md              ← Testing strategy overview + how to run
│   │
│   ├── karate/
│   │   ├── README.md          ← "Why Karate for GraphQL" + setup guide
│   │   └── src/test/...       ← Feature files
│   │
│   ├── cypress/
│   │   ├── README.md          ← E2E coverage map + screenshots
│   │   └── e2e/...            ← Spec files
│   │
│   └── k6/
│       ├── README.md          ← Load test results + p95 metrics
│       └── *.js               ← Load test scripts
│
├── .github/
│   └── workflows/
│       └── test.yml           ← CI pipeline (run on PR)
│
├── backend/
│   └── tests/
│       ├── unit/              ← Handicap engine, service unit tests
│       └── integration/       ← Resolver + DB integration tests
│
└── frontend/
    └── tests/
        ├── components/        ← RTL component tests
        └── hooks/             ← Hook unit tests
```

### Portfolio README sections to include:

1. **Project Overview** — What the app does
2. **Tech Stack** — Table with all choices and rationale
3. **Testing Strategy** — Test pyramid diagram + tool rationale
4. **How to Run** — One-command docker setup
5. **API Documentation** — Link to GraphQL schema / playground
6. **Screenshots** — Roster, Post Score, Dashboard

---

## 10. CI Pipeline Placeholder

File: `.github/workflows/test.yml`

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  backend-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd backend && npm ci && npm test

  schema-validate:
    runs-on: ubuntu-latest
    needs: backend-unit
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g @apollo/rover
      - run: cd backend && npm run dev &
      - run: sleep 5 && npm run schema:validate

  karate-api:
    runs-on: ubuntu-latest
    needs: backend-unit
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: '17' }
      - run: |
          docker-compose -f docker-compose.dev.yml up -d
          sleep 10 && cd backend && npm run seed
      - run: cd tests/karate && mvn test
      - uses: actions/upload-artifact@v4
        with:
          name: karate-reports
          path: tests/karate/target/karate-reports/

  cypress-e2e:
    runs-on: ubuntu-latest
    needs: karate-api
    steps:
      - uses: actions/checkout@v4
      - uses: cypress-io/github-action@v6
        with:
          working-directory: tests/cypress
          start: docker-compose -f docker-compose.dev.yml up
          wait-on: 'http://localhost:3000'
```

---

## 11. Acceptance Criteria

- [ ] `npm test` in backend runs all unit tests (60+ tests)
- [ ] Handicap engine unit tests: all 8 WHS test scenarios pass
- [ ] `mvn test` in `tests/karate` runs all feature files and generates HTML report
- [ ] Karate: auth feature — all 4 scenarios pass
- [ ] Karate: golfer feature — roster, add, duplicate, forbidden scenarios pass
- [ ] Karate: score feature — post score, invalid slope, member forbidden scenarios pass
- [ ] Karate: tournament feature — register, duplicate, no-terms scenarios pass
- [ ] `npx cypress run` completes all 8 admin + member E2E workflows
- [ ] Cypress: login redirect to correct portal based on role
- [ ] Cypress: post score form auto-fills tee data
- [ ] k6 roster test: p95 response time < 500ms at 10 concurrent users
- [ ] k6 post score test: p95 response time < 1000ms at 5 concurrent users
- [ ] CI pipeline triggers on every PR and runs unit + Karate tests
- [ ] GitHub README includes project overview, stack table, test pyramid, and run instructions

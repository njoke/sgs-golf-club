# 06 — GHIN / WHS Handicap Engine
**Domain:** Handicap  
**Version:** 1.0  
**Compliance:** USGA World Handicap System (WHS)  
**Location:** `backend/src/handicap/`

---

## Table of Contents
1. [Module Overview](#1-module-overview)
2. [Core Functions — Differential Calculation](#2-core-functions--differential-calculation)
3. [Core Functions — Handicap Index Calculation](#3-core-functions--handicap-index-calculation)
4. [Soft and Hard Cap Logic](#4-soft-and-hard-cap-logic)
5. [Exceptional Scoring Reduction (ESR)](#5-exceptional-scoring-reduction-esr)
6. [9-Hole Pairing Logic](#6-9-hole-pairing-logic)
7. [Handicap Service — Orchestrator](#7-handicap-service--orchestrator)
8. [Net Double Bogey Adjustment](#8-net-double-bogey-adjustment)
9. [Course Handicap Calculation](#9-course-handicap-calculation)
10. [Testing Scenarios](#10-testing-scenarios)
11. [Verification Commands](#11-verification-commands)
12. [Acceptance Criteria](#12-acceptance-criteria)

---

## 1. Module Overview

The handicap engine is a **standalone module** inside the backend:

```
backend/src/handicap/
├── engine.ts            # Main orchestrator — called by score.service.ts
├── differential.ts      # Score differential formula
├── indexCalculator.ts   # HI table + average + truncation
├── caps.ts              # Soft cap + hard cap
├── esr.ts               # Exceptional Scoring Reduction
└── nineHole.ts          # 9-hole pairing
```

> **Critical Rule:** Follow WHS formulas exactly. Do not round the average step — truncate only (floor to 1 decimal place).

> **Disclaimer to include in UI/API responses:**
> "This application calculates handicap-related values for club management purposes. Official GHIN synchronization and USGA-certified handicap issuance require a certified integration, which is outside the scope of this MVP."

---

## 2. Core Functions — Differential Calculation

File: `src/handicap/differential.ts`

### 2.1 18-Hole Score Differential

```typescript
/**
 * WHS Formula:
 * Differential = (Adjusted Gross Score - Course Rating) × (113 / Slope Rating)
 * Truncated (not rounded) to 1 decimal place.
 */
export function calculate18HoleDifferential(
  adjustedGrossScore: number,
  courseRating: number,
  slopeRating: number
): number {
  const raw = (adjustedGrossScore - courseRating) * (113.0 / slopeRating);
  return truncateToOneDecimal(raw);
}

// Example:
// adjustedGrossScore = 85, courseRating = 71.5, slopeRating = 128
// diff = (85 - 71.5) × (113 / 128) = 13.5 × 0.8828125 = 11.918...
// truncated → 11.9
```

### 2.2 9-Hole Score Differential

```typescript
/**
 * WHS Formula for 9-hole:
 * Differential = ((Adjusted Gross Score - 9-Hole Course Rating) × (113 / Slope Rating)) / 2
 * Standard rounding to 1 decimal (not truncation).
 */
export function calculate9HoleDifferential(
  adjustedGrossScore: number,
  nineHoleCourseRating: number,
  slopeRating: number
): number {
  const raw = ((adjustedGrossScore - nineHoleCourseRating) * (113.0 / slopeRating)) / 2.0;
  return roundToOneDecimal(raw);  // Standard round for 9-hole intermediates
}
```

### 2.3 Helper Functions

```typescript
// Truncate (floor) to 1 decimal — used for HI calculation, NOT rounding
export function truncateToOneDecimal(value: number): number {
  return Math.floor(value * 10) / 10;
}

// Standard round to 1 decimal — used for intermediate 9-hole calculations
export function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
```

---

## 3. Core Functions — Handicap Index Calculation

File: `src/handicap/indexCalculator.ts`

### 3.1 Differential Count to K Value Table

```typescript
/**
 * WHS Table: number of differentials used based on rounds posted
 */
export function getKValue(n: number): number | null {
  if (n < 3)  return null;  // Not enough rounds — no HI
  if (n <= 5)  return 1;
  if (n === 6) return 2;
  if (n <= 8)  return 2;
  if (n <= 11) return 3;
  if (n <= 14) return 4;
  if (n <= 16) return 5;
  if (n <= 18) return 6;
  if (n === 19) return 7;
  return 8;  // n >= 20
}
```

### 3.2 Calculate Handicap Index from Differentials

```typescript
/**
 * Steps:
 * 1. Sort differentials ascending (lowest first)
 * 2. Take the k lowest
 * 3. Average them
 * 4. Truncate to 1 decimal (DO NOT ROUND)
 * 5. Apply caps
 *
 * Max HI = 54.0 (both men and women, WHS unified)
 */
export function calculateHandicapIndex(differentials: number[]): number | null {
  const n = differentials.length;
  const k = getKValue(n);
  if (k === null) return null;  // Fewer than 3 rounds — no HI issued

  const sorted = [...differentials].sort((a, b) => a - b);
  const lowestK = sorted.slice(0, k);
  const sum = lowestK.reduce((acc, d) => acc + d, 0);
  const average = sum / k;

  const hi = truncateToOneDecimal(average);
  return Math.min(hi, 54.0);  // Cap at WHS maximum
}
```

---

## 4. Soft and Hard Cap Logic

File: `src/handicap/caps.ts`

```typescript
/**
 * Caps are applied per WHS revision:
 *
 * Soft Cap Threshold = lowestIndexLast365 + 3.0
 * Hard Cap Threshold = lowestIndexLast365 + 5.0
 *
 * If newIndex <= softCap → return newIndex (no adjustment)
 * If softCap < newIndex < hardCap → excess above softCap cut by 50%
 * If newIndex >= hardCap → cap at hardCap
 */
export function applyCaps(
  newIndex: number,
  lowestIndexLast365: number | null
): number {
  if (lowestIndexLast365 === null) return newIndex;  // No prior history — no cap

  const softCap = lowestIndexLast365 + 3.0;
  const hardCap = lowestIndexLast365 + 5.0;

  if (newIndex <= softCap) return newIndex;

  if (newIndex < hardCap) {
    const excess = newIndex - softCap;
    return truncateToOneDecimal(softCap + excess / 2.0);
  }

  return hardCap;  // Hard cap ceiling
}

/**
 * Example — lowestIndexLast365 = 5.0, newIndex = 9.0:
 * softCap = 8.0, hardCap = 10.0
 * excess = 9.0 - 8.0 = 1.0
 * result = 8.0 + 0.5 = 8.5
 *
 * Example — lowestIndexLast365 = 5.0, newIndex = 11.0:
 * hardCap = 10.0 → result = 10.0
 */

/**
 * Track lowest HI in last 365 days.
 * Called every time HI is recalculated.
 */
export function getLowestIndexLast365(
  currentHI: number,
  storedLowest: number | null,
  lowestDate: Date | null
): number {
  const now = new Date();
  const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));

  // If stored lowest is older than 365 days, reset to current
  if (!storedLowest || !lowestDate || lowestDate < oneYearAgo) {
    return currentHI;
  }

  return Math.min(currentHI, storedLowest);
}
```

---

## 5. Exceptional Scoring Reduction (ESR)

File: `src/handicap/esr.ts`

```typescript
/**
 * ESR triggers when a golfer posts 2+ scores in 365 days
 * that are 7.0 or more below their current HI.
 *
 * When triggered:
 *   reduction = (avgExceptional - currentHI) × 0.5
 *   Max reduction: -2.0 (female), -1.0 (male) — both negative values
 *   newHI = currentHI + reduction (which is negative)
 */
export function applyESR(
  currentHI: number,
  allDifferentials: Array<{ differential: number; datePlayed: Date }>,
  gender: 'M' | 'F'
): number {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // Only look at differentials from the last 365 days
  const recentDiffs = allDifferentials.filter(d => d.datePlayed >= oneYearAgo);

  // Exceptional = 7.0 or more below current HI
  const exceptional = recentDiffs.filter(d => d.differential <= currentHI - 7.0);

  if (exceptional.length < 2) return currentHI;  // ESR does not apply

  // Use the two most recent exceptional rounds
  const lastTwo = exceptional
    .sort((a, b) => b.datePlayed.getTime() - a.datePlayed.getTime())
    .slice(0, 2);

  const avgExceptional = (lastTwo[0].differential + lastTwo[1].differential) / 2.0;
  const reduction = (avgExceptional - currentHI) * 0.5;  // This is negative

  const maxReduction = gender === 'F' ? -2.0 : -1.0;
  const finalReduction = Math.max(reduction, maxReduction);  // reduction is negative; max = less negative

  const newHI = truncateToOneDecimal(Math.max(0.0, currentHI + finalReduction));
  return newHI;
}

/**
 * Example:
 * currentHI = 20.0, gender = M
 * exceptional diffs = [12.0, 13.0] (both <= 20.0 - 7.0 = 13.0)
 * avgExceptional = 12.5
 * reduction = (12.5 - 20.0) × 0.5 = -3.75
 * maxReduction (male) = -1.0
 * finalReduction = max(-3.75, -1.0) = -1.0
 * newHI = 20.0 + (-1.0) = 19.0
 */
```

---

## 6. 9-Hole Pairing Logic

File: `src/handicap/nineHole.ts`

```typescript
/**
 * 9-hole pairing rules (WHS):
 * - A 9-hole score is stored with isNineHole = true
 * - When 2+ unpaired 9-hole scores exist, pair oldest + newest
 * - Combined differential = diff1 + diff2 (each calculated as 9-hole formula)
 * - Once paired, both scores flagged pairedWithScoreId
 * - Unpaired 9-hole scores older than 365 days are archived (not used for HI)
 *
 * Pairing does NOT create a new Score document.
 * The combined differential is stored on the older score record.
 */

export async function tryPairNineHoleScores(golferId: string): Promise<void> {
  // Find all unpaired 9-hole scores for this golfer, sorted oldest first
  const unpaired = await Score.find({
    golferId,
    isNineHole: true,
    pairedWithScoreId: null,
    status: { $in: ['POSTED', 'MODIFIED'] },
  }).sort({ datePlayed: 1 });

  if (unpaired.length < 2) return;  // Nothing to pair

  const first = unpaired[0];
  const second = unpaired[1];

  // Combine the two 9-hole differentials
  const combinedDifferential = roundToOneDecimal(
    (first.differential ?? 0) + (second.differential ?? 0)
  );

  // Mark first score with combined differential, mark both as paired
  await Score.findByIdAndUpdate(first._id, {
    differential: combinedDifferential,
    pairedWithScoreId: second._id,
    isNineHole: false,  // Now acts as an 18-hole differential for HI calc
  });
  await Score.findByIdAndUpdate(second._id, {
    pairedWithScoreId: first._id,
  });
}
```

---

## 7. Handicap Service — Orchestrator

File: `src/services/handicap.service.ts`

This is the single public interface called by `score.service.ts` after every score post.

```typescript
export class HandicapService {

  /**
   * Full recalculation flow:
   * 1. Fetch last 20 differentials (18-hole equivalents only)
   * 2. Calculate raw HI from lowest K differentials
   * 3. Apply ESR
   * 4. Apply soft/hard cap
   * 5. Update golfer.currentHandicapIndex
   * 6. Update golfer.lowHandicapIndex if new HI is a career low
   */
  async recalculateHandicapIndex(golferId: string): Promise<void> {
    const golfer = await GolferRepository.findById(golferId);
    if (!golfer) return;

    // Fetch last 20 paired/18-hole differentials
    const differentials = await ScoreRepository.getLastNDifferentials(golferId, 20);
    if (differentials.length < 3) {
      // Not enough rounds to issue HI
      await GolferRepository.update(golferId, { currentHandicapIndex: null });
      return;
    }

    // Step 1: Calculate raw HI
    let newHI = calculateHandicapIndex(differentials);
    if (newHI === null) return;

    // Step 2: Apply ESR
    const allRecentScores = await ScoreRepository.getRecentScoresWithDifferentials(golferId);
    newHI = applyESR(newHI, allRecentScores, golfer.gender as 'M' | 'F');

    // Step 3: Apply caps
    newHI = applyCaps(newHI, golfer.lowHandicapIndex ?? null);

    // Step 4: Update golfer record
    const lowestHI = getLowestIndexLast365(newHI, golfer.lowHandicapIndex, golfer.lowHandicapDate);
    await GolferRepository.update(golferId, {
      currentHandicapIndex: newHI,
      lowHandicapIndex: lowestHI,
      lowHandicapDate: lowestHI < (golfer.lowHandicapIndex ?? Infinity) ? new Date() : golfer.lowHandicapDate,
    });
  }

  /**
   * Course Handicap for playing:
   * Course Handicap = HI × (Slope / 113) + (Course Rating - Par)
   * Rounded to nearest whole number.
   */
  calculateCourseHandicap(
    handicapIndex: number,
    slopeRating: number,
    courseRating: number,
    par: number
  ): number {
    const raw = handicapIndex * (slopeRating / 113.0) + (courseRating - par);
    return Math.round(raw);
  }

  /**
   * Net Double Bogey Adjustment (simplified — for total score mode):
   * When hole-by-hole data is not available, use adjustedGrossScore as-is.
   * When hole-by-hole data IS available, cap each hole at par + 2 + strokes received.
   */
  computeAdjustedGrossFromHoles(
    holeScores: number[],
    golfer: IGolfer,
    courseId: string | undefined,
    teeId: string | undefined
  ): number {
    // Without hole handicap data, use gross total (simplified MVP approach)
    // Full implementation requires holeHandicaps array from tee data
    return holeScores.reduce((sum, s) => sum + s, 0);
    // TODO: Load hole handicap data + apply net double bogey per hole
  }
}
```

---

## 8. Net Double Bogey Adjustment

Full implementation of hole-by-hole adjustment when `entryMode = HOLE_BY_HOLE`:

```typescript
/**
 * For each hole:
 * 1. Determine how many strokes the golfer receives on that hole
 *    (based on hole's handicap stroke index vs golfer's course handicap)
 * 2. Max score per hole = par + 2 + strokesReceived (Net Double Bogey)
 * 3. Cap each hole score to this max
 * 4. Sum all capped scores = Adjusted Gross Score
 *
 * strokesReceived = 1 if holeHandicapIndex <= courseHandicap, else 0
 * For course handicap > 18: some holes get 2 strokes
 */
export function computeNetDoubleBogeyAdjustment(
  holeScores: number[],
  holePars: number[],
  holeHandicaps: number[],      // Stroke index 1-18 for each hole
  courseHandicap: number
): number {
  let adjustedTotal = 0;

  for (let i = 0; i < holeScores.length; i++) {
    const holePar = holePars[i];
    const strokeIndex = holeHandicaps[i];

    // Calculate strokes received on this hole
    let strokesReceived = 0;
    if (courseHandicap >= strokeIndex) strokesReceived = 1;
    if (courseHandicap >= 18 + strokeIndex) strokesReceived = 2;  // Very high HI

    const maxScore = holePar + 2 + strokesReceived;  // Net Double Bogey
    adjustedTotal += Math.min(holeScores[i], maxScore);
  }

  return adjustedTotal;
}
```

---

## 9. Course Handicap Calculation

Available as a GraphQL query for use in the member portal and tournament registration:

```graphql
type Query {
  courseHandicap(golferId: ID!, courseId: ID!, teeId: ID!): Int
}
```

```typescript
// resolver
courseHandicap: async (_, { golferId, courseId, teeId }, ctx) => {
  requireAuth(ctx);
  const golfer = await GolferRepository.findById(golferId);
  if (!golfer || !golfer.currentHandicapIndex) return null;

  const course = await CourseRepository.findById(courseId);
  if (!course) return null;

  const tee = course.tees.find(t => t.teeId === teeId);
  if (!tee) return null;

  return handicapService.calculateCourseHandicap(
    golfer.currentHandicapIndex,
    tee.slopeRating,
    tee.courseRating,
    tee.par
  );
},
```

---

## 10. Testing Scenarios

These are the exact test cases from the WHS spec. All must pass in unit tests.

| Test Scenario | Differentials Input | Expected HI |
|---|---|---|
| 3 rounds | [12.5, 14.0, 18.2] | 12.5 |
| 5 rounds | [10.0, 11.0, 12.0, 15.0, 20.0] | 10.0 |
| 20 rounds, lowest 8 avg = 10.23 | varies | 10.2 (truncated) |
| Soft cap: lowest365=5.0, newAvg=9.0 | — | 8.5 |
| Hard cap: lowest365=5.0, newAvg=11.0 | — | 10.0 |
| ESR: 2 exceptional rounds | diffs ≤ currentHI − 7 | reduced by max -1.0 (M) |
| 9-hole pairing: diff1=6.2, diff2=7.4 | combined | 13.6 |
| Fewer than 3 rounds | [14.0, 16.0] | null (no HI) |

---

## 11. Verification Commands

```bash
# Unit test file: backend/tests/unit/handicap.engine.test.ts

# Run all handicap unit tests
cd backend && npm test -- --testPathPattern=handicap

# Expected test suite:
# ✓ calculate18HoleDifferential — correct formula
# ✓ calculate18HoleDifferential — truncates not rounds
# ✓ getKValue — correct k for all n values (3–20)
# ✓ calculateHandicapIndex — 3 rounds → lowest 1
# ✓ calculateHandicapIndex — 20 rounds → lowest 8, truncated
# ✓ applyCaps — no cap when below soft cap
# ✓ applyCaps — soft cap halves excess
# ✓ applyCaps — hard cap ceiling enforced
# ✓ applyESR — no trigger with < 2 exceptional rounds
# ✓ applyESR — trigger reduces HI by max -1.0 for male
# ✓ tryPairNineHoleScores — combines two 9-hole diffs correctly
```

---

## 12. Acceptance Criteria

- [ ] `calculate18HoleDifferential(85, 71.5, 128)` returns `11.9` (truncated, not 12.0)
- [ ] `calculateHandicapIndex([12.5, 14.0, 18.2])` returns `12.5` (3 rounds, k=1)
- [ ] `calculateHandicapIndex` returns `null` for fewer than 3 differentials
- [ ] HI is capped at `54.0` regardless of input
- [ ] `applyCaps(9.0, 5.0)` returns `8.5` (soft cap: 5+3=8, excess=1.0, halved=0.5)
- [ ] `applyCaps(11.0, 5.0)` returns `10.0` (hard cap: 5+5=10)
- [ ] ESR reduces HI by no more than -1.0 for male golfers
- [ ] ESR reduces HI by no more than -2.0 for female golfers
- [ ] 9-hole pair: diff1=6.2 + diff2=7.4 → combined=13.6
- [ ] `recalculateHandicapIndex` is called automatically after every `postScore`
- [ ] `golfer.currentHandicapIndex` is updated in MongoDB after recalculation
- [ ] `golfer.lowHandicapIndex` updates when new HI is a career low
- [ ] All 8 test scenarios from Section 10 pass in unit tests

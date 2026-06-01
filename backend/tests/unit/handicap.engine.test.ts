import { applyCaps, getLowestIndexLast365 } from "../../src/handicap/caps";
import {
  calculate18HoleDifferential,
  calculate9HoleDifferential,
  roundToOneDecimal,
} from "../../src/handicap/differential";
import {
  computeNetDoubleBogeyAdjustment,
  HandicapEngine,
} from "../../src/handicap/engine";
import { applyESR } from "../../src/handicap/esr";
import {
  calculateHandicapIndex,
  getKValue,
} from "../../src/handicap/indexCalculator";
import { pairNineHoleScores } from "../../src/handicap/nineHole";
import { HandicapService } from "../../src/services/handicap.service";

describe("handicap differential helpers", () => {
  it("calculate18HoleDifferential uses WHS formula", () => {
    expect(calculate18HoleDifferential(85, 71.5, 128)).toBe(11.9);
  });

  it("calculate18HoleDifferential truncates instead of rounding", () => {
    expect(calculate18HoleDifferential(83.49, 71.5, 113)).toBe(11.9);
  });

  it("calculate9HoleDifferential rounds to one decimal", () => {
    expect(calculate9HoleDifferential(42, 35.8, 120)).toBe(
      roundToOneDecimal(((42 - 35.8) * (113 / 120)) / 2)
    );
  });
});

describe("handicap index calculator", () => {
  it("getKValue returns correct counts across published thresholds", () => {
    expect(getKValue(2)).toBeNull();
    expect(getKValue(3)).toBe(1);
    expect(getKValue(5)).toBe(1);
    expect(getKValue(6)).toBe(2);
    expect(getKValue(8)).toBe(2);
    expect(getKValue(11)).toBe(3);
    expect(getKValue(14)).toBe(4);
    expect(getKValue(16)).toBe(5);
    expect(getKValue(18)).toBe(6);
    expect(getKValue(19)).toBe(7);
    expect(getKValue(20)).toBe(8);
  });

  it("uses lowest single differential for 3 rounds", () => {
    expect(calculateHandicapIndex([12.5, 14, 18.2])).toBe(12.5);
  });

  it("uses lowest single differential for 5 rounds", () => {
    expect(calculateHandicapIndex([10, 11, 12, 15, 20])).toBe(10);
  });

  it("uses lowest 8 and truncates average for 20 rounds", () => {
    const differentials = [
      9.5, 9.8, 10.0, 10.1, 10.4, 10.5, 10.7, 10.8, 11.2, 11.4,
      11.9, 12.2, 12.6, 12.8, 13.1, 13.4, 13.8, 14.0, 14.3, 14.7,
    ];

    expect(calculateHandicapIndex(differentials)).toBe(10.2);
  });

  it("returns null when fewer than 3 rounds exist", () => {
    expect(calculateHandicapIndex([14, 16])).toBeNull();
  });

  it("caps handicap index at 54.0", () => {
    expect(
      calculateHandicapIndex([60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79])
    ).toBe(54);
  });
});

describe("caps and ESR", () => {
  it("returns index unchanged below soft cap", () => {
    expect(applyCaps(7.9, 5)).toBe(7.9);
  });

  it("applies soft cap by halving excess above threshold", () => {
    expect(applyCaps(9, 5)).toBe(8.5);
  });

  it("enforces hard cap ceiling", () => {
    expect(applyCaps(11, 5)).toBe(10);
  });

  it("resets lowest index window after 365 days", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    const expiredLowDate = new Date("2025-05-01T00:00:00.000Z");

    expect(getLowestIndexLast365(12.4, 8.2, expiredLowDate, now)).toBe(12.4);
  });

  it("does not trigger ESR with fewer than 2 exceptional rounds", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    expect(
      applyESR(
        20,
        [{ differential: 12.5, datePlayed: new Date("2026-05-15T00:00:00.000Z") }],
        "M",
        now
      )
    ).toBe(20);
  });

  it("limits male ESR reduction to -1.0", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");

    expect(
      applyESR(
        20,
        [
          { differential: 12, datePlayed: new Date("2026-05-20T00:00:00.000Z") },
          { differential: 13, datePlayed: new Date("2026-05-10T00:00:00.000Z") },
        ],
        "M",
        now
      )
    ).toBe(19);
  });

  it("limits female ESR reduction to -2.0", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");

    expect(
      applyESR(
        20,
        [
          { differential: 11, datePlayed: new Date("2026-05-20T00:00:00.000Z") },
          { differential: 12, datePlayed: new Date("2026-05-10T00:00:00.000Z") },
        ],
        "F",
        now
      )
    ).toBe(18);
  });
});

describe("nine-hole pairing", () => {
  it("combines 2 eligible 9-hole differentials into 18-hole equivalent", () => {
    const result = pairNineHoleScores([
      {
        id: "score-1",
        golferId: "golfer-1",
        datePlayed: new Date("2026-05-01T00:00:00.000Z"),
        differential: 6.2,
        isNineHole: true,
        pairedWithScoreId: null,
        status: "POSTED",
      },
      {
        id: "score-2",
        golferId: "golfer-1",
        datePlayed: new Date("2026-05-08T00:00:00.000Z"),
        differential: 7.4,
        isNineHole: true,
        pairedWithScoreId: null,
        status: "POSTED",
      },
    ]);

    expect(result).not.toBeNull();
    expect(result?.combinedDifferential).toBe(13.6);
    expect(result?.updatedOlderScore.isNineHole).toBe(false);
    expect(result?.updatedOlderScore.pairedWithScoreId).toBe("score-2");
    expect(result?.updatedNewerScore.pairedWithScoreId).toBe("score-1");
  });
});

describe("engine and service orchestration", () => {
  it("calculates course handicap and net double bogey adjustment", () => {
    const engine = new HandicapEngine();

    expect(engine.calculateCourseHandicap(10, 128, 71.5, 72)).toBe(11);
    expect(computeNetDoubleBogeyAdjustment([7, 6, 5], [4, 4, 3], [1, 10, 18], 10)).toBe(18);
  });

  it("clears current handicap when fewer than 3 scores exist", async () => {
    const golferRepository = {
      findById: jest.fn().mockResolvedValue({
        id: "golfer-1",
        gender: "M",
        currentHandicapIndex: 12.5,
        lowHandicapIndex: 10.2,
        lowHandicapDate: new Date("2026-01-01T00:00:00.000Z"),
      }),
      update: jest.fn().mockResolvedValue(null),
    };
    const scoreRepository = {
      getLastNDifferentials: jest.fn().mockResolvedValue([14, 16]),
      getRecentScoresWithDifferentials: jest.fn(),
    };
    const service = new HandicapService(golferRepository, scoreRepository);

    await service.recalculateHandicapIndex("golfer-1");

    expect(golferRepository.update).toHaveBeenCalledWith("golfer-1", {
      currentHandicapIndex: null,
    });
    expect(scoreRepository.getRecentScoresWithDifferentials).not.toHaveBeenCalled();
  });

  it("updates current and low handicap indexes when recalculation succeeds", async () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    const golferRepository = {
      findById: jest.fn().mockResolvedValue({
        id: "golfer-1",
        gender: "M",
        currentHandicapIndex: 14.2,
        lowHandicapIndex: 15,
        lowHandicapDate: new Date("2026-03-01T00:00:00.000Z"),
      }),
      update: jest.fn().mockResolvedValue(null),
    };
    const scoreRepository = {
      getLastNDifferentials: jest.fn().mockResolvedValue([12.5, 14, 18.2]),
      getRecentScoresWithDifferentials: jest.fn().mockResolvedValue([]),
    };
    const service = new HandicapService(golferRepository, scoreRepository);

    await service.recalculateHandicapIndex("golfer-1", now);

    expect(golferRepository.update).toHaveBeenCalledWith("golfer-1", {
      currentHandicapIndex: 12.5,
      lowHandicapIndex: 12.5,
      lowHandicapDate: now,
    });
  });
});

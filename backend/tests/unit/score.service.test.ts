import { Types } from "mongoose";
import { ErrorCodes } from "../../src/errors/errorCodes";
import type { GraphQLContext } from "../../src/graphql/context";
import { CourseRepository } from "../../src/repositories/course.repository";
import { GolferRepository } from "../../src/repositories/golfer.repository";
import { ScoreRepository } from "../../src/repositories/score.repository";
import { auditService } from "../../src/services/audit.service";
import { scoreService, type PostScoreInput } from "../../src/services/score.service";

const clubId = new Types.ObjectId().toString();
const golferId = new Types.ObjectId().toString();
const userId = new Types.ObjectId().toString();

function makeAdminContext(): GraphQLContext {
  return {
    user: {
      userId,
      email: "admin@sgs.golf",
      role: "CLUB_ADMIN",
      clubIds: [clubId],
    },
  };
}

function makeMemberContext(): GraphQLContext {
  return {
    user: {
      userId,
      email: "jared@sgs.golf",
      role: "MEMBER",
      clubIds: [clubId],
      golferId,
    },
  };
}

function makePostInput(overrides: Partial<PostScoreInput> = {}): PostScoreInput {
  return {
    clubId,
    golferId,
    datePlayed: new Date("2026-05-30T00:00:00.000Z"),
    scoreType: "HOME",
    holes: 18,
    entryMode: "TOTAL_SCORE",
    courseName: "Cedar Irons Golf Club",
    teeName: "White",
    grossScore: 82,
    courseRating: 68.5,
    slopeRating: 121,
    par: 72,
    ...overrides,
  };
}

function makeGolfer() {
  return {
    _id: new Types.ObjectId(golferId),
    clubId: new Types.ObjectId(clubId),
    ghinNumber: "10750356",
    firstName: "Jared",
    lastName: "Abwawo",
    gender: "M" as const,
    email: "jared@sgs.golf",
    membershipCode: "R",
    membershipStatus: "ACTIVE" as const,
    digitalProfileStatus: "NONE" as const,
    currentHandicapIndex: 13.1,
    lowHandicapIndex: 12,
    lowHandicapDate: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("scoreService", () => {
  beforeEach(() => {
    jest.spyOn(auditService, "log").mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("prevents members from posting scores for another golfer", async () => {
    await expect(
      scoreService.postScore(
        makePostInput({ golferId: new Types.ObjectId().toString() }),
        makeMemberContext()
      )
    ).rejects.toMatchObject({
      code: ErrorCodes.UNAUTHORIZED,
      message: "Members can only post scores for themselves.",
    });
  });

  it("validates exact hole score count in hole-by-hole mode", async () => {
    await expect(
      scoreService.postScore(
        makePostInput({
          holes: 9,
          entryMode: "HOLE_BY_HOLE",
          holeScores: [4, 5, 4],
          grossScore: 13,
        }),
        makeAdminContext()
      )
    ).rejects.toMatchObject({
      code: ErrorCodes.VALIDATION_ERROR,
      message: "Exactly 9 hole scores required.",
    });
  });

  it("creates score with calculated differential and triggers handicap recalculation", async () => {
    jest.spyOn(GolferRepository, "findById").mockResolvedValue(makeGolfer());
    jest.spyOn(ScoreRepository, "getLastNDifferentials").mockResolvedValue([12.5, 14, 18.2]);
    jest.spyOn(ScoreRepository, "getRecentScoresWithDifferentials").mockResolvedValue([]);
    jest.spyOn(ScoreRepository, "findUnpairedNineHoleScores").mockResolvedValue([]);
    const createSpy = jest.spyOn(ScoreRepository, "create").mockImplementation(async (data) => ({
      _id: new Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    }) as any);
    const golferUpdateSpy = jest.spyOn(GolferRepository, "update").mockResolvedValue(makeGolfer() as any);

    const score = await scoreService.postScore(makePostInput(), makeAdminContext());

    expect(score.differential).toBe(12.6);
    expect(createSpy).toHaveBeenCalled();
    expect(golferUpdateSpy).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "HANDICAP_INDEX_UPDATED" })
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "SCORE_POSTED" })
    );
  });

  it("uses course tee data to compute adjusted gross in hole-by-hole mode", async () => {
    jest.spyOn(GolferRepository, "findById").mockResolvedValue(makeGolfer());
    jest.spyOn(CourseRepository, "findById").mockResolvedValue({
      _id: new Types.ObjectId(),
      clubId: new Types.ObjectId(clubId),
      facilityName: "Cedar Irons Golf Club",
      courseName: "Cedar Irons Golf Club",
      city: "Tacoma",
      state: "WA",
      isPrimaryFacility: true,
      tees: [
        {
          teeId: "white-m",
          teeName: "White",
          gender: "M",
          par: 72,
          courseRating: 68.5,
          slopeRating: 121,
          holePars: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
          holeHandicaps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    jest.spyOn(ScoreRepository, "getLastNDifferentials").mockResolvedValue([12.5, 14, 18.2]);
    jest.spyOn(ScoreRepository, "getRecentScoresWithDifferentials").mockResolvedValue([]);
    jest.spyOn(ScoreRepository, "findUnpairedNineHoleScores").mockResolvedValue([]);
    jest.spyOn(ScoreRepository, "create").mockImplementation(async (data) => ({
      _id: new Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    }) as any);
    jest.spyOn(GolferRepository, "update").mockResolvedValue(makeGolfer() as any);

    const score = await scoreService.postScore(
      makePostInput({
        entryMode: "HOLE_BY_HOLE",
        courseId: new Types.ObjectId().toString(),
        teeId: "white-m",
        holeScores: [8, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        grossScore: 76,
      }),
      makeAdminContext()
    );

    expect(score.adjustedGrossScore).toBe(74);
  });

  it("withdraws score and recalculates handicap", async () => {
    const scoreId = new Types.ObjectId().toString();
    jest.spyOn(ScoreRepository, "findById").mockResolvedValue({
      _id: new Types.ObjectId(scoreId),
      clubId: new Types.ObjectId(clubId),
      golferId: new Types.ObjectId(golferId),
      datePlayed: new Date("2026-05-30T00:00:00.000Z"),
      scoreType: "HOME",
      holes: 18,
      entryMode: "TOTAL_SCORE",
      grossScore: 82,
      adjustedGrossScore: 82,
      courseRating: 68.5,
      slopeRating: 121,
      par: 72,
      differential: 12.6,
      status: "POSTED",
      courseNameSnapshot: "Cedar Irons Golf Club",
      teeNameSnapshot: "White",
      postedByUserId: new Types.ObjectId(userId),
      postedByRole: "CLUB_ADMIN",
      isTournamentScore: false,
      isNineHole: false,
      pairedWithScoreId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    jest.spyOn(ScoreRepository, "update").mockResolvedValue({
      status: "WITHDRAWN",
    } as any);
    jest.spyOn(ScoreRepository, "getLastNDifferentials").mockResolvedValue([12.5, 14, 18.2]);
    jest.spyOn(ScoreRepository, "getRecentScoresWithDifferentials").mockResolvedValue([]);
    jest.spyOn(GolferRepository, "findById").mockResolvedValue(makeGolfer());
    jest.spyOn(GolferRepository, "update").mockResolvedValue(makeGolfer() as any);

    const updated = await scoreService.withdrawScore(scoreId, "Test", makeAdminContext());

    expect(updated.status).toBe("WITHDRAWN");
  });
});

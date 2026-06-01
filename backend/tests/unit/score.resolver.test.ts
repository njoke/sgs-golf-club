import { Types } from "mongoose";
import { scoreResolvers } from "../../src/graphql/resolvers/score.resolver";
import { scoreService } from "../../src/services/score.service";

describe("scoreResolvers", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("maps a freshly created mongoose score document into GraphQL fields", async () => {
    const scoreObject = {
      _id: new Types.ObjectId(),
      clubId: new Types.ObjectId(),
      golferId: new Types.ObjectId(),
      courseId: new Types.ObjectId(),
      teeId: "white-m",
      datePlayed: new Date("2026-06-01T12:00:00.000Z"),
      scoreType: "HOME" as const,
      holes: 18,
      entryMode: "TOTAL_SCORE" as const,
      grossScore: 88,
      adjustedGrossScore: 88,
      courseRating: 71.2,
      slopeRating: 126,
      par: 72,
      differential: 15,
      status: "POSTED" as const,
      courseNameSnapshot: "Cedar Irons Golf Club",
      teeNameSnapshot: "White",
      postedByUserId: new Types.ObjectId(),
      postedByRole: "MEMBER",
      isTournamentScore: false,
      isNineHole: false,
      pairedWithScoreId: null,
      createdAt: new Date("2026-06-01T12:05:00.000Z"),
      updatedAt: new Date("2026-06-01T12:05:00.000Z"),
    };

    jest.spyOn(scoreService, "postScore").mockResolvedValue({
      ...scoreObject,
      toObject: () => scoreObject,
    } as any);

    const result = await scoreResolvers.Mutation.postScore!(
      {},
      { input: {} as any },
      {} as any
    );

    expect(result).toMatchObject({
      id: scoreObject._id.toString(),
      clubId: scoreObject.clubId.toString(),
      golferId: scoreObject.golferId.toString(),
      courseId: scoreObject.courseId.toString(),
      teeId: "white-m",
      grossScore: 88,
      adjustedGrossScore: 88,
      status: "POSTED",
      courseNameSnapshot: "Cedar Irons Golf Club",
      teeNameSnapshot: "White",
    });
  });
});

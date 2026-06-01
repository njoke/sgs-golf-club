import { Types } from "mongoose";
import { HandicapEngine } from "../src/handicap/engine";
import { Score } from "../src/models/score.model";
import { User } from "../src/models/user.model";
import type { ICourse } from "../src/models/course.model";

const handicapEngine = new HandicapEngine();

const jaredScoresSeed = [
  {
    datePlayed: new Date("2026-05-17T00:00:00.000Z"),
    scoreType: "AWAY" as const,
    holes: 18,
    grossScore: 84,
    courseRating: 67.9,
    slopeRating: 122,
    par: 72,
    courseName: "The Classic Golf Club",
    teeName: "White",
  },
  {
    datePlayed: new Date("2026-05-09T00:00:00.000Z"),
    scoreType: "COMPETITION" as const,
    holes: 18,
    grossScore: 93,
    courseRating: 68.5,
    slopeRating: 121,
    par: 72,
    courseName: "Cedar Irons Golf Club",
    teeName: "White",
    teeId: "white-m",
  },
  {
    datePlayed: new Date("2026-05-06T00:00:00.000Z"),
    scoreType: "AWAY" as const,
    holes: 18,
    grossScore: 87,
    courseRating: 67.9,
    slopeRating: 122,
    par: 72,
    courseName: "The Classic Golf Club",
    teeName: "White",
  },
  {
    datePlayed: new Date("2026-04-19T00:00:00.000Z"),
    scoreType: "AWAY" as const,
    holes: 18,
    grossScore: 81,
    courseRating: 67.9,
    slopeRating: 122,
    par: 72,
    courseName: "The Classic Golf Club",
    teeName: "White",
  },
  {
    datePlayed: new Date("2026-04-11T00:00:00.000Z"),
    scoreType: "AWAY" as const,
    holes: 18,
    grossScore: 92,
    courseRating: 67.1,
    slopeRating: 112,
    par: 72,
    courseName: "Bellevue Golf Course",
    teeName: "Blue 2022",
  },
];

export async function seedScores(
  clubId: Types.ObjectId,
  golferId: Types.ObjectId,
  courses: ICourse[]
): Promise<void> {
  const adminUser = await User.findOne({ email: "admin@sgs.golf" }).lean();
  if (!adminUser) {
    throw new Error("Admin user missing; cannot seed scores.");
  }

  const cedarIrons = courses.find((course) => course.defaultMaleTeeId === "white-m");

  for (const entry of jaredScoresSeed) {
    const existing = await Score.findOne({
      golferId,
      datePlayed: entry.datePlayed,
      grossScore: entry.grossScore,
    });
    if (existing) {
      continue;
    }

    const adjustedGrossScore = entry.grossScore;
    const differential = handicapEngine.calculateDifferential({
      adjustedGrossScore,
      courseRating: entry.courseRating,
      slopeRating: entry.slopeRating,
      isNineHole: false,
    });

    await Score.create({
      clubId,
      golferId,
      courseId: entry.courseName === "Cedar Irons Golf Club" ? cedarIrons?._id : undefined,
      teeId: entry.teeId,
      datePlayed: entry.datePlayed,
      scoreType: entry.scoreType,
      holes: entry.holes,
      entryMode: "TOTAL_SCORE",
      grossScore: entry.grossScore,
      adjustedGrossScore,
      courseRating: entry.courseRating,
      slopeRating: entry.slopeRating,
      par: entry.par,
      differential,
      status: "POSTED",
      courseNameSnapshot: entry.courseName,
      teeNameSnapshot: entry.teeName,
      postedByUserId: adminUser._id,
      postedByRole: adminUser.role,
      isTournamentScore: entry.scoreType === "COMPETITION",
      isNineHole: false,
      pairedWithScoreId: null,
    });
  }

  console.log("✓ Jared score history seeded");
}

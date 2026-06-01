import { Types } from "mongoose";
import type { ICourse } from "../src/models/course.model";
import type { IGolfer } from "../src/models/golfer.model";
import { Tournament } from "../src/models/tournament.model";
import { TournamentRegistration } from "../src/models/tournamentRegistration.model";
import { User } from "../src/models/user.model";

export async function seedTournaments(
  clubId: Types.ObjectId,
  courses: ICourse[],
  golfers: IGolfer[]
): Promise<void> {
  const adminUser = await User.findOne({ email: "admin@sgs.golf" }).lean();
  if (!adminUser) {
    throw new Error("Admin user missing; cannot seed tournaments.");
  }

  const course = courses[0];
  const existing = await Tournament.findOne({ clubId, name: "Spring Classic" });
  const tournament =
    existing ??
    (await Tournament.create({
      clubId,
      name: "Spring Classic",
      description: "Club spring tournament — stroke play",
      startDate: new Date("2026-06-15T00:00:00.000Z"),
      courseId: course?._id,
      format: "STROKE_PLAY",
      registrationStatus: "OPEN",
      registrationOpenAt: new Date("2026-05-30T00:00:00.000Z"),
      registrationCloseAt: new Date("2026-06-10T23:59:59.000Z"),
      maxPlayers: 72,
      entryFee: 50,
      membersOnly: true,
      allowGuests: false,
      eligibility: {
        gender: "ALL",
        membershipCodes: ["R"],
      },
      status: "ACTIVE",
      createdByUserId: adminUser._id,
    }));

  const golfersToSeed = golfers.slice(0, 5);
  for (const golfer of golfersToSeed) {
    const existingRegistration = await TournamentRegistration.findOne({
      tournamentId: tournament._id,
      golferId: golfer._id,
    });
    if (existingRegistration) {
      continue;
    }

    await TournamentRegistration.create({
      tournamentId: tournament._id,
      clubId,
      golferId: golfer._id,
      playerNameSnapshot: `${golfer.firstName} ${golfer.lastName}`,
      ghinNumberSnapshot: golfer.ghinNumber,
      emailSnapshot: golfer.email,
      handicapIndexSnapshot: golfer.currentHandicapIndex,
      preferredTeeId: course?.defaultMaleTeeId ?? course?.defaultFemaleTeeId,
      status: "REGISTERED",
      paymentStatus: "UNPAID",
      registeredAt: new Date("2026-06-01T00:00:00.000Z"),
    });
  }

  console.log("✓ Spring Classic tournament seeded");
}

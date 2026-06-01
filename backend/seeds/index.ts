import mongoose from "mongoose";
import { env } from "../src/config/env";
import { seedClub } from "./clubs.seed";
import { seedCourses } from "./courses.seed";
import { seedUsers } from "./users.seed";
import { seedGolfers, findJaredGolfer } from "./golfers.seed";
import { seedScores } from "./scores.seed";
import { seedTournaments } from "./tournaments.seed";
import { User } from "../src/models/user.model";
import { HandicapService } from "../src/services/handicap.service";
import { GolferRepository } from "../src/repositories/golfer.repository";
import { ScoreRepository } from "../src/repositories/score.repository";

const RESET = process.argv.includes("--reset");

const handicapService = new HandicapService(
  {
    async findById(id) {
      const golfer = await GolferRepository.findById(id);
      if (!golfer) return null;
      return {
        id: golfer._id.toString(),
        gender: golfer.gender,
        currentHandicapIndex: golfer.currentHandicapIndex ?? null,
        lowHandicapIndex: golfer.lowHandicapIndex ?? null,
        lowHandicapDate: golfer.lowHandicapDate ?? null,
      };
    },
    async update(id, data) {
      return GolferRepository.update(id, data as any);
    },
  },
  {
    async getLastNDifferentials(golferId, limit) {
      return ScoreRepository.getLastNDifferentials(golferId, limit);
    },
    async getRecentScoresWithDifferentials(golferId) {
      return ScoreRepository.getRecentScoresWithDifferentials(golferId);
    },
  }
);

async function run() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected to MongoDB");

  if (RESET) {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) {
      await col.deleteMany({});
    }
    console.log("Database reset complete");
  }

  // Order: clubs → users → golfers → link member user → courses → scores
  const club = await seedClub();
  await seedUsers(club._id);
  const golfers = await seedGolfers(club._id);
  const courses = await seedCourses(club._id);
  await seedTournaments(club._id, courses, golfers);

  // Link jared@sgs.golf user to Jared Abwawo's golfer record
  const jaredGolfer = findJaredGolfer(golfers);
  if (jaredGolfer) {
    await User.updateOne(
      { email: "jared@sgs.golf" },
      { golferId: jaredGolfer._id }
    );
    console.log(`✓ Linked jared@sgs.golf → golfer ${jaredGolfer._id}`);

    await seedScores(club._id, jaredGolfer._id, courses);
    await handicapService.recalculateHandicapIndex(jaredGolfer._id.toString());
  }

  console.log("Seed complete");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

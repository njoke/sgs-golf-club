import mongoose from "mongoose";
import { env } from "../src/config/env";
import { seedClub } from "./clubs.seed";
import { seedUsers } from "./users.seed";
import { seedGolfers, findJaredGolfer } from "./golfers.seed";
import { User } from "../src/models/user.model";

const RESET = process.argv.includes("--reset");

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

  // Link jared@sgs.golf user to Jared Abwawo's golfer record
  const jaredGolfer = findJaredGolfer(golfers);
  if (jaredGolfer) {
    await User.updateOne(
      { email: "jared@sgs.golf" },
      { golferId: jaredGolfer._id }
    );
    console.log(`✓ Linked jared@sgs.golf → golfer ${jaredGolfer._id}`);
  }

  console.log("Seed complete");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

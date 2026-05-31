import mongoose from "mongoose";
import { env } from "../src/config/env";

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

  // Seed modules imported and run here as feature specs are implemented
  // e.g., await seedUsers();
  // e.g., await seedClubs();

  console.log("Seed complete");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

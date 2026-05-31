import { Types } from "mongoose";
import { User } from "../src/models/user.model";
import { hashPassword } from "../src/auth/password";

export async function seedUsers(clubId: Types.ObjectId): Promise<void> {
  // Admin user
  const adminEmail = "admin@sgs.golf";
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      email: adminEmail,
      passwordHash: await hashPassword("Admin123!"),
      firstName: "Ken",
      lastName: "Njonge",
      role: "CLUB_ADMIN",
      status: "ACTIVE",
      clubIds: [clubId],
    });
    console.log("✓ Admin user seeded: admin@sgs.golf / Admin123!");
  }

  // Member user (linked golfer record created in golfer seed)
  const memberEmail = "jared@sgs.golf";
  const existingMember = await User.findOne({ email: memberEmail });
  if (!existingMember) {
    await User.create({
      email: memberEmail,
      passwordHash: await hashPassword("Member123!"),
      firstName: "Jared",
      lastName: "Abwawo",
      role: "MEMBER",
      status: "ACTIVE",
      clubIds: [clubId],
    });
    console.log("✓ Member user seeded: jared@sgs.golf / Member123!");
  }
}

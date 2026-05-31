import { Types } from "mongoose";
import { User, IUser } from "../models/user.model";

export const UserRepository = {
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() }).lean();
  },

  async updateLastLogin(userId: Types.ObjectId): Promise<void> {
    await User.updateOne({ _id: userId }, { lastLoginAt: new Date() });
  },
};

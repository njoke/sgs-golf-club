import { Schema, model, Types } from "mongoose";

export type UserRole =
  | "SUPER_ADMIN"
  | "CLUB_ADMIN"
  | "HANDICAP_CHAIR"
  | "TOURNAMENT_ADMIN"
  | "MEMBER"
  | "READ_ONLY";

export type UserStatus = "ACTIVE" | "INACTIVE" | "LOCKED";

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  clubIds: Types.ObjectId[];
  golferId?: Types.ObjectId;
  status: UserStatus;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["SUPER_ADMIN", "CLUB_ADMIN", "HANDICAP_CHAIR", "TOURNAMENT_ADMIN", "MEMBER", "READ_ONLY"],
      required: true,
    },
    clubIds: [{ type: Schema.Types.ObjectId, ref: "Club" }],
    golferId: { type: Schema.Types.ObjectId, ref: "Golfer", default: null },
    status: { type: String, enum: ["ACTIVE", "INACTIVE", "LOCKED"], default: "ACTIVE" },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1 });
UserSchema.index({ clubIds: 1 });
UserSchema.index({ golferId: 1 });
UserSchema.index({ status: 1 });

export const User = model<IUser>("User", UserSchema);

import { Schema, model, type Types } from "mongoose";

export type TournamentFormat =
  | "STROKE_PLAY"
  | "STABLEFORD"
  | "SCRAMBLE"
  | "MATCH_PLAY"
  | "OTHER";
export type TournamentStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type TournamentRegistrationStatus =
  | "DRAFT"
  | "OPEN"
  | "CLOSED"
  | "CANCELLED"
  | "COMPLETED";

export interface ITournamentEligibility {
  minHandicapIndex?: number;
  maxHandicapIndex?: number;
  gender?: "ALL" | "M" | "F";
  membershipCodes?: string[];
}

export interface ITournament {
  _id: Types.ObjectId;
  clubId: Types.ObjectId;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  courseId?: Types.ObjectId;
  format: TournamentFormat;
  registrationStatus: TournamentRegistrationStatus;
  registrationOpenAt?: Date;
  registrationCloseAt?: Date;
  maxPlayers?: number;
  entryFee?: number;
  membersOnly: boolean;
  allowGuests: boolean;
  eligibility?: ITournamentEligibility;
  status: TournamentStatus;
  createdByUserId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TournamentEligibilitySchema = new Schema<ITournamentEligibility>(
  {
    minHandicapIndex: Number,
    maxHandicapIndex: Number,
    gender: { type: String, enum: ["ALL", "M", "F"], default: "ALL" },
    membershipCodes: [String],
  },
  { _id: false }
);

const TournamentSchema = new Schema<ITournament>(
  {
    clubId: { type: Schema.Types.ObjectId, ref: "Club", required: true },
    name: { type: String, required: true, trim: true },
    description: String,
    startDate: { type: Date, required: true },
    endDate: Date,
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
    format: {
      type: String,
      enum: ["STROKE_PLAY", "STABLEFORD", "SCRAMBLE", "MATCH_PLAY", "OTHER"],
      required: true,
    },
    registrationStatus: {
      type: String,
      enum: ["DRAFT", "OPEN", "CLOSED", "CANCELLED", "COMPLETED"],
      default: "DRAFT",
    },
    registrationOpenAt: Date,
    registrationCloseAt: Date,
    maxPlayers: Number,
    entryFee: Number,
    membersOnly: { type: Boolean, default: true },
    allowGuests: { type: Boolean, default: false },
    eligibility: TournamentEligibilitySchema,
    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "CANCELLED"],
      default: "ACTIVE",
    },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

TournamentSchema.index({ clubId: 1, startDate: 1 });
TournamentSchema.index({ clubId: 1, registrationStatus: 1 });
TournamentSchema.index({ status: 1 });

export const Tournament = model<ITournament>("Tournament", TournamentSchema);

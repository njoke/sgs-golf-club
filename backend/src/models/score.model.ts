import { Schema, model, type Types } from "mongoose";

export type ScoreType = "HOME" | "AWAY" | "COMPETITION";
export type ScoreEntryMode = "TOTAL_SCORE" | "HOLE_BY_HOLE";
export type ScoreStatus =
  | "POSTED"
  | "MODIFIED"
  | "WITHDRAWN"
  | "DELETED"
  | "PENDING_REVIEW";

export interface IScore {
  _id: Types.ObjectId;
  clubId: Types.ObjectId;
  golferId: Types.ObjectId;
  courseId?: Types.ObjectId;
  teeId?: string;
  datePlayed: Date;
  scoreType: ScoreType;
  holes: number;
  entryMode: ScoreEntryMode;
  grossScore: number;
  adjustedGrossScore?: number;
  holeScores?: number[];
  courseRating: number;
  slopeRating: number;
  par: number;
  pcc?: number;
  differential?: number;
  esr?: number;
  status: ScoreStatus;
  courseNameSnapshot: string;
  teeNameSnapshot: string;
  postedByUserId: Types.ObjectId;
  postedByRole: string;
  isTournamentScore: boolean;
  tournamentId?: Types.ObjectId;
  isNineHole: boolean;
  pairedWithScoreId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ScoreSchema = new Schema<IScore>(
  {
    clubId: { type: Schema.Types.ObjectId, ref: "Club", required: true },
    golferId: { type: Schema.Types.ObjectId, ref: "Golfer", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
    teeId: String,
    datePlayed: { type: Date, required: true },
    scoreType: {
      type: String,
      enum: ["HOME", "AWAY", "COMPETITION"],
      required: true,
    },
    holes: { type: Number, enum: [9, 18], required: true },
    entryMode: {
      type: String,
      enum: ["TOTAL_SCORE", "HOLE_BY_HOLE"],
      required: true,
    },
    grossScore: { type: Number, required: true, min: 1 },
    adjustedGrossScore: Number,
    holeScores: [Number],
    courseRating: { type: Number, required: true },
    slopeRating: { type: Number, required: true, min: 55, max: 155 },
    par: { type: Number, required: true },
    pcc: Number,
    differential: Number,
    esr: Number,
    status: {
      type: String,
      enum: ["POSTED", "MODIFIED", "WITHDRAWN", "DELETED", "PENDING_REVIEW"],
      default: "POSTED",
    },
    courseNameSnapshot: { type: String, required: true },
    teeNameSnapshot: { type: String, required: true },
    postedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    postedByRole: { type: String, required: true },
    isTournamentScore: { type: Boolean, default: false },
    tournamentId: { type: Schema.Types.ObjectId, ref: "Tournament" },
    isNineHole: { type: Boolean, default: false },
    pairedWithScoreId: { type: Schema.Types.ObjectId, ref: "Score", default: null },
  },
  { timestamps: true }
);

ScoreSchema.index({ clubId: 1, golferId: 1, datePlayed: -1 });
ScoreSchema.index({ golferId: 1, datePlayed: -1 });
ScoreSchema.index({ clubId: 1, datePlayed: -1 });
ScoreSchema.index({ status: 1 });
ScoreSchema.index({ tournamentId: 1 }, { sparse: true });

export const Score = model<IScore>("Score", ScoreSchema);

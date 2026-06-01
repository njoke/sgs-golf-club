import { Schema, model, type Types } from "mongoose";

export type RegStatus =
  | "REGISTERED"
  | "PENDING"
  | "WAITLISTED"
  | "CANCELLED"
  | "DECLINED";
export type PaymentStatus =
  | "NOT_REQUIRED"
  | "UNPAID"
  | "PAID"
  | "REFUNDED"
  | "FAILED";

export interface ITournamentRegistration {
  _id: Types.ObjectId;
  tournamentId: Types.ObjectId;
  clubId: Types.ObjectId;
  golferId: Types.ObjectId;
  playerNameSnapshot: string;
  ghinNumberSnapshot?: string;
  emailSnapshot?: string;
  handicapIndexSnapshot?: number;
  preferredTeeId?: string;
  status: RegStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  registeredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TournamentRegistrationSchema = new Schema<ITournamentRegistration>(
  {
    tournamentId: { type: Schema.Types.ObjectId, ref: "Tournament", required: true },
    clubId: { type: Schema.Types.ObjectId, ref: "Club", required: true },
    golferId: { type: Schema.Types.ObjectId, ref: "Golfer", required: true },
    playerNameSnapshot: { type: String, required: true },
    ghinNumberSnapshot: String,
    emailSnapshot: String,
    handicapIndexSnapshot: Number,
    preferredTeeId: String,
    status: {
      type: String,
      enum: ["REGISTERED", "PENDING", "WAITLISTED", "CANCELLED", "DECLINED"],
      default: "REGISTERED",
    },
    paymentStatus: {
      type: String,
      enum: ["NOT_REQUIRED", "UNPAID", "PAID", "REFUNDED", "FAILED"],
      default: "NOT_REQUIRED",
    },
    notes: String,
    registeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

TournamentRegistrationSchema.index({ tournamentId: 1, golferId: 1 }, { unique: true });
TournamentRegistrationSchema.index({ tournamentId: 1, status: 1 });
TournamentRegistrationSchema.index({ golferId: 1 });
TournamentRegistrationSchema.index({ clubId: 1 });

export const TournamentRegistration = model<ITournamentRegistration>(
  "TournamentRegistration",
  TournamentRegistrationSchema
);

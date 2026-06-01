import { Schema, model, type Types } from "mongoose";

export type TeeGender = "M" | "F";

export interface INineHoleRating {
  rating: number;
  slope: number;
  par?: number;
}

export interface ITee {
  teeId: string;
  teeName: string;
  gender: TeeGender;
  par: number;
  courseRating: number;
  bogeyRating?: number;
  slopeRating: number;
  frontNine?: INineHoleRating;
  backNine?: INineHoleRating;
  yardage?: number;
  holeYardages?: number[];
  holePars?: number[];
  holeHandicaps?: number[];
}

export interface ICourse {
  _id: Types.ObjectId;
  clubId: Types.ObjectId;
  facilityName: string;
  courseName: string;
  city: string;
  state: string;
  isPrimaryFacility: boolean;
  tees: ITee[];
  defaultMaleTeeId?: string;
  defaultFemaleTeeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NineHoleRatingSchema = new Schema<INineHoleRating>(
  {
    rating: { type: Number, required: true },
    slope: { type: Number, required: true },
    par: Number,
  },
  { _id: false }
);

const TeeSchema = new Schema<ITee>(
  {
    teeId: { type: String, required: true, trim: true },
    teeName: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["M", "F"], required: true },
    par: { type: Number, required: true },
    courseRating: { type: Number, required: true },
    bogeyRating: Number,
    slopeRating: { type: Number, required: true, min: 55, max: 155 },
    frontNine: { type: NineHoleRatingSchema },
    backNine: { type: NineHoleRatingSchema },
    yardage: Number,
    holeYardages: [Number],
    holePars: [Number],
    holeHandicaps: [Number],
  },
  { _id: false }
);

const CourseSchema = new Schema<ICourse>(
  {
    clubId: { type: Schema.Types.ObjectId, ref: "Club", required: true },
    facilityName: { type: String, required: true, trim: true },
    courseName: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    isPrimaryFacility: { type: Boolean, default: false },
    tees: { type: [TeeSchema], default: [] },
    defaultMaleTeeId: { type: String, trim: true },
    defaultFemaleTeeId: { type: String, trim: true },
  },
  { timestamps: true }
);

CourseSchema.index({ clubId: 1 });
CourseSchema.index({ clubId: 1, isPrimaryFacility: 1 });
CourseSchema.index({ facilityName: 1 });
CourseSchema.index({ courseName: 1 });

export const Course = model<ICourse>("Course", CourseSchema);

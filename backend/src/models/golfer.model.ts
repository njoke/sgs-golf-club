import { Schema, model, Types } from "mongoose";

export type MembershipStatus = "ACTIVE" | "INACTIVE";
export type DigitalProfileStatus = "NONE" | "PENDING" | "ACTIVE";
export type Gender = "M" | "F" | "OTHER" | "PREFER_NOT_TO_SAY";

export interface IAddress {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface IGolfer {
  _id: Types.ObjectId;
  clubId: Types.ObjectId;
  ghinNumber?: string;
  localNumber?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  gender: Gender;
  dateOfBirth?: Date;
  email: string;
  phone?: string;
  address?: IAddress;
  membershipCode: string;
  membershipStatus: MembershipStatus;
  statusDate?: Date;
  digitalProfileStatus: DigitalProfileStatus;
  currentHandicapIndex?: number;
  lowHandicapIndex?: number;
  lowHandicapDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: "United States" },
  },
  { _id: false }
);

const GolferSchema = new Schema<IGolfer>(
  {
    clubId: { type: Schema.Types.ObjectId, ref: "Club", required: true },
    ghinNumber: { type: String, trim: true },
    localNumber: { type: String, trim: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, required: true, trim: true },
    suffix: { type: String, trim: true },
    gender: { type: String, enum: ["M", "F", "OTHER", "PREFER_NOT_TO_SAY"], required: true },
    dateOfBirth: { type: Date },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: AddressSchema },
    membershipCode: { type: String, required: true, trim: true },
    membershipStatus: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    statusDate: { type: Date, default: Date.now },
    digitalProfileStatus: { type: String, enum: ["NONE", "PENDING", "ACTIVE"], default: "NONE" },
    currentHandicapIndex: { type: Number, default: null },
    lowHandicapIndex: { type: Number, default: null },
    lowHandicapDate: { type: Date },
  },
  { timestamps: true }
);

GolferSchema.index({ clubId: 1, lastName: 1, firstName: 1 });
GolferSchema.index({ clubId: 1, membershipStatus: 1 });
GolferSchema.index({ clubId: 1, email: 1 });
GolferSchema.index({ ghinNumber: 1 });
GolferSchema.index({ email: 1 });

export const Golfer = model<IGolfer>("Golfer", GolferSchema);

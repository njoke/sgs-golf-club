import { Schema, model, Types } from "mongoose";

export type ClubStatus = "ACTIVE" | "INACTIVE";

export interface IClubContact {
  contactType: string;
  name?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface IClub {
  _id: Types.ObjectId;
  clubNumber?: string;
  ghpId?: string;
  name: string;
  shortName?: string;
  associationName?: string;
  status: ClubStatus;
  clubCategory?: string;
  clubType?: string;
  isTestClub: boolean;
  authorized: boolean;
  isDac: boolean;
  frontEndProvider?: string;
  usgaAgaClub: boolean;
  phone?: string;
  email?: string;
  website?: string;
  hubspotCompanyId?: string;
  handicapChairperson?: string;
  contacts: IClubContact[];
  lastStatusUpdate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ClubContactSchema = new Schema<IClubContact>(
  {
    contactType: { type: String, required: true },
    name: String,
    email: String,
    phone: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: "United States" },
  },
  { _id: false }
);

const ClubSchema = new Schema<IClub>(
  {
    clubNumber: { type: String, trim: true },
    ghpId: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true },
    associationName: { type: String, trim: true },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    clubCategory: String,
    clubType: String,
    isTestClub: { type: Boolean, default: false },
    authorized: { type: Boolean, default: true },
    isDac: { type: Boolean, default: false },
    frontEndProvider: String,
    usgaAgaClub: { type: Boolean, default: false },
    phone: String,
    email: String,
    website: String,
    hubspotCompanyId: String,
    handicapChairperson: String,
    contacts: [ClubContactSchema],
    lastStatusUpdate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ClubSchema.index({ clubNumber: 1 }, { unique: true, sparse: true });
ClubSchema.index({ ghpId: 1 }, { sparse: true });
ClubSchema.index({ name: 1 });
ClubSchema.index({ status: 1 });
ClubSchema.index({ associationName: 1 });

export const Club = model<IClub>("Club", ClubSchema);

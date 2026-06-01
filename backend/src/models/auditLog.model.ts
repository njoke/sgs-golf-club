import { Schema, model, type Types } from "mongoose";

export type AuditEntityType =
  | "GOLFER"
  | "SCORE"
  | "CLUB"
  | "COURSE"
  | "TOURNAMENT"
  | "REGISTRATION"
  | "USER";

export type AuditAction =
  | "GOLFER_CREATED"
  | "GOLFER_UPDATED"
  | "GOLFER_ACTIVATED"
  | "GOLFER_DEACTIVATED"
  | "SCORE_POSTED"
  | "SCORE_MODIFIED"
  | "SCORE_WITHDRAWN"
  | "SCORE_DELETED"
  | "HANDICAP_INDEX_UPDATED"
  | "HANDICAP_INDEX_RECALCULATED"
  | "CLUB_UPDATED"
  | "COURSE_ADDED"
  | "COURSE_UPDATED"
  | "COURSE_REMOVED"
  | "TOURNAMENT_CREATED"
  | "TOURNAMENT_UPDATED"
  | "TOURNAMENT_CANCELLED"
  | "TOURNAMENT_REGISTRATION_OPENED"
  | "TOURNAMENT_REGISTRATION_CLOSED"
  | "REGISTRATION_CREATED"
  | "REGISTRATION_CANCELLED"
  | "REGISTRATION_APPROVED"
  | "REGISTRATION_WAITLISTED"
  | "USER_LOGIN"
  | "USER_LOGOUT";

export interface IAuditLog {
  _id: Types.ObjectId;
  clubId?: Types.ObjectId;
  actorUserId: Types.ObjectId;
  actorEmail: string;
  actorRole: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    clubId: { type: Schema.Types.ObjectId, ref: "Club" },
    actorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorEmail: { type: String, required: true },
    actorRole: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    action: { type: String, required: true },
    summary: { type: String, required: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ actorUserId: 1, createdAt: -1 });
AuditLogSchema.index({ clubId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLog = model<IAuditLog>("AuditLog", AuditLogSchema);

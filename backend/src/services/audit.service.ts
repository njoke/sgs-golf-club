import { Types } from "mongoose";
import type { AuditAction, AuditEntityType } from "../models/auditLog.model";
import { AuditLogRepository } from "../repositories/auditLog.repository";

export interface CreateAuditLogParams {
  clubId?: string;
  actorUserId: string;
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
}

export class AuditService {
  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await AuditLogRepository.create({
        clubId: params.clubId ? new Types.ObjectId(params.clubId) : undefined,
        actorUserId: new Types.ObjectId(params.actorUserId),
        actorEmail: params.actorEmail,
        actorRole: params.actorRole,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        summary: params.summary,
        before: params.before ?? null,
        after: params.after ?? null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
    } catch (error) {
      console.error("[AuditService] Failed to write audit log:", error);
    }
  }
}

export const auditService = new AuditService();

import { type FilterQuery, Types } from "mongoose";
import { AuditLog, type IAuditLog } from "../models/auditLog.model";

interface AuditEntityFilterInput {
  entityType?: string;
  entityId?: string;
  entityIds?: string[];
}

export interface AuditLogFilterInput {
  entityType?: string;
  entityId?: string;
  action?: string;
  actorUserId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
  relatedEntityFilters?: AuditEntityFilterInput[];
}

function buildEntityClause(filter: AuditEntityFilterInput): FilterQuery<IAuditLog> | null {
  const clause: FilterQuery<IAuditLog> = {};

  if (filter.entityType) {
    clause.entityType = filter.entityType;
  }

  const entityIds = Array.from(new Set(filter.entityIds ?? []));
  if (filter.entityId && !entityIds.includes(filter.entityId)) {
    entityIds.push(filter.entityId);
  }

  if (entityIds.length === 1) {
    clause.entityId = entityIds[0];
  } else if (entityIds.length > 1) {
    clause.entityId = { $in: entityIds };
  }

  return Object.keys(clause).length ? clause : null;
}

export const AuditLogRepository = {
  async create(data: Partial<IAuditLog>): Promise<IAuditLog> {
    return AuditLog.create(data);
  },

  async find(
    filter: AuditLogFilterInput,
    scope?: { clubIds?: string[] }
  ): Promise<{ logs: IAuditLog[]; total: number }> {
    const query: FilterQuery<IAuditLog> = {};

    const entityClauses = [
      buildEntityClause({ entityType: filter.entityType, entityId: filter.entityId }),
      ...(filter.relatedEntityFilters ?? []).map(buildEntityClause),
    ].filter((clause): clause is FilterQuery<IAuditLog> => Boolean(clause));

    if (entityClauses.length === 1) {
      Object.assign(query, entityClauses[0]);
    } else if (entityClauses.length > 1) {
      query.$or = entityClauses;
    }

    if (filter.action) query.action = filter.action;
    if (filter.actorUserId) query.actorUserId = new Types.ObjectId(filter.actorUserId);
    if (filter.dateFrom || filter.dateTo) {
      query.createdAt = {};
      if (filter.dateFrom) query.createdAt.$gte = filter.dateFrom;
      if (filter.dateTo) query.createdAt.$lte = filter.dateTo;
    }

    if (scope?.clubIds) {
      query.clubId = { $in: scope.clubIds.map((clubId) => new Types.ObjectId(clubId)) };
    }

    const page = filter.page ?? 1;
    const pageSize = Math.min(filter.pageSize ?? 25, 100);
    const skip = (page - 1) * pageSize;

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      AuditLog.countDocuments(query),
    ]);

    return { logs, total };
  },
};

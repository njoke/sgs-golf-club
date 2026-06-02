import { requireRole } from "../../auth/permissions";
import { AuditLogRepository, type AuditLogFilterInput } from "../../repositories/auditLog.repository";
import { ScoreRepository } from "../../repositories/score.repository";
import type { GraphQLContext } from "../context";
import type { IAuditLog } from "../../models/auditLog.model";
import { toPlainObject } from "./toPlainObject";

function mapAuditLog(log: IAuditLog) {
  const plainLog = toPlainObject(log);
  return {
    ...plainLog,
    id: plainLog._id.toString(),
    clubId: plainLog.clubId?.toString() ?? null,
    actorUserId: plainLog.actorUserId.toString(),
  };
}

export const auditLogResolvers = {
  Query: {
    auditLogs: async (
      _: unknown,
      { filter }: { filter: AuditLogFilterInput },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ["SUPER_ADMIN", "CLUB_ADMIN", "HANDICAP_CHAIR"]);

      const scope =
        ctx.user?.role === "SUPER_ADMIN" ? undefined : { clubIds: ctx.user?.clubIds ?? [] };
      const relatedEntityFilters = [...(filter.relatedEntityFilters ?? [])];
      if (filter.entityType === "GOLFER" && filter.entityId) {
        const scoreIds = await ScoreRepository.findIdsByGolfer(filter.entityId);
        if (scoreIds.length) {
          relatedEntityFilters.push({
            entityType: "SCORE",
            entityIds: scoreIds,
          });
        }
      }

      const { logs, total } = await AuditLogRepository.find(
        {
          ...filter,
          relatedEntityFilters,
        },
        scope
      );
      const page = filter.page ?? 1;
      const pageSize = Math.min(filter.pageSize ?? 25, 100);

      return {
        nodes: logs.map(mapAuditLog),
        pageInfo: {
          totalCount: total,
          page,
          pageSize,
          hasNextPage: page * pageSize < total,
          hasPreviousPage: page > 1,
        },
      };
    },
  },
};

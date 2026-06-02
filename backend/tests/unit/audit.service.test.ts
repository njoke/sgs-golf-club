import { Types } from "mongoose";
import { ErrorCodes } from "../../src/errors/errorCodes";
import type { GraphQLContext } from "../../src/graphql/context";
import { auditLogResolvers } from "../../src/graphql/resolvers/auditLog.resolver";
import { AuditLogRepository } from "../../src/repositories/auditLog.repository";
import { ScoreRepository } from "../../src/repositories/score.repository";
import { auditService } from "../../src/services/audit.service";

const clubId = new Types.ObjectId().toString();

function makeAdminContext(): GraphQLContext {
  return {
    user: {
      userId: new Types.ObjectId().toString(),
      email: "admin@sgs.golf",
      role: "CLUB_ADMIN",
      clubIds: [clubId],
    },
  };
}

function makeMemberContext(): GraphQLContext {
  return {
    user: {
      userId: new Types.ObjectId().toString(),
      email: "jared@sgs.golf",
      role: "MEMBER",
      clubIds: [clubId],
      golferId: new Types.ObjectId().toString(),
    },
  };
}

describe("audit service and resolver", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("swallows repository write failures", async () => {
    jest
      .spyOn(AuditLogRepository, "create")
      .mockRejectedValue(new Error("write failed"));
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      auditService.log({
        clubId,
        actorUserId: new Types.ObjectId().toString(),
        actorEmail: "admin@sgs.golf",
        actorRole: "CLUB_ADMIN",
        entityType: "CLUB",
        entityId: new Types.ObjectId().toString(),
        action: "CLUB_UPDATED",
        summary: "Club updated.",
      })
    ).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("denies audit log access to members", async () => {
    await expect(
      auditLogResolvers.Query.auditLogs(
        undefined,
        { filter: { entityId: new Types.ObjectId().toString() } },
        makeMemberContext()
      )
    ).rejects.toMatchObject({
      code: ErrorCodes.UNAUTHORIZED,
    });
  });

  it("scopes audit log queries to caller clubs", async () => {
    const logId = new Types.ObjectId();
    jest.spyOn(ScoreRepository, "findIdsByGolfer").mockResolvedValue([]);
    jest.spyOn(AuditLogRepository, "find").mockResolvedValue({
      logs: [
        {
          _id: logId,
          clubId: new Types.ObjectId(clubId),
          actorUserId: new Types.ObjectId(),
          actorEmail: "admin@sgs.golf",
          actorRole: "CLUB_ADMIN",
          entityType: "GOLFER",
          entityId: new Types.ObjectId().toString(),
          action: "GOLFER_CREATED",
          summary: "Golfer added.",
          before: null,
          after: { firstName: "Jared" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
    });

    const result = await auditLogResolvers.Query.auditLogs(
      undefined,
      { filter: { entityId: new Types.ObjectId().toString() } },
      makeAdminContext()
    );

    expect(AuditLogRepository.find).toHaveBeenCalledWith(
      { entityId: expect.any(String), relatedEntityFilters: [] },
      { clubIds: [clubId] }
    );
    expect(result.pageInfo.totalCount).toBe(1);
    expect(result.nodes[0].id).toBe(logId.toString());
  });

  it("includes score audit rows when querying a golfer entity log", async () => {
    const golferId = new Types.ObjectId().toString();
    jest.spyOn(ScoreRepository, "findIdsByGolfer").mockResolvedValue(["score-1", "score-2"]);
    jest.spyOn(AuditLogRepository, "find").mockResolvedValue({
      logs: [],
      total: 0,
    });

    await auditLogResolvers.Query.auditLogs(
      undefined,
      { filter: { entityType: "GOLFER", entityId: golferId, page: 1, pageSize: 20 } },
      makeAdminContext()
    );

    expect(ScoreRepository.findIdsByGolfer).toHaveBeenCalledWith(golferId);
    expect(AuditLogRepository.find).toHaveBeenCalledWith(
      {
        entityType: "GOLFER",
        entityId: golferId,
        page: 1,
        pageSize: 20,
        relatedEntityFilters: [
          {
            entityType: "SCORE",
            entityIds: ["score-1", "score-2"],
          },
        ],
      },
      { clubIds: [clubId] }
    );
  });
});

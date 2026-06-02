import { AuditLog } from "../../src/models/auditLog.model";
import { AuditLogRepository } from "../../src/repositories/auditLog.repository";

describe("AuditLogRepository", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("builds an OR query for primary and related entity filters", async () => {
    const queryChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };

    const findSpy = jest.spyOn(AuditLog, "find").mockReturnValue(queryChain as any);
    const countSpy = jest.spyOn(AuditLog, "countDocuments").mockResolvedValue(0 as any);

    await AuditLogRepository.find({
      entityType: "GOLFER",
      entityId: "golfer-1",
      relatedEntityFilters: [
        {
          entityType: "SCORE",
          entityIds: ["score-1", "score-2"],
        },
      ],
      page: 1,
      pageSize: 20,
    });

    const expectedQuery = {
      $or: [
        { entityType: "GOLFER", entityId: "golfer-1" },
        { entityType: "SCORE", entityId: { $in: ["score-1", "score-2"] } },
      ],
    };

    expect(findSpy).toHaveBeenCalledWith(expectedQuery);
    expect(countSpy).toHaveBeenCalledWith(expectedQuery);
    expect(queryChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(queryChain.skip).toHaveBeenCalledWith(0);
    expect(queryChain.limit).toHaveBeenCalledWith(20);
  });
});

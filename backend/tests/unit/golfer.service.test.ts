import { Types } from "mongoose";
import { ErrorCodes } from "../../src/errors/errorCodes";
import type { GraphQLContext } from "../../src/graphql/context";
import { GolferRepository } from "../../src/repositories/golfer.repository";
import { auditService } from "../../src/services/audit.service";
import { golferService } from "../../src/services/golfer.service";

const clubId = new Types.ObjectId().toString();
const golferId = new Types.ObjectId().toString();
const userId = new Types.ObjectId().toString();

function makeMemberContext(overrides: Partial<NonNullable<GraphQLContext["user"]>> = {}): GraphQLContext {
  return {
    user: {
      userId,
      email: "jared@sgs.golf",
      role: "MEMBER",
      clubIds: [clubId],
      golferId,
      ...overrides,
    },
  };
}

function makeGolfer() {
  return {
    _id: new Types.ObjectId(golferId),
    clubId: new Types.ObjectId(clubId),
    ghinNumber: "10750356",
    localNumber: "L-14",
    firstName: "Jared",
    middleName: "Otis",
    lastName: "Abwawo",
    suffix: null,
    gender: "M" as const,
    dateOfBirth: new Date("1988-01-01T00:00:00.000Z"),
    email: "jared@sgs.golf",
    phone: "206-555-0199",
    address: {
      addressLine1: "123 Pine St",
      city: "Seattle",
      state: "WA",
      postalCode: "98101",
      country: "USA",
    },
    membershipCode: "R",
    membershipStatus: "ACTIVE" as const,
    statusDate: new Date("2026-01-01T00:00:00.000Z"),
    digitalProfileStatus: "NONE" as const,
    currentHandicapIndex: 13.1,
    lowHandicapIndex: 12.0,
    lowHandicapDate: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("golferService.updateGolfer", () => {
  beforeEach(() => {
    jest.spyOn(auditService, "log").mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("allows member to update safe fields on own profile", async () => {
    const golfer = makeGolfer();
    jest.spyOn(GolferRepository, "findById").mockResolvedValue(golfer as any);
    const updateSpy = jest.spyOn(GolferRepository, "update").mockResolvedValue({
      ...golfer,
      firstName: "Jay",
      phone: "206-555-0111",
      address: {
        ...golfer.address,
        city: "Tacoma",
      },
    } as any);

    const updated = await golferService.updateGolfer(
      golferId,
      {
        firstName: "Jay",
        phone: "206-555-0111",
        address: {
          ...golfer.address,
          city: "Tacoma",
        },
      },
      makeMemberContext()
    );

    expect(updateSpy).toHaveBeenCalledWith(
      golferId,
      expect.objectContaining({
        firstName: "Jay",
        phone: "206-555-0111",
      })
    );
    expect(updated.firstName).toBe("Jay");
  });

  it("rejects member update of restricted fields", async () => {
    jest.spyOn(GolferRepository, "findById").mockResolvedValue(makeGolfer() as any);

    await expect(
      golferService.updateGolfer(
        golferId,
        {
          email: "new@sgs.golf",
        },
        makeMemberContext()
      )
    ).rejects.toMatchObject({
      code: ErrorCodes.UNAUTHORIZED,
      message: "Members cannot update: email.",
    });
  });

  it("rejects member update on another golfer", async () => {
    jest.spyOn(GolferRepository, "findById").mockResolvedValue(makeGolfer() as any);

    await expect(
      golferService.updateGolfer(
        golferId,
        {
          firstName: "Jay",
        },
        makeMemberContext({ golferId: new Types.ObjectId().toString() })
      )
    ).rejects.toMatchObject({
      code: ErrorCodes.UNAUTHORIZED,
      message: "Access denied.",
    });
  });
});

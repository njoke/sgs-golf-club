import { Types } from "mongoose";
import { ErrorCodes } from "../../src/errors/errorCodes";
import type { GraphQLContext } from "../../src/graphql/context";
import { GolferRepository } from "../../src/repositories/golfer.repository";
import { TournamentRegistrationRepository } from "../../src/repositories/tournamentRegistration.repository";
import { TournamentRepository } from "../../src/repositories/tournament.repository";
import { auditService } from "../../src/services/audit.service";
import {
  tournamentRegistrationService,
  type RegisterForTournamentInput,
} from "../../src/services/tournamentRegistration.service";

const clubId = new Types.ObjectId().toString();
const tournamentId = new Types.ObjectId().toString();
const golferId = new Types.ObjectId().toString();
const userId = new Types.ObjectId().toString();

function makeAdminContext(): GraphQLContext {
  return {
    user: {
      userId,
      email: "admin@sgs.golf",
      role: "TOURNAMENT_ADMIN",
      clubIds: [clubId],
    },
  };
}

function makeMemberContext(): GraphQLContext {
  return {
    user: {
      userId,
      email: "jared@sgs.golf",
      role: "MEMBER",
      clubIds: [clubId],
      golferId,
    },
  };
}

function makeInput(overrides: Partial<RegisterForTournamentInput> = {}): RegisterForTournamentInput {
  return {
    tournamentId,
    golferId,
    email: "jared@sgs.golf",
    agreedToTerms: true,
    ...overrides,
  };
}

function makeTournament(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(tournamentId),
    clubId: new Types.ObjectId(clubId),
    name: "Spring Classic",
    startDate: new Date("2026-06-15T00:00:00.000Z"),
    format: "STROKE_PLAY",
    registrationStatus: "OPEN",
    registrationOpenAt: new Date("2026-05-30T00:00:00.000Z"),
    registrationCloseAt: new Date("2026-06-10T23:59:59.000Z"),
    maxPlayers: 72,
    entryFee: 50,
    membersOnly: true,
    allowGuests: false,
    status: "ACTIVE",
    createdByUserId: new Types.ObjectId(userId),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeGolfer(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(golferId),
    clubId: new Types.ObjectId(clubId),
    firstName: "Jared",
    lastName: "Abwawo",
    email: "jared@sgs.golf",
    ghinNumber: "10750356",
    gender: "M",
    membershipCode: "R",
    membershipStatus: "ACTIVE",
    currentHandicapIndex: 13.1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("tournamentRegistrationService", () => {
  beforeEach(() => {
    jest.spyOn(auditService, "log").mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("blocks members from registering another golfer", async () => {
    await expect(
      tournamentRegistrationService.registerForTournament(
        makeInput({ golferId: new Types.ObjectId().toString() }),
        makeMemberContext()
      )
    ).rejects.toMatchObject({
      code: ErrorCodes.UNAUTHORIZED,
      message: "Members can only register themselves.",
    });
  });

  it("requires agreedToTerms", async () => {
    await expect(
      tournamentRegistrationService.registerForTournament(
        makeInput({ agreedToTerms: false }),
        makeAdminContext()
      )
    ).rejects.toMatchObject({
      code: ErrorCodes.VALIDATION_ERROR,
      message: "You must agree to the terms to register.",
    });
  });

  it("rejects duplicate registrations", async () => {
    jest.spyOn(TournamentRepository, "findById").mockResolvedValue(makeTournament() as any);
    jest.spyOn(GolferRepository, "findById").mockResolvedValue(makeGolfer() as any);
    jest.spyOn(TournamentRegistrationRepository, "findExisting").mockResolvedValue({
      _id: new Types.ObjectId(),
      status: "REGISTERED",
    } as any);

    await expect(
      tournamentRegistrationService.registerForTournament(makeInput(), makeAdminContext())
    ).rejects.toMatchObject({
      code: ErrorCodes.REGISTRATION_DUPLICATE,
      message: "Golfer is already registered for this tournament.",
    });
  });

  it("rejects closed registration", async () => {
    jest
      .spyOn(TournamentRepository, "findById")
      .mockResolvedValue(makeTournament({ registrationStatus: "CLOSED" }) as any);

    await expect(
      tournamentRegistrationService.registerForTournament(makeInput(), makeAdminContext())
    ).rejects.toMatchObject({
      code: ErrorCodes.REGISTRATION_CLOSED,
    });
  });

  it("rejects golfer failing handicap eligibility", async () => {
    jest.spyOn(TournamentRepository, "findById").mockResolvedValue(
      makeTournament({
        eligibility: { maxHandicapIndex: 10 },
      }) as any
    );
    jest.spyOn(GolferRepository, "findById").mockResolvedValue(makeGolfer() as any);
    jest.spyOn(TournamentRegistrationRepository, "findExisting").mockResolvedValue(null);

    await expect(
      tournamentRegistrationService.registerForTournament(makeInput(), makeAdminContext())
    ).rejects.toMatchObject({
      code: ErrorCodes.NOT_ELIGIBLE,
      message: "A maximum Handicap Index of 10 is required.",
    });
  });

  it("waitlists registration when tournament is full", async () => {
    jest.spyOn(TournamentRepository, "findById").mockResolvedValue(
      makeTournament({ maxPlayers: 1 }) as any
    );
    jest.spyOn(GolferRepository, "findById").mockResolvedValue(makeGolfer() as any);
    jest.spyOn(TournamentRegistrationRepository, "findExisting").mockResolvedValue(null);
    jest.spyOn(TournamentRepository, "countRegistered").mockResolvedValue(1);
    jest.spyOn(TournamentRegistrationRepository, "create").mockImplementation(async (data) => ({
      _id: new Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    }) as any);

    const registration = await tournamentRegistrationService.registerForTournament(
      makeInput(),
      makeAdminContext()
    );

    expect(registration.status).toBe("WAITLISTED");
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REGISTRATION_CREATED" })
    );
  });
});

import { Types } from "mongoose";
import { ErrorCodes } from "../../src/errors/errorCodes";
import type { GraphQLContext } from "../../src/graphql/context";
import { TournamentRepository } from "../../src/repositories/tournament.repository";
import { auditService } from "../../src/services/audit.service";
import {
  tournamentService,
  type CreateTournamentInput,
} from "../../src/services/tournament.service";

const clubId = new Types.ObjectId().toString();
const tournamentId = new Types.ObjectId().toString();
const userId = new Types.ObjectId().toString();

function makeContext(): GraphQLContext {
  return {
    user: {
      userId,
      email: "admin@sgs.golf",
      role: "TOURNAMENT_ADMIN",
      clubIds: [clubId],
    },
  };
}

function makeInput(overrides: Partial<CreateTournamentInput> = {}): CreateTournamentInput {
  return {
    clubId,
    name: "Spring Classic",
    description: "Club spring tournament",
    startDate: new Date("2026-06-15T00:00:00.000Z"),
    format: "STROKE_PLAY",
    ...overrides,
  };
}

function makeTournament() {
  return {
    _id: new Types.ObjectId(tournamentId),
    clubId: new Types.ObjectId(clubId),
    name: "Spring Classic",
    description: "Club spring tournament",
    startDate: new Date("2026-06-15T00:00:00.000Z"),
    format: "STROKE_PLAY" as const,
    registrationStatus: "DRAFT" as const,
    membersOnly: true,
    allowGuests: false,
    status: "ACTIVE" as const,
    createdByUserId: new Types.ObjectId(userId),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("tournamentService", () => {
  beforeEach(() => {
    jest.spyOn(auditService, "log").mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates draft tournament by default", async () => {
    const createSpy = jest
      .spyOn(TournamentRepository, "create")
      .mockResolvedValue(makeTournament() as any);

    const tournament = await tournamentService.createTournament(makeInput(), makeContext());

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        registrationStatus: "DRAFT",
        membersOnly: true,
        allowGuests: false,
      })
    );
    expect(tournament.registrationStatus).toBe("DRAFT");
  });

  it("requires registration dates when creating directly as open", async () => {
    await expect(
      tournamentService.createTournament(
        makeInput({ registrationStatus: "OPEN" }),
        makeContext()
      )
    ).rejects.toMatchObject({
      code: ErrorCodes.VALIDATION_ERROR,
      message: "Registration open and close dates are required when opening registration.",
    });
  });

  it("rejects open registration when dates are missing", async () => {
    jest.spyOn(TournamentRepository, "findById").mockResolvedValue(makeTournament() as any);

    await expect(
      tournamentService.openRegistration(tournamentId, makeContext())
    ).rejects.toMatchObject({
      code: ErrorCodes.VALIDATION_ERROR,
      message: "Set registration open and close dates before opening.",
    });
  });
});

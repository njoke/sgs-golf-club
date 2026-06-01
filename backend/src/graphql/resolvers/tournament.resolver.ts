import { AppError } from "../../errors/AppError";
import { ErrorCodes } from "../../errors/errorCodes";
import { requireAuth, requireClubAccess } from "../../auth/permissions";
import type { ITournament } from "../../models/tournament.model";
import type { ITournamentRegistration } from "../../models/tournamentRegistration.model";
import { TournamentRepository } from "../../repositories/tournament.repository";
import {
  tournamentRegistrationService,
  type RegisterForTournamentInput,
} from "../../services/tournamentRegistration.service";
import {
  tournamentService,
  type CreateTournamentInput,
} from "../../services/tournament.service";
import type { GraphQLContext } from "../context";
import { toPlainObject } from "./toPlainObject";

function mapTournament(tournament: ITournament) {
  const plainTournament = toPlainObject(tournament);
  return {
    ...plainTournament,
    id: plainTournament._id.toString(),
    clubId: plainTournament.clubId.toString(),
    courseId: plainTournament.courseId?.toString() ?? null,
  };
}

function mapTournamentRegistration(registration: ITournamentRegistration) {
  const plainRegistration = toPlainObject(registration);
  return {
    ...plainRegistration,
    id: plainRegistration._id.toString(),
    tournamentId: plainRegistration.tournamentId.toString(),
    clubId: plainRegistration.clubId.toString(),
    golferId: plainRegistration.golferId.toString(),
    preferredTeeId: plainRegistration.preferredTeeId ?? null,
  };
}

export const tournamentResolvers = {
  Tournament: {
    registeredPlayerCount: async (parent: ITournament) =>
      TournamentRepository.countRegistered(parent._id.toString()),
  },

  Query: {
    tournaments: async (
      _: unknown,
      {
        clubId,
        status,
        registrationStatus,
      }: {
        clubId: string;
        status?: ITournament["status"];
        registrationStatus?: ITournament["registrationStatus"];
      },
      ctx: GraphQLContext
    ) => {
      const tournaments = await tournamentService.getTournaments(
        clubId,
        status,
        registrationStatus,
        ctx
      );
      return tournaments.map(mapTournament);
    },

    tournament: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const tournament = await tournamentService.getById(id);
      if (!tournament) {
        throw new AppError("Tournament not found.", ErrorCodes.NOT_FOUND, 404);
      }
      requireClubAccess(ctx, tournament.clubId.toString());
      return mapTournament(tournament);
    },

    openTournaments: async (
      _: unknown,
      { clubId }: { clubId: string },
      ctx: GraphQLContext
    ) => {
      const tournaments = await tournamentService.getOpenTournaments(clubId, ctx);
      return tournaments.map(mapTournament);
    },

    tournamentRegistrations: async (
      _: unknown,
      { tournamentId }: { tournamentId: string },
      ctx: GraphQLContext
    ) => {
      const registrations = await tournamentRegistrationService.tournamentRegistrations(
        tournamentId,
        ctx
      );
      return registrations.map(mapTournamentRegistration);
    },

    myTournamentRegistrations: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const registrations = await tournamentRegistrationService.myTournamentRegistrations(ctx);
      return registrations.map(mapTournamentRegistration);
    },
  },

  Mutation: {
    createTournament: async (
      _: unknown,
      { input }: { input: CreateTournamentInput },
      ctx: GraphQLContext
    ) => {
      const tournament = await tournamentService.createTournament(input, ctx);
      return mapTournament(tournament);
    },

    updateTournament: async (
      _: unknown,
      { id, input }: { id: string; input: CreateTournamentInput },
      ctx: GraphQLContext
    ) => {
      const tournament = await tournamentService.updateTournament(id, input, ctx);
      return mapTournament(tournament);
    },

    openTournamentRegistration: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ) => {
      const tournament = await tournamentService.openRegistration(id, ctx);
      return mapTournament(tournament);
    },

    closeTournamentRegistration: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ) => {
      const tournament = await tournamentService.closeRegistration(id, ctx);
      return mapTournament(tournament);
    },

    cancelTournament: async (
      _: unknown,
      { id, reason }: { id: string; reason?: string },
      ctx: GraphQLContext
    ) => {
      const tournament = await tournamentService.cancelTournament(id, reason, ctx);
      return mapTournament(tournament);
    },

    registerForTournament: async (
      _: unknown,
      { input }: { input: RegisterForTournamentInput },
      ctx: GraphQLContext
    ) => {
      const registration = await tournamentRegistrationService.registerForTournament(
        input,
        ctx
      );
      return mapTournamentRegistration(registration);
    },

    cancelTournamentRegistration: async (
      _: unknown,
      { id, reason }: { id: string; reason?: string },
      ctx: GraphQLContext
    ) => {
      const registration = await tournamentRegistrationService.cancelRegistration(
        id,
        reason,
        ctx
      );
      return mapTournamentRegistration(registration);
    },

    approveTournamentRegistration: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ) => {
      const registration = await tournamentRegistrationService.approve(id, ctx);
      return mapTournamentRegistration(registration);
    },

    waitlistTournamentRegistration: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ) => {
      const registration = await tournamentRegistrationService.waitlist(id, ctx);
      return mapTournamentRegistration(registration);
    },
  },
};

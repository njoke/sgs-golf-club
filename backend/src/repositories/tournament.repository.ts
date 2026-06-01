import { type FilterQuery } from "mongoose";
import {
  Tournament,
  type ITournament,
  type TournamentRegistrationStatus,
  type TournamentStatus,
} from "../models/tournament.model";
import { TournamentRegistration } from "../models/tournamentRegistration.model";

export const TournamentRepository = {
  async findByClub(
    clubId: string,
    status?: TournamentStatus,
    registrationStatus?: TournamentRegistrationStatus
  ): Promise<ITournament[]> {
    const query: FilterQuery<ITournament> = { clubId };
    if (status) query.status = status;
    if (registrationStatus) query.registrationStatus = registrationStatus;
    return Tournament.find(query).sort({ startDate: 1 }).lean();
  },

  async findOpenForClub(clubId: string): Promise<ITournament[]> {
    return Tournament.find({
      clubId,
      registrationStatus: "OPEN",
      status: "ACTIVE",
      registrationCloseAt: { $gte: new Date() },
    })
      .sort({ startDate: 1 })
      .lean();
  },

  async findById(id: string): Promise<ITournament | null> {
    return Tournament.findById(id).lean();
  },

  async create(data: Partial<ITournament>): Promise<ITournament> {
    return Tournament.create(data);
  },

  async update(id: string, data: Partial<ITournament>): Promise<ITournament | null> {
    return Tournament.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  },

  async countRegistered(tournamentId: string): Promise<number> {
    return TournamentRegistration.countDocuments({
      tournamentId,
      status: { $in: ["REGISTERED", "PENDING"] },
    });
  },
};

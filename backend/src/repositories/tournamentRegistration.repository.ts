import { TournamentRegistration, type ITournamentRegistration } from "../models/tournamentRegistration.model";

export const TournamentRegistrationRepository = {
  async findByTournament(tournamentId: string): Promise<ITournamentRegistration[]> {
    return TournamentRegistration.find({ tournamentId }).sort({ registeredAt: 1 }).lean();
  },

  async findByGolfer(golferId: string): Promise<ITournamentRegistration[]> {
    return TournamentRegistration.find({ golferId }).sort({ registeredAt: -1 }).lean();
  },

  async findExisting(
    tournamentId: string,
    golferId: string
  ): Promise<ITournamentRegistration | null> {
    return TournamentRegistration.findOne({ tournamentId, golferId }).lean();
  },

  async findById(id: string): Promise<ITournamentRegistration | null> {
    return TournamentRegistration.findById(id).lean();
  },

  async create(data: Partial<ITournamentRegistration>): Promise<ITournamentRegistration> {
    return TournamentRegistration.create(data);
  },

  async update(
    id: string,
    data: Partial<ITournamentRegistration>
  ): Promise<ITournamentRegistration | null> {
    return TournamentRegistration.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
  },
};

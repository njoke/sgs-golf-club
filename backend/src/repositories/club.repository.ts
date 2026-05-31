import { Club, IClub } from "../models/club.model";

export const ClubRepository = {
  async findById(id: string): Promise<IClub | null> {
    return Club.findById(id).lean();
  },

  async findByIds(ids: string[]): Promise<IClub[]> {
    return Club.find({ _id: { $in: ids } }).lean();
  },

  async findByClubNumber(clubNumber: string): Promise<IClub | null> {
    return Club.findOne({ clubNumber }).lean();
  },

  async findAllActive(): Promise<IClub[]> {
    return Club.find({ status: "ACTIVE" }).lean();
  },

  async update(id: string, data: Partial<IClub>): Promise<IClub | null> {
    return Club.findByIdAndUpdate(
      id,
      { ...data, lastStatusUpdate: new Date() },
      { new: true, runValidators: true }
    ).lean();
  },

  async create(data: Partial<IClub>): Promise<IClub> {
    return Club.create(data);
  },
};

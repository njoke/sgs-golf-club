import { FilterQuery } from "mongoose";
import { Golfer, IGolfer } from "../models/golfer.model";

export interface GolferRosterFilter {
  clubId: string;
  searchText?: string;
  membershipStatus?: "ACTIVE" | "INACTIVE";
  membershipCode?: string;
  gender?: string;
  digitalProfileStatus?: string;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
}

export const GolferRepository = {
  async findByClub(
    filter: GolferRosterFilter
  ): Promise<{ golfers: IGolfer[]; total: number }> {
    const query: FilterQuery<IGolfer> = { clubId: filter.clubId };

    if (!filter.includeInactive && !filter.membershipStatus) {
      query.membershipStatus = "ACTIVE";
    }
    if (filter.membershipStatus) {
      query.membershipStatus = filter.membershipStatus;
    }
    if (filter.membershipCode) {
      query.membershipCode = filter.membershipCode;
    }
    if (filter.gender) {
      query.gender = filter.gender;
    }
    if (filter.digitalProfileStatus) {
      query.digitalProfileStatus = filter.digitalProfileStatus;
    }
    if (filter.searchText) {
      const regex = new RegExp(filter.searchText, "i");
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { ghinNumber: regex },
      ];
    }

    const page = filter.page ?? 1;
    const pageSize = Math.min(filter.pageSize ?? 25, 100);
    const skip = (page - 1) * pageSize;
    const sortField = filter.sortBy ?? "lastName";
    const sortDir = filter.sortDirection === "DESC" ? -1 : 1;

    const [golfers, total] = await Promise.all([
      Golfer.find(query)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Golfer.countDocuments(query),
    ]);

    return { golfers, total };
  },

  async findById(id: string): Promise<IGolfer | null> {
    return Golfer.findById(id).lean();
  },

  async findByEmail(clubId: string, email: string): Promise<IGolfer | null> {
    return Golfer.findOne({ clubId, email: email.toLowerCase() }).lean();
  },

  async findByGhin(clubId: string, ghinNumber: string): Promise<IGolfer | null> {
    return Golfer.findOne({ clubId, ghinNumber }).lean();
  },

  async findByGhinGlobal(ghinNumber: string): Promise<IGolfer | null> {
    return Golfer.findOne({ ghinNumber }).lean();
  },

  async create(data: Partial<IGolfer>): Promise<IGolfer> {
    return Golfer.create(data);
  },

  async update(id: string, data: Partial<IGolfer>): Promise<IGolfer | null> {
    return Golfer.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  },

  async searchGlobal(query: FilterQuery<IGolfer>): Promise<IGolfer[]> {
    return Golfer.find(query).limit(20).lean();
  },
};

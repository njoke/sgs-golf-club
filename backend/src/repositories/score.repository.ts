import { type FilterQuery, Types } from "mongoose";
import { Score, type IScore, type ScoreStatus, type ScoreType } from "../models/score.model";

export interface ScoreHistoryFilterInput {
  golferId: string;
  status?: ScoreStatus;
  dateFrom?: Date;
  dateTo?: Date;
  scoreType?: ScoreType;
  page?: number;
  pageSize?: number;
}

export const ScoreRepository = {
  async findByGolfer(
    filter: ScoreHistoryFilterInput
  ): Promise<{ scores: IScore[]; total: number }> {
    const query: FilterQuery<IScore> = {
      golferId: filter.golferId,
    };

    if (filter.status && filter.status !== "DELETED") {
      query.status = filter.status;
    } else {
      query.status = { $ne: "DELETED" };
    }

    if (filter.scoreType) {
      query.scoreType = filter.scoreType;
    }

    if (filter.dateFrom || filter.dateTo) {
      query.datePlayed = {};
      if (filter.dateFrom) {
        query.datePlayed.$gte = filter.dateFrom;
      }
      if (filter.dateTo) {
        query.datePlayed.$lte = filter.dateTo;
      }
    }

    const page = filter.page ?? 1;
    const pageSize = Math.min(filter.pageSize ?? 25, 100);
    const skip = (page - 1) * pageSize;

    const [scores, total] = await Promise.all([
      Score.find(query).sort({ datePlayed: -1 }).skip(skip).limit(pageSize).lean(),
      Score.countDocuments(query),
    ]);

    return { scores, total };
  },

  async getLastNDifferentials(golferId: string, limit = 20): Promise<number[]> {
    const scores = await Score.find({
      golferId,
      status: { $in: ["POSTED", "MODIFIED"] },
      differential: { $ne: null },
      isNineHole: false,
    })
      .sort({ datePlayed: -1 })
      .limit(limit)
      .select("differential")
      .lean();

    return scores.flatMap((score) =>
      typeof score.differential === "number" ? [score.differential] : []
    );
  },

  async getRecentScoresWithDifferentials(
    golferId: string
  ): Promise<Array<{ differential: number; datePlayed: Date }>> {
    const scores = await Score.find({
      golferId,
      status: { $in: ["POSTED", "MODIFIED"] },
      differential: { $ne: null },
      isNineHole: false,
    })
      .select("differential datePlayed")
      .lean();

    return scores.flatMap((score) =>
      typeof score.differential === "number"
        ? [{ differential: score.differential, datePlayed: score.datePlayed }]
        : []
    );
  },

  async findUnpairedNineHoleScores(golferId: string): Promise<IScore[]> {
    return Score.find({
      golferId,
      isNineHole: true,
      pairedWithScoreId: null,
      status: { $in: ["POSTED", "MODIFIED"] },
    })
      .sort({ datePlayed: 1 })
      .lean();
  },

  async findById(id: string): Promise<IScore | null> {
    return Score.findById(id).lean();
  },

  async create(data: Partial<IScore>): Promise<IScore> {
    return Score.create(data);
  },

  async update(id: string, data: Partial<IScore>): Promise<IScore | null> {
    return Score.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  },

  async bulkUpdate(records: Array<{ id: string; data: Partial<IScore> }>): Promise<void> {
    if (!records.length) {
      return;
    }

    await Score.bulkWrite(
      records.map((record) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(record.id) },
          update: { $set: record.data },
        },
      }))
    );
  },
};

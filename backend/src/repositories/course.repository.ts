import { Course, type ICourse } from "../models/course.model";

export const CourseRepository = {
  async findByClub(clubId: string): Promise<ICourse[]> {
    return Course.find({ clubId })
      .sort({ isPrimaryFacility: -1, facilityName: 1, courseName: 1 })
      .lean();
  },

  async findById(id: string): Promise<ICourse | null> {
    return Course.findById(id).lean();
  },

  async create(data: Partial<ICourse>): Promise<ICourse> {
    return Course.create(data);
  },

  async update(id: string, data: Partial<ICourse>): Promise<ICourse | null> {
    return Course.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  },

  async delete(id: string): Promise<void> {
    await Course.findByIdAndDelete(id);
  },

  async clearPrimaryFacility(clubId: string, excludeCourseId?: string): Promise<void> {
    const query = excludeCourseId
      ? { clubId, _id: { $ne: excludeCourseId } }
      : { clubId };
    await Course.updateMany(query, { isPrimaryFacility: false });
  },
};

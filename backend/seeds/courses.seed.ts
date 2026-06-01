import { Types } from "mongoose";
import { Course, type ICourse } from "../src/models/course.model";

const cedarIronsSeed = {
  facilityName: "Cedar Irons Golf Club",
  courseName: "Cedar Irons Golf Club",
  city: "Tacoma",
  state: "WA",
  isPrimaryFacility: true,
  defaultMaleTeeId: "white-m",
  defaultFemaleTeeId: "red-f",
  tees: [
    {
      teeId: "black-m",
      teeName: "Black",
      gender: "M" as const,
      par: 72,
      courseRating: 69.7,
      slopeRating: 126,
      bogeyRating: 93,
      frontNine: { rating: 35, slope: 119, par: 36 },
      backNine: { rating: 34.7, slope: 131, par: 36 },
      yardage: 6109,
      holeYardages: [320, 398, 373, 180, 486, 147, 309, 376, 511, 509, 294, 431, 163, 342, 358, 165, 263, 484],
      holePars: [4, 4, 4, 3, 5, 3, 4, 4, 5, 5, 4, 4, 3, 4, 4, 3, 4, 5],
      holeHandicaps: [15, 7, 1, 5, 13, 17, 11, 3, 9, 8, 12, 4, 14, 10, 2, 6, 18, 16],
    },
    {
      teeId: "white-m",
      teeName: "White",
      gender: "M" as const,
      par: 72,
      courseRating: 68.5,
      slopeRating: 121,
      frontNine: { rating: 34.4, slope: 116, par: 36 },
      backNine: { rating: 34.1, slope: 125, par: 36 },
    },
    {
      teeId: "red-m",
      teeName: "Red",
      gender: "M" as const,
      par: 72,
      courseRating: 66.3,
      slopeRating: 115,
      frontNine: { rating: 33.2, slope: 116, par: 36 },
      backNine: { rating: 33.1, slope: 113, par: 36 },
    },
    {
      teeId: "yellow-m",
      teeName: "Yellow",
      gender: "M" as const,
      par: 72,
      courseRating: 62.1,
      slopeRating: 104,
      frontNine: { rating: 31, slope: 102, par: 36 },
      backNine: { rating: 31.1, slope: 107, par: 36 },
    },
    {
      teeId: "black-f",
      teeName: "Black",
      gender: "F" as const,
      par: 73,
      courseRating: 75.3,
      slopeRating: 136,
      frontNine: { rating: 37.7, slope: 131, par: 37 },
      backNine: { rating: 37.6, slope: 141, par: 36 },
    },
    {
      teeId: "white-f",
      teeName: "White",
      gender: "F" as const,
      par: 73,
      courseRating: 73.6,
      slopeRating: 131,
      frontNine: { rating: 36.9, slope: 128, par: 37 },
      backNine: { rating: 36.7, slope: 134, par: 36 },
    },
    {
      teeId: "red-f",
      teeName: "Red",
      gender: "F" as const,
      par: 73,
      courseRating: 71.1,
      slopeRating: 124,
      frontNine: { rating: 35.8, slope: 120, par: 37 },
      backNine: { rating: 35.3, slope: 127, par: 36 },
    },
    {
      teeId: "yellow-f",
      teeName: "Yellow",
      gender: "F" as const,
      par: 73,
      courseRating: 66.6,
      slopeRating: 115,
      frontNine: { rating: 33.4, slope: 112, par: 37 },
      backNine: { rating: 33.2, slope: 117, par: 36 },
    },
  ],
};

export async function seedCourses(clubId: Types.ObjectId): Promise<ICourse[]> {
  const existing = await Course.findOne({
    clubId,
    facilityName: cedarIronsSeed.facilityName,
    courseName: cedarIronsSeed.courseName,
  });

  if (existing) {
    return [existing as ICourse];
  }

  const course = await Course.create({
    ...cedarIronsSeed,
    clubId,
  });

  console.log(`✓ Course seeded: ${course.courseName} (${course._id})`);
  return [course as ICourse];
}

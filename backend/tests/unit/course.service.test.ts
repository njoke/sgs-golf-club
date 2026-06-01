import { Types } from "mongoose";
import { ErrorCodes } from "../../src/errors/errorCodes";
import { type GraphQLContext } from "../../src/graphql/context";
import { CourseRepository } from "../../src/repositories/course.repository";
import { auditService } from "../../src/services/audit.service";
import {
  courseService,
  type AddCourseInput,
} from "../../src/services/course.service";

const clubId = new Types.ObjectId().toString();
const courseId = new Types.ObjectId().toString();

function makeContext(): GraphQLContext {
  return {
    user: {
      userId: new Types.ObjectId().toString(),
      email: "admin@sgs.golf",
      role: "CLUB_ADMIN",
      clubIds: [clubId],
    },
  };
}

function makeInput(overrides: Partial<AddCourseInput> = {}): AddCourseInput {
  return {
    clubId,
    facilityName: "Cedar Irons Golf Club",
    courseName: "Cedar Irons Golf Club",
    city: "Tacoma",
    state: "WA",
    isPrimaryFacility: false,
    defaultMaleTeeId: "white-m",
    defaultFemaleTeeId: "red-f",
    tees: [
      {
        teeId: "white-m",
        teeName: "White",
        gender: "M",
        par: 72,
        courseRating: 68.5,
        slopeRating: 121,
      },
      {
        teeId: "red-f",
        teeName: "Red",
        gender: "F",
        par: 73,
        courseRating: 71.1,
        slopeRating: 124,
      },
    ],
    ...overrides,
  };
}

function makeCourse() {
  const id = new Types.ObjectId();
  return {
    _id: id,
    clubId: new Types.ObjectId(clubId),
    facilityName: "Existing Facility",
    courseName: "Existing Course",
    city: "Tacoma",
    state: "WA",
    isPrimaryFacility: false,
    tees: [
      {
        teeId: "white-m",
        teeName: "White",
        gender: "M" as const,
        par: 72,
        courseRating: 68.5,
        slopeRating: 121,
      },
      {
        teeId: "red-f",
        teeName: "Red",
        gender: "F" as const,
        par: 73,
        courseRating: 71.1,
        slopeRating: 124,
      },
    ],
    defaultMaleTeeId: "white-m",
    defaultFemaleTeeId: "red-f",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("courseService", () => {
  beforeEach(() => {
    jest.spyOn(auditService, "log").mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("requires at least one tee when adding a home course", async () => {
    await expect(
      courseService.addHomeCourse(makeInput({ tees: [] }), makeContext())
    ).rejects.toMatchObject({
      code: ErrorCodes.VALIDATION_ERROR,
      message: "At least one tee is required.",
    });
  });

  it("validates default tee IDs belong to provided tee set", async () => {
    await expect(
      courseService.addHomeCourse(
        makeInput({ defaultMaleTeeId: "black-m" }),
        makeContext()
      )
    ).rejects.toMatchObject({
      code: ErrorCodes.VALIDATION_ERROR,
      message: "Default male tee ID not found in provided tees.",
    });
  });

  it("clears other primary facilities before creating a new primary course", async () => {
    jest.spyOn(CourseRepository, "clearPrimaryFacility").mockResolvedValue();
    const createSpy = jest.spyOn(CourseRepository, "create").mockResolvedValue(makeCourse());

    await courseService.addHomeCourse(
      makeInput({ isPrimaryFacility: true }),
      makeContext()
    );

    expect(CourseRepository.clearPrimaryFacility).toHaveBeenCalledWith(clubId);
    expect(createSpy).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "COURSE_ADDED",
        entityType: "COURSE",
      })
    );
  });

  it("clears other primary facilities before promoting a course", async () => {
    const existingCourse = makeCourse();
    jest.spyOn(CourseRepository, "findById").mockResolvedValue(existingCourse);
    jest.spyOn(CourseRepository, "clearPrimaryFacility").mockResolvedValue();
    jest
      .spyOn(CourseRepository, "update")
      .mockResolvedValue({ ...existingCourse, isPrimaryFacility: true });

    const result = await courseService.setPrimaryFacility(courseId, makeContext());

    expect(CourseRepository.clearPrimaryFacility).toHaveBeenCalledWith(clubId, courseId);
    expect(result.isPrimaryFacility).toBe(true);
  });

  it("rejects default tee updates when tee does not exist on course", async () => {
    jest.spyOn(CourseRepository, "findById").mockResolvedValue(makeCourse());

    await expect(
      courseService.setDefaultTees(courseId, "black-m", undefined, makeContext())
    ).rejects.toMatchObject({
      code: ErrorCodes.NOT_FOUND,
      message: "Male tee 'black-m' not found on this course.",
    });
  });

  it("prevents moving a course to another club during update", async () => {
    jest.spyOn(CourseRepository, "findById").mockResolvedValue(makeCourse());

    await expect(
      courseService.updateHomeCourse(
        courseId,
        makeInput({ clubId: new Types.ObjectId().toString() }),
        makeContext()
      )
    ).rejects.toMatchObject({
      code: ErrorCodes.VALIDATION_ERROR,
      message: "Course club ID cannot be changed.",
    });
  });

  it("deletes a course and returns success payload", async () => {
    jest.spyOn(CourseRepository, "findById").mockResolvedValue(makeCourse());
    jest.spyOn(CourseRepository, "delete").mockResolvedValue();

    await expect(
      courseService.removeHomeCourse(courseId, makeContext())
    ).resolves.toEqual({
      success: true,
      message: "Course removed successfully.",
    });
  });
});

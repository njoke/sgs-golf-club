import { Types } from "mongoose";
import { requireAuth, requireClubAccess, requireRole } from "../auth/permissions";
import { AppError } from "../errors/AppError";
import { ErrorCodes } from "../errors/errorCodes";
import type { GraphQLContext } from "../graphql/context";
import type { ICourse, INineHoleRating, ITee, TeeGender } from "../models/course.model";
import { CourseRepository } from "../repositories/course.repository";
import { auditService } from "./audit.service";
import { buildAuditActorContext, diffAuditFields, sanitizeAuditRecord } from "./audit.utils";

export interface NineHoleRatingInput extends INineHoleRating {}

export interface TeeInput {
  teeId: string;
  teeName: string;
  gender: TeeGender;
  par: number;
  courseRating: number;
  bogeyRating?: number;
  slopeRating: number;
  frontNine?: NineHoleRatingInput;
  backNine?: NineHoleRatingInput;
  yardage?: number;
  holeYardages?: number[];
  holePars?: number[];
  holeHandicaps?: number[];
}

export interface AddCourseInput {
  clubId: string;
  facilityName: string;
  courseName: string;
  city: string;
  state: string;
  isPrimaryFacility?: boolean;
  tees: TeeInput[];
  defaultMaleTeeId?: string;
  defaultFemaleTeeId?: string;
}

function validateLength(name: string, values: number[] | undefined): void {
  if (values && values.length !== 18) {
    throw new AppError(
      `${name} must contain exactly 18 values when provided.`,
      ErrorCodes.VALIDATION_ERROR,
      400
    );
  }
}

function validateTeeInput(tee: TeeInput): void {
  if (!["M", "F"].includes(tee.gender)) {
    throw new AppError(
      "Tee gender must be M or F.",
      ErrorCodes.VALIDATION_ERROR,
      400
    );
  }

  validateLength("holeYardages", tee.holeYardages);
  validateLength("holePars", tee.holePars);
  validateLength("holeHandicaps", tee.holeHandicaps);
}

function validateCourseInput(input: AddCourseInput): void {
  if (!input.tees.length) {
    throw new AppError(
      "At least one tee is required.",
      ErrorCodes.VALIDATION_ERROR,
      400
    );
  }

  input.tees.forEach(validateTeeInput);

  const teeIds = input.tees.map((tee) => tee.teeId);
  if (new Set(teeIds).size !== teeIds.length) {
    throw new AppError(
      "Tee IDs must be unique within a course.",
      ErrorCodes.VALIDATION_ERROR,
      400
    );
  }

  if (input.defaultMaleTeeId && !teeIds.includes(input.defaultMaleTeeId)) {
    throw new AppError(
      "Default male tee ID not found in provided tees.",
      ErrorCodes.VALIDATION_ERROR,
      400
    );
  }

  if (input.defaultFemaleTeeId && !teeIds.includes(input.defaultFemaleTeeId)) {
    throw new AppError(
      "Default female tee ID not found in provided tees.",
      ErrorCodes.VALIDATION_ERROR,
      400
    );
  }
}

function mapCourseCreateInput(input: AddCourseInput): Partial<ICourse> {
  return {
    ...input,
    clubId: new Types.ObjectId(input.clubId),
    tees: input.tees as ITee[],
    isPrimaryFacility: input.isPrimaryFacility ?? false,
  };
}

function getCourseAuditSnapshot(course: ICourse) {
  return {
    facilityName: course.facilityName,
    courseName: course.courseName,
    city: course.city,
    state: course.state,
    isPrimaryFacility: course.isPrimaryFacility,
    defaultMaleTeeId: course.defaultMaleTeeId,
    defaultFemaleTeeId: course.defaultFemaleTeeId,
    teeCount: course.tees.length,
  };
}

export const courseService = {
  async getCoursesByClub(clubId: string): Promise<ICourse[]> {
    return CourseRepository.findByClub(clubId);
  },

  async getById(id: string): Promise<ICourse | null> {
    return CourseRepository.findById(id);
  },

  async addHomeCourse(input: AddCourseInput, context: GraphQLContext): Promise<ICourse> {
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN"]);
    requireClubAccess(context, input.clubId);
    validateCourseInput(input);

    if (input.isPrimaryFacility) {
      await CourseRepository.clearPrimaryFacility(input.clubId);
    }

    const course = await CourseRepository.create(mapCourseCreateInput(input));
    const auditActor = buildAuditActorContext(context, input.clubId);

    await auditService.log({
      ...auditActor,
      entityType: "COURSE",
      entityId: course._id.toString(),
      action: "COURSE_ADDED",
      summary: `Course ${course.courseName} was added.`,
      before: null,
      after: sanitizeAuditRecord(getCourseAuditSnapshot(course)),
    });

    return course;
  },

  async updateHomeCourse(
    id: string,
    input: AddCourseInput,
    context: GraphQLContext
  ): Promise<ICourse> {
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN"]);

    const existing = await CourseRepository.findById(id);
    if (!existing) {
      throw new AppError("Course not found.", ErrorCodes.NOT_FOUND, 404);
    }

    const existingClubId = existing.clubId.toString();
    requireClubAccess(context, existingClubId);

    if (input.clubId !== existingClubId) {
      throw new AppError(
        "Course club ID cannot be changed.",
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }

    validateCourseInput(input);

    if (input.isPrimaryFacility) {
      await CourseRepository.clearPrimaryFacility(existingClubId, id);
    }

    const updated = await CourseRepository.update(id, {
      ...mapCourseCreateInput(input),
      clubId: existing.clubId,
    });

    if (!updated) {
      throw new AppError("Course not found.", ErrorCodes.NOT_FOUND, 404);
    }

    const auditActor = buildAuditActorContext(context, existingClubId);
    const { before: auditBefore, after: auditAfter } = diffAuditFields(
      getCourseAuditSnapshot(existing),
      getCourseAuditSnapshot(updated),
      [
        "facilityName",
        "courseName",
        "city",
        "state",
        "isPrimaryFacility",
        "defaultMaleTeeId",
        "defaultFemaleTeeId",
        "teeCount",
      ]
    );

    await auditService.log({
      ...auditActor,
      entityType: "COURSE",
      entityId: id,
      action: "COURSE_UPDATED",
      summary: `Course ${updated.courseName} was updated.`,
      before: auditBefore,
      after: auditAfter,
    });

    return updated;
  },

  async removeHomeCourse(
    id: string,
    context: GraphQLContext
  ): Promise<{ success: boolean; message: string }> {
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN"]);

    const existing = await CourseRepository.findById(id);
    if (!existing) {
      throw new AppError("Course not found.", ErrorCodes.NOT_FOUND, 404);
    }

    requireClubAccess(context, existing.clubId.toString());
    await CourseRepository.delete(id);
    const auditActor = buildAuditActorContext(context, existing.clubId.toString());

    await auditService.log({
      ...auditActor,
      entityType: "COURSE",
      entityId: id,
      action: "COURSE_REMOVED",
      summary: `Course ${existing.courseName} was removed.`,
      before: sanitizeAuditRecord(getCourseAuditSnapshot(existing)),
      after: null,
    });

    return { success: true, message: "Course removed successfully." };
  },

  async setPrimaryFacility(courseId: string, context: GraphQLContext): Promise<ICourse> {
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN"]);

    const course = await CourseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found.", ErrorCodes.NOT_FOUND, 404);
    }

    const clubId = course.clubId.toString();
    requireClubAccess(context, clubId);

    await CourseRepository.clearPrimaryFacility(clubId, courseId);

    const updated = await CourseRepository.update(courseId, { isPrimaryFacility: true });
    if (!updated) {
      throw new AppError("Course not found.", ErrorCodes.NOT_FOUND, 404);
    }

    const auditActor = buildAuditActorContext(context, clubId);
    await auditService.log({
      ...auditActor,
      entityType: "COURSE",
      entityId: courseId,
      action: "COURSE_UPDATED",
      summary: `Primary facility set to ${updated.courseName}.`,
      before: sanitizeAuditRecord({ isPrimaryFacility: course.isPrimaryFacility }),
      after: sanitizeAuditRecord({ isPrimaryFacility: updated.isPrimaryFacility }),
    });

    return updated;
  },

  async setDefaultTees(
    courseId: string,
    maleTeeId: string | undefined,
    femaleTeeId: string | undefined,
    context: GraphQLContext
  ): Promise<ICourse> {
    requireAuth(context);
    requireRole(context, ["SUPER_ADMIN", "CLUB_ADMIN"]);

    const course = await CourseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found.", ErrorCodes.NOT_FOUND, 404);
    }

    requireClubAccess(context, course.clubId.toString());

    const teeIds = course.tees.map((tee) => tee.teeId);
    if (maleTeeId && !teeIds.includes(maleTeeId)) {
      throw new AppError(
        `Male tee '${maleTeeId}' not found on this course.`,
        ErrorCodes.NOT_FOUND,
        404
      );
    }

    if (femaleTeeId && !teeIds.includes(femaleTeeId)) {
      throw new AppError(
        `Female tee '${femaleTeeId}' not found on this course.`,
        ErrorCodes.NOT_FOUND,
        404
      );
    }

    const updated = await CourseRepository.update(courseId, {
      defaultMaleTeeId: maleTeeId,
      defaultFemaleTeeId: femaleTeeId,
    });

    if (!updated) {
      throw new AppError("Course not found.", ErrorCodes.NOT_FOUND, 404);
    }

    const auditActor = buildAuditActorContext(context, course.clubId.toString());
    await auditService.log({
      ...auditActor,
      entityType: "COURSE",
      entityId: courseId,
      action: "COURSE_UPDATED",
      summary: `Default tees updated for ${updated.courseName}.`,
      before: sanitizeAuditRecord({
        defaultMaleTeeId: course.defaultMaleTeeId,
        defaultFemaleTeeId: course.defaultFemaleTeeId,
      }),
      after: sanitizeAuditRecord({
        defaultMaleTeeId: updated.defaultMaleTeeId,
        defaultFemaleTeeId: updated.defaultFemaleTeeId,
      }),
    });

    return updated;
  },
};

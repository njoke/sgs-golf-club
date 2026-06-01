import { AppError } from "../../errors/AppError";
import { ErrorCodes } from "../../errors/errorCodes";
import type { ICourse } from "../../models/course.model";
import {
  courseService,
  type AddCourseInput,
} from "../../services/course.service";
import { requireAuth, requireClubAccess } from "../../auth/permissions";
import type { GraphQLContext } from "../context";
import { toPlainObject } from "./toPlainObject";

function mapCourse(course: ICourse) {
  const plainCourse = toPlainObject(course);
  return {
    ...plainCourse,
    id: plainCourse._id.toString(),
    clubId: plainCourse.clubId.toString(),
  };
}

export const courseResolvers = {
  Query: {
    clubCourses: async (
      _: unknown,
      { clubId }: { clubId: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      requireClubAccess(ctx, clubId);
      const courses = await courseService.getCoursesByClub(clubId);
      return courses.map(mapCourse);
    },

    course: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const course = await courseService.getById(id);
      if (!course) {
        throw new AppError("Course not found.", ErrorCodes.NOT_FOUND, 404);
      }
      requireClubAccess(ctx, course.clubId.toString());
      return mapCourse(course);
    },
  },

  Mutation: {
    addHomeCourse: async (
      _: unknown,
      { input }: { input: AddCourseInput },
      ctx: GraphQLContext
    ) => {
      const course = await courseService.addHomeCourse(input, ctx);
      return mapCourse(course);
    },

    updateHomeCourse: async (
      _: unknown,
      { id, input }: { id: string; input: AddCourseInput },
      ctx: GraphQLContext
    ) => {
      const course = await courseService.updateHomeCourse(id, input, ctx);
      return mapCourse(course);
    },

    removeHomeCourse: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      return courseService.removeHomeCourse(id, ctx);
    },

    setPrimaryFacility: async (
      _: unknown,
      { courseId }: { courseId: string },
      ctx: GraphQLContext
    ) => {
      const course = await courseService.setPrimaryFacility(courseId, ctx);
      return mapCourse(course);
    },

    setDefaultTees: async (
      _: unknown,
      {
        courseId,
        maleTeeId,
        femaleTeeId,
      }: { courseId: string; maleTeeId?: string; femaleTeeId?: string },
      ctx: GraphQLContext
    ) => {
      const course = await courseService.setDefaultTees(
        courseId,
        maleTeeId,
        femaleTeeId,
        ctx
      );
      return mapCourse(course);
    },
  },
};

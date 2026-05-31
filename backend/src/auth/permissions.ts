import { AppError } from "../errors/AppError";
import { ErrorCodes } from "../errors/errorCodes";
import { GraphQLContext } from "../graphql/context";
import type { UserRole } from "../models/user.model";

export function requireAuth(
  context: GraphQLContext
): asserts context is GraphQLContext & { user: NonNullable<GraphQLContext["user"]> } {
  if (!context.user) {
    throw new AppError("Authentication required.", ErrorCodes.UNAUTHENTICATED, 401);
  }
}

export function requireRole(context: GraphQLContext, roles: UserRole[]): void {
  requireAuth(context);
  if (!roles.includes(context.user!.role)) {
    throw new AppError(
      "You do not have permission to perform this action.",
      ErrorCodes.UNAUTHORIZED,
      403
    );
  }
}

export function requireClubAccess(context: GraphQLContext, clubId: string): void {
  requireAuth(context);
  if (context.user!.role === "SUPER_ADMIN") return;
  if (!context.user!.clubIds.includes(clubId)) {
    throw new AppError("Access to this club is not authorized.", ErrorCodes.UNAUTHORIZED, 403);
  }
}

export function requireOwnGolferOrAdmin(context: GraphQLContext, golferId: string): void {
  requireAuth(context);
  const { role, golferId: contextGolferId } = context.user!;
  const adminRoles: UserRole[] = ["SUPER_ADMIN", "CLUB_ADMIN", "HANDICAP_CHAIR"];
  if (adminRoles.includes(role)) return;
  if (role === "MEMBER" && contextGolferId === golferId) return;
  throw new AppError("Access denied.", ErrorCodes.UNAUTHORIZED, 403);
}

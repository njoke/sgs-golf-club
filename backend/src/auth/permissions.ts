import { AppError } from "../errors/AppError";
import { ErrorCodes } from "../errors/errorCodes";
import { GraphQLContext } from "../graphql/context";

export function requireAuth(context: GraphQLContext): asserts context is GraphQLContext & { user: NonNullable<GraphQLContext["user"]> } {
  if (!context.user) {
    throw new AppError("Authentication required", ErrorCodes.UNAUTHENTICATED, 401);
  }
}

export function requireRole(context: GraphQLContext, ...roles: string[]): void {
  requireAuth(context);
  if (!roles.includes(context.user!.role)) {
    throw new AppError("Insufficient permissions", ErrorCodes.UNAUTHORIZED, 403);
  }
}

export function requireClubAccess(context: GraphQLContext, clubId: string): void {
  requireAuth(context);
  if (context.user!.role === "SUPER_ADMIN") return;
  if (context.user!.clubId !== clubId) {
    throw new AppError("Access denied to this club", ErrorCodes.UNAUTHORIZED, 403);
  }
}

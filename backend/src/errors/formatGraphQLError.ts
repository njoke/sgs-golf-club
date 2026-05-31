import { GraphQLFormattedError } from "graphql";
import { AppError } from "./AppError";
import { ErrorCodes } from "./errorCodes";

export function formatGraphQLError(
  formattedError: GraphQLFormattedError,
  error: unknown
): GraphQLFormattedError {
  if (error instanceof AppError) {
    return {
      message: error.message,
      extensions: {
        code: error.code,
        statusCode: error.statusCode,
      },
    };
  }

  // Hide internal errors in production
  if (process.env.NODE_ENV === "production") {
    return {
      message: "Internal server error",
      extensions: { code: ErrorCodes.INTERNAL_ERROR },
    };
  }

  return formattedError;
}

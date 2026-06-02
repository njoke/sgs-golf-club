import { GraphQLError, GraphQLFormattedError } from "graphql";
import { AppError } from "./AppError";
import { ErrorCodes } from "./errorCodes";

export function formatGraphQLError(
  formattedError: GraphQLFormattedError,
  error: unknown
): GraphQLFormattedError {
  const originalError =
    error instanceof GraphQLError && error.originalError ? error.originalError : error;

  if (originalError instanceof AppError) {
    return {
      message: originalError.message,
      extensions: {
        code: originalError.code,
        statusCode: originalError.statusCode,
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

import { authService } from "../../services/auth.service";
import type { GraphQLContext } from "../context";

interface LoginInput {
  email: string;
  password: string;
}

export const authResolvers = {
  Mutation: {
    login: async (_: unknown, { input }: { input: LoginInput }) => {
      const { token, user } = await authService.login(input.email, input.password);
      return {
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          clubIds: user.clubIds.map(String),
          golferId: user.golferId?.toString() ?? null,
          status: user.status,
        },
      };
    },

    logout: async (_: unknown, __: unknown, _context: GraphQLContext) => {
      return { success: true, message: "Logged out successfully." };
    },
  },
};

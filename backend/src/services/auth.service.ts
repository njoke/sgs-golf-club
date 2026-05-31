import { IUser } from "../models/user.model";
import { UserRepository } from "../repositories/user.repository";
import { comparePassword } from "../auth/password";
import { signToken } from "../auth/jwt";
import { AppError } from "../errors/AppError";
import { ErrorCodes } from "../errors/errorCodes";

export interface AuthPayload {
  token: string;
  user: IUser;
}

export class AuthService {
  async login(email: string, password: string): Promise<AuthPayload> {
    const user = await UserRepository.findByEmail(email.toLowerCase());
    if (!user) {
      throw new AppError("Invalid email or password.", ErrorCodes.INVALID_CREDENTIALS, 401);
    }

    if (user.status !== "ACTIVE") {
      throw new AppError("Account is inactive or locked.", ErrorCodes.UNAUTHORIZED, 403);
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new AppError("Invalid email or password.", ErrorCodes.INVALID_CREDENTIALS, 401);
    }

    await UserRepository.updateLastLogin(user._id);

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      clubIds: user.clubIds.map(String),
      golferId: user.golferId?.toString(),
    });

    return { token, user };
  }
}

export const authService = new AuthService();

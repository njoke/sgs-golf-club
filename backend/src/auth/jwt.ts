import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { UserRole } from "../models/user.model";

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  clubIds: string[];
  golferId?: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: "sgs-golf-club",
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.substring(7);
}

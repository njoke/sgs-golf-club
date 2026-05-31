// Shared TypeScript types — expanded as feature specs are implemented

export type UserRole = "SUPER_ADMIN" | "CLUB_ADMIN" | "MEMBER";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  clubId?: string;
}

export interface AuthPayload {
  token: string;
  user: User;
}

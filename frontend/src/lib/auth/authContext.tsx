"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthPayload, AuthUser } from "@/types";
import {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  getClientCookie,
  setAuthCookie,
  USER_STORAGE_KEY,
} from "./session";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAdmin: () => boolean;
  isMember: () => boolean;
  primaryClubId: string | null;
  authenticate: (email: string, password: string) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        email
        firstName
        lastName
        role
        clubIds
        golferId
        status
      }
    }
  }
`;

const LOGOUT_MUTATION = `
  mutation Logout {
    logout {
      success
    }
  }
`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    const storedToken = getClientCookie(AUTH_COOKIE_NAME);

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    setToken(storedToken);
    setIsLoading(false);
  }, []);

  function login(newToken: string, newUser: AuthUser) {
    setAuthCookie(newToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  async function authenticate(email: string, password: string): Promise<AuthUser> {
    const response = await fetch(
      process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/graphql",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: LOGIN_MUTATION,
          variables: { input: { email, password } },
        }),
      }
    );

    const payload = (await response.json()) as {
      data?: { login?: AuthPayload };
      errors?: Array<{ message?: string }>;
    };

    const loginPayload = payload.data?.login;
    if (!loginPayload) {
      throw new Error(payload.errors?.[0]?.message ?? "Invalid email or password.");
    }

    login(loginPayload.token, loginPayload.user);
    return loginPayload.user;
  }

  async function logout() {
    try {
      const currentToken = getClientCookie(AUTH_COOKIE_NAME);
      if (currentToken) {
        await fetch(process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/graphql", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({ query: LOGOUT_MUTATION }),
        });
      }
    } catch {
      // Swallow logout transport issues and clear local session anyway.
    }

    clearAuthCookie();
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isLoading,
        isAdmin: () => !!user && user.role !== "MEMBER",
        isMember: () => user?.role === "MEMBER",
        primaryClubId: user?.clubIds?.[0] ?? null,
        authenticate,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}

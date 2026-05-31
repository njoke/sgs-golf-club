import { IncomingMessage } from "http";
import { verifyToken, JwtPayload } from "../auth/jwt";

export interface GraphQLContext {
  user: JwtPayload | null;
}

export async function buildContext({ req }: { req: IncomingMessage }): Promise<GraphQLContext> {
  const authHeader = (req as any).headers?.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { user: null };
  }

  try {
    const user = verifyToken(token);
    return { user };
  } catch {
    return { user: null };
  }
}

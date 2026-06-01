import { IncomingMessage } from "http";
import { verifyToken, JwtPayload } from "../auth/jwt";

export interface GraphQLRequestInfo {
  ipAddress?: string;
  userAgent?: string;
}

export interface GraphQLContext {
  user: JwtPayload | null;
  requestInfo?: GraphQLRequestInfo;
}

export async function buildContext({ req }: { req: IncomingMessage }): Promise<GraphQLContext> {
  const authHeader = (req as any).headers?.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const requestInfo: GraphQLRequestInfo = {
    ipAddress: (req.socket as any)?.remoteAddress,
    userAgent: typeof (req as any).headers?.["user-agent"] === "string"
      ? (req as any).headers["user-agent"]
      : undefined,
  };

  if (!token) {
    return { user: null, requestInfo };
  }

  try {
    const user = verifyToken(token);
    return { user, requestInfo };
  } catch {
    return { user: null, requestInfo };
  }
}

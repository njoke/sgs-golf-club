import type { GraphQLContext } from "../graphql/context";

export interface AuditActorContext {
  clubId?: string;
  actorUserId: string;
  actorEmail: string;
  actorRole: string;
  ipAddress?: string;
  userAgent?: string;
}

type AuditRecord = Record<string, unknown>;

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function buildAuditActorContext(
  context: GraphQLContext,
  clubId?: string
): AuditActorContext {
  if (!context.user) {
    throw new Error("Authenticated user required for audit context.");
  }

  return {
    clubId,
    actorUserId: context.user.userId,
    actorEmail: context.user.email,
    actorRole: context.user.role,
    ipAddress: context.requestInfo?.ipAddress,
    userAgent: context.requestInfo?.userAgent,
  };
}

export function sanitizeAuditRecord(
  record: AuditRecord | null | undefined
): AuditRecord | null {
  if (!record) {
    return null;
  }

  const filteredEntries = Object.entries(record).filter(([, value]) => value !== undefined);
  if (!filteredEntries.length) {
    return null;
  }

  return Object.fromEntries(filteredEntries);
}

export function diffAuditFields(
  beforeSource: AuditRecord,
  afterSource: AuditRecord,
  keys: string[]
): { before: AuditRecord | null; after: AuditRecord | null } {
  const before: AuditRecord = {};
  const after: AuditRecord = {};

  for (const key of keys) {
    if (!valuesEqual(beforeSource[key], afterSource[key])) {
      before[key] = beforeSource[key];
      after[key] = afterSource[key];
    }
  }

  return {
    before: sanitizeAuditRecord(before),
    after: sanitizeAuditRecord(after),
  };
}

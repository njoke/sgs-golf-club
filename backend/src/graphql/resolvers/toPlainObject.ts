export function toPlainObject<T>(value: T): T {
  if (
    value &&
    typeof value === "object" &&
    "toObject" in (value as Record<string, unknown>) &&
    typeof (value as { toObject?: unknown }).toObject === "function"
  ) {
    return (value as unknown as { toObject: () => T }).toObject();
  }

  return value;
}

const STATUS_CLASS_MAP: Record<string, string> = {
  ACTIVE: "bg-status-active/12 text-status-active",
  INACTIVE: "bg-status-inactive/18 text-ui-muted",
  POSTED: "bg-status-active/12 text-status-active",
  REGISTERED: "bg-status-open/12 text-status-open",
  OPEN: "bg-status-open/12 text-status-open",
  PENDING: "bg-brand-sand/70 text-brand-clay",
  WAITLISTED: "bg-status-waitlisted/14 text-status-waitlisted",
  WITHDRAWN: "bg-status-withdrawn/12 text-status-withdrawn",
  MODIFIED: "bg-brand-gold/18 text-brand-clay",
  CANCELLED: "bg-status-withdrawn/12 text-status-withdrawn",
  CLOSED: "bg-status-withdrawn/12 text-status-withdrawn",
  COMPLETED: "bg-ui-line/65 text-ui-ink",
  UNPAID: "bg-brand-sand/70 text-brand-clay",
  PAID: "bg-status-active/12 text-status-active",
  NOT_REQUIRED: "bg-ui-line/65 text-ui-muted",
};

export function StatusBadge({ status }: { status: string }) {
  const className = STATUS_CLASS_MAP[status] ?? "bg-ui-line/60 text-ui-muted";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

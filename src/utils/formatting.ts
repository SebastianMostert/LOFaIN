const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Unknown";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return dateFormatter.format(date);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "Not scheduled";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return dateTimeFormatter.format(date);
}

export function formatDeadline(value: Date | string | null | undefined) {
  if (!value) return "No deadline set";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "No deadline set";

  const diffMs = date.getTime() - Date.now();
  const absMinutes = Math.round(Math.abs(diffMs) / 60000);

  if (absMinutes < 1) {
    return diffMs >= 0 ? "Closes now" : "Closed just now";
  }

  const units = [
    { label: "day", minutes: 60 * 24 },
    { label: "hour", minutes: 60 },
    { label: "minute", minutes: 1 },
  ];

  for (const unit of units) {
    if (absMinutes >= unit.minutes || unit.label === "minute") {
      const valueCount = Math.round(absMinutes / unit.minutes);
      const suffix = valueCount === 1 ? unit.label : `${unit.label}s`;
      return diffMs >= 0
        ? `Closes in ${valueCount} ${suffix}`
        : `Closed ${valueCount} ${suffix} ago`;
    }
  }

  return "No deadline set";
}

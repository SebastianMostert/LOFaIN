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

function getUtcCalendarParts(date: Date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
  };
}

function getDaysInUtcMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function diffUtcCalendar(from: Date, to: Date) {
  const fromParts = getUtcCalendarParts(from);
  const toParts = getUtcCalendarParts(to);

  let years = toParts.year - fromParts.year;
  let months = toParts.month - fromParts.month;
  let days = toParts.day - fromParts.day;

  if (days < 0) {
    months -= 1;
    const borrowMonth = (toParts.month + 11) % 12;
    const borrowYear = borrowMonth === 11 ? toParts.year - 1 : toParts.year;
    days += getDaysInUtcMonth(borrowYear, borrowMonth);
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
}

function formatClosedElapsed(closedAt: Date, reference: Date) {
  const { years, months, days } = diffUtcCalendar(closedAt, reference);
  const parts = [
    years > 0 ? `${years} year${years === 1 ? "" : "s"}` : null,
    months > 0 ? `${months} month${months === 1 ? "" : "s"}` : null,
    days > 0 ? `${days} day${days === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  if (parts.length === 0) {
    return "Closed today";
  }

  return `Closed ${parts.join(" ")} ago`;
}

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

export function formatDeadline(
  value: Date | string | null | undefined,
  referenceValue?: Date | string,
) {
  return formatDeadlineFromReference(value, referenceValue);
}

export function formatDeadlineFromReference(
  value: Date | string | null | undefined,
  referenceValue: Date | string = new Date(),
) {
  if (!value) return "No deadline set";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "No deadline set";
  const reference = referenceValue instanceof Date ? referenceValue : new Date(referenceValue);
  if (Number.isNaN(reference.getTime())) return "No deadline set";

  const diffMs = date.getTime() - reference.getTime();
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
        : formatClosedElapsed(date, reference);
    }
  }

  return "No deadline set";
}

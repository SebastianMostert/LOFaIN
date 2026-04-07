const longMonthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const shortMonthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function formatCalendarEraYear(year: number) {
  return year <= 0 ? `${1 - year} BCE` : `${year} CE`;
}

export function formatCalendarYear(date: Date) {
  return formatCalendarEraYear(date.getUTCFullYear());
}

export function formatCalendarMonthYear(date: Date, month: "long" | "short" = "long") {
  const monthName = month === "short" ? shortMonthNames[date.getUTCMonth()] : longMonthNames[date.getUTCMonth()];
  return `${monthName} ${formatCalendarYear(date)}`;
}

export function formatCalendarDate(
  date: Date,
  options: {
    month?: "long" | "short";
    weekday?: boolean;
  } = {},
) {
  const parts = [];

  if (options.weekday) {
    parts.push(weekdayNames[date.getUTCDay()]);
  }

  const month = options.month ?? "long";
  const monthName = month === "short" ? shortMonthNames[date.getUTCMonth()] : longMonthNames[date.getUTCMonth()];
  parts.push(`${date.getUTCDate()} ${monthName} ${formatCalendarYear(date)}`);

  return parts.join(", ");
}

import type { Metadata } from "next";
import Link from "next/link";
import { epunda } from "@/app/fonts";
import YearsScroller from "@/components/calendar/YearsScroller";
import { prisma } from "@/prisma";
import { formatCalendarDate, formatCalendarMonthYear, formatCalendarYear } from "@/utils/calendarEra";
import { CHAIR_ROTATION_ORDER, getRotationSchedule } from "@/utils/chair";
import { computeSimulatedDateForRealDate } from "@/utils/time/shared";
import { getLeagueTimeSnapshot } from "@/utils/time/server";
import { getCurrentSimulatedNow } from "@/utils/time/server";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const metadata: Metadata = {
  title: "Calendar - League",
  description: "Simulation calendar for the League.",
  keywords: ["calendar", "league", "simulation"],
  alternates: { canonical: `${baseUrl}/calendar` },
  openGraph: {
    title: "Calendar - League",
    description: "Simulation calendar for the League.",
    url: `${baseUrl}/calendar`,
    images: [{ url: `${baseUrl}/logo.png`, alt: "League logo" }],
  },
};

type CalendarView = "years" | "year" | "month" | "week";

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const monthShortFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  timeZone: "UTC",
});

const dayNumberFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  timeZone: "UTC",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  timeZone: "UTC",
});

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeek(date: Date) {
  const day = date.getUTCDay();
  const mondayIndex = day === 0 ? 6 : day - 1;
  const next = startOfUtcDay(date);
  next.setUTCDate(next.getUTCDate() - mondayIndex);
  return next;
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfUtcYear(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function addUtcYears(date: Date, years: number) {
  return new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate()));
}

function isSameUtcDay(left: Date, right: Date) {
  return left.getUTCFullYear() === right.getUTCFullYear()
    && left.getUTCMonth() === right.getUTCMonth()
    && left.getUTCDate() === right.getUTCDate();
}

function getCalendarStart(date: Date) {
  return startOfUtcWeek(startOfUtcMonth(date));
}

function parseView(input: string | undefined): CalendarView {
  return input === "years" || input === "year" || input === "week" || input === "month" ? input : "month";
}

function parseOffset(input: string | undefined) {
  const parsed = Number.parseInt(input ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getViewDate(now: Date, view: CalendarView, offset: number) {
  if (view === "years") {
    return startOfUtcYear(now);
  }

  if (view === "year") {
    return addUtcYears(startOfUtcYear(now), offset);
  }

  if (view === "week") {
    return addUtcDays(startOfUtcWeek(now), offset * 7);
  }

  return addUtcMonths(startOfUtcMonth(now), offset);
}

function getViewTitle(view: CalendarView, date: Date) {
  if (view === "years") {
    return "Years";
  }

  if (view === "year") {
    return formatCalendarYear(date);
  }

  if (view === "week") {
    return `Week of ${formatCalendarDate(date)}`;
  }

  return formatCalendarMonthYear(date);
}

function getOffsetLabel(view: CalendarView) {
  if (view === "years") return "year block";
  if (view === "year") return "year";
  if (view === "week") return "week";
  return "month";
}

function getCalendarHref(view: CalendarView, offset: number) {
  const params = new URLSearchParams();
  if (view !== "month") {
    params.set("view", view);
  }
  if (offset !== 0) {
    params.set("offset", String(offset));
  }

  const query = params.toString();
  return query ? `/calendar?${query}` : "/calendar";
}

function ViewTabs({ view, offset }: { view: CalendarView; offset: number }) {
  const views: CalendarView[] = ["years", "year", "month", "week"];

  return (
    <div className="flex flex-wrap gap-2">
      {views.map((item) => {
        const active = item === view;
        return (
          <Link
            key={item}
            href={getCalendarHref(item, offset)}
            className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.24em] transition ${
              active
                ? "border-amber-500/60 bg-amber-500/10 text-amber-200"
                : "border-stone-700 bg-stone-900/70 text-stone-300 hover:border-stone-500 hover:text-stone-100"
            }`}
          >
            {item}
          </Link>
        );
      })}
    </div>
  );
}

function DayCell({
  day,
  currentMonth,
  today,
  compact = false,
}: {
  day: Date;
  currentMonth: number;
  today: Date;
  compact?: boolean;
}) {
  const isCurrentMonth = day.getUTCMonth() === currentMonth;
  const isToday = isSameUtcDay(day, today);

  return (
    <div
      className={`border-b border-r border-stone-800 ${
        compact ? "min-h-16 p-2" : "min-h-24 p-2.5 sm:min-h-32 sm:p-3"
      } ${isCurrentMonth ? "bg-stone-900/55" : "bg-stone-950/55 text-stone-500"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={`inline-flex min-w-8 items-center justify-center rounded-sm border px-2 text-sm font-semibold ${
            compact ? "h-7" : "h-8 sm:h-9"
          } ${
            isToday
              ? "border-amber-500/70 bg-amber-500/15 text-amber-100"
              : isCurrentMonth
                ? "border-stone-700 bg-stone-950 text-stone-100"
                : "border-stone-700 bg-stone-900/80 text-stone-500"
          }`}
        >
          {dayNumberFormatter.format(day)}
        </div>
        {day.getUTCDate() === 1 && (
          <div className="pt-1 text-[10px] uppercase tracking-[0.26em] text-stone-500">
            {monthShortFormatter.format(day)}
          </div>
        )}
      </div>

      {isToday && !compact && (
        <div className="mt-4 text-[11px] uppercase tracking-[0.24em] text-amber-200">
          Current day
        </div>
      )}
    </div>
  );
}

function MonthGrid({ monthDate, today }: { monthDate: Date; today: Date }) {
  const gridStart = getCalendarStart(monthDate);
  const days = Array.from({ length: 42 }, (_, index) => addUtcDays(gridStart, index));

  return (
    <>
      <div className="grid grid-cols-7 border-b border-stone-700 bg-stone-900/70">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.26em] text-stone-400 sm:px-3"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            day={day}
            currentMonth={monthDate.getUTCMonth()}
            today={today}
          />
        ))}
      </div>
    </>
  );
}

function WeekGrid({ weekDate, today }: { weekDate: Date; today: Date }) {
  const days = Array.from({ length: 7 }, (_, index) => addUtcDays(weekDate, index));
  const hours = Array.from({ length: 24 }, (_, index) => `${index.toString().padStart(2, "0")}:00`);
  const slotClassName = "min-h-[26px] sm:min-h-[28px]";

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[980px] grid-cols-[88px_repeat(7,minmax(0,1fr))]">
        <div className="border-r border-b border-stone-800 bg-stone-900/85 px-3 py-4" />
        {days.map((day) => {
          const isToday = isSameUtcDay(day, today);
          return (
            <div key={day.toISOString()} className="border-b border-r border-stone-800 bg-stone-900/85 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-stone-500">{weekdayFormatter.format(day)}</div>
                  <div className={`${epunda.className} mt-1 text-xl text-stone-100`}>
                    {dayNumberFormatter.format(day)} {monthShortFormatter.format(day)}
                  </div>
                </div>
                {isToday && (
                  <span className="rounded-full border border-amber-500/60 bg-amber-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-amber-200">
                    Today
                  </span>
                )}
              </div>
            </div>
          );
        })}

        <div className="border-r border-stone-800 bg-stone-950/80">
          {hours.map((label, index) => (
            <div
              key={label}
              className={`flex items-center justify-end border-b border-stone-800/70 px-3 py-1 ${slotClassName} ${
                index % 2 === 0 ? "bg-stone-950/30" : "bg-transparent"
              }`}
            >
              <span className="text-[11px] font-medium tabular-nums text-stone-500">{label}</span>
            </div>
          ))}
          <div className={`flex items-center justify-end px-3 py-1 ${slotClassName}`}>
            <span className="text-[11px] font-medium tabular-nums text-stone-500">23:59</span>
          </div>
        </div>

        {days.map((day) => (
          <div key={`${day.toISOString()}-slots`} className="border-r border-stone-800 bg-stone-900/65">
            {hours.map((label, index) => (
              <div
                key={`${day.toISOString()}-${label}`}
                className={`border-b border-stone-800/70 px-3 py-1 ${slotClassName} ${
                  index % 2 === 0 ? "bg-stone-950/20" : "bg-transparent"
                }`}
              />
            ))}
            <div className={`${slotClassName}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

function YearView({ yearDate, today, baseOffset }: { yearDate: Date; today: Date; baseOffset: number }) {
  const months = Array.from({ length: 12 }, (_, index) => addUtcMonths(yearDate, index));

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-3">
      {months.map((monthDate, index) => {
        const monthOffset = baseOffset * 12 + index;
        return (
          <Link
            key={monthDate.toISOString()}
            href={getCalendarHref("month", monthOffset)}
            className="rounded-[1.2rem] border border-stone-800 bg-stone-900/55 transition hover:border-stone-600"
          >
            <div className="border-b border-stone-800 px-4 py-3">
              <div className={`${epunda.className} text-xl text-stone-100`}>{formatCalendarMonthYear(monthDate)}</div>
            </div>
            <div className="grid grid-cols-7 border-b border-stone-800 bg-stone-900/70">
              {weekdayLabels.map((label) => (
                <div key={label} className="px-1 py-2 text-center text-[10px] uppercase tracking-[0.2em] text-stone-500">
                  {label.slice(0, 1)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: 42 }, (_, dayIndex) => addUtcDays(getCalendarStart(monthDate), dayIndex)).map((day) => (
                <DayCell
                  key={day.toISOString()}
                  day={day}
                  currentMonth={monthDate.getUTCMonth()}
                  today={today}
                  compact
                />
              ))}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const rawView = Array.isArray(resolvedSearchParams.view) ? resolvedSearchParams.view[0] : resolvedSearchParams.view;
  const rawOffset = Array.isArray(resolvedSearchParams.offset) ? resolvedSearchParams.offset[0] : resolvedSearchParams.offset;
  const view = parseView(rawView);
  const offset = parseOffset(rawOffset);
  const [simulatedNow, leagueTime, countries] = await Promise.all([
    getCurrentSimulatedNow(),
    getLeagueTimeSnapshot(),
    prisma.country.findMany({
      where: {
        slug: { in: [...CHAIR_ROTATION_ORDER] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        code: true,
        flagImagePath: true,
        flagAspectRatio: true,
        hasVeto: true,
        isActive: true,
      },
    }),
  ]);
  const viewDate = getViewDate(simulatedNow, view, offset);
  const offsetLabel = getOffsetLabel(view);
  const showPager = view !== "years";
  const bySlug = new Map(countries.map((country) => [country.slug, country]));
  const rotationCountries = CHAIR_ROTATION_ORDER
    .map((slug) => bySlug.get(slug))
    .filter((country): country is NonNullable<typeof country> => Boolean(country));
  const chairTerms = getRotationSchedule(rotationCountries, new Date(process.env.CHAIR_ROTATION_START_AT ?? "2026-03-16T00:00:00.000Z"), 40)
    .map((term) => {
      const simulatedStartsAt = computeSimulatedDateForRealDate(term.startsAt, leagueTime);
      const simulatedEndsAt = computeSimulatedDateForRealDate(term.endsAt, leagueTime);
      return {
        countryName: term.country.name,
        slug: term.country.slug,
        startsAt: simulatedStartsAt.toISOString(),
        endsAt: simulatedEndsAt.toISOString(),
        startYear: simulatedStartsAt.getUTCFullYear(),
        endYear: simulatedEndsAt.getUTCFullYear(),
      };
    });

  return (
    <main className="w-full px-4 py-10 text-stone-100 sm:px-6">
      <section className="rounded-[1.75rem] border border-stone-800 bg-stone-900/80 p-3 shadow-[0_18px_48px_rgba(0,0,0,0.28)] sm:p-5">
        <div className="rounded-[1.4rem] border border-stone-700 bg-stone-950/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="border-b border-stone-700 bg-stone-900/90 px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                {showPager && (
                  <Link
                    href={getCalendarHref(view, offset - 1)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 bg-stone-950 text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
                    aria-label={`Previous ${offsetLabel}`}
                  >
                    {"<"}
                  </Link>
                )}
                <div>
                  <div className="text-[11px] uppercase tracking-[0.32em] text-stone-500">League Calendar</div>
                  <div className={`${epunda.className} mt-1 text-2xl text-stone-100 sm:text-4xl`}>
                    {getViewTitle(view, viewDate)}
                  </div>
                </div>
                {showPager && (
                  <Link
                    href={getCalendarHref(view, offset + 1)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 bg-stone-950 text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
                    aria-label={`Next ${offsetLabel}`}
                  >
                    {">"}
                  </Link>
                )}
              </div>

              <div className="flex flex-col gap-3 lg:items-end">
                <ViewTabs view={view} offset={offset} />
                <div className="text-right text-sm text-stone-400">
                  Current simulated date: <span className="text-stone-200">{formatCalendarDate(simulatedNow, { weekday: true })}</span>
                </div>
              </div>
            </div>
          </div>

          {view === "years" && <YearsScroller currentYear={simulatedNow.getUTCFullYear()} chairTerms={chairTerms} />}
          {view === "year" && <YearView yearDate={viewDate} today={simulatedNow} baseOffset={offset} />}
          {view === "month" && <MonthGrid monthDate={viewDate} today={simulatedNow} />}
          {view === "week" && <WeekGrid weekDate={viewDate} today={simulatedNow} />}
        </div>
      </section>
    </main>
  );
}

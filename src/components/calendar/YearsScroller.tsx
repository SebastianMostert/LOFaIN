"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { epunda } from "@/app/fonts";
import { formatCalendarDate, formatCalendarEraYear } from "@/utils/calendarEra";

type ChairTerm = {
  countryName: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  startYear: number;
  endYear: number;
};

type Props = {
  currentYear: number;
  chairTerms: ChairTerm[];
};

const PRELOAD_YEARS = 50;
const ROW_GAP_PX = 16;
const ROW_MIN_HEIGHT_PX = 164;
const MIN_VISIBLE_ROWS = 2;
const MAX_VISIBLE_ROWS = 8;

function getCalendarHref(offset: number) {
  const params = new URLSearchParams();
  params.set("view", "year");
  if (offset !== 0) {
    params.set("offset", String(offset));
  }

  return `/calendar?${params.toString()}`;
}

export default function YearsScroller({ currentYear, chairTerms }: Props) {
  const [layout, setLayout] = useState({
    columns: 1,
    visibleRows: 4,
    containerHeight: 704,
  });
  const [range, setRange] = useState({ startYear: currentYear, count: 0 });
  const [showChairRotation, setShowChairRotation] = useState(false);
  const [showTimeframe, setShowTimeframe] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldPositionCurrentYearRef = useRef(true);
  const prependAdjustmentRef = useRef<number | null>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);

  const yearsPerPreload = useMemo(
    () => Math.ceil(PRELOAD_YEARS / layout.columns) * layout.columns,
    [layout.columns],
  );

  const visibleYears = layout.columns * layout.visibleRows;
  const resetRange = useMemo(
    () => ({
      startYear: currentYear - yearsPerPreload,
      count: visibleYears + yearsPerPreload + yearsPerPreload,
    }),
    [currentYear, visibleYears, yearsPerPreload],
  );

  useEffect(() => {
    const computeLayout = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      const columns = width >= 1280 ? 4 : width >= 640 ? 2 : 1;
      const availableHeight = Math.max(
        ROW_MIN_HEIGHT_PX * MIN_VISIBLE_ROWS,
        Math.round(height * 0.72),
      );
      const visibleRows = Math.max(
        MIN_VISIBLE_ROWS,
        Math.min(
          MAX_VISIBLE_ROWS,
          Math.floor((availableHeight + ROW_GAP_PX) / (ROW_MIN_HEIGHT_PX + ROW_GAP_PX)),
        ),
      );
      const containerHeight =
        visibleRows * ROW_MIN_HEIGHT_PX + (visibleRows - 1) * ROW_GAP_PX;

      setLayout({ columns, visibleRows, containerHeight });
    };

    computeLayout();
    window.addEventListener("resize", computeLayout);
    return () => window.removeEventListener("resize", computeLayout);
  }, []);

  useEffect(() => {
    shouldPositionCurrentYearRef.current = true;
    prependAdjustmentRef.current = null;
    rowRefs.current = [];

    setRange(resetRange);
  }, [resetRange]);

  const years = useMemo(
    () => Array.from({ length: range.count }, (_, index) => range.startYear + index),
    [range],
  );

  const rows = useMemo(() => {
    return Array.from(
      { length: Math.ceil(years.length / layout.columns) },
      (_, rowIndex) =>
        years.slice(rowIndex * layout.columns, rowIndex * layout.columns + layout.columns),
    );
  }, [years, layout.columns]);

  useLayoutEffect(() => {
    const root = scrollContainerRef.current;
    if (!root || !shouldPositionCurrentYearRef.current) {
      return;
    }

    const targetRowIndex = rows.findIndex((rowYears) => rowYears.includes(currentYear));
    const targetRow = targetRowIndex >= 0 ? rowRefs.current[targetRowIndex] : null;
    if (!targetRow) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const rootBox = root.getBoundingClientRect();
      const targetBox = targetRow.getBoundingClientRect();
      const nextScrollTop = root.scrollTop + (targetBox.top - rootBox.top);

      root.scrollTo({ top: nextScrollTop, behavior: "auto" });
      shouldPositionCurrentYearRef.current = false;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [rows, currentYear]);

  useEffect(() => {
    const root = scrollContainerRef.current;
    if (!root || prependAdjustmentRef.current === null) {
      return;
    }

    root.scrollTop += prependAdjustmentRef.current;
    prependAdjustmentRef.current = null;
  }, [rows]);

  useEffect(() => {
    const root = scrollContainerRef.current;
    if (!root) {
      return;
    }

    const getMeasuredRows = () =>
      rowRefs.current.filter((row): row is HTMLDivElement => Boolean(row));

    const extendRangeIfNeeded = () => {
      const measuredRows = getMeasuredRows();
      if (measuredRows.length === 0) {
        return;
      }

      const firstRow = measuredRows[0];
      const lastRow = measuredRows[measuredRows.length - 1];

      const topThreshold = firstRow.offsetHeight * 2;
      const bottomThreshold = lastRow.offsetHeight * (layout.visibleRows + 1);

      if (root.scrollTop <= topThreshold) {
        const previousScrollHeight = root.scrollHeight;

        setRange((current) => ({
          startYear: current.startYear - yearsPerPreload,
          count: current.count + yearsPerPreload,
        }));

        requestAnimationFrame(() => {
          const newScrollHeight = root.scrollHeight;
          prependAdjustmentRef.current = newScrollHeight - previousScrollHeight;
        });

        return;
      }

      const distanceFromBottom =
        root.scrollHeight - root.clientHeight - root.scrollTop;

      if (distanceFromBottom <= bottomThreshold) {
        setRange((current) => ({
          startYear: current.startYear,
          count: current.count + yearsPerPreload,
        }));
      }
    };

    const handleScroll = () => {
      extendRangeIfNeeded();
    };

    root.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      root.removeEventListener("scroll", handleScroll);
    };
  }, [layout.visibleRows, yearsPerPreload, rows.length]);

  function resetToToday() {
    const root = scrollContainerRef.current;
    const nextRange = resetRange;

    shouldPositionCurrentYearRef.current = true;
    prependAdjustmentRef.current = null;
    rowRefs.current = [];

    if (root) {
      root.scrollTop = 0;
    }

    setRange((current) => {
      if (current.startYear === nextRange.startYear && current.count === nextRange.count) {
        return { ...current };
      }

      return nextRange;
    });
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={resetToToday}
          className="rounded-full border border-stone-700 bg-stone-900/70 px-3 py-1.5 text-xs uppercase tracking-[0.24em] text-stone-300 transition hover:border-stone-500 hover:text-stone-100"
        >
          Today
        </button>

        <button
          type="button"
          onClick={() => {
            setShowChairRotation((current) => {
              const next = !current;
              if (!next) {
                setShowTimeframe(false);
              }
              return next;
            });
          }}
          className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.24em] transition ${showChairRotation
              ? "border-amber-500/60 bg-amber-500/10 text-amber-200"
              : "border-stone-700 bg-stone-900/70 text-stone-300 hover:border-stone-500 hover:text-stone-100"
            }`}
        >
          Chair rotation
        </button>

        <button
          type="button"
          onClick={() => setShowTimeframe((current) => !current)}
          disabled={!showChairRotation}
          className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.24em] transition ${showChairRotation && showTimeframe
              ? "border-amber-500/60 bg-amber-500/10 text-amber-200"
              : "border-stone-700 bg-stone-900/70 text-stone-300 hover:border-stone-500 hover:text-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
            }`}
        >
          Timeframe
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        className="overflow-y-auto"
        style={{ height: `${layout.containerHeight}px` }}
      >
        <div className="flex flex-col gap-4">
          {rows.map((rowYears, rowIndex) => (
            <div
              key={rowYears[0]}
              ref={(node) => {
                rowRefs.current[rowIndex] = node;
              }}
              className="grid gap-4"
              style={{
                minHeight: `${ROW_MIN_HEIGHT_PX}px`,
                gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
              }}
            >
              {rowYears.map((year) => {
                const relevantTerms = showChairRotation
                  ? chairTerms.filter(
                    (term) => term.startYear <= year && term.endYear >= year,
                  )
                  : [];

                const isCurrentYear = year === currentYear;

                return (
                  <Link
                    key={year}
                    href={getCalendarHref(year - currentYear)}
                    className={`flex h-full flex-col rounded-[1.2rem] border p-5 transition ${isCurrentYear
                        ? "border-amber-500/40 bg-amber-500/8"
                        : "border-stone-800 bg-stone-900/55 hover:border-stone-600"
                      }`}
                  >
                    <div className="text-[11px] uppercase tracking-[0.24em] text-stone-500">
                      Year
                    </div>

                    <div className={`${epunda.className} mt-2 text-4xl text-stone-100`}>
                      {formatCalendarEraYear(year)}
                    </div>

                    {isCurrentYear && (
                      <div className="mt-3 text-[11px] uppercase tracking-[0.24em] text-amber-200">
                        Current year
                      </div>
                    )}

                    {showChairRotation && relevantTerms.length > 0 && (
                      <div className="mt-4 space-y-3 border-t border-stone-800 pt-4">
                        {relevantTerms.map((term) => (
                          <div
                            key={`${year}-${term.slug}-${term.startsAt}`}
                            className="text-sm text-stone-300"
                          >
                            <div className="font-medium text-stone-100">
                              {term.countryName}
                            </div>

                            {showTimeframe && (
                              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-500">
                                {formatCalendarDate(new Date(term.startsAt), { month: "short" })} to{" "}
                                {formatCalendarDate(new Date(term.endsAt), { month: "short" })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

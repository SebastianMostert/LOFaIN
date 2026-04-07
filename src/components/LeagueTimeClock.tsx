"use client";

import { useEffect, useState } from "react";
import { combineDateWithCurrentUtc, computeDisplayedSimulatedDate, getMsUntilNextNrpDay } from "@/utils/time/shared";
import type { SerializedLeagueTimeSnapshot } from "@/utils/time/types";

type Props = {
  initialTime: SerializedLeagueTimeSnapshot;
};

export default function LeagueTimeClock({ initialTime }: Props) {
  const [displayedDate, setDisplayedDate] = useState(() => computeDisplayedSimulatedDate(initialTime));
  const [displayedNow, setDisplayedNow] = useState(() =>
    initialTime.isPaused
      ? initialTime.currentSimulatedNow
      : combineDateWithCurrentUtc(computeDisplayedSimulatedDate(initialTime)),
  );

  useEffect(() => {
    if (initialTime.isPaused) {
      setDisplayedNow(initialTime.currentSimulatedNow);
      return;
    }

    const interval = window.setInterval(() => {
      setDisplayedNow(combineDateWithCurrentUtc(displayedDate));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [displayedDate, initialTime.currentSimulatedNow, initialTime.isPaused]);

  useEffect(() => {
    if (initialTime.isPaused) {
      return;
    }

    const timeoutMs = getMsUntilNextNrpDay(initialTime);
    if (timeoutMs == null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setDisplayedDate(computeDisplayedSimulatedDate(initialTime));
    }, timeoutMs);

    return () => window.clearTimeout(timeout);
  }, [displayedDate, initialTime]);

  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
      <div className="text-xs uppercase tracking-[0.28em] text-stone-400">League Time</div>
      <div className="mt-3 text-3xl font-semibold tracking-[0.04em] text-stone-50 sm:text-4xl">
        {new Date(displayedNow).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "UTC",
        })}{" "}
        UTC
      </div>
      <div className="mt-2 text-sm text-stone-300">
        {new Intl.DateTimeFormat("en-GB", {
          dateStyle: "full",
          timeZone: "UTC",
        }).format(new Date(displayedNow))}
      </div>
      <div className="mt-4 text-xs uppercase tracking-[0.24em] text-stone-500">
        {initialTime.isPaused ? "Paused" : "Live NRP clock"}
      </div>
    </div>
  );
}

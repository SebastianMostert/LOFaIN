"use client";

import { useEffect, useState, useTransition } from "react";
import {
  combineDateWithCurrentUtc,
  computeDisplayedSimulatedDate,
  getMsUntilNextNrpDay,
} from "@/utils/time/shared";
import type { SerializedLeagueTimeSnapshot as TimeSnapshot } from "@/utils/time/types";

type Props = {
  initialTime: TimeSnapshot;
};

type EditableField = "originalRealStartAt" | "originalSimulatedAt" | "currentSimulatedDate";

function toUtcDateInput(value: string) {
  return value.slice(0, 10);
}

function utcDateInputToIso(value: string) {
  return `${value}T00:00:00.000Z`;
}

function formatUtcDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}


export default function TimeAdminControls({ initialTime }: Props) {
  const [time, setTime] = useState(initialTime);
  const [displayedDate, setDisplayedDate] = useState(() => computeDisplayedSimulatedDate(initialTime));
  const [displayedNow, setDisplayedNow] = useState(() =>
    initialTime.isPaused
      ? initialTime.currentSimulatedNow
      : combineDateWithCurrentUtc(computeDisplayedSimulatedDate(initialTime)),
  );
  const [realStartAtInput, setRealStartAtInput] = useState(() => toUtcDateInput(initialTime.originalRealStartAt));
  const [simulatedStartAtInput, setSimulatedStartAtInput] = useState(() => toUtcDateInput(initialTime.originalSimulatedAt));
  const [currentSimulatedInput, setCurrentSimulatedInput] = useState(() => toUtcDateInput(initialTime.currentSimulatedNow));
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (time.isPaused) {
      setDisplayedNow(time.currentSimulatedNow);
      return;
    }

    const interval = window.setInterval(() => {
      setDisplayedNow(combineDateWithCurrentUtc(displayedDate));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [displayedDate, time.isPaused, time.currentSimulatedNow]);

  useEffect(() => {
    setDisplayedDate(computeDisplayedSimulatedDate(time));
  }, [time]);

  useEffect(() => {
    if (time.isPaused) {
      setDisplayedNow(time.currentSimulatedNow);
      return;
    }

    setDisplayedNow(combineDateWithCurrentUtc(displayedDate));
  }, [displayedDate, time.isPaused, time.currentSimulatedNow]);

  useEffect(() => {
    if (time.isPaused) {
      return;
    }

    const timeoutMs = getMsUntilNextNrpDay(time);
    if (timeoutMs == null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setDisplayedDate(computeDisplayedSimulatedDate(time));
    }, timeoutMs);

    return () => window.clearTimeout(timeout);
  }, [time, displayedDate]);

  function runAction(
    body:
      | { action: "pause" | "resume" | "reset_to_original_start" }
      | { action: "set_current_simulated_time"; simulatedAt: string }
      | { action: "set_original_mapping"; realStartAt: string; simulatedStartAt: string },
    successText: string,
  ) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/time/control", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Request failed.");
        return;
      }

      setTime(payload.time);
      const nextDisplayedDate = computeDisplayedSimulatedDate(payload.time);
      setDisplayedDate(nextDisplayedDate);
      setDisplayedNow(combineDateWithCurrentUtc(nextDisplayedDate));
      setCurrentSimulatedInput(toUtcDateInput(payload.time.currentSimulatedNow));
      setRealStartAtInput(toUtcDateInput(payload.time.originalRealStartAt));
      setSimulatedStartAtInput(toUtcDateInput(payload.time.originalSimulatedAt));
      setMessage(successText);
    });
  }

  function openEditor(field: EditableField) {
    setEditingField(field);
    setError(null);
    setMessage(null);
  }

  function closeEditor() {
    setEditingField(null);
  }

  const modalConfig = (() => {
    if (editingField === "originalRealStartAt") {
      return {
        title: "Edit original real start",
        description:
          "Sets the real-world UTC date that the baseline mapping starts from. This is stored at 00:00:00 UTC and is used together with the original simulated start date.",
        value: realStartAtInput,
        onChange: setRealStartAtInput,
        onSave: () =>
          runAction(
            {
              action: "set_original_mapping",
              realStartAt: utcDateInputToIso(realStartAtInput.trim()),
              simulatedStartAt: utcDateInputToIso(simulatedStartAtInput.trim()),
            },
            "Original real start updated.",
          ),
      };
    }

    if (editingField === "originalSimulatedAt") {
      return {
        title: "Edit original simulated start",
        description:
          "Sets the NRP date paired with the original real start date. This is stored at 00:00:00 UTC and defines the first simulated calendar day in the mapping.",
        value: simulatedStartAtInput,
        onChange: setSimulatedStartAtInput,
        onSave: () =>
          runAction(
            {
              action: "set_original_mapping",
              realStartAt: utcDateInputToIso(realStartAtInput.trim()),
              simulatedStartAt: utcDateInputToIso(simulatedStartAtInput.trim()),
            },
            "Original simulated start updated.",
          ),
      };
    }

    if (editingField === "currentSimulatedDate") {
      return {
        title: "Set current simulated date",
        description:
          "Moves the current NRP date anchor to a different calendar day. The time-of-day will still mirror live UTC after the change, and the saved anchor is always midnight UTC.",
        value: currentSimulatedInput,
        onChange: setCurrentSimulatedInput,
        onSave: () =>
          runAction(
            {
              action: "set_current_simulated_time",
              simulatedAt: utcDateInputToIso(currentSimulatedInput.trim()),
            },
            "Current simulated date updated.",
          ),
      };
    }

    return null;
  })();

  function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 bg-stone-900/80 text-stone-300 transition hover:border-stone-500 hover:text-stone-100"
        aria-label={label}
        title={label}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.8]">
          <path d="M4 20l4.5-1 9-9a1.5 1.5 0 0 0 0-2.1l-1.4-1.4a1.5 1.5 0 0 0-2.1 0l-9 9L4 20Z" />
          <path d="M13 7l4 4" />
        </svg>
      </button>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-stone-800 bg-[radial-gradient(circle_at_top_left,rgba(8,58,87,0.22),transparent_34%),linear-gradient(180deg,rgba(28,25,23,0.95),rgba(12,10,9,0.98))] shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
        <div className="border-b border-stone-800/80 px-5 py-4 sm:px-6">
          <div className="text-[11px] uppercase tracking-[0.28em] text-stone-500">Live status</div>
          <h2 className="mt-2 text-2xl font-semibold text-stone-100">Current NRP clock</h2>
        </div>

        <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <div className="rounded-[1.75rem] border border-stone-800/80 bg-stone-950/55 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="text-[11px] uppercase tracking-[0.28em] text-stone-500">Simulated time</div>
              <EditButton label="Set current simulated date" onClick={() => openEditor("currentSimulatedDate")} />
            </div>
            <div className="mt-4 text-3xl font-semibold tracking-[0.04em] text-stone-50 sm:text-4xl">
              {new Date(displayedNow).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                timeZone: "UTC",
              })}{" "}
              UTC
            </div>
            <div className="mt-2 text-lg text-stone-300">
              {new Intl.DateTimeFormat("en-GB", {
                dateStyle: "full",
                timeZone: "UTC",
              }).format(new Date(displayedNow))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-stone-800/80 pt-5">
              <button
                type="button"
                onClick={() => runAction({ action: "pause" }, "Time paused.")}
                disabled={isPending || time.isPaused}
                className="rounded-full border border-stone-700 bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Pause
              </button>
              <button
                type="button"
                onClick={() => runAction({ action: "resume" }, "Time resumed.")}
                disabled={isPending || !time.isPaused}
                className="rounded-full border border-stone-700 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Resume
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-stone-800/80 bg-stone-950/55 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.28em] text-stone-500">Original real start</div>
                <EditButton label="Edit original real start" onClick={() => openEditor("originalRealStartAt")} />
              </div>
              <div className="mt-2 text-sm font-medium text-stone-100">{formatUtcDateTime(time.originalRealStartAt)} UTC</div>
            </div>
            <div className="rounded-2xl border border-stone-800/80 bg-stone-950/55 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.28em] text-stone-500">Original simulated start</div>
                <EditButton label="Edit original simulated start" onClick={() => openEditor("originalSimulatedAt")} />
              </div>
              <div className="mt-2 text-sm font-medium text-stone-100">{formatUtcDateTime(time.originalSimulatedAt)} UTC</div>
            </div>
            <div className="rounded-2xl border border-stone-800/80 bg-stone-950/55 p-4">
              <div className="text-[11px] uppercase tracking-[0.28em] text-stone-500">Real anchor</div>
              <div className="mt-2 text-sm font-medium text-stone-100">{formatUtcDateTime(time.currentRealAnchorAt)} UTC</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-stone-800 bg-stone-950/35 p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-stone-500">Rule</div>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-stone-300">
          The baseline is <span className="text-stone-100">2026-04-07T00:00:00Z</span> mapping to <span className="text-stone-100">1917-01-01T00:00:00Z</span>. The NRP date advances in whole NRP-day steps, with <span className="text-stone-100">1 real day = 1 NRP year</span>. The NRP clock-of-day always mirrors current UTC exactly.
        </p>
      </section>

      {message && (
        <div className="rounded-2xl border border-emerald-700/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100 shadow-[0_12px_32px_rgba(6,78,59,0.18)]">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-700/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-100 shadow-[0_12px_32px_rgba(127,29,29,0.18)]">
          {error}
        </div>
      )}

      {modalConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] border border-stone-700 bg-stone-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Edit Date</div>
                <h3 className="mt-2 text-xl font-semibold text-stone-50">{modalConfig.title}</h3>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-full border border-stone-700 bg-stone-950/60 px-3 py-1 text-sm text-stone-300 transition hover:border-stone-500 hover:text-stone-100"
              >
                Close
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-stone-400">{modalConfig.description}</p>

            <input
              type="date"
              value={modalConfig.value}
              onChange={(event) => modalConfig.onChange(event.target.value)}
              className="mt-5 w-full rounded-2xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-stone-100 [color-scheme:dark]"
            />

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isPending || modalConfig.value.trim().length === 0}
                onClick={() => {
                  modalConfig.onSave();
                  closeEditor();
                }}
                className="rounded-full border border-stone-700 bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
              {editingField === "currentSimulatedDate" && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    runAction({ action: "reset_to_original_start" }, "Current simulated time reset to original start.");
                    closeEditor();
                  }}
                  className="rounded-full border border-stone-700 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reset to original start
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

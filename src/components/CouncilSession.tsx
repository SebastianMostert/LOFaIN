"use client";

import TimeDisplay from "./Vote/TimeDisplay";

interface CouncilSessionUIProps {
  recognizedName: string | null;
  recognitionCountdownLabel: string | null;
  recognitionIsOvertime?: boolean;
  queuedCountries: string[];
  presentCountries?: string[];
  quorumLabel?: string | null;
  connected?: boolean;
  statusMessage?: string | null;
  statusTone?: "info" | "success" | "error";
  canModerate?: boolean;
  moderateDisabled?: boolean;
  showRecognizeNext?: boolean;
  showNudgeSpeaker?: boolean;
  showStopSpeaker?: boolean;
  showSkipWaiting?: boolean;
  onRequestToSpeak?: () => void;
  onRecognizeNext?: () => void;
  onNudgeSpeaker?: () => void;
  onStopSpeaker?: () => void;
  onSkipSpeaker?: () => void;
}

export function CouncilSessionUI({
  recognizedName,
  recognitionCountdownLabel,
  recognitionIsOvertime = false,
  queuedCountries,
  presentCountries = [],
  quorumLabel = null,
  connected = false,
  statusMessage = null,
  statusTone = "info",
  canModerate = false,
  moderateDisabled = true,
  showRecognizeNext = false,
  showNudgeSpeaker = false,
  showStopSpeaker = false,
  showSkipWaiting = false,
  onRecognizeNext,
  onNudgeSpeaker,
  onStopSpeaker,
  onSkipSpeaker,
}: CouncilSessionUIProps) {
  const statusToneClass =
    statusTone === "error"
      ? "text-rose-300"
      : statusTone === "success"
        ? "text-emerald-300"
        : "text-stone-400";
  const speakerActionDisabled = moderateDisabled || !recognizedName;
  const skipWaitingDisabled = moderateDisabled || queuedCountries.length === 0;
  const isIdle = !recognizedName && queuedCountries.length === 0;

  return (
    <section>
      <article className={`rounded-[1.35rem] border border-stone-800 bg-stone-900/90 ${isIdle ? "p-2.5" : "p-3"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className={`${isIdle ? "text-sm" : "text-base"} font-semibold text-stone-100`}>Speaker Queue</h3>
          </div>
          <div className="rounded-xl border border-stone-800 bg-stone-950/60 px-2 py-1 text-right">
            <div className="text-[10px] uppercase tracking-[0.16em] text-stone-500">{connected ? "Live" : "Offline"}</div>
            <div className="mt-0.5 text-sm font-semibold text-stone-100">{queuedCountries.length}</div>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
          <span className="uppercase tracking-[0.16em]">Present</span>
          <span className="rounded-full border border-stone-800 bg-stone-950/50 px-2 py-0.5 text-stone-300">
            {presentCountries.length}{quorumLabel ? ` / ${quorumLabel}` : ""}
          </span>
          {presentCountries.length > 0 && (
            <span className="min-w-0 flex-1 truncate">{presentCountries.join(", ")}</span>
          )}
        </div>

        <div className={`mt-2 rounded-[0.95rem] border px-3 ${recognizedName ? "border-amber-500/70 bg-[linear-gradient(135deg,rgba(120,53,15,0.45),rgba(68,64,60,0.45))] py-2" : "border-stone-800 bg-stone-950/60 py-1.5"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-stone-400">Recognized Speaker</div>
              <div className={`mt-0.5 ${isIdle ? "text-sm" : "text-base"} font-semibold text-stone-100`}>
                {recognizedName ?? "No delegation recognized"}
              </div>
            </div>
            {recognizedName && recognitionCountdownLabel && (
              <div className={`rounded-xl border px-2.5 py-1.5 text-right ${recognitionIsOvertime ? "border-rose-400/70 bg-rose-950/35" : "border-amber-400/50 bg-stone-950/50"}`}>
                <div className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80">Time Remaining</div>
                <TimeDisplay recognitionCountdownLabel={recognitionCountdownLabel} recognitionIsOvertime={recognitionIsOvertime} />
              </div>
            )}
          </div>
        </div>

        <ol className="mt-2 space-y-1 text-sm text-stone-300">
          {queuedCountries.length === 0 && (
            <li className="rounded-xl border border-dashed border-stone-700 px-3 py-1 italic text-[12px] text-stone-500">
              No delegations are waiting for the floor.
            </li>
          )}
          {queuedCountries.map((name, index) => (
            <li
              key={`${name}-${index}`}
              className="rounded-xl border border-stone-800 bg-stone-950/60 px-3 py-1.5"
            >
              <span className="mr-3 text-stone-500">{index + 1}.</span>
              <span>{name}</span>
            </li>
          ))}
        </ol>

        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm">
          {canModerate && (
            <>
              {showRecognizeNext && (
                <button
                  type="button"
                  disabled={moderateDisabled}
                  onClick={onRecognizeNext}
                  className="rounded border border-emerald-700 bg-emerald-900/30 px-3 py-1.5 text-emerald-100 disabled:opacity-60"
                >
                  Recognize next
                </button>
              )}
              {showNudgeSpeaker && (
                <button
                  type="button"
                  disabled={speakerActionDisabled}
                  onClick={onNudgeSpeaker}
                  className="rounded border border-amber-700 bg-amber-900/30 px-3 py-1.5 text-amber-100 disabled:opacity-60"
                >
                  Nudge speaker
                </button>
              )}
              {showStopSpeaker && (
                <button
                  type="button"
                  disabled={speakerActionDisabled}
                  onClick={onStopSpeaker}
                  className="rounded border border-rose-700 bg-rose-900/30 px-3 py-1.5 text-rose-100 disabled:opacity-60"
                >
                  Stop speaker
                </button>
              )}
              {showSkipWaiting && (
                <button
                  type="button"
                  disabled={skipWaitingDisabled}
                  onClick={onSkipSpeaker}
                  className="rounded border border-rose-700 bg-rose-900/30 px-3 py-1.5 text-rose-100 disabled:opacity-60"
                >
                  Skip waiting
                </button>
              )}
            </>
          )}
        </div>

        {statusMessage && (
          <p className={`mt-1.5 text-sm ${statusToneClass}`}>{statusMessage}</p>
        )}
      </article>
      <style jsx>{`
        @keyframes overtimeBlink {
          0%,
          49.999% {
            opacity: 1;
          }

          50%,
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </section>
  );
}

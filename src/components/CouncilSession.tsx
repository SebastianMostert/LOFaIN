"use client";

import TimeDisplay from "./Vote/TimeDisplay";

interface CouncilSessionUIProps {
  recognizedName: string | null;
  recognitionCountdownLabel: string | null;
  recognitionIsOvertime?: boolean;
  queuedCountries: string[];
  connected?: boolean;
  statusMessage?: string | null;
  statusTone?: "info" | "success" | "error";
  canModerate?: boolean;
  requestToSpeakDisabled?: boolean;
  moderateDisabled?: boolean;
  onRequestToSpeak?: () => void;
  onRecognizeNext?: () => void;
  onSkipSpeaker?: () => void;
}

export function CouncilSessionUI({
  recognizedName,
  recognitionCountdownLabel,
  recognitionIsOvertime = false,
  queuedCountries,
  connected = false,
  statusMessage = null,
  statusTone = "info",
  canModerate = false,
  requestToSpeakDisabled = true,
  moderateDisabled = true,
  onRequestToSpeak,
  onRecognizeNext,
  onSkipSpeaker,
}: CouncilSessionUIProps) {
  const statusToneClass =
    statusTone === "error"
      ? "text-rose-300"
      : statusTone === "success"
        ? "text-emerald-300"
        : "text-stone-400";

  return (
    <section>
      <article className="rounded-[2rem] border border-stone-800 bg-stone-900/90 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-stone-100">Speaker Queue</h3>
          </div>
          <div className="rounded-2xl border border-stone-800 bg-stone-950/60 px-4 py-3 text-right">
            <div className="text-xs uppercase tracking-[0.18em] text-stone-500">{connected ? "Live" : "Offline"}</div>
            <div className="mt-1 text-xl font-semibold text-stone-100">{queuedCountries.length}</div>
          </div>
        </div>

        <div className={`mt-4 rounded-[1.75rem] border px-5 py-4 ${recognizedName ? "border-amber-500/70 bg-[linear-gradient(135deg,rgba(120,53,15,0.45),rgba(68,64,60,0.45))]" : "border-stone-800 bg-stone-950/60"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-stone-400">Recognized Speaker</div>
              <div className="mt-2 text-2xl font-semibold text-stone-100">
                {recognizedName ?? "No delegation recognized"}
              </div>
            </div>
            {recognizedName && recognitionCountdownLabel && (
              <div className={`rounded-2xl border px-4 py-3 text-right ${recognitionIsOvertime ? "border-rose-400/70 bg-rose-950/35" : "border-amber-400/50 bg-stone-950/50"}`}>
                <div className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Time Remaining</div>
                <TimeDisplay recognitionCountdownLabel={recognitionCountdownLabel} recognitionIsOvertime={recognitionIsOvertime} />
              </div>
            )}
          </div>
        </div>

        <ol className="mt-5 space-y-2 text-sm text-stone-300">
          {queuedCountries.length === 0 && (
            <li className="rounded-2xl border border-dashed border-stone-700 px-4 py-3 italic text-stone-500">
              No delegations are waiting for the floor.
            </li>
          )}
          {queuedCountries.map((name, index) => (
            <li
              key={`${name}-${index}`}
              className="rounded-2xl border border-stone-800 bg-stone-950/60 px-4 py-3"
            >
              <span className="mr-3 text-stone-500">{index + 1}.</span>
              <span>{name}</span>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            disabled={requestToSpeakDisabled}
            onClick={onRequestToSpeak}
            className="rounded border border-stone-600 bg-stone-800 px-3 py-1.5 text-stone-100 disabled:opacity-60"
          >
            Request to speak
          </button>
          {canModerate && (
            <>
              <button
                type="button"
                disabled={moderateDisabled}
                onClick={onRecognizeNext}
                className="rounded border border-emerald-700 bg-emerald-900/30 px-3 py-1.5 text-emerald-100 disabled:opacity-60"
              >
                Recognize next
              </button>
              <button
                type="button"
                disabled={moderateDisabled}
                onClick={onSkipSpeaker}
                className="rounded border border-rose-700 bg-rose-900/30 px-3 py-1.5 text-rose-100 disabled:opacity-60"
              >
                Skip speaker
              </button>
            </>
          )}
        </div>

        {statusMessage && (
          <p className={`mt-4 text-sm ${statusToneClass}`}>{statusMessage}</p>
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

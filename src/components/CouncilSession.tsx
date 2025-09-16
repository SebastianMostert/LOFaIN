"use client";

interface CouncilSessionUIProps {
  // Presence panel
  quorum: number;
  presentCountries: string[]; // country names already resolved
  motionsSuspended: boolean;

  // Queue panel
  recognizedName: string | null;
  queuedCountries: string[]; // country names in order

  // Footer status
  connected?: boolean; // purely cosmetic light
  statusMessage?: string | null; // optional banner text (success/error/info)
  statusTone?: "info" | "success" | "error";
}

export function CouncilSessionUI({
  quorum,
  presentCountries,
  motionsSuspended,
  recognizedName,
  queuedCountries,
  connected = false,
  statusMessage = null,
  statusTone = "info",
}: CouncilSessionUIProps) {
  const statusToneClass =
    statusTone === "error"
      ? "text-rose-300"
      : statusTone === "success"
        ? "text-emerald-300"
        : "text-stone-400";

  return (
    <section className="space-y-6">
      {/* Presence */}
      <header className="rounded-lg border border-stone-700 bg-stone-900 p-5">
        <h2 className="text-lg font-semibold text-stone-100">Session Presence</h2>
        <p className="mt-2 text-sm text-stone-300">
          Quorum: <span className="font-medium text-stone-100">{quorum}</span> present countries
        </p>
        <p className="mt-1 text-sm text-stone-400">
          {presentCountries.length === 0 ? "No countries currently connected." : presentCountries.join(", ")}
        </p>

        {motionsSuspended ? (
          <p className="mt-3 rounded border border-amber-700 bg-amber-900/30 px-3 py-2 text-sm text-amber-100">
            Motions are suspended until the debate quorum is met.
          </p>
        ) : (
          <p className="mt-3 rounded border border-emerald-700 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-100">
            Quorum met. Motions may proceed.
          </p>
        )}
      </header>

      {/* Queue + Motions */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Speaker Queue */}
        <article className="rounded-lg border border-stone-700 bg-stone-900 p-5">
          <h3 className="text-base font-semibold text-stone-100">Speaker Queue</h3>
          <p className="mt-2 text-sm text-stone-400">
            Recognized speaker:{" "}
            {recognizedName ? (
              <span className="font-medium text-stone-100">{recognizedName}</span>
            ) : (
              <span className="italic">None</span>
            )}
          </p>

          <ol className="mt-3 space-y-2 text-sm text-stone-300">
            {queuedCountries.length === 0 && (
              <li className="italic text-stone-500">Queue is currently empty.</li>
            )}
            {queuedCountries.map((name, index) => (
              <li
                key={`${name}-${index}`}
                className="rounded border border-stone-700 bg-stone-800/60 px-3 py-2"
              >
                {index + 1}. {name}
              </li>
            ))}
          </ol>

          {/* Inert controls (disabled) */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              disabled
              className="rounded border border-stone-600 bg-stone-800 px-3 py-1.5 text-stone-100 opacity-60"
              title="Disabled in UI-only mode"
            >
              Request to speak
            </button>
            <button
              type="button"
              disabled
              className="rounded border border-emerald-700 bg-emerald-900/30 px-3 py-1.5 text-emerald-100 opacity-60"
              title="Disabled in UI-only mode"
            >
              Recognize next
            </button>
            <button
              type="button"
              disabled
              className="rounded border border-rose-700 bg-rose-900/30 px-3 py-1.5 text-rose-100 opacity-60"
              title="Disabled in UI-only mode"
            >
              Skip speaker
            </button>
          </div>

          {/* Optional message line (cosmetic only) */}
          {statusMessage && (
            <p className={`mt-3 text-sm ${statusToneClass}`}>{statusMessage}</p>
          )}
        </article>

        {/* Motion Panel */}
        <article className="rounded-lg border border-stone-700 bg-stone-900 p-5">
          <h3 className="text-base font-semibold text-stone-100">Motion Panel</h3>
          <p className="mt-2 text-sm text-stone-300">
            Submit motions to the council. Availability depends on quorum.
          </p>

          {/* Inert button (disabled) */}
          <button
            type="button"
            disabled
            className="mt-4 rounded border border-sky-700 bg-sky-900/40 px-4 py-2 text-sm font-medium text-sky-100 opacity-60"
            title="Disabled in UI-only mode"
          >
            Open motion form
          </button>

          {motionsSuspended && (
            <p className="mt-3 text-sm text-amber-200">
              Motion submission disabled while the debate quorum is not met.
            </p>
          )}
        </article>
      </section>

      {/* Connection pill (cosmetic) */}
      <div className="text-xs text-stone-500">
        Connection status:{" "}
        <span className={`font-medium ${connected ? "text-emerald-300" : "text-stone-300"}`}>
          {connected ? "connected" : "disconnected"}
        </span>
      </div>
    </section>
  );
}

import React from 'react'

const MiniVoteMeter = ({
    ayePct,
    neutralPct,
    nayPct,
    thresholdPct,
    closed,
    result,
}: {
    ayePct: number;
    neutralPct: number;
    nayPct: number;
    thresholdPct: number;
    closed: boolean;
    result: string | null;
}) => {
    const closedTint =
        closed && result === "PASSED"
            ? "ring-2 ring-emerald-600"
            : closed && result === "FAILED"
                ? "ring-2 ring-rose-600"
                : "";

    return (
        <div
            className={`relative h-3 border-2 border-stone-900 bg-stone-100 shadow-[0_1px_0_rgba(0,0,0,1)] ${closedTint}`}
            aria-hidden
        >
            {/* AYE (left → right) */}
            {ayePct > 0 && (
                <div
                    className="absolute inset-y-0 left-0 bg-emerald-600"
                    style={{ width: `${ayePct}%` }}
                />
            )}

            {/* NEUTRAL — sits left of NAY (or right-aligned if no NAY) */}
            {neutralPct > 0 && (
                <div
                    className="absolute inset-y-0 bg-stone-500"
                    style={{
                        right: `${nayPct}%`,
                        width: `${neutralPct}%`,
                    }}
                />
            )}

            {/* NAY (right → left) */}
            {nayPct > 0 && (
                <div
                    className="absolute inset-y-0 right-0 bg-rose-600"
                    style={{ width: `${nayPct}%` }}
                />
            )}

            {/* Two-thirds threshold marker (always from left edge) */}
            <div
                className="absolute inset-y-0 w-[2px] bg-stone-900"
                style={{ left: `${thresholdPct}%` }}
                title="Two-thirds threshold"
            />

            {/* Closed overlay (subtle) */}
            {closed && (
                <div className="absolute inset-0 rounded bg-red-900/5 pointer-events-none" />
            )}
        </div>
    );
}

export default MiniVoteMeter
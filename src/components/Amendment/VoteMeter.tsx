import type { CSSProperties } from "react";

type Choice = "AYE" | "NAY" | "ABSTAIN" | "ABSENT";

export default function VoteMeter({
    totalMembers,
    votes,
    closed,
    result,
}: {
    totalMembers: number;
    votes: { choice: Choice }[];
    closed?: boolean;
    result?: "PASSED" | "FAILED" | null | string;
}) {
    const aye = votes.filter(v => v.choice === "AYE").length;
    const nay = votes.filter(v => v.choice === "NAY").length;
    const abstain = votes.filter(v => v.choice === "ABSTAIN").length;
    const absent = Math.max(0, totalMembers - votes.length);

    const neutral = abstain + absent;

    const pctFloat = (n: number, d: number) => (d ? Math.max(0, Math.min(100, (n / d) * 100)) : 0);

    const ayePct = pctFloat(aye, totalMembers);
    const nayPct = pctFloat(nay, totalMembers);
    const neutralPct = pctFloat(neutral, totalMembers);

    const thresholdCount = Math.ceil((2 / 3) * totalMembers);
    const thresholdPct = Math.max(0, Math.min(100, (2 / 3) * 100));

    const closedTint =
        closed && result === "PASSED" ? "ring-2 ring-emerald-600"
            : closed && result === "FAILED" ? "ring-2 ring-rose-600"
                : "";

    const neutralRight = nayPct;
    const neutralStyle = nayPct > 0
        ? { right: `${neutralRight}%`, width: `${neutralPct}%` }
        : { right: `0%`, width: `${neutralPct}%` };

    return (
        <section className="mx-auto mt-8 max-w-4xl rounded">
            <div className={`relative h-10 border-2 border-stone-900 bg-stone-100 shadow-[0_2px_0_rgba(0,0,0,1)] ${closedTint}`}>

                {/* AYE (left → right) */}
                {ayePct > 0 && (
                    <div
                        className="absolute inset-y-0 left-0 bg-emerald-600"
                        style={{ width: `${ayePct}%` }}
                        title={`Aye: ${aye}`}
                    />
                )}

                {/* NEUTRAL (ABSTAIN + ABSENT) — to the left of NAY, or right-aligned if no NAY */}
                {neutralPct > 0 && (
                    <div
                        className="absolute inset-y-0 bg-stone-500"
                        style={neutralStyle as CSSProperties}
                        title={`Neutral (Abstain + Absent): ${neutral}`}
                    />
                )}

                {/* NAY (right → left) */}
                {nayPct > 0 && (
                    <div
                        className="absolute inset-y-0 right-0 bg-rose-600"
                        style={{ width: `${nayPct}%` }}
                        title={`Nay: ${nay}`}
                    />
                )}

                {/* Two-thirds threshold marker */}
                <div
                    className="absolute inset-y-0 w-[2px] bg-stone-900"
                    style={{ left: `${thresholdPct}%` }}
                    title="Two-thirds threshold"
                />

                {/* Lock overlay when closed */}
                {closed && (
                    <div className="absolute inset-0 grid place-items-center bg-stone-900/10 pointer-events-none">
                        <span className="rounded-md border border-stone-700 bg-stone-900/80 px-2 py-0.5 text-xs text-stone-200">
                            Voting closed
                        </span>
                    </div>
                )}
            </div>

            <div className="mt-2 flex items-center justify-between text-sm text-stone-300">
                <span>
                    Aye {aye} • Nay {nay} • Abstain {abstain} • Absent {absent}
                </span>
                <span>{thresholdCount} of {totalMembers} required</span>
            </div>
        </section>
    );
}

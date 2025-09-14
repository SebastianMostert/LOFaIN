import { AmendmentResult, AmendmentStatus } from '@prisma/client';
import Link from 'next/link';
import React from 'react'
import MiniVoteMeter from './MiniVoteMeter';
import { epunda } from '@/app/fonts';
import { clampPct, pct } from '@/utils/voteStats';

type ExtendedAmendment = {
    result: AmendmentResult | null;
    id: string;
    slug: string;
    title: string;
    status: AmendmentStatus;
    opensAt: Date | null;
    closesAt: Date | null;
    eligibleCount: number | null;
    votes: {
        choice: Choice;
    }[];
}
type Choice = "AYE" | "NAY" | "ABSTAIN" | "ABSENT";

const hasOpened = (opensAt: Date) => new Date() >= opensAt;
const hasClosed = (closesAt: Date) => new Date() >= closesAt;

const AmendmentCard = ({ amendment, counts, eligible }: { amendment: ExtendedAmendment, counts: Record<Exclude<Choice, "ABSENT">, number>, eligible: number }) => {
    const totalVotes = counts.AYE + counts.NAY + counts.ABSTAIN;
    const absent = Math.max(0, eligible - totalVotes);

    const ayePct = pct(counts.AYE, eligible);
    const nayPct = pct(counts.NAY, eligible);
    const neutralPct = pct(counts.ABSTAIN + absent, eligible); // abstain + absent sit left of NAY

    const thresholdCount = Math.ceil((2 / 3) * eligible);
    const thresholdPct = clampPct((2 / 3) * 100);

    return (
        <Link
            key={amendment.id}
            href={`/amendments/${amendment.slug}`}
            className="group rounded-lg border border-stone-700/80 bg-stone-900 p-5 shadow-sm transition hover:border-stone-600 hover:bg-stone-850/80 hover:shadow-md"
        >
            {/* Header row: badge + title */}
            <div className="flex items-start justify-between gap-3">
                <StatusBadge status={amendment.status} result={amendment.result} />
                {(amendment.opensAt || amendment.closesAt) && (
                    <div className="text-right text-[11px] leading-4 text-stone-400">
                        {amendment.opensAt && <div>Open{hasOpened(amendment.opensAt) ? "ed" : "s"}: {new Date(amendment.opensAt).toLocaleString()}</div>}
                        {amendment.closesAt && <div>Close{hasClosed(amendment.closesAt) ? "d" : "s"}: {new Date(amendment.closesAt).toLocaleString()}</div>}
                    </div>
                )}
            </div>

            <h2 className={`${epunda.className} mt-1 text-lg font-semibold text-stone-100`}>
                {amendment.title}
            </h2>

            {/* Meter */}
            <div className="mt-4">
                <MiniVoteMeter
                    ayePct={ayePct}
                    neutralPct={neutralPct}
                    nayPct={nayPct}
                    thresholdPct={thresholdPct}
                    closed={amendment.status !== "OPEN"}
                    result={amendment.result}
                />

                {/* Counts / threshold line */}
                <div className="mt-2 flex items-center justify-between text-xs text-stone-400">
                    <span>
                        Aye {counts.AYE} • Nay {counts.NAY} • Abstain {counts.ABSTAIN} • Absent {absent}
                    </span>
                    <span>
                        {thresholdCount} / {eligible} needed
                    </span>
                </div>
            </div>
        </Link>
    );
}


/* ---------- UI bits ---------- */

function StatusBadge({
    status,
    result,
}: {
    status: string;
    result: string | null;
}) {
    if (status === "OPEN") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-700/60 bg-blue-900/40 px-2.5 py-1 text-[11px] font-medium text-blue-200">
                <span aria-hidden>●</span> Voting open
            </span>
        );
    }
    if (result === "PASSED") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/70 bg-emerald-900/40 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                ✓ Passed
            </span>
        );
    }
    if (result === "FAILED") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-700/70 bg-rose-900/40 px-2.5 py-1 text-[11px] font-medium text-rose-200">
                ✗ Failed
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-stone-600/70 bg-stone-800/60 px-2.5 py-1 text-[11px] font-medium text-stone-200">
            Archived
        </span>
    );
}

export default AmendmentCard
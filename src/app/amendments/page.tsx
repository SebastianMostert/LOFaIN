// app/amendments/page.tsx
import Link from "next/link";
import { prisma } from "@/prisma";
import { epunda } from "@/app/fonts";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AmendmentResult, AmendmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type Choice = "AYE" | "NAY" | "ABSTAIN" | "ABSENT";

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

const clampPct = (n: number) => Math.max(0, Math.min(100, n));
const pct = (n: number, d: number) => (d ? clampPct((n / d) * 100) : 0);

const hasOpened = (opensAt: Date) => new Date() >= opensAt;
const hasClosed = (closesAt: Date) => new Date() >= closesAt;

export default async function AmendmentsPage() {
    const session = await auth();
    if (!session) redirect("/api/auth/signin?callbackUrl=/amendments");

    const items = await prisma.amendment.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            slug: true,
            title: true,
            status: true,          // "OPEN" | "CLOSED"
            result: true,          // "PASSED" | "FAILED" | null
            eligibleCount: true,   // 👈 used for ABSENT + threshold
            opensAt: true,
            closesAt: true,
            votes: { select: { choice: true } },
        },
    });

    return (
        <main className="mx-auto max-w-6xl px-4 py-10 text-stone-100">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={`${epunda.className} text-3xl font-bold`}>Amendments</h1>
                    <div className="mt-2 h-px w-24 bg-stone-700" />
                </div>

                <Link
                    href="/amendments/new"
                    className="rounded-md border border-stone-300/20 bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-white hover:shadow"
                >
                    Propose Amendment
                </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
                {items.map((a) => {
                    const counts = { AYE: 0, NAY: 0, ABSTAIN: 0 } as Record<Exclude<Choice, "ABSENT">, number>;
                    a.votes.forEach((v) => {
                        if (v.choice === "AYE") counts.AYE++;
                        else if (v.choice === "NAY") counts.NAY++;
                        else counts.ABSTAIN++;
                    });

                    const eligible = a.eligibleCount ?? a.votes.length; // fallback if not set

                    return (
                        <AmendmentCard key={a.id} amendment={a} counts={counts} eligible={eligible} />
                    );
                })}
            </div>
        </main>
    );
}

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
                <MiniMeter
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

/** Compact bidirectional meter for list cards.
 *  - AYE grows left → right (emerald)
 *  - NEUTRAL (abstain + absent) sits to the left of NAY (stone)
 *  - NAY grows right → left (rose)
 */
function MiniMeter({
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
}) {
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

import { prisma } from "@/prisma";
import { closeExpiredAmendments } from "@/utils/amendments";
import { epunda } from "@/app/fonts";
import { notFound, redirect } from "next/navigation";
import FlagImage from "@/components/FlagImage";
import SlideOutVoteTab from "@/components/Vote/SlideOutVoteTab";
import DiffPreview from "@/components/DiffPreview";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

type Choice = "AYE" | "NAY" | "ABSTAIN" | "ABSENT";

function choiceColor(choice?: Choice | null) {
    switch (choice) {
        case "AYE": return "bg-emerald-500";
        case "NAY": return "bg-rose-600";
        case "ABSTAIN": return "bg-stone-500";
        case "ABSENT": return "bg-stone-400";
        default: return "bg-stone-500";
    }
}

export default async function AmendmentPage({ params }: { params: Promise<{ slug: string }> }) {
    const awaitedParams = await params;

    const session = await auth();
    const user = session?.user;
    if (!session) redirect("/api/auth/signin?callbackUrl=/amendments/" + awaitedParams.slug);

    await closeExpiredAmendments(awaitedParams.slug);

    const amendment = await prisma.amendment.findUnique({
        where: { slug: awaitedParams.slug },
        select: {
            id: true, slug: true, title: true, rationale: true,
            status: true, result: true, opensAt: true, closesAt: true, eligibleCount: true,
            failureReason: true,
            op: true, newHeading: true, newBody: true, targetArticleId: true,
            votes: { select: { choice: true, countryId: true } },
        },
    });
    if (!amendment) notFound();

    const targetArticle = amendment.targetArticleId
        ? await prisma.article.findUnique({
            where: { id: amendment.targetArticleId },
            select: { id: true, order: true, heading: true, body: true },
        })
        : null;

    const countries = await prisma.country.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, code: true, hasVeto: true },
    });

    const byCountry = new Map<string, Choice>();
    amendment.votes.forEach(v => byCountry.set(v.countryId, v.choice as Choice));

    const countriesMap = new Map(countries.map(c => [c.id, c]));
    const vetoers = amendment.votes
        .filter(v => v.choice === "NAY" && countriesMap.get(v.countryId)?.hasVeto)
        .map(v => countriesMap.get(v.countryId)!.name);
    const vetoUsed = vetoers.length > 0;

    const totalMembers = amendment.eligibleCount || countries.length || 1;

    // "OPEN" | "CLOSED"
    // "PASSED" | "FAILED"
    const status = amendment.status;
    const result = amendment.result;

    // My vote
    const userCountryId = user?.countryId;
    const myVote = userCountryId ? byCountry.get(userCountryId) : undefined as Choice | undefined;

    return (
        <main className="mx-auto max-w-7xl px-4 py-10 text-stone-100">
            <SlideOutVoteTab slug={amendment.slug} status={status} myVote={myVote || null} />

            {/* Title */}
            <header className="text-center">
                <h1 className={`${epunda.className} text-4xl sm:text-5xl font-extrabold`}>{amendment.title}</h1>
                <div className="mx-auto mt-3 h-[3px] w-40 bg-red-600" />

                {/* Status line + banner */}
                <div className="mt-3 flex flex-col items-center justify-center gap-3">
                    <StatusBanner
                        status={status}
                        result={result}
                        closesAt={amendment.closesAt ?? null}
                        failureReason={amendment.failureReason ?? null}
                    />
                    {status === "OPEN" && vetoUsed && (
                        <div className="rounded-md border border-rose-700 bg-rose-900/40 px-3 py-1 text-sm text-rose-200">
                            Veto used by {vetoers.join(", ")} – amendment will fail unless withdrawn
                        </div>
                    )}
                </div>
            </header>

            {/* Meter */}
            <Meter
                totalMembers={totalMembers}
                votes={amendment.votes as { choice: Choice }[]}
                closed={status !== "OPEN"}
                result={result ?? null}
            />

            {/* Content */}
            <section className="mt-10 grid grid-cols-1 gap-8">
                <div>
                    {amendment.rationale && (
                        <article className="rounded-lg border border-stone-700 bg-stone-900 p-5">
                            <h2 className={`${epunda.className} text-xl font-semibold text-stone-100`}>Amendment Summary</h2>
                            <p className="mt-2 whitespace-pre-wrap leading-relaxed text-stone-300">{amendment.rationale}</p>
                        </article>
                    )}

                    <Legend />
                    <FlagsGrid countries={countries} byCountry={byCountry} />
                </div>

                {/* Details + Diff */}
                <section className="mt-12 space-y-4">
                    <h2 className={`${epunda.className} text-xl font-semibold text-stone-100`}>Amendment Details</h2>

                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                        <Detail label="Operation" value={labelForOp(amendment.op)} />
                        {targetArticle && (
                            <Detail label="Target Article" value={`Article ${targetArticle.order}: ${targetArticle.heading}`} />
                        )}
                        {amendment.newHeading && <Detail label="New Heading" value={amendment.newHeading} />}
                    </div>

                    <DiffPreview
                        op={amendment.op as "ADD" | "EDIT" | "REMOVE"}
                        targetArticle={
                            targetArticle
                                ? { id: targetArticle.id, order: targetArticle.order, heading: targetArticle.heading, body: targetArticle.body }
                                : null
                        }
                        newHeading={amendment.newHeading ?? ""}
                        newBody={amendment.newBody ?? ""}
                    />
                </section>
            </section>
        </main>
    );
}

/* ---------- NEW: clear status visuals ---------- */

function StatusBanner({
    status,
    result,
    closesAt,
    failureReason,
}: {
    status: "OPEN" | "CLOSED" | string;
    result: "PASSED" | "FAILED" | null | string;
    closesAt: Date | null;
    failureReason: string | null;
}) {
    if (status === "OPEN") {
        return (
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-700/60 bg-blue-900/40 px-3 py-1 text-xs text-blue-200">
                <span className="i" aria-hidden>●</span> Voting open
                {closesAt && <span className="text-blue-300/80">• Closes {new Date(closesAt).toLocaleString()}</span>}
            </span>
        );
    }

    const passed = result === "PASSED";
    const base =
        "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold";
    return passed ? (
        <div className={`${base} border border-emerald-700 bg-emerald-900/40 text-emerald-200`}>
            ✓ Passed{closesAt ? ` • ${new Date(closesAt).toLocaleString()}` : ""}
        </div>
    ) : (
        <div className={`${base} flex-col items-start border border-rose-700 bg-rose-900/40 text-rose-200`}>
            <div>✗ Failed{closesAt ? ` • ${new Date(closesAt).toLocaleString()}` : ""}</div>
            {failureReason && <div className="mt-1 text-xs text-rose-300">{failureReason}</div>}
        </div>
    );
}

/* ---------- helpers/components (unchanged except Meter tweaks) ---------- */

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-stone-700 bg-stone-900 p-3">
            <div className="text-xs uppercase tracking-wide text-stone-400">{label}</div>
            <div className="mt-1 font-medium text-stone-100">{value}</div>
        </div>
    );
}

function labelForOp(op: "ADD" | "EDIT" | "REMOVE") {
    switch (op) {
        case "ADD": return "Add New Article";
        case "EDIT": return "Edit Existing Article";
        case "REMOVE": return "Remove Article";
        default: return op;
    }
}

const FlagsGrid = ({
    countries,
    byCountry,
}: {
    countries: { name: string; id: string; slug: string; code: string | null }[];
    byCountry: Map<string, Choice>;
}) => (
    <section className="mx-auto mt-12 max-w-[95rem]">
        <div className="flex flex-wrap items-end justify-center gap-16">
            {countries.map((c) => {
                const vote = (byCountry.get(c.id) ?? "ABSENT") as Choice;
                const flagSrc = `/flags/${(c.code || "unknown").toLowerCase()}.svg`;
                return (
                    <div key={c.id} className="flex flex-col items-center">
                        <div className="relative h-[120px] w-[220px] overflow-hidden rounded-[2px] border-[6px] border-stone-900 bg-white">
                            <FlagImage src={flagSrc} alt={`${c.name} flag`} sizes="220px" className="object-cover" />
                        </div>
                        <div className="mt-6 h-[64px] w-[64px] rounded-[2px] border-[6px] border-stone-900 bg-white">
                            <div className={`h-full w-full ${choiceColor(vote)}`} />
                        </div>
                    </div>
                );
            })}
        </div>
    </section>
);

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <span className="inline-flex items-center gap-2">
            <span className={`inline-block h-3 w-6 rounded ${color}`} />
            <span className="text-sm text-stone-300">{label}</span>
        </span>
    );
}
const Legend = () => (
    <div className="mt-8 flex flex-wrap items-center gap-4">
        <LegendItem color="bg-emerald-600" label="Aye" />
        <LegendItem color="bg-rose-600" label="Nay" />
        <LegendItem color="bg-stone-500" label="Abstain / no vote" />
    </div>
);

/** Meter now knows about closed state & result for stronger visuals */
/** Meter: AYE fills from left, NAY from right, NEUTRAL sits left of NAY (or right-aligned if no NAY). */
const Meter = ({
    totalMembers,
    votes,
    closed,
    result,
}: {
    totalMembers: number;
    votes: { choice: Choice }[];
    closed?: boolean;
    result?: "PASSED" | "FAILED" | null | string;
}) => {
    const aye = votes.filter(v => v.choice === "AYE").length;
    const nay = votes.filter(v => v.choice === "NAY").length;
    const abstain = votes.filter(v => v.choice === "ABSTAIN").length;
    const absent = Math.max(0, totalMembers - votes.length);

    const neutral = abstain + absent;

    // use precise percentages for layout (avoid rounding overlap)
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

    // NEUTRAL placement:
    // - If there are NAYs, NEUTRAL sits immediately to the left of NAY.
    // - If there are no NAYs, NEUTRAL is right-aligned (fills from right to left).
    const neutralRight = nayPct; // distance from right edge when there ARE NAYs
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
                        style={neutralStyle as React.CSSProperties}
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
};

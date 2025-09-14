import { prisma } from "@/prisma";
import { epunda } from "@/app/fonts";
import { notFound } from "next/navigation";
import FlagImage from "@/components/FlagImage";
import SlideOutVoteTab from "@/components/Vote/SlideOutVoteTab";
import DiffPreview from "@/components/DiffPreview"; // ⬅️ add

export const dynamic = "force-dynamic";

type Choice = "AYE" | "NAY" | "ABSTAIN";

function choiceColor(choice?: Choice | null) {
    switch (choice) {
        case "AYE": return "bg-emerald-500";
        case "NAY": return "bg-rose-600";
        default: return "bg-stone-500";
    }
}
const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const pct = (n: number, d: number) => (d ? clampPct((n / d) * 100) : 0);

export default async function AmendmentPage({ params }: { params: Promise<{ slug: string }> }) {
    const awaitedParams = await params;
    const amendment = await prisma.amendment.findUnique({
        where: { slug: awaitedParams.slug },
        select: {
            id: true, slug: true, title: true, rationale: true,
            status: true, opensAt: true, closesAt: true, eligibleCount: true,
            // ⬇️ needed for details/diff
            op: true, newHeading: true, newBody: true, targetArticleId: true,
            votes: { select: { choice: true, countryId: true } },
        },
    });
    if (!amendment) notFound();

    // If we reference an existing article, fetch its full content for the diff
    const targetArticle = amendment.targetArticleId
        ? await prisma.article.findUnique({
            where: { id: amendment.targetArticleId },
            select: { id: true, order: true, heading: true, body: true },
        })
        : null;

    const countries = await prisma.country.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, code: true },
    });

    const byCountry = new Map<string, Choice>();
    amendment.votes.forEach(v => byCountry.set(v.countryId, v.choice as Choice));

    const totalMembers = amendment.eligibleCount || countries.length || 1;

    return (
        <main className="mx-auto max-w-7xl px-4 py-10 text-stone-100">
            {/* Slide-out vote tab */}
            <SlideOutVoteTab slug={amendment.slug} status={amendment.status} />

            {/* Title */}
            <header className="text-center">
                <h1 className={`${epunda.className} text-4xl sm:text-5xl font-extrabold`}>{amendment.title}</h1>
                <div className="mx-auto mt-3 h-[3px] w-40 bg-red-600" />
                <p className="mt-2 text-sm text-stone-400">
                    {amendment.status === "OPEN"
                        ? <>Open • Closes {amendment.closesAt ? new Date(amendment.closesAt).toLocaleString() : "—"}</>
                        : <>Closed {amendment.closesAt ? `• ${new Date(amendment.closesAt).toLocaleString()}` : ""}</>}
                </p>
            </header>

            {/* Meter */}
            <Meter totalMembers={totalMembers} votes={amendment.votes as { choice: Choice }[]} />

            {/* Content */}
            <section className="mt-10 grid grid-cols-1 gap-8">
                <div>
                    {amendment.rationale && (
                        <article className="rounded-lg border border-stone-700 bg-stone-900 p-5">
                            <h2 className={`${epunda.className} text-xl font-semibold text-stone-100`}>Amendment Summary</h2>
                            <p className="mt-2 whitespace-pre-wrap leading-relaxed text-stone-300">
                                {amendment.rationale}
                            </p>
                        </article>
                    )}

                    <Legend />
                    <FlagsGrid countries={countries} byCountry={byCountry} />
                </div>

                {/* --- Amendment Details + Diff --- */}
                <section className="mt-12 space-y-4">
                    <h2 className={`${epunda.className} text-xl font-semibold text-stone-100`}>Amendment Details</h2>

                    {/* Small facts row */}
                    <div className="grid gap-3 sm:grid-cols-2 text-sm">
                        <Detail label="Operation" value={labelForOp(amendment.op)} />
                        {targetArticle && (
                            <Detail
                                label="Target Article"
                                value={`Article ${targetArticle.order}: ${targetArticle.heading}`}
                            />
                        )}
                        {amendment.newHeading && <Detail label="New Heading" value={amendment.newHeading} />}
                    </div>

                    {/* GitHub-style unified diff */}
                    <DiffPreview
                        op={amendment.op as "ADD" | "EDIT" | "REMOVE"}
                        targetArticle={targetArticle ? {
                            id: targetArticle.id,
                            order: targetArticle.order,
                            heading: targetArticle.heading,
                            body: targetArticle.body,
                        } : null}
                        newHeading={amendment.newHeading ?? ""}
                        newBody={amendment.newBody ?? ""}
                    />
                </section>
            </section>
        </main>
    );
}

/* -------- helper components -------- */

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
                const vote = byCountry.get(c.id) ?? null;
                const flagSrc = `/flags/${(c.code || "unknown").toLowerCase()}.svg`;
                return (
                    <div key={c.id} className="flex flex-col items-center">
                        <div className="relative h-[120px] w-[220px] overflow-hidden rounded-[2px] border-[6px] border-stone-900 bg-white">
                            <FlagImage src={flagSrc} alt={`${c.name} flag`} sizes="220px" className="object-cover" />
                        </div>
                        <div className="mt-6 h-[64px] w-[64px] rounded-[2px] border-[6px] border-stone-900 bg-white">
                            {vote && <div className={`h-full w-full ${choiceColor(vote)}`} />}
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

const Meter = ({ totalMembers, votes }: { totalMembers: number; votes: { choice: Choice }[] }) => {
    const aye = votes.filter(v => v.choice === "AYE").length;
    const nay = votes.filter(v => v.choice === "NAY").length;
    const abstain = votes.filter(v => v.choice === "ABSTAIN").length;
    const ayePct = pct(aye, totalMembers);
    const thresholdCount = Math.ceil((2 / 3) * totalMembers);
    const thresholdPct = clampPct((2 / 3) * 100);

    return (
        <section className="mx-auto mt-8 max-w-4xl">
            <div className="relative h-10 rounded border-2 border-stone-900 bg-stone-100 shadow-[0_2px_0_rgba(0,0,0,1)]">
                <div className="absolute inset-y-0 left-0 rounded-l bg-emerald-600" style={{ width: `${ayePct}%` }} />
                <div className="absolute inset-y-0 w-[2px] bg-stone-900" style={{ left: `${thresholdPct}%` }} title="Two-thirds threshold" />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-stone-300">
                <span>Aye {aye} • Nay {nay} • Abstain {abstain}</span>
                <span>{thresholdCount} of {totalMembers} required</span>
            </div>
        </section>
    );
};

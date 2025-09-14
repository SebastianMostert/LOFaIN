import { prisma } from "@/prisma";
import { closeExpiredAmendments } from "@/utils/amendments";
import { epunda } from "@/app/fonts";
import { notFound, redirect } from "next/navigation";
import FlagImage from "@/components/FlagImage";
import SlideOutVoteTab from "@/components/Vote/SlideOutVoteTab";
import DiffPreview from "@/components/DiffPreview";
import StatusBanner from "@/components/Amendment/StatusBanner";
import VoteMeter from "@/components/Amendment/VoteMeter";
import VoteSummary from "@/components/Amendment/VoteSummary";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

type Choice = "AYE" | "NAY" | "ABSTAIN" | "ABSENT";

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

            proposerUser: { select: { id: true, name: true } },
            proposerCountry: { select: { id: true, name: true, slug: true, code: true } },
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
                {/* Byline: proposer */}
                <div className="mt-2 flex items-center justify-center gap-2 text-sm text-stone-300">
                    {amendment.proposerCountry && (
                        <span className="inline-flex items-center gap-2">
                            <span className="relative inline-block h-4 w-6 overflow-hidden rounded-[2px] border border-stone-800 bg-white align-middle">
                                <FlagImage
                                    src={`/flags/${(amendment.proposerCountry.code || "unknown").toLowerCase()}.svg`}
                                    alt={`${amendment.proposerCountry.name} flag`}
                                    sizes="24px"
                                    className="object-cover"
                                />
                            </span>
                            <span className="truncate">
                                <>Proposed by the <span className="font-medium text-stone-200">{amendment.proposerCountry.name}</span></>
                            </span>
                        </span>
                    )}

                    {!amendment.proposerCountry && amendment.proposerUser?.name && (
                        <span>
                            Proposed by <span className="font-medium text-stone-200">{amendment.proposerUser.name}</span>
                        </span>
                    )}

                    {!amendment.proposerCountry && !amendment.proposerUser && (
                        <span className="italic text-stone-400">Proposer not recorded</span>
                    )}
                </div>


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
            <VoteMeter
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

                    <VoteSummary countries={countries} byCountry={byCountry} />
                </div>

                {/* Details + Content */}
                <section className="mt-12 space-y-4">
                    <h2 className={`${epunda.className} text-xl font-semibold text-stone-100`}>Amendment Details</h2>

                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                        <Detail label="Operation" value={labelForOp(amendment.op)} />
                        {targetArticle && (
                            <Detail
                                label="Target Article"
                                value={`Article ${targetArticle.order}: ${targetArticle.heading}`}
                            />
                        )}
                        {amendment.newHeading && <Detail label="New Heading" value={amendment.newHeading} />}
                    </div>

                    <AmendmentContent
                        status={status}
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <article className="rounded-lg border border-stone-700 bg-stone-900 p-5">
            <h3 className={`${epunda.className} text-lg font-semibold text-stone-100`}>{title}</h3>
            <div className="mt-3 text-stone-300 leading-relaxed">{children}</div>
        </article>
    );
}

/** Shows Diff while OPEN; shows Proposed Text when CLOSED (no diff). */
function AmendmentContent({
    status,
    op,
    targetArticle,
    newHeading,
    newBody,
}: {
    status: "OPEN" | "CLOSED" | string;
    op: "ADD" | "EDIT" | "REMOVE";
    targetArticle: { id: string; order: number; heading: string; body: string } | null;
    newHeading: string;
    newBody: string;
}) {
    const isOpen = status === "OPEN";

    if (isOpen) {
        // Keep your live diff while voting is open
        return (
            <DiffPreview
                op={op}
                targetArticle={targetArticle}
                newHeading={newHeading}
                newBody={newBody}
            />
        );
    }

    // CLOSED: show the clean proposed text instead of a diff
    if (op === "REMOVE") {
        return (
            <SectionCard title="Proposed Amendment Text">
                <div className="rounded-md border border-rose-800/50 bg-rose-950/30 px-3 py-2 text-rose-200">
                    Proposed removal of{" "}
                    {targetArticle
                        ? <>Article {targetArticle.order}: <span className="font-medium text-rose-100">{targetArticle.heading}</span></>
                        : "the specified article"}
                    .
                </div>
                {targetArticle?.body && (
                    <p className="mt-3 text-sm text-stone-400">
                        (Original text not shown here to avoid stale snapshots. See article history for prior versions.)
                    </p>
                )}
            </SectionCard>
        );
    }

    // ADD / EDIT: show the proposed final text
    const finalHeading =
        (op === "EDIT" && newHeading) ? newHeading
            : (op === "EDIT" && targetArticle) ? targetArticle.heading
                : newHeading;

    const finalBody = newBody; // for EDIT/ADD this is the proposed final body

    return (
        <SectionCard title="Proposed Amendment Text">
            {finalHeading && (
                <h4 className="text-base font-semibold text-stone-100">
                    {targetArticle ? `Article ${targetArticle.order}: ` : ""}{finalHeading}
                </h4>
            )}
            {finalBody ? (
                <div className="prose prose-invert mt-3 max-w-none whitespace-pre-wrap">
                    {finalBody}
                </div>
            ) : (
                <p className="mt-2 text-stone-400 italic">No body text provided.</p>
            )}
        </SectionCard>
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

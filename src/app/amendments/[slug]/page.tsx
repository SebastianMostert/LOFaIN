import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth, getSignInPath } from "@/auth";
import { epunda } from "@/app/fonts";
import StatusBanner from "@/components/Amendment/StatusBanner";
import VoteMeter from "@/components/Amendment/VoteMeter";
import VoteSummary from "@/components/Amendment/VoteSummary";
import DiffPreview from "@/components/DiffPreview";
import FlagImage from "@/components/FlagImage";
import SlideOutVoteTab from "@/components/Vote/SlideOutVoteTab";
import { prisma } from "@/prisma";
import { closeExpiredAmendments } from "@/utils/amendments";
import { formatDateTime, formatDeadline } from "@/utils/formatting";
import { toRoman } from "@/utils/roman-numerals";
import Link from "next/link";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const url = `${baseUrl}/amendments/${slug}`;
  return {
    title: "Amendment - League",
    description: "View details of a treaty amendment.",
    keywords: ["amendment", "league"],
    alternates: { canonical: url },
    openGraph: {
      title: "Amendment - League",
      description: "View details of a treaty amendment.",
      url,
      images: [{ url: `${baseUrl}/logo.png`, alt: "League logo" }],
    },
  };
}

type Choice = "AYE" | "NAY" | "ABSTAIN" | "ABSENT";
const articleAnchor = (order: number) => `/treaty#art-${toRoman(order)}`;

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900 p-3">
      <div className="text-xs uppercase tracking-[0.24em] text-stone-400">{label}</div>
      <div className="mt-1 font-medium text-stone-100">{value}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-stone-700 bg-stone-900 p-5">
      <h3 className={`${epunda.className} text-lg font-semibold text-stone-100`}>{title}</h3>
      <div className="mt-3 leading-relaxed text-stone-300">{children}</div>
    </article>
  );
}

function labelForOp(op: "ADD" | "EDIT" | "REMOVE") {
  switch (op) {
    case "ADD":
      return "Add new article";
    case "EDIT":
      return "Edit existing article";
    case "REMOVE":
      return "Remove article";
    default:
      return op;
  }
}

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
  if (status === "OPEN") {
    return (
      <DiffPreview
        op={op}
        targetArticle={targetArticle}
        newHeading={newHeading}
        newBody={newBody}
      />
    );
  }

  if (op === "REMOVE") {
    return (
      <SectionCard title="Proposed Amendment Text">
        <div className="rounded-md border border-rose-800/50 bg-rose-950/30 px-3 py-2 text-rose-200">
          Proposed removal of{" "}
          {targetArticle ? (
            <>
              Article {targetArticle.order}: <span className="font-medium text-rose-100">{targetArticle.heading}</span>
            </>
          ) : (
            "the specified article"
          )}
          .
        </div>
        {targetArticle?.body && (
          <p className="mt-3 text-sm text-stone-400">
            Original text is not repeated here to avoid stale snapshots. Refer to the treaty article directly for the current wording.
          </p>
        )}
      </SectionCard>
    );
  }

  const finalHeading =
    op === "EDIT" && newHeading ? newHeading : op === "EDIT" && targetArticle ? targetArticle.heading : newHeading;
  const finalBody = newBody;

  return (
    <SectionCard title="Proposed Amendment Text">
      {finalHeading && (
        <h4 className="text-base font-semibold text-stone-100">
          {targetArticle ? `Article ${targetArticle.order}: ` : ""}
          {finalHeading}
        </h4>
      )}
      {finalBody ? (
        <div className="mt-3 whitespace-pre-wrap text-stone-200">{finalBody}</div>
      ) : (
        <p className="mt-2 italic text-stone-400">No body text provided.</p>
      )}
    </SectionCard>
  );
}

export default async function AmendmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const awaitedParams = await params;
  const session = await auth();
  const user = session?.user;
  if (!session) redirect(getSignInPath(`/amendments/${awaitedParams.slug}`));

  await closeExpiredAmendments(awaitedParams.slug);

  const amendment = await prisma.amendment.findUnique({
    where: { slug: awaitedParams.slug },
    select: {
      id: true,
      slug: true,
      title: true,
      rationale: true,
      status: true,
      result: true,
      opensAt: true,
      closesAt: true,
      eligibleCount: true,
      failureReason: true,
      op: true,
      newHeading: true,
      newBody: true,
      targetArticleId: true,
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
  amendment.votes.forEach((vote) => byCountry.set(vote.countryId, vote.choice as Choice));

  const countriesMap = new Map(countries.map((country) => [country.id, country]));
  const vetoers = amendment.votes
    .filter((vote) => vote.choice === "NAY" && countriesMap.get(vote.countryId)?.hasVeto)
    .map((vote) => countriesMap.get(vote.countryId)!.name);
  const vetoUsed = vetoers.length > 0;
  const totalMembers = amendment.eligibleCount || countries.length || 1;
  const myVote = user?.countryId ? byCountry.get(user.countryId) : undefined;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 text-stone-100">
      <SlideOutVoteTab slug={amendment.slug} status={amendment.status} myVote={myVote || null} />

      <header className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6 text-center">
        <div className="text-xs uppercase tracking-[0.28em] text-stone-400">Amendment dossier</div>
        <h1 className={`${epunda.className} mt-2 text-4xl font-extrabold sm:text-5xl`}>{amendment.title}</h1>
        <div className="mx-auto mt-3 h-[3px] w-40 bg-red-600" />

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-stone-300">
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
              Proposed by the <span className="font-medium text-stone-200">{amendment.proposerCountry.name}</span>
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

        <div className="mt-5 flex flex-col items-center gap-3">
          <StatusBanner
            status={amendment.status}
            result={amendment.result}
            closesAt={amendment.closesAt ?? null}
            failureReason={amendment.failureReason ?? null}
          />
          {amendment.closesAt && (
            <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
              {formatDeadline(amendment.closesAt)}. Scheduled close: {formatDateTime(amendment.closesAt)}.
            </div>
          )}
          {amendment.status === "OPEN" && vetoUsed && (
            <div className="rounded-md border border-rose-700 bg-rose-900/40 px-3 py-1 text-sm text-rose-200">
              Veto used by {vetoers.join(", ")}. The amendment will fail unless withdrawn.
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {targetArticle && (
            <Link
              href={articleAnchor(targetArticle.order)}
              className="rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
            >
              Open target article
            </Link>
          )}
          <Link
            href={`/amendments/${amendment.slug}/discussion`}
            className="rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
          >
            Open discussion
          </Link>
        </div>
      </header>

      <VoteMeter
        totalMembers={totalMembers}
        votes={amendment.votes as { choice: Choice }[]}
        closed={amendment.status !== "OPEN"}
        result={amendment.result ?? null}
      />

      <section className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {amendment.rationale && (
            <article className="rounded-2xl border border-stone-700 bg-stone-900 p-5">
              <h2 className={`${epunda.className} text-xl font-semibold text-stone-100`}>Amendment Summary</h2>
              <p className="mt-2 whitespace-pre-wrap leading-relaxed text-stone-300">{amendment.rationale}</p>
            </article>
          )}

          <section className="space-y-4">
            <h2 className={`${epunda.className} text-xl font-semibold text-stone-100`}>Amendment Details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="Operation" value={labelForOp(amendment.op)} />
              {targetArticle ? (
                <Detail
                  label="Target Article"
                  value={
                    <Link
                      href={articleAnchor(targetArticle.order)}
                      className="text-amber-200 hover:text-amber-100"
                    >
                      Article {targetArticle.order}: {targetArticle.heading}
                    </Link>
                  }
                />
              ) : null}
              {amendment.newHeading && <Detail label="New Heading" value={amendment.newHeading} />}
              {amendment.opensAt && <Detail label="Voting Opened" value={formatDateTime(amendment.opensAt)} />}
            </div>

            <AmendmentContent
              status={amendment.status}
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
        </div>

        <aside className="space-y-6">
          <VoteSummary countries={countries} byCountry={byCountry} />
          <SectionCard title="Voting Window">
            <ul className="space-y-2 text-sm">
              <li>Opens: {formatDateTime(amendment.opensAt)}</li>
              <li>Closes: {formatDateTime(amendment.closesAt)}</li>
              <li>{formatDeadline(amendment.closesAt)}</li>
            </ul>
          </SectionCard>
        </aside>
      </section>
    </main>
  );
}

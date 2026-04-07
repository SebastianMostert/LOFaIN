import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth, getSignInPath } from "@/auth";
import { epunda } from "@/app/fonts";
import StatusBanner from "@/components/Amendment/StatusBanner";
import OpenVotingButton from "@/components/Amendment/OpenVotingButton";
import VoteMeter from "@/components/Amendment/VoteMeter";
import VoteSummary from "@/components/Amendment/VoteSummary";
import DiffPreview from "@/components/DiffPreview";
import FlagImage from "@/components/FlagImage";
import SlideOutVoteTab from "@/components/Vote/SlideOutVoteTab";
import { prisma } from "@/prisma";
import { closeExpiredAmendments } from "@/utils/amendments";
import { formatArticleHeading, stripArticlePrefix } from "@/utils/articleHeadings";
import { getEligibleVotingCountries } from "@/utils/country";
import { getCountryFlagSrc } from "@/utils/flags";
import { formatDateTime, formatDeadline } from "@/utils/formatting";
import { toRoman } from "@/utils/roman-numerals";
import { getCurrentSimulatedNow } from "@/utils/time/server";
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
    <div className="rounded-xl border border-stone-800 bg-stone-900 p-3 sm:p-4">
      <div className="text-xs uppercase tracking-[0.24em] text-stone-400">{label}</div>
      <div className="mt-1 break-words font-medium text-stone-100">{value}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-stone-700 bg-stone-900 p-4 sm:p-5">
      <h3 className={`${epunda.className} text-lg font-semibold text-stone-100 sm:text-xl`}>{title}</h3>
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
  newOrder,
  targetArticle,
  newHeading,
  newBody,
}: {
  status: "OPEN" | "CLOSED" | string;
  op: "ADD" | "EDIT" | "REMOVE";
  newOrder: number | null;
  targetArticle: { id: string; order: number; heading: string; body: string } | null;
  newHeading: string;
  newBody: string;
}) {
  if (status === "OPEN") {
    return (
      <DiffPreview
        op={op}
        targetArticle={targetArticle}
        newOrder={newOrder}
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
              <span className="font-medium text-rose-100">{formatArticleHeading(targetArticle.order, targetArticle.heading)}</span>
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
          {targetArticle
            ? formatArticleHeading(targetArticle.order, finalHeading)
            : newOrder
              ? formatArticleHeading(newOrder, finalHeading)
              : stripArticlePrefix(finalHeading)}
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
      newOrder: true,
      targetArticleId: true,
      votes: { select: { choice: true, countryId: true } },
      proposerUser: { select: { id: true, name: true } },
      proposerCountry: { select: { id: true, name: true, slug: true, code: true, flagImagePath: true, flagAspectRatio: true } },
    },
  });
  if (!amendment) notFound();

  const discussionThread = await prisma.discussionThread.findFirst({
    where: { slug: { in: [`amendment-${amendment.slug}-discussion`, amendment.slug, `${amendment.slug}-discussion`] } },
    select: { id: true },
  });

  const targetArticle = amendment.targetArticleId
    ? await prisma.article.findUnique({
        where: { id: amendment.targetArticleId },
        select: { id: true, order: true, heading: true, body: true },
      })
    : null;

  const simulatedNow = await getCurrentSimulatedNow();
  const countries = await getEligibleVotingCountries(amendment.opensAt ?? amendment.closesAt ?? simulatedNow);

  const byCountry = new Map<string, Choice>();
  amendment.votes.forEach((vote) => byCountry.set(vote.countryId, vote.choice as Choice));

  const countriesMap = new Map(countries.map((country) => [country.id, country]));
  const vetoers = amendment.votes
    .filter((vote) => vote.choice === "NAY" && countriesMap.get(vote.countryId)?.hasVeto)
    .map((vote) => countriesMap.get(vote.countryId)!.name);
  const vetoUsed = vetoers.length > 0;
  const totalMembers = amendment.eligibleCount || countries.length || 1;
  const myVote = user?.countryId ? byCountry.get(user.countryId) : undefined;
  const canOpenVoting =
    amendment.status === "DRAFT" &&
    (
      (amendment.proposerCountry?.id != null && amendment.proposerCountry.id === user?.countryId) ||
      (amendment.proposerUser?.id != null && amendment.proposerUser.id === user?.id)
    );

  return (
    <main className="mx-auto max-w-7xl px-3 py-6 text-stone-100 sm:px-4 sm:py-10">
      <SlideOutVoteTab slug={amendment.slug} status={amendment.status} myVote={myVote || null} />

      <header className="rounded-3xl border border-stone-800 bg-stone-900/80 p-4 text-center sm:p-6">
        <div className="text-xs uppercase tracking-[0.28em] text-stone-400">Amendment dossier</div>
        <h1 className={`${epunda.className} mt-2 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl`}>{amendment.title}</h1>
        <div className="mx-auto mt-3 h-[3px] w-24 bg-red-600 sm:w-40" />

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-stone-300 sm:gap-3 sm:text-sm">
          {amendment.proposerCountry && (
            <span className="inline-flex items-center gap-2 text-left">
              <span className="relative inline-block h-4 w-6 overflow-hidden rounded-[2px] border border-stone-800 bg-white align-middle">
                <FlagImage
                  src={getCountryFlagSrc(amendment.proposerCountry)}
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
            opensAt={amendment.opensAt ?? null}
            closesAt={amendment.closesAt ?? null}
            failureReason={amendment.failureReason ?? null}
          />
          {amendment.status === "DRAFT" && (
            <div className="max-w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm leading-relaxed text-amber-100 sm:rounded-full">
              Debate comes first. Voting stays closed until the proposer opens the 24-hour vote.
            </div>
          )}
          {amendment.closesAt && amendment.status === "OPEN" && (
            <div className="max-w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm leading-relaxed text-amber-200 sm:rounded-full">
              {formatDeadline(amendment.closesAt, simulatedNow)}. Scheduled close: {formatDateTime(amendment.closesAt)}.
            </div>
          )}
          {amendment.status === "OPEN" && vetoUsed && (
            <div className="max-w-full rounded-md border border-rose-700 bg-rose-900/40 px-3 py-2 text-sm leading-relaxed text-rose-200">
              Veto used by {vetoers.join(", ")}. The amendment will fail unless withdrawn.
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row sm:flex-wrap">
          {targetArticle && (
            <Link
              href={articleAnchor(targetArticle.order)}
              className="rounded-full border border-stone-700 px-4 py-2 text-sm text-center text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
            >
              Open target article
            </Link>
          )}
          {amendment.status !== "CLOSED" && (
            <Link
              href={`/amendments/${amendment.slug}/discussion`}
              className="rounded-full border border-stone-700 px-4 py-2 text-sm text-center text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
            >
              {discussionThread ? "Open discussion" : "Start discussion"}
            </Link>
          )}
          {canOpenVoting && <OpenVotingButton slug={amendment.slug} />}
        </div>
      </header>

      {amendment.status === "DRAFT" ? (
        <section className="mx-auto mt-8 max-w-4xl rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-center text-sm leading-relaxed text-amber-100">
          No voting record exists yet. Use the discussion session to debate the text, then open voting when the chamber is ready.
        </section>
      ) : (
        <>
          <VoteMeter
            totalMembers={totalMembers}
            votes={amendment.votes as { choice: Choice }[]}
            closed={amendment.status !== "OPEN"}
            result={amendment.result ?? null}
          />

          <VoteSummary countries={countries} byCountry={byCountry} />
        </>
      )}

      <section className="mt-8 grid grid-cols-1 gap-6 lg:mt-10 lg:gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {amendment.rationale && (
            <article className="rounded-2xl border border-stone-700 bg-stone-900 p-4 sm:p-5">
              <h2 className={`${epunda.className} text-xl font-semibold text-stone-100 sm:text-2xl`}>Amendment Summary</h2>
              <p className="mt-2 whitespace-pre-wrap leading-relaxed text-stone-300">{amendment.rationale}</p>
            </article>
          )}

          <section className="space-y-4">
            <h2 className={`${epunda.className} text-xl font-semibold text-stone-100 sm:text-2xl`}>Amendment Details</h2>
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
                      {formatArticleHeading(targetArticle.order, targetArticle.heading)}
                    </Link>
                  }
                />
              ) : null}
              {amendment.newHeading && (
                <Detail
                  label="New Heading"
                  value={
                    targetArticle
                      ? formatArticleHeading(targetArticle.order, amendment.newHeading)
                      : amendment.newOrder
                        ? formatArticleHeading(amendment.newOrder, amendment.newHeading)
                        : stripArticlePrefix(amendment.newHeading)
                  }
                />
              )}
              {amendment.opensAt && <Detail label="Voting Opened" value={formatDateTime(amendment.opensAt)} />}
            </div>

            <AmendmentContent
              status={amendment.status}
              op={amendment.op as "ADD" | "EDIT" | "REMOVE"}
              newOrder={amendment.newOrder ?? null}
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
          <SectionCard title="Voting Window">
            {amendment.status === "DRAFT" ? (
              <p className="text-sm text-stone-300">
                Voting has not been scheduled yet. Once debate is complete, the proposer can open a 24-hour voting window.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                <li>Opens: {formatDateTime(amendment.opensAt)}</li>
                <li>Closes: {formatDateTime(amendment.closesAt)}</li>
                <li>{formatDeadline(amendment.closesAt, simulatedNow)}</li>
              </ul>
            )}
          </SectionCard>
        </aside>
      </section>
    </main>
  );
}

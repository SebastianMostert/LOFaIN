import Link from "next/link";
import type { Metadata } from "next";

import { epunda } from "@/app/fonts";
import { prisma } from "@/prisma";
import { getDebateRulesDocument } from "@/app/debate-rules/data";
import { getLeagueTreaty } from "@/app/treaty/data";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const metadata: Metadata = {
  title: "Documents",
  description: "Browse League documents, including the treaty, debate rules, and recorded chair rulings.",
  alternates: { canonical: `${baseUrl}/documents` },
  openGraph: {
    title: "Documents",
    description: "Browse League documents, including the treaty, debate rules, and recorded chair rulings.",
    url: `${baseUrl}/documents`,
  },
};

function formatDate(value: Date | null) {
  if (!value) return "Undated";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(value);
}

function getDiscussionHref(threadSlug: string | null) {
  if (!threadSlug) return null;
  if (threadSlug.startsWith("amendment-") && threadSlug.endsWith("-discussion")) {
    return `/amendments/${threadSlug.slice("amendment-".length, -"-discussion".length)}/discussion`;
  }
  if (threadSlug.endsWith("-discussion")) {
    return `/amendments/${threadSlug.slice(0, -"-discussion".length)}/discussion`;
  }
  return null;
}

export default async function DocumentsPage() {
  const [treaty, debateRules, chairLogs] = await Promise.all([
    getLeagueTreaty(),
    getDebateRulesDocument(),
    prisma.chairActionLog.findMany({
      where: { motionId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        note: true,
        createdAt: true,
        metadata: true,
        motion: {
          select: {
            title: true,
            targetThread: {
              select: {
                title: true,
                slug: true,
              },
            },
          },
        },
        actorCountry: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const rulings = chairLogs
    .map((log) => {
      const metadata = log.metadata && typeof log.metadata === "object" ? (log.metadata as Record<string, unknown>) : null;
      const outcome = typeof metadata?.outcome === "string" ? metadata.outcome : null;
      if (!outcome) return null;

      return {
        id: log.id,
        note: log.note ?? `${outcome} ruling issued`,
        createdAt: log.createdAt,
        outcome,
        motionTitle: log.motion?.title ?? "Untitled motion",
        threadTitle: log.motion?.targetThread?.title ?? null,
        threadSlug: log.motion?.targetThread?.slug ?? null,
        actorCountryName: log.actorCountry?.name ?? null,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const latestTreatySnapshot = treaty.snapshots[treaty.snapshots.length - 1]!;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),transparent_28%),linear-gradient(180deg,#1c1917_0%,#0c0a09_100%)] px-4 py-10 text-stone-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[2rem] border border-amber-700/40 bg-stone-950/70 px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:px-10">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-200/80">League Archive</p>
          <h1 className={`${epunda.className} mt-4 text-4xl text-stone-50 sm:text-5xl`}>Documents</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-300 sm:text-base">
            Canonical texts, procedural rules, and recorded chair rulings are collected here.
          </p>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="rounded-[1.75rem] border border-stone-800 bg-stone-950/65 p-6">
            <div className="text-xs uppercase tracking-[0.3em] text-stone-500">Founding Instrument</div>
            <h2 className={`${epunda.className} mt-3 text-3xl text-stone-50`}>{treaty.title}</h2>
            <p className="mt-3 text-sm leading-7 text-stone-300">
              Current text with historical revisions. Latest archived revision: {latestTreatySnapshot.label}, dated {formatDate(latestTreatySnapshot.date)}.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <Link href="/treaty" className="rounded-full border border-amber-600/50 bg-amber-500/10 px-4 py-2 font-semibold text-amber-100 hover:bg-amber-500/20">
                Read treaty
              </Link>
              <Link href="/treaty/history" className="rounded-full border border-stone-700 bg-stone-900/80 px-4 py-2 font-semibold text-stone-100 hover:border-stone-500">
                View history
              </Link>
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-stone-800 bg-stone-950/65 p-6">
            <div className="text-xs uppercase tracking-[0.3em] text-stone-500">Procedural Code</div>
            <h2 className={`${epunda.className} mt-3 text-3xl text-stone-50`}>{debateRules.title}</h2>
            <p className="mt-3 text-sm leading-7 text-stone-300">
              {debateRules.summary} Adopted {formatDate(debateRules.adoptedAt)}.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <Link href="/debate-rules" className="rounded-full border border-amber-600/50 bg-amber-500/10 px-4 py-2 font-semibold text-amber-100 hover:bg-amber-500/20">
                Read debate rules
              </Link>
            </div>
          </article>
        </section>

        <section className="mt-8 rounded-[1.75rem] border border-stone-800 bg-stone-950/65 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-stone-500">Chair Rulings</div>
              <h2 className={`${epunda.className} mt-3 text-3xl text-stone-50`}>Recorded Rulings</h2>
            </div>
            <div className="text-sm text-stone-400">{rulings.length} archived entries</div>
          </div>

          {rulings.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-stone-700 px-4 py-5 text-sm text-stone-400">
              No chair rulings have been recorded yet.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {rulings.map((ruling) => (
                <article key={ruling.id} className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-stone-500">
                    <span>{ruling.outcome}</span>
                    <span>{formatDate(ruling.createdAt)}</span>
                    {ruling.actorCountryName && <span>By {ruling.actorCountryName}</span>}
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-stone-100">{ruling.motionTitle}</h3>
                  <p className="mt-2 text-sm leading-7 text-stone-300">{ruling.note}</p>
                  {getDiscussionHref(ruling.threadSlug) && (
                    <Link
                      href={getDiscussionHref(ruling.threadSlug)!}
                      className="mt-3 inline-flex text-sm font-semibold text-amber-200 hover:text-amber-100"
                    >
                      {ruling.threadTitle ?? "Open debate record"}
                    </Link>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { epunda } from "@/app/fonts";
import { prisma } from "@/prisma";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const metadata: Metadata = {
  title: "Home - League",
  description: "Portal for the League of Free and Independent Nations.",
  keywords: ["league", "documents", "amendments", "home"],
  alternates: { canonical: `${baseUrl}/` },
  openGraph: {
    title: "Home - League",
    description: "Portal for the League of Free and Independent Nations.",
    url: `${baseUrl}/`,
    images: [{ url: `${baseUrl}/logo.png`, alt: "League logo" }],
  },
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-700/80 bg-stone-900/90 p-4">
      <div className={`${epunda.className} text-3xl font-bold text-stone-100`}>{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.24em] text-stone-300">{label}</div>
    </div>
  );
}

function CTA({ href, label, tone = "dark" }: { href: string; label: string; tone?: "dark" | "light" }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full px-5 py-3 text-sm font-semibold transition ${
        tone === "light"
          ? "bg-stone-100 text-stone-950 hover:bg-white"
          : "border border-stone-600 bg-stone-900/60 text-stone-100 hover:border-stone-400 hover:bg-stone-800"
      }`}
    >
      {label}
    </Link>
  );
}

export default async function HomePage() {
  const [amendmentCount, memberCount, articleCount, openAmendments, rulingCount] = await Promise.all([
    prisma.amendment.count(),
    prisma.country.count({ where: { isActive: true } }),
    prisma.article.count({ where: { treaty: { adopted: true } } }),
    prisma.amendment.count({ where: { status: "OPEN" } }),
    prisma.chairActionLog.count({ where: { motionId: { not: null } } }),
  ]);

  return (
    <>
      <section className="relative overflow-hidden bg-stone-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(180,83,9,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,0.16),transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.2fr)_360px]">
            <div className="max-w-3xl">
              <div className="text-xs uppercase tracking-[0.34em] text-stone-400">League Record Office</div>
              <h1 className={`${epunda.className} mt-4 text-4xl font-extrabold leading-tight text-stone-100 sm:text-5xl`}>
                The public archive and working floor of the League
              </h1>
              <div className="mt-4 h-px w-28 bg-gradient-to-r from-amber-500/60 to-stone-400" />
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-200">
                Read the League&apos;s governing documents, track live amendments, and follow recorded procedure in one place.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <CTA href="/documents" label="Open documents" tone="light" />
                <CTA href="/amendments" label="Review amendments" />
                <CTA href="/members" label="Browse members" />
              </div>
              <div className="mt-5 text-sm text-stone-300">
                {openAmendments > 0
                  ? `${openAmendments} open ${openAmendments === 1 ? "amendment" : "amendments"} currently need attention.`
                  : "No amendments are open for voting right now."}
              </div>
            </div>

            <aside className="rounded-3xl border border-stone-700/80 bg-stone-900/80 p-6 shadow-2xl">
              <div className="text-xs uppercase tracking-[0.28em] text-stone-400">At A Glance</div>
              <div className="mt-4 space-y-4 text-sm text-stone-200">
                <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
                  <div className="font-semibold text-stone-100">Documents</div>
                  <div className="mt-1 text-stone-300">Treaty text, debate rules, and recorded chair rulings.</div>
                </div>
                <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
                  <div className="font-semibold text-stone-100">Active business</div>
                  <div className="mt-1 text-stone-300">Open amendments, pending votes, and live debate threads.</div>
                </div>
                <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
                  <div className="font-semibold text-stone-100">Member states</div>
                  <div className="mt-1 text-stone-300">Delegation roster, flags, and public state profiles.</div>
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Amendments" value={amendmentCount.toString()} />
            <Stat label="Member States" value={memberCount.toString()} />
            <Stat label="Treaty Articles" value={articleCount.toString()} />
            <Stat label="Recorded Rulings" value={rulingCount.toString()} />
          </div>
        </div>
      </section>

      <section className="border-t border-stone-800 bg-stone-950/80">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 lg:grid-cols-3">
          <article className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-stone-400">Documents</div>
            <h2 className={`${epunda.className} mt-2 text-2xl text-stone-100`}>The League&apos;s core texts in one archive</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-300">
              Use the documents archive to move between the treaty, procedural rules, and formal rulings without hunting through separate pages.
            </p>
            <Link href="/documents" className="mt-5 inline-flex text-sm font-semibold text-amber-200 hover:text-amber-100">
              Open documents
            </Link>
          </article>
          <article className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-stone-400">Amendments</div>
            <h2 className={`${epunda.className} mt-2 text-2xl text-stone-100`}>Open business and voting deadlines</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-300">
              Track proposals, see what is open, and move directly into the debates and votes that still need attention.
            </p>
            <Link href="/amendments" className="mt-5 inline-flex text-sm font-semibold text-amber-200 hover:text-amber-100">
              Review amendments
            </Link>
          </article>
          <article className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-stone-400">Members</div>
            <h2 className={`${epunda.className} mt-2 text-2xl text-stone-100`}>States, delegates, and public profiles</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-300">
              Member pages surface delegation context, state identity, and current standing within the League&apos;s order.
            </p>
            <Link href="/members" className="mt-5 inline-flex text-sm font-semibold text-amber-200 hover:text-amber-100">
              Browse members
            </Link>
          </article>
        </div>
      </section>
    </>
  );
}

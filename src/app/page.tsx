import Link from "next/link";
import type { Metadata } from "next";
import { epunda } from "@/app/fonts";
import { prisma } from "@/prisma";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const metadata: Metadata = {
  title: "Home - League",
  description: "Portal for the League of Free and Independent Nations.",
  keywords: ["league", "treaty", "home"],
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
  const [amendmentCount, memberCount, articleCount, openAmendments] = await Promise.all([
    prisma.amendment.count(),
    prisma.country.count({ where: { isActive: true } }),
    prisma.article.count({ where: { treaty: { adopted: true } } }),
    prisma.amendment.count({ where: { status: "OPEN" } }),
  ]);

  return (
    <>
      <section className="relative overflow-hidden bg-stone-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(180,83,9,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,0.16),transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.2fr)_320px]">
            <div className="max-w-3xl">
              <div className="text-xs uppercase tracking-[0.34em] text-stone-400">League Treaty Portal</div>
              <h1 className={`${epunda.className} mt-4 text-4xl font-extrabold leading-tight text-stone-100 sm:text-5xl`}>
                Treaty of the League of Free and Independent Nations
              </h1>
              <div className="mt-4 h-px w-28 bg-gradient-to-r from-amber-500/60 to-stone-400" />
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-200">
                Review the treaty text, track live amendments, and keep delegates aligned on votes and council procedure.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <CTA href="/treaty" label="Read the treaty" tone="light" />
                <CTA href="/amendments" label="Review amendments" />
                <CTA href="/amendments?status=OPEN" label="Join discussion" />
              </div>
              <div className="mt-5 text-sm text-stone-300">
                {openAmendments > 0
                  ? `${openAmendments} open ${openAmendments === 1 ? "amendment" : "amendments"} currently need attention.`
                  : "No amendments are open for voting right now."}
              </div>
            </div>

            <aside className="rounded-3xl border border-stone-700/80 bg-stone-900/80 p-6 shadow-2xl">
              <div className="text-xs uppercase tracking-[0.28em] text-stone-400">Quick Access</div>
              <ul className="mt-4 space-y-3 text-sm text-stone-200">
                <li className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
                  <div className="font-semibold text-stone-100">Treaty text</div>
                  <div className="mt-1 text-stone-300">Search articles and jump directly to a section.</div>
                </li>
                <li className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
                  <div className="font-semibold text-stone-100">Amendment votes</div>
                  <div className="mt-1 text-stone-300">Track deadlines, current tallies, and pending votes.</div>
                </li>
                <li className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
                  <div className="font-semibold text-stone-100">Member directory</div>
                  <div className="mt-1 text-stone-300">Review flags, delegates, veto status, and public profiles.</div>
                </li>
              </ul>
            </aside>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Amendments" value={amendmentCount.toString()} />
            <Stat label="Member States" value={memberCount.toString()} />
            <Stat label="Ratified Articles" value={articleCount.toString()} />
            <Stat label="Open Votes" value={openAmendments.toString()} />
          </div>
        </div>
      </section>

      <section className="border-t border-stone-800 bg-stone-950/80">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 lg:grid-cols-3">
          <article className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-stone-400">Treaty Spotlight</div>
            <h2 className={`${epunda.className} mt-2 text-2xl text-stone-100`}>Constitutional text with live navigation</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-300">
              The treaty view now serves as the canonical reading experience, with search, article anchors, and a persistent contents rail.
            </p>
            <Link href="/treaty" className="mt-5 inline-flex text-sm font-semibold text-amber-200 hover:text-amber-100">
              Open treaty
            </Link>
          </article>
          <article className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-stone-400">Amendment Flow</div>
            <h2 className={`${epunda.className} mt-2 text-2xl text-stone-100`}>Votes, filters, and closing windows</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-300">
              Open proposals surface deadlines more clearly and keep uncast votes easier to find.
            </p>
            <Link href="/amendments" className="mt-5 inline-flex text-sm font-semibold text-amber-200 hover:text-amber-100">
              Review amendments
            </Link>
          </article>
          <article className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-stone-400">Delegations</div>
            <h2 className={`${epunda.className} mt-2 text-2xl text-stone-100`}>Public profiles with country context</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-300">
              Member pages now foreground flags, joined dates, veto rights, and current chair status.
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

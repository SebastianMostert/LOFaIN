"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { epunda } from "@/app/fonts";
import { formatArticleHeading, stripArticlePrefix } from "@/utils/articleHeadings";
import { formatDate } from "@/utils/formatting";
import { toRoman } from "@/utils/roman-numerals";
import DownloadPdfButton from "./DownloadPdfButton";

const anchorFor = (order: number) => `art-${toRoman(order)}`;
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const snapshotTone = (index: number, total: number) => {
  if (index === total - 1) return "Current text";
  if (index === 0) return "Founding text";
  return `Revision ${index}`;
};

type TreatySnapshot = {
  id: string;
  label: string;
  date: Date | string | null;
  summary: string;
  sourceAmendmentSlug: string | null;
  sourceAmendmentTitle: string | null;
  preamble: string | null;
  articles: {
    id: string;
    body: string;
    order: number;
    heading: string;
  }[];
};

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-3 leading-relaxed text-stone-200">{children}</p>
);

function Clause({
  n,
  text,
  highlight,
}: {
  n: string;
  text: string;
  highlight: (s: string) => React.ReactNode;
}) {
  return (
    <p className="mt-4 flex leading-relaxed">
      <span className="mr-3 w-8 shrink-0 text-right font-semibold text-stone-100">{n}.</span>
      <span className="flex-1">{highlight(text)}</span>
    </p>
  );
}

function SubClause({
  letter,
  text,
  highlight,
}: {
  letter: string;
  text: string;
  highlight: (s: string) => React.ReactNode;
}) {
  return (
    <p className="mt-1 flex pl-8 leading-relaxed">
      <span className="mr-3 w-6 shrink-0 text-right font-semibold text-stone-200">({letter})</span>
      <span className="flex-1">{highlight(text)}</span>
    </p>
  );
}

function ArticleBody({
  body,
  highlight,
}: {
  body: string;
  highlight: (s: string) => React.ReactNode;
}) {
  const lines = body.split(/\r?\n/);
  return (
    <div>
      {lines.map((raw, idx) => {
        const line = raw.trim();
        if (!line) return <div key={`gap-${idx}`} className="h-2" />;

        const mNum = line.match(/^(\d+)\.\s+(.*)$/);
        if (mNum) {
          return <Clause key={`n-${idx}`} n={mNum[1]} text={mNum[2]} highlight={highlight} />;
        }

        const mSub = line.match(/^(?:\(([A-Za-z])\)|([A-Za-z])\)|([A-Za-z])\.)\s+(.*)$/);
        if (mSub) {
          const letter = (mSub[1] || mSub[2] || mSub[3] || "").toLowerCase();
          return <SubClause key={`s-${idx}`} letter={letter} text={mSub[4] ?? ""} highlight={highlight} />;
        }

        return (
          <p key={`p-${idx}`} className="mt-3 leading-relaxed">
            {highlight(line)}
          </p>
        );
      })}
    </div>
  );
}

function splitPreambleNicely(text: string) {
  return text
    .replace(/\s+(?=(WISHING|DETERMINED|RECOGNISING|AGREEING)\b)/g, "\n\n")
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function TOC({
  articles,
  activeId,
}: {
  articles: { id: string; order: number; heading: string }[];
  activeId: string;
}) {
  const linkClasses = (id: string) =>
    `block rounded-xl px-3 py-2 transition ${
      activeId === id ? "bg-stone-100 text-stone-950" : "text-stone-300 hover:bg-stone-800 hover:text-stone-50"
    }`;

  return (
    <aside className="order-1 lg:sticky lg:top-24 lg:self-start">
      <nav aria-label="Table of contents" className="rounded-2xl border border-stone-800 bg-stone-900 p-4">
        <div className={`${epunda.className} mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-stone-200`}>
          Contents
        </div>
        <ul className="space-y-1 text-sm">
          <li>
            <a href="#preamble" className={linkClasses("preamble")}>
              Preamble
            </a>
          </li>
          {articles.map((article) => {
            const id = anchorFor(article.order);
            return (
              <li key={article.id}>
                <a href={`#${id}`} className={linkClasses(id)}>
                  {formatArticleHeading(article.order, article.heading)}
                </a>
              </li>
            );
          })}
          <li>
            <a href="#sign" className={linkClasses("sign")}>
              Signatories
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

function SnapshotChooser({
  snapshots,
  selectedSnapshot,
  onSelect,
}: {
  snapshots: TreatySnapshot[];
  selectedSnapshot: TreatySnapshot;
  onSelect: (id: string) => void;
}) {
  const selectedSnapshotIndex = snapshots.findIndex((snapshot) => snapshot.id === selectedSnapshot.id);

  return (
    <section className="mb-6 overflow-hidden rounded-[2rem] border border-stone-800 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.08),_transparent_30%),linear-gradient(180deg,rgba(28,25,23,0.94),rgba(12,10,9,0.96))] p-5 sm:p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Historical versions</div>
            <h2 className={`${epunda.className} mt-2 text-2xl text-stone-50 sm:text-3xl`}>Choose a treaty version</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-300">
              Select a ratified revision to read the full treaty text as it stood at that point in time.
            </p>
          </div>
          <div className="rounded-full border border-stone-700 bg-stone-950/50 px-3 py-1 text-xs uppercase tracking-[0.18em] text-stone-300">
            {snapshots.length} versions
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {snapshots.map((snapshot, index) => {
            const active = snapshot.id === selectedSnapshot.id;
            return (
              <button
                key={snapshot.id}
                type="button"
                onClick={() => onSelect(snapshot.id)}
                className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                  active
                    ? "border-amber-300 bg-amber-100 text-stone-950"
                    : "border-stone-700 bg-stone-950/80 text-stone-200 hover:border-stone-500 hover:bg-stone-900"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`text-[11px] uppercase tracking-[0.24em] ${active ? "text-stone-700" : "text-stone-500"}`}>
                      {snapshotTone(index, snapshots.length)}
                    </div>
                    <div className={`mt-1 text-xs ${active ? "text-stone-700" : "text-stone-400"}`}>
                      {snapshot.date ? formatDate(snapshot.date) : "Undated"}
                    </div>
                  </div>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                      active ? "border-stone-950/15 bg-stone-950/10" : "border-stone-600 bg-stone-900"
                    }`}
                  >
                    {index + 1}
                  </div>
                </div>
                <div className="mt-4 text-sm font-semibold leading-snug">{snapshot.summary}</div>
                <div className={`mt-3 text-xs ${active ? "text-stone-700" : "text-stone-400"}`}>
                  {snapshot.sourceAmendmentSlug ? "Ratified amendment" : "Original signed instrument"}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-[1.5rem] border border-stone-800 bg-stone-950/50 p-4 text-sm text-stone-300">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-semibold text-stone-100">{selectedSnapshot.summary}</span>
              {selectedSnapshot.date ? ` | ${formatDate(selectedSnapshot.date)}` : ""}
            </div>
            <div className="text-xs uppercase tracking-[0.22em] text-stone-500">
              Step {selectedSnapshotIndex + 1} of {snapshots.length}
            </div>
          </div>
          <div className="mt-2">
            {selectedSnapshot.sourceAmendmentSlug ? (
              <>
                Entered force with{" "}
                <Link
                  href={`/amendments/${selectedSnapshot.sourceAmendmentSlug}`}
                  className="font-medium text-amber-200 hover:text-amber-100"
                >
                  {selectedSnapshot.sourceAmendmentTitle}
                </Link>
                .
              </>
            ) : (
              "This is the treaty as originally adopted."
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function TreatyClient({
  treaty,
  initialSnapshotId,
  showHistoryChooser = false,
  historyHref = "/treaty/history",
}: {
  treaty: {
    title: string;
    adoptedAt: Date | null;
    snapshots: TreatySnapshot[];
  };
  initialSnapshotId?: string;
  showHistoryChooser?: boolean;
  historyHref?: string;
}) {
  const latestSnapshot = treaty.snapshots[treaty.snapshots.length - 1]!;
  const initialSnapshot =
    treaty.snapshots.find((snapshot) => snapshot.id === initialSnapshotId) ?? latestSnapshot;
  const [query, setQuery] = useState("");
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(initialSnapshot.id);
  const [activeId, setActiveId] = useState("preamble");
  const normalized = query.trim().toLowerCase();
  const selectedSnapshot =
    treaty.snapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ?? initialSnapshot;

  const filteredArticles = useMemo(() => {
    if (!normalized) return selectedSnapshot.articles;
    return selectedSnapshot.articles.filter(
      (article) =>
                        stripArticlePrefix(article.heading).toLowerCase().includes(normalized) ||
        article.body.toLowerCase().includes(normalized),
    );
  }, [normalized, selectedSnapshot]);

  useEffect(() => {
    const ids = ["preamble", ...filteredArticles.map((article) => anchorFor(article.order)), "sign"];
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveId(visible.target.id);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.2, 0.45, 0.75],
      },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [filteredArticles]);

  const highlight = (text: string): React.ReactNode => {
    if (!normalized) return text;
    const regex = new RegExp(`(${escapeRegExp(normalized)})`, "gi");
    return text.split(regex).map((part, index) =>
      part.toLowerCase() === normalized ? (
        <mark key={index} className="rounded bg-amber-300 px-1 text-stone-950">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  const preamble = (selectedSnapshot.preamble ?? "").trim();

  return (
    <main className="bg-stone-950 text-stone-100">
      <section className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <div className="text-xs uppercase tracking-[0.28em] text-stone-400">Founding instrument</div>
          <h1 className={`${epunda.className} mt-2 text-3xl font-extrabold sm:text-4xl`}>{treaty.title}</h1>
          <div className="mt-3 h-px w-28 bg-gradient-to-r from-stone-700 to-stone-400" />
          {treaty.adoptedAt && (
            <p className="mt-3 text-stone-300">Done at Versailles, the Fifth day of June 1872.</p>
          )}
          {!showHistoryChooser && (
            <p className="mt-4 text-sm text-stone-400">
              <Link href={historyHref} className="text-stone-300 underline decoration-stone-600 underline-offset-4 hover:text-stone-100">
                View historical versions of the treaty
              </Link>
            </p>
          )}
        </header>

        {showHistoryChooser && (
          <SnapshotChooser
            snapshots={treaty.snapshots}
            selectedSnapshot={selectedSnapshot}
            onSelect={setSelectedSnapshotId}
          />
        )}

        <div className="mb-6 rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex-1">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-stone-400">Search the treaty</span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search headings, clauses, or terms"
                className="w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-stone-100 placeholder-stone-500"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2 text-sm text-stone-300">
              <span className="rounded-full border border-stone-700 px-3 py-2">
                {normalized ? `${filteredArticles.length} matching articles` : `${selectedSnapshot.articles.length} total articles`}
              </span>
              {showHistoryChooser && (
                <span className="rounded-full border border-stone-700 px-3 py-2">
                  {selectedSnapshot.label}
                  {selectedSnapshot.date ? ` | ${formatDate(selectedSnapshot.date)}` : ""}
                </span>
              )}
              <Link
                href="/treaty/pdf"
                className="rounded-full border border-stone-700 px-3 py-2 transition hover:border-stone-500 hover:text-stone-50"
              >
                PDF preview
              </Link>
              <DownloadPdfButton />
              {normalized && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded-full border border-stone-700 px-3 py-2 transition hover:border-stone-500 hover:text-stone-50"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <TOC articles={filteredArticles} activeId={activeId} />

          <article className="order-2">
            <section id="preamble" className="scroll-mt-28 rounded-2xl border border-stone-800 bg-stone-900/40 p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className={`${epunda.className} text-xl font-semibold text-stone-100`}>Preamble</h2>
                <a href="#preamble" className="text-xs uppercase tracking-[0.2em] text-stone-400 hover:text-stone-200">
                  Deep link
                </a>
              </div>
              {splitPreambleNicely(preamble).map((para, index) => (
                <P key={index}>{highlight(para)}</P>
              ))}
            </section>

            {filteredArticles.length === 0 ? (
              <section className="mt-6 rounded-2xl border border-dashed border-stone-700 bg-stone-900/40 p-10 text-center">
                <h3 className={`${epunda.className} text-2xl text-stone-100`}>No articles match this search</h3>
                <p className="mt-3 text-sm text-stone-300">
                  Try a broader term or clear the search to return to the full treaty.
                </p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-5 rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
                >
                  Clear search
                </button>
              </section>
            ) : (
              filteredArticles.map((article) => {
                const anchor = anchorFor(article.order);
                return (
                  <section
                    key={article.id}
                    id={anchor}
                    className="mt-6 scroll-mt-28 rounded-2xl border border-stone-800 bg-stone-900/40 p-6"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <h3 className={`${epunda.className} text-lg font-semibold text-stone-100`}>
                        {formatArticleHeading(article.order, article.heading)}
                      </h3>
                      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-stone-400">
                        <a href={`#${anchor}`} className="hover:text-stone-200">
                          Deep link
                        </a>
                        <Link href={`/amendments?q=${encodeURIComponent(stripArticlePrefix(article.heading))}`} className="hover:text-stone-200">
                          Related amendments
                        </Link>
                      </div>
                    </div>
                    <div className="mt-3 text-stone-200">
                      <ArticleBody body={article.body} highlight={highlight} />
                    </div>
                  </section>
                );
              })
            )}

            <section id="sign" className="mt-6 scroll-mt-28 rounded-2xl border border-stone-800 bg-stone-900/40 p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className={`${epunda.className} text-lg font-semibold text-stone-100`}>Signatories</h3>
                <a href="#sign" className="text-xs uppercase tracking-[0.2em] text-stone-400 hover:text-stone-200">
                  Deep link
                </a>
              </div>
              <P>
                In witness whereof, the undersigned Plenipotentiaries have signed this Treaty and affixed their seals.
              </P>
              <P>Done at Versailles, the Fifth day of June 1872.</P>
              <ul className="mt-3 list-disc space-y-1 pl-6 text-stone-200">
                <li>
                  <strong>For the French Third Republic:</strong> Pierre Marchand, Deputy of Paris, Plenipotentiary of the French Third Republic
                </li>
                <li>
                  <strong>For the Union of Soviet Socialist Republics:</strong> Georgy Alexandrovich Plekhanov, People&apos;s Commissar for Foreign Affairs, Plenipotentiary of the Union of Soviet Socialist Republics
                </li>
                <li>
                  <strong>For the Kingdom of Italy:</strong> Agostino Depretis, Prime Minister of the Kingdom of Italy, Plenipotentiary of the Kingdom of Italy
                </li>
              </ul>
            </section>
          </article>
        </div>
      </section>
    </main>
  );
}

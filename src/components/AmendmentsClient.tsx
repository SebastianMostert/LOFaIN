"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AmendmentResult, AmendmentStatus } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { epunda } from "@/app/fonts";
import AmendmentCard from "@/components/Amendment/AmendmentCard";

type Choice = "AYE" | "NAY" | "ABSTAIN" | "ABSENT";

type Amendment = {
  id: string;
  slug: string;
  title: string;
  status: AmendmentStatus;
  result: AmendmentResult | null;
  eligibleCount: number | null;
  opensAt: Date | null;
  closesAt: Date | null;
  votes: { choice: Choice; countryId: string }[];
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function AmendmentsClient({
  items,
  searchParams,
  userCountryId,
}: {
  items: Amendment[];
  searchParams: Record<string, string | string[] | undefined>;
  userCountryId?: string | null;
}) {
  const router = useRouter();
  const urlParams = useSearchParams();

  const initialQuery = (typeof searchParams.q === "string" ? searchParams.q : "") ?? "";
  const initialStatus =
    typeof searchParams.status === "string" && ["OPEN", "CLOSED"].includes(searchParams.status)
      ? (searchParams.status as AmendmentStatus)
      : "ALL";
  const initialOnlyNotVoted =
    (typeof searchParams.nv === "string" && searchParams.nv === "1") ||
    (typeof searchParams.mine === "string" && searchParams.mine.toLowerCase() === "unvoted");

  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<AmendmentStatus | "ALL">(initialStatus);
  const [onlyNotVoted, setOnlyNotVoted] = useState(Boolean(initialOnlyNotVoted));

  useEffect(() => {
    const params = new URLSearchParams(urlParams.toString());
    if (query) params.set("q", query);
    else params.delete("q");

    if (status !== "ALL") params.set("status", status);
    else params.delete("status");

    if (onlyNotVoted) params.set("nv", "1");
    else params.delete("nv");

    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.replace(newUrl, { scroll: false });
  }, [onlyNotVoted, query, router, status, urlParams]);

  const normalized = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    let list = items;

    if (status !== "ALL") {
      list = list.filter((item) => item.status === status);
    }

    if (onlyNotVoted && userCountryId) {
      list = list.filter((item) => !item.votes.some((vote) => vote.countryId === userCountryId));
    }

    if (!normalized) return list;
    return list.filter((item) => item.title.toLowerCase().includes(normalized));
  }, [items, normalized, onlyNotVoted, status, userCountryId]);

  const activeFilters = [
    status !== "ALL" ? { label: `Status: ${status.toLowerCase()}`, onRemove: () => setStatus("ALL") } : null,
    onlyNotVoted ? { label: "Unvoted only", onRemove: () => setOnlyNotVoted(false) } : null,
    normalized ? { label: `Search: ${query}`, onRemove: () => setQuery("") } : null,
  ].filter(Boolean) as { label: string; onRemove: () => void }[];

  const highlight = (text: string): React.ReactNode => {
    if (!normalized) return text;
    const regex = new RegExp(`(${escapeRegExp(normalized)})`, "gi");
    return text.split(regex).map((part, index) =>
      part.toLowerCase() === normalized ? (
        <mark key={index} className="rounded bg-amber-300 px-1 text-stone-900">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 text-stone-100">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-stone-400">Deliberation docket</div>
          <h1 className={`${epunda.className} mt-1 text-3xl font-bold`}>Amendments</h1>
          <p className="mt-2 text-sm text-stone-300">
            Review open proposals, watch closing windows, and focus on the votes your country still needs to cast.
          </p>
        </div>

        <Link
          href="/amendments/new"
          className="inline-flex w-fit rounded-full border border-stone-300/20 bg-stone-100 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-white hover:shadow"
        >
          Propose amendment
        </Link>
      </div>

      <div className="mt-8 rounded-2xl border border-stone-800 bg-stone-900/60 p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <label className="flex flex-col">
            <span className="mb-1 text-xs font-medium uppercase tracking-[0.24em] text-stone-400">Search</span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search amendments"
              className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder-stone-500"
            />
          </label>

          <label className="flex flex-col">
            <span className="mb-1 text-xs font-medium uppercase tracking-[0.24em] text-stone-400">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as AmendmentStatus | "ALL")}
              className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
            >
              <option value="ALL">All</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </label>

          <div className="flex flex-col sm:col-span-1 lg:col-span-2">
            <span className="mb-1 text-xs font-medium uppercase tracking-[0.24em] text-stone-400">Filter</span>
            <label className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-200">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-stone-500"
                checked={onlyNotVoted}
                onChange={(event) => setOnlyNotVoted(event.target.checked)}
                disabled={!userCountryId}
              />
              <span className="select-none">Show only amendments my country has not voted on</span>
            </label>
            {!userCountryId && (
              <span className="mt-1 text-xs text-stone-400">
                Sign in with a country assignment to use the unvoted filter.
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-stone-800 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {activeFilters.length === 0 ? (
              <span className="rounded-full border border-stone-800 px-3 py-1.5 text-xs text-stone-400">
                No active filters
              </span>
            ) : (
              activeFilters.map((filterChip) => (
                <button
                  key={filterChip.label}
                  type="button"
                  onClick={filterChip.onRemove}
                  className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
                >
                  {filterChip.label} x
                </button>
              ))
            )}
          </div>

          {activeFilters.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatus("ALL");
                setOnlyNotVoted(false);
              }}
              className="rounded-full border border-stone-700 px-3 py-1.5 text-xs text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 text-sm text-stone-300">
        Showing {filtered.length} of {items.length} amendments.
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-stone-700 bg-stone-900/40 p-10 text-center">
          <h2 className={`${epunda.className} text-2xl text-stone-100`}>No amendments match the current filters</h2>
          <p className="mt-3 text-sm text-stone-300">
            Clear one or more filters to restore the full docket.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatus("ALL");
              setOnlyNotVoted(false);
            }}
            className="mt-5 rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {filtered.map((amendment) => {
            const counts = { AYE: 0, NAY: 0, ABSTAIN: 0 } as Record<Exclude<Choice, "ABSENT">, number>;
            amendment.votes.forEach((vote) => {
              if (vote.choice === "AYE") counts.AYE++;
              else if (vote.choice === "NAY") counts.NAY++;
              else counts.ABSTAIN++;
            });

            const eligible = amendment.eligibleCount ?? amendment.votes.length;

            return (
              <AmendmentCard
                key={amendment.id}
                amendment={amendment}
                counts={counts}
                eligible={eligible}
                highlight={highlight}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}

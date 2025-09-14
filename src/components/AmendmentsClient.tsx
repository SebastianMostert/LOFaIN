"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { epunda } from "@/app/fonts";
import AmendmentCard from "@/components/Amendment/AmendmentCard";
import { AmendmentResult, AmendmentStatus } from "@prisma/client";

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
    votes: { choice: Choice; countryId: string }[]; // 👈 need countryId here
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function AmendmentsClient({
    items,
    searchParams,
    userCountryId, // 👈 pass this in from the server component
}: {
    items: Amendment[];
    searchParams: Record<string, string | string[] | undefined>;
    userCountryId?: string | null;
}) {
    const router = useRouter();
    const urlParams = useSearchParams();

    // Initialize from URL
    const initialQuery =
        (typeof searchParams.q === "string" ? searchParams.q : "") ?? "";
    const initialStatus =
        (typeof searchParams.status === "string" &&
            ["OPEN", "CLOSED"].includes(searchParams.status))
            ? (searchParams.status as AmendmentStatus)
            : "ALL";
    const initialOnlyNotVoted =
        (typeof searchParams.nv === "string" && searchParams.nv === "1") ||
        (typeof searchParams.mine === "string" &&
            searchParams.mine.toLowerCase() === "unvoted");

    const [query, setQuery] = useState(initialQuery);
    const [status, setStatus] = useState<AmendmentStatus | "ALL">(initialStatus);
    const [onlyNotVoted, setOnlyNotVoted] = useState<boolean>(
        Boolean(initialOnlyNotVoted)
    );

    // Sync state -> URL
    useEffect(() => {
        const params = new URLSearchParams(urlParams.toString());

        params.set("q", query);
        params.set("status", status);
        params.set("nv", onlyNotVoted ? "1" : "0");

        const newUrl = params.toString() ? `?${params.toString()}` : "";
        router.replace(newUrl, { scroll: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, status, onlyNotVoted]);

    const normalized = query.trim().toLowerCase();

    const filtered = useMemo(() => {
        let list = items;

        if (status !== "ALL") {
            list = list.filter((a) => a.status === status);
        }

        if (onlyNotVoted && userCountryId) {
            list = list.filter(
                (a) => !a.votes.some((v) => v.countryId === userCountryId)
            );
        }

        if (!normalized) return list;
        return list.filter((a) => a.title.toLowerCase().includes(normalized));
    }, [items, normalized, status, onlyNotVoted, userCountryId]);

    const highlight = (text: string): React.ReactNode => {
        if (!normalized) return text;
        const regex = new RegExp(`(${escapeRegExp(normalized)})`, "gi");
        return text.split(regex).map((part, i) =>
            part.toLowerCase() === normalized ? (
                <mark key={i} className="rounded bg-yellow-300 px-1 text-stone-900">
                    {part}
                </mark>
            ) : (
                part
            )
        );
    };

    return (
        <main className="mx-auto max-w-6xl px-4 py-10 text-stone-100">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={`${epunda.className} text-3xl font-bold`}>Amendments</h1>
                    <div className="mt-2 h-px w-24 bg-stone-700" />
                </div>

                <Link
                    href="/amendments/new"
                    className="rounded-md border border-stone-300/20 bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-white hover:shadow"
                >
                    Propose Amendment
                </Link>
            </div>

            <div className="mt-8 rounded-lg border border-stone-700 bg-stone-900/60 p-4 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {/* Search */}
                    <div className="flex flex-col">
                        <label className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-400">
                            Search
                        </label>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search amendments..."
                            className="rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
                        />
                    </div>

                    {/* Status filter */}
                    <div className="flex flex-col">
                        <label className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-400">
                            Status
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as AmendmentStatus | "ALL")}
                            className="rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
                        >
                            <option value="ALL">All</option>
                            <option value="OPEN">Open</option>
                            <option value="CLOSED">Closed</option>
                        </select>
                    </div>

                    {/* Unvoted filter */}
                    <div className="flex flex-col sm:col-span-1 lg:col-span-2">
                        <label className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-400">
                            Filter
                        </label>
                        <label className="inline-flex items-center gap-2 rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-200 hover:border-stone-600">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-stone-500 focus:ring-stone-500"
                                checked={onlyNotVoted}
                                onChange={(e) => setOnlyNotVoted(e.target.checked)}
                                disabled={!userCountryId}
                            />
                            <span className="select-none">Unvoted</span>
                        </label>
                        {!userCountryId && (
                            <span className="mt-1 text-xs text-stone-500">
                                Sign in with a country to use this filter
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
                {filtered.map((a) => {
                    const counts = { AYE: 0, NAY: 0, ABSTAIN: 0 } as Record<
                        Exclude<Choice, "ABSENT">,
                        number
                    >;
                    a.votes.forEach((v) => {
                        if (v.choice === "AYE") counts.AYE++;
                        else if (v.choice === "NAY") counts.NAY++;
                        else counts.ABSTAIN++;
                    });

                    const eligible = a.eligibleCount ?? a.votes.length;

                    return (
                        <AmendmentCard
                            key={a.id}
                            amendment={a}
                            counts={counts}
                            eligible={eligible}
                            highlight={highlight}
                        />
                    );
                })}
            </div>
        </main>
    );
}

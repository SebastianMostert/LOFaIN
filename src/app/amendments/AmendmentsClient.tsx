"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { epunda } from "@/app/fonts";
import AmendmentCard from "@/components/Amendment/AmendmentCard";

type Choice = "AYE" | "NAY" | "ABSTAIN" | "ABSENT";

type Amendment = {
    id: string;
    slug: string;
    title: string;
    status: string;
    result: string | null;
    eligibleCount: number | null;
    opensAt: Date | null;
    closesAt: Date | null;
    votes: { choice: Choice }[];
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function AmendmentsClient({ items }: { items: Amendment[] }) {
    const [query, setQuery] = useState("");
    const normalized = query.trim().toLowerCase();

    const filtered = useMemo(() => {
        if (!normalized) return items;
        return items.filter((a) => a.title.toLowerCase().includes(normalized));
    }, [items, normalized]);

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

            <div className="mt-6">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search amendments..."
                    className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
                {filtered.map((a) => {
                    const counts = { AYE: 0, NAY: 0, ABSTAIN: 0 } as Record<Exclude<Choice, "ABSENT">, number>;
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

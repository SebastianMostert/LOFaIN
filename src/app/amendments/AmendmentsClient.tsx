"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
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
    votes: { choice: Choice }[];
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function AmendmentsClient({ items }: { items: Amendment[] }) {
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<AmendmentStatus | "ALL">("ALL");
    const normalized = query.trim().toLowerCase();

    const filtered = useMemo(() => {
        let list = items;
        if (status !== "ALL") {
            list = list.filter((a) => a.status === status);
        }
        if (!normalized) return list;
        return list.filter((a) => a.title.toLowerCase().includes(normalized));
    }, [items, normalized, status]);

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

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search amendments..."
                    className="flex-1 rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AmendmentStatus | "ALL")}
                    className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-500"
                >
                    <option value="ALL">All</option>
                    <option value="OPEN">Open</option>
                    <option value="CLOSED">Closed</option>
                </select>
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

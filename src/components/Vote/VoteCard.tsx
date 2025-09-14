"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Choice = "AYE" | "NAY" | "ABSTAIN";
type Status = "OPEN" | "CLOSED" | string;

export default function VoteCard({ slug, status }: { slug: string; status: Status }) {
    const [choice, setChoice] = useState<Choice | null>(null);
    const [pending, startTransition] = useTransition();
    const router = useRouter();

    const canVote = status === "OPEN";

    useEffect(() => {
        // hydrate current vote for the user’s country (optional mini-call)
        // You can skip this if you already pass initialChoice from server.
        (async () => {
            try {
                // TODO: Fix - Doesnt exist
                const res = await fetch(`/api/amendments/${encodeURIComponent(slug)}/my-vote`, { cache: "no-store" });
                if (res.ok) {
                    const j = (await res.json()) as { choice: Choice | null };
                    setChoice(j.choice ?? null);
                }
            } catch { /* silent */ }
        })();
    }, [slug]);

    async function vote(next: Choice) {
        if (!canVote || pending) return;
        const prev = choice;
        setChoice(next);

        const res = await fetch(`/api/amendments/${encodeURIComponent(slug)}/vote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ choice: next }),
        });

        if (!res.ok) {
            setChoice(prev);
            const j = await res.json().catch(() => ({}));
            alert(j?.error ?? "Failed to vote");
            return;
        }
        startTransition(() => router.refresh());
    }

    const Btn = ({
        label, value, bg, outline,
    }: { label: string; value: Choice; bg: string; outline: string }) => {
        const active = choice === value;
        return (
            <button
                type="button"
                onClick={() => vote(value)}
                disabled={!canVote || pending}
                className={`w-full rounded-md border px-4 py-3 text-lg font-semibold shadow-sm transition
          ${active ? `${bg} text-white border-stone-900` : `bg-stone-100 text-stone-900 ${outline}`}
          ${!canVote ? "opacity-60 cursor-not-allowed" : "hover:brightness-95"}
        `}
            >
                {label}
            </button>
        );
    };

    return (
        <div className="rounded-lg border-2 border-stone-900 bg-stone-100 p-4 shadow-[0_2px_0_rgba(0,0,0,1)]">
            <div className="mb-3 text-center">
                <div className="text-xs uppercase tracking-wide text-stone-600">
                    {canVote ? "Cast your vote" : "Voting closed"}
                </div>
                <div className="mt-1 text-sm text-stone-700">
                    Your choice: <strong>{choice ?? "—"}</strong>
                </div>
            </div>

            <div className="grid gap-2">
                <Btn label="Yes" value="AYE" bg="bg-emerald-600" outline="border-stone-400" />
                <Btn label="No" value="NAY" bg="bg-rose-600" outline="border-stone-400" />
                <Btn label="Abstain" value="ABSTAIN" bg="bg-stone-500" outline="border-stone-400" />
            </div>
        </div>
    );
}

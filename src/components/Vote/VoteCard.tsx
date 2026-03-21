"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Choice = "AYE" | "NAY" | "ABSTAIN" | "ABSENT";
type Status = "OPEN" | "CLOSED" | string;

export default function VoteCard({ slug, status, myVote }: { slug: string; status: Status; myVote: Choice | null }) {
    const [choice, setChoice] = useState<Choice | null>(myVote);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [, startTransition] = useTransition();
    const router = useRouter();

    const canVote = status === "OPEN";

    async function vote(next: Choice) {
        if (!canVote || isSubmitting) return;
        const prev = choice;
        setChoice(next === "ABSENT" ? null : next);
        setError(null);
        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/amendments/${encodeURIComponent(slug)}/vote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({ choice: next }),
            });

            if (!res.ok) {
                setChoice(prev);
                const j = await res.json().catch(() => ({}));
                setError(j?.error ?? "Failed to vote");
                return;
            }
            setError(null);
            startTransition(() => router.refresh());
        } finally {
            setIsSubmitting(false);
        }
    }

    const Btn = ({
        label, value, bg, outline,
    }: { label: string; value: Choice; bg: string; outline: string }) => {
        const active = (choice ?? "ABSENT") === value;
        return (
            <button
                type="button"
                onClick={() => vote(value)}
                disabled={!canVote || isSubmitting}
                className={`w-full rounded-xl border px-4 py-3 text-lg font-semibold shadow-sm transition
          ${active ? `${bg} text-white border-stone-900` : `bg-stone-100 text-stone-900 ${outline}`}
          ${!canVote ? "opacity-60 cursor-not-allowed" : "hover:brightness-95"}
        `}
            >
                {label}
            </button>
        );
    };

    return (
        <div className="rounded-[1.5rem] border border-stone-300 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className="mb-4 text-center">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                    {canVote ? "Cast your vote" : status === "DRAFT" ? "Debate in progress" : "Voting closed"}
                </div>
                <div className="mt-1 text-sm text-stone-700">
                    Your choice: <strong className="text-stone-900">{choice ?? "ABSENT"}</strong>
                </div>
            </div>

            <div className="grid gap-3">
                <Btn label="Aye" value="AYE" bg="bg-emerald-600" outline="border-stone-400" />
                <Btn label="Nay" value="NAY" bg="bg-rose-600" outline="border-stone-400" />
                <Btn label="Abstain" value="ABSTAIN" bg="bg-stone-500" outline="border-stone-400" />
            </div>
            {isSubmitting && (
                <div className="mt-2 text-center text-sm text-stone-600">Submitting...</div>
            )}
            {error && (
                <div className="mt-2 text-center text-sm text-rose-600">{error}</div>
            )}
        </div>
    );
}

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
                    Your choice: <strong>{choice ?? "ABSENT"}</strong>
                </div>
            </div>

            <div className="grid gap-2">
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
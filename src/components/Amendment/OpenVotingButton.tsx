"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function OpenVotingButton({ slug }: { slug: string }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [, startTransition] = useTransition();

    async function openVoting() {
        if (isSubmitting) return;

        setError(null);
        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/amendments/${encodeURIComponent(slug)}/open`, {
                method: "POST",
                cache: "no-store",
            });

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                setError(payload?.error ?? "Failed to open voting");
                return;
            }

            startTransition(() => router.refresh());
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="flex flex-col items-center gap-2">
            <button
                type="button"
                onClick={openVoting}
                disabled={isSubmitting}
                className="rounded-full border border-amber-400/40 bg-amber-200 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
                {isSubmitting ? "Opening vote..." : "Open voting"}
            </button>
            {error && <div className="text-center text-xs text-rose-300">{error}</div>}
        </div>
    );
}

// lib/amendments.ts — server actions & API helpers for amendments
"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { amendmentSchema } from "@/app/api/amendments/route";
import { apiPost } from "./client";

/* ---------------- types ---------------- */

export type VoteChoice = "AYE" | "NAY" | "ABSTAIN" | "ABSENT";

/* --------------- actions -------------- */

/**
 * Cast a vote on an amendment.
 * Redirects to sign-in if unauthenticated.
 */
export async function castVote(
    slug: string,
    choice: VoteChoice,
    comment?: string
) {
    const session = await auth();
    if (!session) redirect(`/api/auth/signin?callbackUrl=/amendments/${slug}`);

    await apiPost(`/api/amendments/${encodeURIComponent(slug)}/vote`, {
        choice,
        comment: comment?.trim() || undefined,
    });
}

/**
 * Create an amendment via API (form-based server action).
 * NOTE: slug, opens/closes, threshold are set server-side.
 */
export async function createAmendmentAction(formData: FormData) {
    const session = await auth();
    if (!session) redirect("/api/auth/signin?callbackUrl=/amendments/new");

    // Whitelisted fields only
    const payload = {
        title: String(formData.get("title") || "").trim(),
        rationale: (formData.get("rationale") as string) || null,
        op: String(formData.get("op") || "EDIT"),
        targetArticleId: (formData.get("targetArticleId") as string) || null,
        newHeading: (formData.get("newHeading") as string) || null,
        newBody: (formData.get("newBody") as string) || null,
        newOrder: formData.get("newOrder")
            ? Number(formData.get("newOrder"))
            : null,
    };

    const parsed = amendmentSchema.safeParse(payload);
    if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors;
        throw new Error(Object.values(errors).flat().join("; "));
    }

    const { amendment } = await apiPost<{ amendment: { slug: string } }>(
        "/api/amendments",
        parsed.data
    );

    redirect(`/amendments/${amendment.slug}`);
}

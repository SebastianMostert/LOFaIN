// lib/amendments.ts — server actions & API helpers for amendments
"use server";

import { auth } from "@/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/* ---------------- types ---------------- */

export type VoteChoice = "AYE" | "NAY" | "ABSTAIN" | "ABSENT";

/* -------------- helpers --------------- */

function getBaseUrl() {
    // Prefer NEXTAUTH_URL (used by Auth.js), then public base, then dev default
    return (
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        "http://localhost:3000"
    );
}

async function apiPost<T>(
    path: string,
    body: unknown,
    opts?: { revalidate?: RequestCache }
): Promise<T> {
    const res = await fetch(`${getBaseUrl()}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            // forward auth cookies so `auth()` in the API route can see the session
            cookie: cookies().toString(),
        },
        cache: opts?.revalidate ?? "no-store",
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        let msg = `Request failed (${res.status})`;
        try {
            const j = await res.json();
            if (j?.error) msg = j.error;
        } catch {
            /* ignore */
        }
        throw new Error(msg);
    }

    // If route returns no JSON body, this will throw—so only call when you expect JSON
    return (await res.json()) as T;
}

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

    // Basic client-side guardrails (API will re-validate)
    if (!payload.title) throw new Error("Title is required.");
    if (!["ADD", "EDIT", "REMOVE"].includes(payload.op))
        throw new Error("Invalid operation.");
    if ((payload.op === "EDIT" || payload.op === "REMOVE") && !payload.targetArticleId)
        throw new Error("Target article is required for EDIT/REMOVE.");
    if ((payload.op === "ADD" || payload.op === "EDIT") && !payload.newBody)
        throw new Error("New body is required for ADD/EDIT.");

    const { amendment } = await apiPost<{ amendment: { slug: string } }>(
        "/api/amendments",
        payload
    );

    redirect(`/amendments/${amendment.slug}`);
}

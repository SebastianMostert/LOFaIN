// components/NewAmendmentComposer.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import DiffPreview from "@/components/DiffPreview";
import { epunda } from "@/app/fonts";

type Article = { id: string; order: number; heading: string; body: string };

export default function NewAmendmentComposer({
    articles,
    onSubmit,
}: {
    articles: Article[];
    onSubmit: (fd: FormData) => Promise<void>;
}) {
    // ---- Form state ----
    const [title, setTitle] = useState("");
    const [op, setOp] = useState<"ADD" | "EDIT" | "REMOVE">("EDIT");
    const [targetArticleId, setTargetArticleId] = useState("");
    const [newHeading, setNewHeading] = useState("");
    const [newBody, setNewBody] = useState("");
    const [rationale, setRationale] = useState("");

    // ---- Derived values ----
    const targetArticle = useMemo(
        () => articles.find((a) => a.id === targetArticleId) ?? null,
        [articles, targetArticleId]
    );

    const lastArticle = useMemo(
        () => (articles.length ? articles[articles.length - 1] : null),
        [articles]
    );
    const nextOrder = useMemo(
        () => (lastArticle ? lastArticle.order + 1 : 1),
        [lastArticle]
    );

    // ---- Effects: prefill / clear based on op ----
    // Prefill for EDIT (and optionally heading)
    useEffect(() => {
        if (op === "EDIT" && targetArticle) {
            setNewBody(targetArticle.body);
            setNewHeading((h) => h || targetArticle.heading);
        }
    }, [op, targetArticle]);

    // Clear fields when switching to REMOVE
    useEffect(() => {
        if (op === "REMOVE") {
            setNewBody("");
            setNewHeading("");
        }
    }, [op]);

    // ---- Submit (server action passthrough) ----
    async function handleSubmit(formData: FormData) {
        formData.set("title", title);
        formData.set("op", op);
        formData.set("rationale", rationale);

        if (op === "EDIT" || op === "REMOVE") {
            if (targetArticleId) formData.set("targetArticleId", targetArticleId);
            else formData.delete("targetArticleId");
        } else {
            formData.delete("targetArticleId");
        }

        if (op === "ADD" || op === "EDIT") {
            formData.set("newBody", newBody);
            if (newHeading) formData.set("newHeading", newHeading);
            else formData.delete("newHeading");
        } else {
            formData.delete("newBody");
            formData.delete("newHeading");
        }

        // For ADD: enforce append after last article
        if (op === "ADD") {
            formData.set("newOrder", String(nextOrder));
        } else {
            formData.delete("newOrder");
        }

        await onSubmit(formData);
    }

    return (
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(380px,520px)_minmax(0,1fr)]">
            {/* LEFT: FORM */}
            <form action={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm text-stone-300">Title</label>
                    <input
                        name="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="mt-1 w-full rounded border border-stone-700 bg-stone-900 p-2"
                    />
                </div>

                <div>
                    <label className="block text-sm text-stone-300">Operation</label>
                    <select
                        name="op"
                        value={op}
                        onChange={(e) => setOp(e.target.value as "ADD" | "EDIT" | "REMOVE")}
                        className="mt-1 w-full rounded border border-stone-700 bg-stone-900 p-2"
                    >
                        <option value="EDIT">EDIT — change an existing article</option>
                        <option value="ADD">ADD — add a new article (appends at end)</option>
                        <option value="REMOVE">REMOVE — remove an article</option>
                    </select>
                </div>

                {(op === "EDIT" || op === "REMOVE") && (
                    <div>
                        <label className="block text-sm text-stone-300">Target Article</label>
                        <select
                            name="targetArticleId"
                            value={targetArticleId}
                            onChange={(e) => setTargetArticleId(e.target.value)}
                            required
                            className="mt-1 w-full rounded border border-stone-700 bg-stone-900 p-2"
                        >
                            <option value="">Select an article…</option>
                            {articles.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.order}. {a.heading}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {(op === "ADD" || op === "EDIT") && (
                    <>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm text-stone-300">New Heading (optional)</label>
                                <input
                                    name="newHeading"
                                    value={newHeading}
                                    onChange={(e) => setNewHeading(e.target.value)}
                                    className="mt-1 w-full rounded border border-stone-700 bg-stone-900 p-2"
                                />
                            </div>

                            {/* ADD: No order input — always appended */}
                            {op === "ADD" && (
                                <div className="rounded border border-stone-700 bg-stone-900 p-2 text-sm text-stone-300">
                                    Will be added as <span className="font-semibold">Article {nextOrder}</span>{" "}
                                    {lastArticle ? (
                                        <>after “{lastArticle.heading}”.</>
                                    ) : (
                                        <>as the first article.</>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm text-stone-300">New Body</label>
                            <textarea
                                name="newBody"
                                rows={10}
                                value={newBody}
                                onChange={(e) => setNewBody(e.target.value)}
                                required
                                className="mt-1 w-full rounded border border-stone-700 bg-stone-900 p-2"
                                placeholder={op === "ADD" ? "Write the new article text…" : undefined}
                            />
                        </div>
                    </>
                )}

                {op === "REMOVE" && (
                    <div className="rounded border border-stone-700 bg-stone-900 p-3 text-sm text-stone-300">
                        This proposal will <span className="font-semibold">remove</span>{" "}
                        {targetArticle ? (
                            <>
                                Article {targetArticle.order}: “{targetArticle.heading}”.
                            </>
                        ) : (
                            "the selected article."
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-sm text-stone-300">Rationale (optional)</label>
                    <textarea
                        name="rationale"
                        rows={3}
                        value={rationale}
                        onChange={(e) => setRationale(e.target.value)}
                        className="mt-1 w-full rounded border border-stone-700 bg-stone-900 p-2"
                    />
                </div>

                <button className="rounded bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-100">
                    Submit Amendment
                </button>
            </form>

            {/* RIGHT: PREVIEW / DIFF */}
            <div>
                <div className="mb-3 flex items-center justify-between">
                    <div className={`${epunda.className} text-base font-semibold`}>
                        {op === "REMOVE" ? "Summary" : "Live Diff"}
                    </div>
                    <div className="text-xs text-stone-400">
                        {op === "ADD" && "Adding a new article at the end"}
                        {op === "EDIT" &&
                            (targetArticle
                                ? `Editing: ${targetArticle.order}. ${targetArticle.heading}`
                                : "Select an article to edit")}
                        {op === "REMOVE" &&
                            (targetArticle
                                ? `Removing: ${targetArticle.order}. ${targetArticle.heading}`
                                : "Select an article to remove")}
                    </div>
                </div>

                {op === "REMOVE" ? (
                    <section className="rounded-lg border border-stone-700 bg-stone-900 p-4 text-sm text-stone-300">
                        <p>
                            This amendment proposes to <span className="font-semibold text-stone-100">remove</span>{" "}
                            the selected article from the treaty.
                        </p>
                        {targetArticle && (
                            <>
                                <div className="mt-3 text-stone-400">Article to be removed:</div>
                                <div className="mt-1 rounded border border-stone-700 bg-stone-950 p-3">
                                    <div className="text-stone-200">
                                        <span className="font-semibold">Article {targetArticle.order}.</span>{" "}
                                        {targetArticle.heading}
                                    </div>
                                    <pre className="mt-2 whitespace-pre-wrap text-stone-300">
                                        {targetArticle.body}
                                    </pre>
                                </div>
                            </>
                        )}
                    </section>
                ) : (
                    <DiffPreview
                        op={op}
                        targetArticle={targetArticle}
                        newHeading={newHeading}
                        newBody={newBody}
                    />
                )}
            </div>
        </div>
    );
}

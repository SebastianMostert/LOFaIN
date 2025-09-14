"use client";

import { useEffect, useRef, useState } from "react";
import VoteCard from "./VoteCard";

type Status = "OPEN" | "CLOSED" | string;

export default function SlideOutVoteTab({
    slug,
    status,
    myVote,
}: {
    slug: string;
    status: Status;
    myVote: "AYE" | "NAY" | "ABSTAIN" | "ABSENT" | null;
}) {
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const buttonPanelRef = useRef<HTMLButtonElement | null>(null);

    // Close/Open on ESC
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen((prev) => !prev);
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Close when clicking outside
    useEffect(() => {
        function onClick(e: MouseEvent) {
            if (!open) return;
            const el = panelRef.current;
            const buttonEl = buttonPanelRef.current;

            const outsideOfEl = el && !el.contains(e.target as Node);
            const outsideOfButtonEl = buttonEl && !buttonEl.contains(e.target as Node);

            if (outsideOfEl && outsideOfButtonEl) setOpen(false);
        }
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [open]);

    if (status === "CLOSED") return null

    return (
        <>
            {/* Slide-out panel */}
            <div
                ref={panelRef}
                className={`fixed right-0 top-24 z-40 w-[320px] translate-x-full transition-transform duration-300
          ${open ? "!translate-x-0" : ""}`}
                aria-hidden={!open}
            >
                <div className="mr-2 rounded-l-lg border-2 border-stone-900 bg-stone-100 shadow-[0_2px_0_rgba(0,0,0,1)]">
                    <div className="flex items-center justify-between border-b-2 border-stone-900 bg-stone-200 px-3 py-2">
                        <div className="text-sm font-bold text-stone-900">Vote</div>
                        <button
                            onClick={() => setOpen(false)}
                            className="rounded border border-stone-400 bg-white px-2 py-1 text-xs text-stone-800 hover:bg-stone-100"
                        >
                            Close
                        </button>
                    </div>
                    <div className="p-3">
                        <VoteCard slug={slug} status={status} myVote={myVote} />
                    </div>
                    <div className="px-3 pb-3 text-center text-xs text-stone-600">
                        Press <kbd className="rounded border px-1">ESC</kbd> to close
                    </div>
                </div>
            </div>

            {/* Handle / Tab */}
            <button
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-controls="vote-panel"
                ref={buttonPanelRef}
                className="fixed right-0 top-1/2 z-50 -translate-y-1/2
             rounded-l-md border-2 border-stone-900 bg-white
             px-2 py-3 shadow-[0_2px_0_rgba(0,0,0,1)] hover:bg-stone-50"
                title="Vote"
            >
                <div className="flex rotate-180 items-center gap-2 [writing-mode:vertical-rl]">
                    <span className="text-[11px] font-bold tracking-wider text-stone-900">VOTE</span>
                </div>
            </button>
        </>
    );
}

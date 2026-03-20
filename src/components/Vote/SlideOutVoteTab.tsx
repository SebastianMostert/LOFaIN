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
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!open) return;
      const target = event.target as Node;
      const outsidePanel = panelRef.current && !panelRef.current.contains(target);
      const outsideButton = buttonRef.current && !buttonRef.current.contains(target);
      if (outsidePanel && outsideButton) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (status === "CLOSED") return null;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close vote panel backdrop"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-stone-950/50 lg:hidden"
        />
      )}

      <div
        id="vote-panel"
        ref={panelRef}
        role="dialog"
        aria-modal={open}
        aria-labelledby="vote-panel-title"
        className={`fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border border-stone-800 bg-stone-100 p-3 shadow-2xl transition-transform duration-300 lg:inset-auto lg:right-0 lg:top-28 lg:w-[360px] lg:rounded-l-2xl lg:rounded-tr-none ${
          open ? "translate-y-0 lg:translate-x-0" : "translate-y-[calc(100%-4rem)] lg:translate-x-[calc(100%-3rem)] lg:translate-y-0"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div id="vote-panel-title" className="text-sm font-bold uppercase tracking-[0.18em] text-stone-900">
              Vote panel
            </div>
            <div className="text-xs text-stone-600">Cast or review your country&apos;s vote.</div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border border-stone-400 bg-white px-3 py-1.5 text-xs text-stone-800 transition hover:bg-stone-100"
          >
            Close
          </button>
        </div>

        <VoteCard slug={slug} status={status} myVote={myVote} />

        <div className="mt-3 text-center text-xs text-stone-600">
          Press <kbd className="rounded border border-stone-400 px-1">Esc</kbd> to close
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="vote-panel"
        ref={buttonRef}
        className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border-2 border-stone-900 bg-white px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-stone-900 shadow-[0_2px_0_rgba(0,0,0,1)] transition hover:bg-stone-50 lg:right-0 lg:top-1/2 lg:-translate-y-1/2 lg:rounded-l-xl lg:rounded-r-none lg:px-3 lg:py-4"
        title="Vote"
      >
        <span className="lg:hidden">{open ? "Hide vote panel" : "Open vote panel"}</span>
        <span className="hidden lg:block [writing-mode:vertical-rl]">{open ? "Close" : "Vote"}</span>
      </button>
    </>
  );
}

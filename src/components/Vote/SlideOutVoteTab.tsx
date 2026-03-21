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
  const containerRef = useRef<HTMLDivElement | null>(null);
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
      const outsideContainer = containerRef.current && !containerRef.current.contains(target);
      if (outsideContainer) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (status !== "OPEN") return null;

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
        ref={containerRef}
        className={`fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 lg:inset-auto lg:right-0 lg:top-1/2 lg:z-50 lg:flex lg:-translate-y-1/2 lg:items-center ${
          open ? "translate-y-0 lg:translate-x-0" : "translate-y-[calc(100%-4.5rem)] lg:translate-x-[calc(100%-5.1rem)]"
        }`}
      >
        <div className="flex justify-center px-4 pb-2 pt-3 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls="vote-panel"
            ref={buttonRef}
            className="inline-flex items-center justify-center rounded-full border-2 border-stone-900 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-stone-900 shadow-[0_2px_0_rgba(0,0,0,1)] transition hover:bg-stone-50"
            title="Vote"
          >
            <span>{open ? "Close vote panel" : "Open vote panel"}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="vote-panel"
          ref={buttonRef}
          className="hidden items-center gap-2 rounded-full border-2 border-stone-900 bg-white text-sm font-bold uppercase tracking-[0.18em] text-stone-900 shadow-[0_2px_0_rgba(0,0,0,1)] transition hover:bg-stone-50 lg:relative lg:z-10 lg:-mr-px lg:inline-flex lg:flex-none lg:min-w-[5.1rem] lg:justify-center lg:self-stretch lg:rounded-l-[1.1rem] lg:rounded-r-none lg:border-r-0 lg:px-2.5 lg:py-5"
          title="Vote"
        >
          <span className="[writing-mode:vertical-rl]">{open ? "CLOSE" : "OPEN"}</span>
        </button>

        <section
          id="vote-panel"
          ref={panelRef}
          role="dialog"
          aria-modal={open}
          aria-labelledby="vote-panel-title"
          className="max-h-[min(78vh,42rem)] overflow-y-auto rounded-t-[1.75rem] border border-stone-800 bg-stone-100/95 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.35)] backdrop-blur sm:px-5 lg:max-h-none lg:w-[380px] lg:overflow-visible lg:rounded-l-none lg:rounded-r-[1.75rem] lg:border-l-0 lg:shadow-[-14px_16px_32px_rgba(0,0,0,0.28)]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div id="vote-panel-title" className="text-[11px] font-bold uppercase tracking-[0.24em] text-stone-500">
                Vote panel
              </div>
              <div className="mt-1 text-base font-semibold text-stone-900">Cast or review your country&apos;s vote</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50"
            > 
              Close
            </button>
          </div>

          <VoteCard slug={slug} status={status} myVote={myVote} />

          <div className="mt-3 hidden text-center text-xs text-stone-500 lg:block">
            Press <kbd className="rounded border border-stone-300 bg-white px-1.5 py-0.5 font-sans">Esc</kbd> to close
          </div>
        </section>
      </div>
    </>
  );
}

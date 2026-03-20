"use client";

export default function PdfPreviewActions() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-full border border-stone-800 bg-stone-950 px-5 py-2.5 text-sm font-semibold text-stone-100 transition hover:bg-stone-800"
      >
        Print / Save as PDF
      </button>
      <a
        href="/treaty"
        className="rounded-full border border-stone-300/40 px-5 py-2.5 text-sm text-stone-700 transition hover:border-stone-700 hover:text-stone-950"
      >
        Back to treaty reader
      </a>
    </div>
  );
}

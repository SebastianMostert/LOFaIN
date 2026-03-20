"use client";

export default function DownloadPdfButton() {
  return (
    <a
      href="/treaty/download"
      className="rounded-full border border-stone-700 px-3 py-2 text-sm text-stone-300 transition hover:border-stone-500 hover:text-stone-50"
    >
      Download PDF
    </a>
  );
}

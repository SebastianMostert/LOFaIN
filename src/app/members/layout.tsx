import Link from "next/link";
import { epunda } from "@/app/fonts";

export default function CountryLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-stone-100">
      <header className="mb-8 flex flex-col gap-3 border-b border-stone-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-stone-400">Directory</div>
          <h1 className={`${epunda.className} text-3xl font-extrabold`}>League Members</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-300">
            Browse the current member states, review delegate rosters, and inspect each country&apos;s public profile.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex w-fit items-center rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
        >
          Back home
        </Link>
      </header>
      {children}
    </main>
  );
}

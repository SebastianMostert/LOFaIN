import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-stone-800 bg-stone-950 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-stone-400 sm:flex-row sm:items-center sm:justify-between">
        <p>Copyright 1900 League Treaty Portal. Built with Next.js and TypeScript.</p>
        <div className="flex items-center gap-4">
          <Link href="/work" className="transition hover:text-stone-200">
            Our Work
          </Link>
          <Link href="/faq" className="transition hover:text-stone-200">
            FAQ
          </Link>
          <Link href="https://github.com/nrp-vote-website#public-api" className="transition hover:text-stone-200">
            API
          </Link>
        </div>
      </div>
    </footer>
  );
}

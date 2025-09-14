// app/country/layout.tsx
import Link from "next/link";
import { epunda } from "@/app/fonts";

export default function CountryLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="mx-auto max-w-6xl px-4 py-8 text-stone-100">
            <header className="mb-6 flex items-end justify-between">
                <h1 className={`${epunda.className} text-3xl font-extrabold`}>League Countries</h1>
                <Link href="/" className="text-sm text-stone-400 hover:text-stone-200">← Back home</Link>
            </header>
            {children}
        </main>
    );
}

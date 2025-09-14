// app/countries/page.tsx
import Link from "next/link";
import { prisma } from "@/prisma";
import { epunda } from "@/app/fonts";
import { auth } from "@/auth";
import type { Metadata } from "next";

const baseUrl = "https://example.com";

export const metadata: Metadata = {
    title: "Countries • League",
    description: "Browse member countries of the League of Free and Independent Nations.",
    keywords: ["countries", "members", "league"],
    alternates: { canonical: `${baseUrl}/members` },
    openGraph: {
        title: "Countries • League",
        description: "Browse member countries of the League of Free and Independent Nations.",
        url: `${baseUrl}/members`,
        images: [{ url: `${baseUrl}/logo.png`, alt: "League logo" }],
    },
};

export default async function CountriesPage() {
    const session = await auth();
    const user = session?.user;
    const myCountryId = user?.countryId ?? null;

    const countries = await prisma.country.findMany({
        where: { isActive: true },
        orderBy: [{ name: "asc" }],
        select: {
            id: true,
            name: true,
            slug: true,
            code: true,
            colorHex: true,
            _count: { select: { users: true } },
        },
    });

    return (
        <main className="mx-auto max-w-6xl px-4 py-8 text-stone-100">
            <header className="mb-6 flex items-end justify-between">
                <h1 className={`${epunda.className} text-3xl font-extrabold`}>All Countries</h1>
                <div className="text-sm text-stone-400">
                    {countries.length} {countries.length === 1 ? "country" : "countries"}
                </div>
            </header>

            {countries.length === 0 ? (
                <div className="rounded-lg border border-stone-700 bg-stone-900 p-6 text-stone-300">
                    No countries yet. Seed some in <code className="text-stone-200">prisma/seed.ts</code>.
                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {countries.map((c) => {
                        const href = c.code ? `/members/${c.code}` : `/members/${c.slug}`;
                        const isMine = myCountryId === c.id;

                        return (
                            <li
                                key={c.id}
                                className={`relative rounded-lg border bg-stone-900 p-5 transition hover:bg-stone-900/80 ${isMine ? "border-emerald-700 shadow-[0_0_0_2px_rgba(16,185,129,0.25)]" : "border-stone-700"
                                    }`}
                            >
                                {/* Accent bar */}
                                <div
                                    className="absolute inset-x-0 top-0 h-1 rounded-t-lg"
                                    style={{ background: c.colorHex ?? "#49423a" }}
                                />
                                <div className="mt-2 flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className={`${epunda.className} text-xl font-semibold text-stone-100`}>{c.name}</h2>
                                        <div className="mt-1 text-sm text-stone-400">
                                            Code: <span className="text-stone-200">{c.code ?? "—"}</span> · Slug:{" "}
                                            <span className="text-stone-200">{c.slug}</span>
                                        </div>
                                    </div>
                                    <span
                                        className="h-6 w-10 shrink-0 rounded"
                                        style={{ background: c.colorHex ?? "#49423a" }}
                                        title={c.colorHex ?? "default"}
                                    />
                                </div>

                                <div className="mt-4 flex items-center justify-between text-sm text-stone-300">
                                    <div>
                                        Delegates:{" "}
                                        <span className="font-medium text-stone-100">{c._count.users}</span>
                                    </div>
                                    {isMine && (
                                        <span className="rounded border border-emerald-800 bg-emerald-900/30 px-2 py-0.5 text-emerald-200">
                                            Your country
                                        </span>
                                    )}
                                </div>

                                <div className="mt-4 flex items-center gap-2">
                                    <Link
                                        href={href}
                                        className="rounded-md border border-stone-700 bg-stone-800 px-3 py-1.5 text-sm hover:bg-stone-700"
                                    >
                                        View public page
                                    </Link>
                                    {isMine && (
                                        <Link
                                            href="/members/me"
                                            className="rounded-md border border-emerald-800 bg-emerald-900/30 px-3 py-1.5 text-sm text-emerald-200 hover:bg-emerald-900/50"
                                        >
                                            Open my country
                                        </Link>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </main>
    );
}

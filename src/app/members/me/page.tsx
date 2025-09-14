// app/members/me/page.tsx
import { redirect } from "next/navigation";
import { epunda } from "@/app/fonts";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { getCountry } from "@/utils/country";
import type { Metadata } from "next";

const baseUrl = "https://example.com";

export const metadata: Metadata = {
    title: "My Country • League",
    description: "Private profile and tools for your country in the League.",
    keywords: ["country", "profile", "league"],
    alternates: { canonical: `${baseUrl}/members/me` },
    openGraph: {
        title: "My Country • League",
        description: "Private profile and tools for your country in the League.",
        url: `${baseUrl}/members/me`,
        images: [{ url: `${baseUrl}/logo.png`, alt: "League logo" }],
    },
};

export default async function MyCountryPage() {
    const session = await auth();
    if (!session) redirect("/api/auth/signin?callbackUrl=/members/me");

    const user = session.user;
    const countryCode = user.country?.code ?? null;

    if (!countryCode) {
        return (
            <section className="rounded-lg border border-stone-700 bg-stone-900 p-6">
                <h2 className={`${epunda.className} text-xl font-semibold`}>No Country Assigned</h2>
                <p className="mt-2 text-stone-300">
                    Your account is not yet mapped to a country. Please contact an admin to set your assignment.
                </p>
                <p className="mt-4 text-sm text-stone-400">
                    Tip: Ensure your Discord ID is in the CountryMapping table.
                </p>
            </section>
        );
    }

    const country = await getCountry(countryCode)

    if (!country) {
        return (
            <section className="rounded-lg border border-stone-700 bg-stone-900 p-6">
                <h2 className={`${epunda.className} text-xl font-semibold`}>Country Not Found</h2>
                <p className="mt-2 text-stone-300">Your mapped country no longer exists.</p>
            </section>
        );
    }

    return (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,320px]">
            {/* Main */}
            <article className="rounded-lg border border-stone-700 bg-stone-900 p-6">
                <div className="mb-1 text-xs uppercase tracking-wide text-stone-400">Private Country Profile</div>
                <h2 className={`${epunda.className} text-2xl font-semibold`}>{country.name}</h2>
                <div className="mt-2 text-sm text-stone-400">
                    Code: <span className="text-stone-200 font-medium">{country.code ?? "—"}</span> ·
                    {" "}Slug: <span className="text-stone-200 font-medium">{country.slug}</span>
                </div>

                <div className="mt-6">
                    <h3 className={`${epunda.className} text-lg font-semibold`}>Delegates</h3>
                    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {country.users.length === 0 && (
                            <li className="text-stone-400">No delegates yet.</li>
                        )}
                        {country.users.map(u => (
                            <li
                                key={u.id}
                                className="flex items-center gap-3 rounded border border-stone-700 bg-stone-950/60 p-3"
                            >
                                <Image
                                    src={u.image ?? "/logo.png"}
                                    alt={u.name ? `${u.name}'s avatar` : "Delegate avatar"}
                                    className="h-8 w-8 rounded object-cover"
                                    width={32}
                                    height={32}
                                />
                                <span className="text-stone-200">{u.name ?? "Unnamed delegate"}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </article>

            {/* Aside */}
            <aside className="space-y-4">
                <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
                    <div className="mb-2 text-xs uppercase tracking-wide text-stone-400">Public Link</div>
                    <Link href={`/members/${country.code ?? country.slug}`} className="text-stone-200 underline decoration-stone-600 hover:text-stone-50">
                        View public profile
                    </Link>
                </div>
                <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
                    <div className="mb-2 text-xs uppercase tracking-wide text-stone-400">Accent</div>
                    <div
                        className="h-8 w-full rounded"
                        style={{ background: country.colorHex ?? "#49423a" }}
                        title={country.colorHex ?? "default"}
                    />
                </div>
            </aside>
        </section>
    );
}

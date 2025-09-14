// app/members/[slugOrCode]/page.tsx
import { notFound } from "next/navigation";
import { epunda } from "@/app/fonts";
import { getCountry } from "@/utils/country";
import Image from "next/image";
import type { Metadata } from "next";

const baseUrl = "https://example.com";

export async function generateMetadata({ params }: { params: Promise<{ slugOrCode: string }> }): Promise<Metadata> {
    const awaitedParams = await params;
    const country = await getCountry(awaitedParams.slugOrCode);
    if (!country) {
        const url = `${baseUrl}/members/${awaitedParams.slugOrCode}`;
        return {
            title: "Country • League",
            description: "Public profile for a member country of the League.",
            keywords: ["country", "league"],
            alternates: { canonical: url },
            openGraph: {
                title: "Country • League",
                description: "Public profile for a member country of the League.",
                url,
                images: [{ url: `${baseUrl}/logo.png`, alt: "League logo" }],
            },
        };
    }
    const url = `${baseUrl}/members/${country.slug}`;
    return {
        title: `${country.name} • League`,
        description: `Public profile for ${country.name} in the League of Free and Independent Nations.`,
        keywords: [country.name, "country", "league"],
        alternates: { canonical: url },
        openGraph: {
            title: `${country.name} • League`,
            description: `Public profile for ${country.name} in the League of Free and Independent Nations.`,
            url,
            images: [{ url: `${baseUrl}/flags/${(country.code || "unknown").toLowerCase()}.svg`, alt: `${country.name} flag` }],
        },
    };
}

export default async function PublicCountryPage({ params }: { params: Promise<{ slugOrCode: string }> }) {
    const awaitedParams = await params;
    const country = await getCountry(awaitedParams.slugOrCode);
    if (!country) notFound();

    return (
        <section className="rounded-lg border border-stone-700 bg-stone-900 p-6">
            <div className="mb-1 text-xs uppercase tracking-wide text-stone-400">Public Country Profile</div>
            <h2 className={`${epunda.className} text-2xl font-semibold`}>{country.name}</h2>
            <div className="mt-2 text-sm text-stone-400">
                Code: <span className="text-stone-200 font-medium">{country.code ?? "—"}</span> ·
                {" "}Slug: <span className="text-stone-200 font-medium">{country.slug}</span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[1fr,280px]">
                <article>
                    <h3 className={`${epunda.className} text-lg font-semibold`}>Delegates</h3>
                    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {country.users.length === 0 && (
                            <li className="text-stone-400">No delegates registered.</li>
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
                </article>

                <aside className="rounded border border-stone-700 bg-stone-950/60 p-4">
                    <div className="mb-2 text-xs uppercase tracking-wide text-stone-400">Accent</div>
                    <div
                        className="h-8 w-full rounded"
                        style={{ background: country.colorHex ?? "#49423a" }}
                        title={country.colorHex ?? "default"}
                    />
                    <p className="mt-3 text-sm text-stone-400">
                        This page is publicly viewable. Private country tools live under <code className="text-stone-300">/members/me</code>.
                    </p>
                </aside>
            </div>
        </section>
    );
}

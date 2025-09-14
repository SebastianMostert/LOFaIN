// app/members/[slugOrCode]/page.tsx
import { prisma } from "@/prisma";
import { notFound } from "next/navigation";
import { epunda } from "@/app/fonts";

// Accepts /members/france or /members/FR /members/FRA
async function getCountry(slugOrCode: string) {
    const code = slugOrCode.toUpperCase();
    const slug = slugOrCode.toLowerCase();

    // Try by code, then by slug
    const byCode = await prisma.country.findFirst({
        where: { code },
        select: {
            id: true, name: true, slug: true, code: true, colorHex: true,
            users: { select: { id: true, name: true, image: true }, take: 50 },
        },
    });
    if (byCode) return byCode;

    const bySlug = await prisma.country.findUnique({
        where: { slug },
        select: {
            id: true, name: true, slug: true, code: true, colorHex: true,
            users: { select: { id: true, name: true, image: true }, take: 50 },
        },
    });
    return bySlug;
}

export async function generateMetadata({ params }: { params: { slugOrCode: string } }) {
    const country = await getCountry(params.slugOrCode);
    return {
        title: country ? `${country.name} • League` : "Country • League",
    };
}

export default async function PublicCountryPage({ params }: { params: { slugOrCode: string } }) {
    const country = await getCountry(params.slugOrCode);
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
                            <li key={u.id} className="flex items-center gap-3 rounded border border-stone-700 bg-stone-950/60 p-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={u.image ?? "/logo.png"} alt="" className="h-8 w-8 rounded object-cover" />
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

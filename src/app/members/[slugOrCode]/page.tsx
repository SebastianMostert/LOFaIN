import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { epunda } from "@/app/fonts";
import FlagImage from "@/components/FlagImage";
import { getCountry } from "@/utils/country";
import { formatDate } from "@/utils/formatting";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slugOrCode: string }>;
}): Promise<Metadata> {
  const awaitedParams = await params;
  const country = await getCountry(awaitedParams.slugOrCode);
  if (!country) {
    const url = `${baseUrl}/members/${awaitedParams.slugOrCode}`;
    return {
      title: "Country - League",
      description: "Public profile for a member country of the League.",
      keywords: ["country", "league"],
      alternates: { canonical: url },
      openGraph: {
        title: "Country - League",
        description: "Public profile for a member country of the League.",
        url,
        images: [{ url: `${baseUrl}/logo.png`, alt: "League logo" }],
      },
    };
  }
  const url = `${baseUrl}/members/${country.slug}`;
  return {
    title: `${country.name} - League`,
    description: `Public profile for ${country.name} in the League of Free and Independent Nations.`,
    keywords: [country.name, "country", "league"],
    alternates: { canonical: url },
    openGraph: {
      title: `${country.name} - League`,
      description: `Public profile for ${country.name} in the League of Free and Independent Nations.`,
      url,
      images: [{ url: `${baseUrl}/flags/${(country.code || "unknown").toLowerCase()}.svg`, alt: `${country.name} flag` }],
    },
  };
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4">
      <dt className="text-xs uppercase tracking-[0.24em] text-stone-400">{label}</dt>
      <dd className="mt-1 text-sm text-stone-100">{value}</dd>
    </div>
  );
}

export default async function PublicCountryPage({
  params,
}: {
  params: Promise<{ slugOrCode: string }>;
}) {
  const awaitedParams = await params;
  const country = await getCountry(awaitedParams.slugOrCode);
  if (!country) notFound();

  const isChair = country.slug === "chair";

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-900">
      <div
        className="h-2 w-full"
        style={{ background: country.colorHex ?? "#49423a" }}
      />
      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative h-16 w-24 overflow-hidden rounded-xl border border-stone-700 bg-stone-950">
                <FlagImage
                  src={`/flags/${(country.code ?? "unknown").toLowerCase()}.svg`}
                  alt={`${country.name} flag`}
                  sizes="96px"
                  className="object-cover"
                />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-stone-400">Public Country Profile</div>
                <h2 className={`${epunda.className} mt-1 text-3xl font-semibold text-stone-50`}>{country.name}</h2>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-stone-700 px-3 py-1 text-stone-200">
                    Code {country.code ?? "N/A"}
                  </span>
                  {country.hasVeto && (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-200">
                      Veto power
                    </span>
                  )}
                  {isChair && (
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-sky-200">
                      Current chair
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatCard label="Date joined" value={formatDate(country.createdAt)} />
            <StatCard label="Delegates" value={String(country.users.length)} />
            <StatCard label="Status" value={isChair ? "Chairing member" : "Standard member"} />
          </dl>

          <div className="mt-8">
            <h3 className={`${epunda.className} text-lg font-semibold`}>Delegates</h3>
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {country.users.length === 0 && (
                <li className="rounded-xl border border-dashed border-stone-700 bg-stone-950/40 p-4 text-sm text-stone-400">
                  No delegates registered.
                </li>
              )}
              {country.users.map((delegate) => (
                <li
                  key={delegate.id}
                  className="flex items-center gap-3 rounded-xl border border-stone-800 bg-stone-950/60 p-3"
                >
                  <Image
                    src={delegate.image ?? "/logo.png"}
                    alt={delegate.name ? `${delegate.name}'s avatar` : "Delegate avatar"}
                    className="h-10 w-10 rounded-full object-cover"
                    width={40}
                    height={40}
                  />
                  <div>
                    <div className="text-sm font-medium text-stone-100">{delegate.name ?? "Unnamed delegate"}</div>
                    <div className="text-xs text-stone-400">Registered delegate</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
            <div className="text-xs uppercase tracking-[0.24em] text-stone-400">Accent</div>
            <div
              className="mt-3 h-12 w-full rounded-xl border border-stone-800"
              style={{ background: country.colorHex ?? "#49423a" }}
              title={country.colorHex ?? "default"}
            />
            <p className="mt-3 text-sm text-stone-300">
              Public profiles show delegates and core state metadata. Private tools remain under <code className="text-stone-100">/members/me</code>.
            </p>
          </section>

          <section className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
            <div className="text-xs uppercase tracking-[0.24em] text-stone-400">Quick Facts</div>
            <ul className="mt-3 space-y-2 text-sm text-stone-300">
              <li>Joined the League on {formatDate(country.createdAt)}.</li>
              <li>{country.hasVeto ? "Can exercise veto rights on qualifying matters." : "Does not currently hold veto rights."}</li>
              <li>{isChair ? "Currently holds the chair." : "Is not the current chair."}</li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}

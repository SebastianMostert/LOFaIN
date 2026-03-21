import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, getSignInPath } from "@/auth";
import { epunda } from "@/app/fonts";
import FlagImage from "@/components/FlagImage";
import { getCurrentChairAssignment } from "@/utils/chair";
import { getCountry } from "@/utils/country";
import { formatDate } from "@/utils/formatting";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const metadata: Metadata = {
  title: "My Country - League",
  description: "Private profile and tools for your country in the League.",
  keywords: ["country", "profile", "league"],
  alternates: { canonical: `${baseUrl}/members/me` },
  openGraph: {
    title: "My Country - League",
    description: "Private profile and tools for your country in the League.",
    url: `${baseUrl}/members/me`,
    images: [{ url: `${baseUrl}/logo.png`, alt: "League logo" }],
  },
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4">
      <div className="text-xs uppercase tracking-[0.24em] text-stone-400">{label}</div>
      <div className="mt-1 text-sm text-stone-100">{value}</div>
    </div>
  );
}

export default async function MyCountryPage() {
  const session = await auth();
  if (!session) redirect(getSignInPath("/members/me"));

  const user = session.user;
  const countryLookup = user.country?.slug ?? user.country?.code ?? null;

  if (!countryLookup) {
    return (
      <section className="rounded-2xl border border-stone-800 bg-stone-900 p-6">
        <h2 className={`${epunda.className} text-xl font-semibold`}>No Country Assigned</h2>
        <p className="mt-2 text-stone-300">
          Your account is not yet mapped to a country. Contact an admin to complete the assignment.
        </p>
        <p className="mt-4 text-sm text-stone-400">
          Tip: confirm that your Discord ID exists in the <code className="text-stone-200">CountryMapping</code> table.
        </p>
      </section>
    );
  }

  const [country, chairAssignment] = await Promise.all([getCountry(countryLookup), getCurrentChairAssignment()]);

  if (!country) {
    return (
      <section className="rounded-2xl border border-stone-800 bg-stone-900 p-6">
        <h2 className={`${epunda.className} text-xl font-semibold`}>Country Not Found</h2>
        <p className="mt-2 text-stone-300">Your mapped country no longer exists.</p>
      </section>
    );
  }

  const isChair = chairAssignment.effectiveChair.id === country.id;

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <article className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-900">
        <div
          className="h-2 w-full"
          style={{ background: country.colorHex ?? "#49423a" }}
        />
        <div className="p-6">
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
                <div className="text-xs uppercase tracking-[0.28em] text-stone-400">Private Country Profile</div>
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

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric label="Date joined" value={formatDate(country.createdAt)} />
            <Metric label="Delegates" value={String(country.users.length)} />
            <Metric label="Profile route" value={`/members/${country.slug}`} />
          </div>

          <div className="mt-8">
            <h3 className={`${epunda.className} text-lg font-semibold`}>Delegates</h3>
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {country.users.length === 0 && (
                <li className="rounded-xl border border-dashed border-stone-700 bg-stone-950/40 p-4 text-sm text-stone-400">
                  No delegates yet.
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
                    <div className="text-xs text-stone-400">Member of your delegation</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </article>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-stone-800 bg-stone-900 p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-stone-400">Public Link</div>
          <Link
            href={`/members/${country.slug}`}
            className="mt-3 inline-flex rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
          >
            View public profile
          </Link>
        </div>
        <div className="rounded-2xl border border-stone-800 bg-stone-900 p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-stone-400">Accent</div>
          <div
            className="mt-3 h-12 w-full rounded-xl border border-stone-800"
            style={{ background: country.colorHex ?? "#49423a" }}
            title={country.colorHex ?? "default"}
          />
          <p className="mt-3 text-sm text-stone-300">
            Use this profile as the private landing page for your delegation.
          </p>
        </div>
        <div className="rounded-2xl border border-stone-800 bg-stone-900 p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-stone-400">Chair Rotation</div>
          <p className="mt-3 text-sm text-stone-300">
            Current chair: <span className="font-medium text-stone-100">{chairAssignment.effectiveChair.name}</span>
          </p>
          <p className="mt-1 text-sm text-stone-400">
            Term length depends on chair status: one week for veto powers, two weeks for non-veto powers.
          </p>
        </div>
      </aside>
    </section>
  );
}

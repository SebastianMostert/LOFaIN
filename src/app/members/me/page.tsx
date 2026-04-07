import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, getSignInPath } from "@/auth";
import { epunda } from "@/app/fonts";
import FlagImage from "@/components/FlagImage";
import CountryProfileEditor from "@/components/members/CountryProfileEditor";
import { getCurrentChairAssignment } from "@/utils/chair";
import { getCountry } from "@/utils/country";
import { getCountryFlagAspectRatio, getCountryFlagSrc } from "@/utils/flags";
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
    <div className="rounded-2xl border border-stone-800/80 bg-stone-950/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="text-[11px] uppercase tracking-[0.28em] text-stone-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-stone-100">{value}</div>
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
  const joinedDate = formatDate(country.joinedAt ?? country.createdAt);
  const delegateCount = country.users.length;
  const accentColor = country.colorHex ?? "#49423a";

  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <article className="relative overflow-hidden rounded-[2rem] border border-stone-800 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_30%),linear-gradient(180deg,rgba(41,37,36,0.96),rgba(12,10,9,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
          <div className="h-1.5 w-full" style={{ background: accentColor }} />
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background: `radial-gradient(circle at top right, ${accentColor}22, transparent 32%)`,
            }}
          />

          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-5">
                <div
                  className="relative w-28 shrink-0 overflow-hidden rounded-2xl border border-stone-700/80 bg-stone-950 shadow-[0_18px_32px_rgba(0,0,0,0.28)]"
                  style={{ aspectRatio: getCountryFlagAspectRatio(country) }}
                >
                  <FlagImage
                    src={getCountryFlagSrc(country)}
                    alt={`${country.name} flag`}
                    sizes="112px"
                    className="object-cover"
                  />
                </div>

                <div className="max-w-2xl">
                  <div className="text-xs uppercase tracking-[0.32em] text-stone-500">Private Country Profile</div>
                  <h2 className={`${epunda.className} mt-2 text-3xl font-semibold leading-none text-stone-50 sm:text-4xl`}>
                    {country.name}
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-stone-300">
                    Manage the public-facing profile for your delegation, keep state details current, and review how your country appears across the members directory.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-stone-700 bg-stone-900/70 px-3 py-1 text-stone-200">
                      Code {country.code ?? "N/A"}
                    </span>
                    <span className="rounded-full border border-stone-700 bg-stone-900/70 px-3 py-1 text-stone-200">
                      Joined {joinedDate}
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

              <div className="grid gap-3 sm:grid-cols-2 lg:w-[19rem] lg:grid-cols-1">
                <Link
                  href={`/members/${country.slug}`}
                  className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-white"
                >
                  View public profile
                </Link>
                <div className="rounded-2xl border border-stone-800/80 bg-stone-950/50 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-stone-500">Current chair</div>
                  <div className="mt-2 text-sm text-stone-100">{chairAssignment.effectiveChair.name}</div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Metric label="Date joined" value={joinedDate} />
              <Metric label="Delegates" value={String(delegateCount)} />
              <Metric label="Profile route" value={`/members/${country.slug}`} />
              <Metric label="Chair status" value={isChair ? "Holding office" : "Standard rotation"} />
            </div>
          </div>
        </article>

        <section className="rounded-[2rem] border border-stone-800 bg-[linear-gradient(180deg,rgba(24,24,27,0.88),rgba(12,10,9,0.96))] p-2 shadow-[0_16px_48px_rgba(0,0,0,0.2)]">
          <div className="rounded-[1.6rem] border border-stone-800/80 bg-stone-950/20">
            <div className="border-b border-stone-800/80 px-6 py-5">
              <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Editor</div>
              <h3 className={`${epunda.className} mt-2 text-2xl text-stone-100`}>Profile controls</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400">
                Update the visual identity, public summary, government details, and officeholder list shown on your country profile.
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <CountryProfileEditor
                initialCountry={{
                  name: country.name,
                  slug: country.slug,
                  code: country.code ?? null,
                  colorHex: country.colorHex ?? null,
                  flagImagePath: country.flagImagePath ?? null,
                  flagAspectRatio: country.flagAspectRatio ?? null,
                  summary: country.summary ?? null,
                  capital: country.capital ?? null,
                  governmentType: country.governmentType ?? null,
                  officeholders: country.officeholders ?? null,
                  headOfState: country.headOfState ?? null,
                  foreignMinister: country.foreignMinister ?? null,
                  delegates: country.users.map((delegate) => ({
                    id: delegate.id,
                    name: delegate.name ?? null,
                  })),
                }}
              />
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-stone-800 bg-[linear-gradient(180deg,rgba(28,25,23,0.92),rgba(12,10,9,0.96))] p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Delegation</div>
              <h3 className={`${epunda.className} mt-2 text-2xl text-stone-100`}>Delegate roster</h3>
              <p className="mt-2 text-sm leading-6 text-stone-400">
                These members can be assigned to officeholder roles inside the profile editor.
              </p>
            </div>
            <div className="rounded-full border border-stone-800 bg-stone-950/60 px-4 py-2 text-sm text-stone-300">
              {delegateCount} {delegateCount === 1 ? "delegate" : "delegates"}
            </div>
          </div>

          <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            {delegateCount === 0 && (
              <li className="rounded-2xl border border-dashed border-stone-700 bg-stone-950/40 p-5 text-sm text-stone-400">
                No delegates yet.
              </li>
            )}
            {country.users.map((delegate, index) => (
              <li
                key={delegate.id}
                className="flex items-center gap-4 rounded-2xl border border-stone-800 bg-stone-950/55 p-4 transition hover:border-stone-700"
              >
                <Image
                  src={delegate.image ?? "/logo.png"}
                  alt={delegate.name ? `${delegate.name}'s avatar` : "Delegate avatar"}
                  className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10"
                  width={48}
                  height={48}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-stone-100">{delegate.name ?? "Unnamed delegate"}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">
                    Delegate {String(index + 1).padStart(2, "0")}
                  </div>
                </div>
                <div className="rounded-full border border-stone-800 bg-stone-900/80 px-3 py-1 text-xs text-stone-300">
                  Delegation member
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
        <section className="overflow-hidden rounded-[1.75rem] border border-stone-800 bg-[linear-gradient(180deg,rgba(28,25,23,0.96),rgba(12,10,9,0.96))]">
          <div className="h-1.5 w-full" style={{ background: accentColor }} />
          <div className="p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-stone-500">Identity</div>
            <div
              className="relative mt-4 w-full overflow-hidden rounded-2xl border border-stone-800 bg-stone-950"
              style={{ aspectRatio: getCountryFlagAspectRatio(country) }}
            >
              <FlagImage
                src={getCountryFlagSrc(country)}
                alt={`${country.name} flag`}
                sizes="320px"
                className="object-cover"
              />
            </div>

            <div className="mt-4 grid gap-3">
              <Metric label="Accent" value={country.colorHex ?? "Default palette"} />
              <Metric label="Capital" value={country.capital ?? "Not set"} />
              <Metric label="Government" value={country.governmentType ?? "Not set"} />
            </div>

            <div
              className="mt-4 h-12 w-full rounded-2xl border border-stone-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
              style={{ background: accentColor }}
              title={country.colorHex ?? "default"}
            />
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-stone-800 bg-stone-900/90 p-5">
          <div className="text-xs uppercase tracking-[0.24em] text-stone-500">Publishing notes</div>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-300">
            <li>Changes in the editor stay local until you save them.</li>
            <li>The flag can suggest an accent automatically, but you can override it manually.</li>
            <li>Officeholders should map to delegates so the public profile stays consistent.</li>
          </ul>
        </section>

        <section className="rounded-[1.75rem] border border-stone-800 bg-stone-900/90 p-5">
          <div className="text-xs uppercase tracking-[0.24em] text-stone-500">Chair rotation</div>
          <p className="mt-3 text-sm leading-6 text-stone-300">
            Current chair: <span className="font-medium text-stone-100">{chairAssignment.effectiveChair.name}</span>
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-400">
            Term length depends on chair status: one week for veto powers, two weeks for non-veto powers.
          </p>
        </section>
      </aside>
    </section>
  );
}

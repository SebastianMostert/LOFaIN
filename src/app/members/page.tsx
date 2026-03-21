import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { epunda } from "@/app/fonts";
import FlagImage from "@/components/FlagImage";
import { prisma } from "@/prisma";
import { getCurrentChairAssignment } from "@/utils/chair";
import { formatDate } from "@/utils/formatting";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

type SortKey = "name" | "delegates" | "joined";
type FilterKey = "all" | "active" | "former" | "veto" | "chair";

export const metadata: Metadata = {
  title: "Countries - League",
  description: "Browse current and former member countries of the League of Free and Independent Nations.",
  keywords: ["countries", "members", "league"],
  alternates: { canonical: `${baseUrl}/members` },
  openGraph: {
    title: "Countries - League",
    description: "Browse current and former member countries of the League of Free and Independent Nations.",
    url: `${baseUrl}/members`,
    images: [{ url: `${baseUrl}/logo.png`, alt: "League logo" }],
  },
};

function badgeClasses(kind: "veto" | "chair" | "self") {
  if (kind === "veto") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }
  if (kind === "chair") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  }
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
}

export default async function CountriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const user = session?.user;
  const myCountryId = user?.countryId ?? null;
  const params = await searchParams;

  const query = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const sort = (typeof params.sort === "string" ? params.sort : "name") as SortKey;
  const filter = (typeof params.filter === "string" ? params.filter : "all") as FilterKey;

  const [countries, chairAssignment] = await Promise.all([
    prisma.country.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      colorHex: true,
      hasVeto: true,
      isActive: true,
      createdAt: true,
      _count: { select: { users: true } },
    },
    }),
    getCurrentChairAssignment(),
  ]);
  const currentChairCountryId = chairAssignment.effectiveChair.id;

  const shapedCountries = countries
    .map((country) => ({
      ...country,
      isChair: country.id === currentChairCountryId,
      href: `/members/${country.slug}`,
    }))
    .filter((country) => {
      if (filter === "active" && !country.isActive) return false;
      if (filter === "former" && country.isActive) return false;
      if (filter === "veto" && !country.hasVeto) return false;
      if (filter === "chair" && !country.isChair) return false;
      if (!query) return true;

      return [country.name, country.code ?? "", formatDate(country.createdAt)]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((left, right) => {
      if (sort === "delegates") {
        return right._count.users - left._count.users || left.name.localeCompare(right.name);
      }
      if (sort === "joined") {
        return left.createdAt.getTime() - right.createdAt.getTime();
      }
      return left.name.localeCompare(right.name);
    });

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-stone-400">Browse</div>
            <h2 className={`${epunda.className} mt-1 text-2xl font-bold`}>All Countries</h2>
            <p className="mt-2 text-sm text-stone-300">
              {shapedCountries.length} {shapedCountries.length === 1 ? "country matches" : "countries match"} the current view.
            </p>
          </div>

          <form className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_180px_180px_auto]">
            <label className="flex flex-col gap-1 text-sm text-stone-300">
              <span className="text-xs uppercase tracking-[0.24em] text-stone-400">Search</span>
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search by country or joined date"
                className="rounded-xl border border-stone-700 bg-stone-950 px-4 py-2.5 text-stone-100 placeholder:text-stone-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-stone-300">
              <span className="text-xs uppercase tracking-[0.24em] text-stone-400">Sort</span>
              <select
                name="sort"
                defaultValue={sort}
                className="rounded-xl border border-stone-700 bg-stone-950 px-4 py-2.5 text-stone-100"
              >
                <option value="name">Alphabetical</option>
                <option value="delegates">Delegates</option>
                <option value="joined">Date joined</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-stone-300">
              <span className="text-xs uppercase tracking-[0.24em] text-stone-400">Filter</span>
              <select
                name="filter"
                defaultValue={filter}
                className="rounded-xl border border-stone-700 bg-stone-950 px-4 py-2.5 text-stone-100"
              >
                <option value="all">All countries</option>
                <option value="active">Current members</option>
                <option value="former">Former members</option>
                <option value="veto">Veto holders</option>
                <option value="chair">Chair only</option>
              </select>
            </label>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex rounded-xl border border-stone-600 bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-white"
              >
                Apply
              </button>
              <Link
                href="/members"
                className="inline-flex rounded-xl border border-stone-700 px-4 py-2.5 text-sm text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
              >
                Reset
              </Link>
            </div>
          </form>
        </div>
      </div>

      {shapedCountries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/40 p-10 text-center">
          <h3 className={`${epunda.className} text-2xl text-stone-100`}>No countries match this view</h3>
          <p className="mt-3 text-sm text-stone-300">
            Adjust the search or filters to see member states again.
          </p>
          <Link
            href="/members"
            className="mt-5 inline-flex rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
          >
            Clear all filters
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {shapedCountries.map((country) => {
            const isMine = myCountryId === country.id;

            return (
              <li
                key={country.id}
                className={`relative overflow-hidden rounded-2xl border bg-stone-900/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-500 ${
                  isMine
                    ? "border-emerald-600/70 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                    : "border-stone-800"
                }`}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: country.colorHex ?? "#6b6257" }}
                />

                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="relative h-14 w-20 overflow-hidden rounded-lg border border-stone-700 bg-stone-950">
                      <FlagImage
                        src={`/flags/${(country.code ?? "unknown").toLowerCase()}.svg`}
                        alt={`${country.name} flag`}
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`${epunda.className} text-2xl font-semibold text-stone-50`}>{country.name}</h3>
                        {country.hasVeto && (
                          <span className={`rounded-full border px-2.5 py-1 text-xs ${badgeClasses("veto")}`}>
                            Veto power
                          </span>
                        )}
                        {!country.isActive && (
                          <span className="rounded-full border border-stone-600 bg-stone-800/80 px-2.5 py-1 text-xs text-stone-300">
                            Former member
                          </span>
                        )}
                        {country.isChair && (
                          <span className={`rounded-full border px-2.5 py-1 text-xs ${badgeClasses("chair")}`}>
                            Current chair
                          </span>
                        )}
                        {isMine && (
                          <span className={`rounded-full border px-2.5 py-1 text-xs ${badgeClasses("self")}`}>
                            Your country
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-stone-300">
                        Code <span className="font-medium text-stone-100">{country.code ?? "N/A"}</span>
                      </p>
                    </div>
                  </div>

                  <div
                    className="h-10 w-full rounded-xl border border-stone-800 sm:w-28"
                    style={{ background: country.colorHex ?? "#49423a" }}
                    title={country.colorHex ?? "default"}
                  />
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                  <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                    <dt className="text-xs uppercase tracking-[0.2em] text-stone-400">Joined</dt>
                    <dd className="mt-1 text-stone-100">{formatDate(country.createdAt)}</dd>
                  </div>
                  <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                    <dt className="text-xs uppercase tracking-[0.2em] text-stone-400">Delegates</dt>
                    <dd className="mt-1 text-stone-100">{country._count.users}</dd>
                  </div>
                  <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                    <dt className="text-xs uppercase tracking-[0.2em] text-stone-400">Veto</dt>
                    <dd className="mt-1 text-stone-100">{country.hasVeto ? "Yes" : "No"}</dd>
                  </div>
                  <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                    <dt className="text-xs uppercase tracking-[0.2em] text-stone-400">Chair</dt>
                    <dd className="mt-1 text-stone-100">{country.isChair ? "Holding office" : "Not current"}</dd>
                  </div>
                  <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                    <dt className="text-xs uppercase tracking-[0.2em] text-stone-400">Membership</dt>
                    <dd className="mt-1 text-stone-100">{country.isActive ? "Current member" : "Former member"}</dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={country.href}
                    className="inline-flex rounded-full border border-stone-700 bg-stone-800 px-4 py-2 text-sm text-stone-100 transition hover:border-stone-500 hover:bg-stone-700"
                  >
                    View public page
                  </Link>
                  {isMine && (
                    <Link
                      href="/members/me"
                      className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/20"
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
    </section>
  );
}

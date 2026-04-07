import type { Metadata } from "next";
import Link from "next/link";

import { epunda } from "@/app/fonts";
import FlagImage from "@/components/FlagImage";
import { prisma } from "@/prisma";
import { CHAIR_ROTATION_ORDER, getCurrentChairAssignment, getRotationSchedule } from "@/utils/chair";
import { getCountryFlagAspectRatio, getCountryFlagSrc } from "@/utils/flags";
import { formatDateTime, formatDeadline } from "@/utils/formatting";
import { computeSimulatedDateForRealDate } from "@/utils/time/shared";
import { getLeagueTimeSnapshot } from "@/utils/time/server";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const metadata: Metadata = {
  title: "Chair Rotation - League",
  description: "Current chair, mixed-term rotation order, and debate handoff rules for the League.",
  keywords: ["chair", "rotation", "league", "debate"],
  alternates: { canonical: `${baseUrl}/chair` },
  openGraph: {
    title: "Chair Rotation - League",
    description: "Current chair, mixed-term rotation order, and debate handoff rules for the League.",
    url: `${baseUrl}/chair`,
    images: [{ url: `${baseUrl}/logo.png`, alt: "League logo" }],
  },
};

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4">
      <div className="text-xs uppercase tracking-[0.24em] text-stone-400">{label}</div>
      <div className="mt-2 text-lg font-semibold text-stone-100">{value}</div>
      {note && <div className="mt-1 text-sm text-stone-400">{note}</div>}
    </div>
  );
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "sky" | "amber";
}) {
  const classes =
    tone === "sky"
      ? "border-sky-500/30 bg-sky-500/10 text-sky-200"
      : tone === "amber"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
        : "border-stone-700 bg-stone-900/70 text-stone-200";

  return <span className={`rounded-full border px-2.5 py-1 text-xs ${classes}`}>{children}</span>;
}

export default async function ChairPage() {
  const [assignment, countries, leagueTime] = await Promise.all([
    getCurrentChairAssignment(),
    prisma.country.findMany({
      where: {
        slug: { in: [...CHAIR_ROTATION_ORDER] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        code: true,
        flagImagePath: true,
        flagAspectRatio: true,
        hasVeto: true,
        isActive: true,
      },
    }),
    getLeagueTimeSnapshot(),
  ]);

  const bySlug = new Map(countries.map((country) => [country.slug, country]));
  const rotation = CHAIR_ROTATION_ORDER
    .map((slug) => bySlug.get(slug))
    .filter((country): country is NonNullable<typeof country> => Boolean(country));
  const currentIndex = rotation.findIndex((country) => country?.id === assignment.effectiveChair.id);
  const nextCountry = rotation.length > 0 ? rotation[(currentIndex + 1) % rotation.length] : null;
  const termLengthLabel = assignment.effectiveChair.hasVeto ? "7 years" : "14 years";
  const schedule = getRotationSchedule(rotation, assignment.rotationStartedAt);
  const simulatedRotationStartedAt = computeSimulatedDateForRealDate(assignment.rotationStartedAt, leagueTime);
  const simulatedTermStartedAt = computeSimulatedDateForRealDate(assignment.termStartedAt, leagueTime);
  const simulatedTermEndsAt = computeSimulatedDateForRealDate(assignment.termEndsAt, leagueTime);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 text-stone-100">
      <header className="relative overflow-hidden rounded-[2rem] border border-stone-800 bg-stone-900/90 p-6 shadow-xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(180,83,9,0.12),transparent_28%)]" />
        <div className="relative">
          <div className="text-xs uppercase tracking-[0.3em] text-stone-400">Council Chair</div>
          <h1 className={`${epunda.className} mt-2 text-4xl font-extrabold text-stone-100 sm:text-5xl`}>
            Chair Rotation
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-stone-300 sm:text-base">
            The office rotates in an agreed order. Veto powers preside for seven simulated years, non-veto powers for
            fourteen simulated years, and amendment debates pass temporarily to the next state in line when the scheduled
            chair is also the proposer.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Pill tone="sky">Current chair: {assignment.effectiveChair.name}</Pill>
            <Pill tone="amber">Term length: {termLengthLabel}</Pill>
            {nextCountry && <Pill>Next in line: {nextCountry.name}</Pill>}
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <article className="rounded-3xl border border-sky-700/30 bg-sky-950/25 p-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className="relative w-24 overflow-hidden rounded-xl border border-stone-700 bg-stone-950"
                    style={{ aspectRatio: getCountryFlagAspectRatio(assignment.effectiveChair) }}
                  >
                    <FlagImage
                      src={getCountryFlagSrc(assignment.effectiveChair)}
                      alt={`${assignment.effectiveChair.name} flag`}
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-sky-200/80">Current chair</div>
                    <div className={`${epunda.className} mt-1 text-3xl text-stone-50`}>{assignment.effectiveChair.name}</div>
                    <div className="mt-2 text-sm text-stone-300">
                      {assignment.effectiveChair.hasVeto
                        ? "Seven-year veto term currently in force."
                        : "Fourteen-year non-veto term currently in force."}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-700 bg-stone-950/60 px-4 py-3 text-sm text-stone-300">
                  <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Term status</div>
                  <div className="mt-1 font-semibold text-stone-100">
                    {formatDeadline(simulatedTermEndsAt, leagueTime.currentSimulatedNow)}
                  </div>
                  <div className="mt-1 text-stone-400">Ends {formatDateTime(simulatedTermEndsAt)}</div>
                </div>
              </div>
            </article>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <StatCard label="Term opened" value={formatDateTime(simulatedTermStartedAt)} />
              <StatCard
                label="Next rotation"
                value={formatDateTime(simulatedTermEndsAt)}
                note={
                  nextCountry
                    ? `${nextCountry.name} is next in the published order. Real time: ${formatDateTime(assignment.termEndsAt)}.`
                    : `Rotation continues automatically. Real time: ${formatDateTime(assignment.termEndsAt)}.`
                }
              />
            </div>
          </div>
        </div>
      </header>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <article className="rounded-3xl border border-stone-800 bg-stone-900/75 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-stone-400">Agreed order</div>
              <h2 className={`${epunda.className} mt-1 text-2xl text-stone-100`}>Rotation Sequence</h2>
            </div>
            <div className="text-sm text-stone-400">
              Position {currentIndex >= 0 ? currentIndex + 1 : "?"} currently presides
            </div>
          </div>

          <ol className="mt-6 grid gap-3">
            {rotation.map((country, index) => {
              if (!country) return null;
              const isCurrent = country.id === assignment.effectiveChair.id;
              const isNext = nextCountry?.id === country.id && !isCurrent;
              const slot = schedule[index];

              return (
                <li
                  key={country.id}
                  className={`rounded-2xl border px-4 py-4 transition ${
                    isCurrent
                      ? "border-sky-500/40 bg-sky-950/30 shadow-[0_0_0_1px_rgba(56,189,248,0.12)]"
                      : isNext
                        ? "border-amber-500/25 bg-amber-950/10"
                        : "border-stone-800 bg-stone-950/50"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 bg-stone-900 text-sm font-semibold text-stone-200">
                        {index + 1}
                      </div>
                      <div
                        className="relative w-16 overflow-hidden rounded-lg border border-stone-700 bg-stone-950"
                        style={{ aspectRatio: getCountryFlagAspectRatio(country) }}
                      >
                        <FlagImage
                          src={getCountryFlagSrc(country)}
                          alt={`${country.name} flag`}
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-base font-semibold text-stone-100">{country.name}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {isCurrent && <Pill tone="sky">Current chair</Pill>}
                          {isNext && <Pill tone="amber">Next in line</Pill>}
                          {country.hasVeto && <Pill tone="amber">Veto power</Pill>}
                        </div>
                        {slot && (
                          <div className="mt-2 text-sm text-stone-400">
                            {formatDateTime(computeSimulatedDateForRealDate(slot.startsAt, leagueTime))} to{" "}
                            {formatDateTime(computeSimulatedDateForRealDate(slot.endsAt, leagueTime))}
                          </div>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/members/${country.slug}`}
                      className="inline-flex w-fit rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
                    >
                      View member page
                    </Link>
                  </div>
                </li>
              );
            })}
          </ol>
        </article>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-stone-800 bg-stone-900/75 p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-stone-400">Rules</div>
            <h2 className={`${epunda.className} mt-1 text-2xl text-stone-100`}>How It Works</h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-stone-300">
              <div className="rounded-2xl border border-stone-800 bg-stone-950/50 p-4">
                Veto powers hold the chair for seven simulated years so the office does not remain concentrated too long among the strongest states.
              </div>
              <div className="rounded-2xl border border-stone-800 bg-stone-950/50 p-4">
                Non-veto powers hold the chair for fourteen simulated years to give smaller states a fuller opportunity to shape procedure and visibly exercise leadership.
              </div>
              <div className="rounded-2xl border border-stone-800 bg-stone-950/50 p-4">
                If the scheduled chair proposed the amendment being debated, the office passes temporarily to the next state in rotation for that debate.
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-stone-800 bg-stone-900/75 p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-stone-400">Current term</div>
            <h2 className={`${epunda.className} mt-1 text-2xl text-stone-100`}>At a Glance</h2>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-stone-800 bg-stone-950/50 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Presiding state</div>
                <div className="mt-1 font-semibold text-stone-100">{assignment.effectiveChair.name}</div>
              </div>
              <div className="rounded-2xl border border-stone-800 bg-stone-950/50 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Rotation anchor</div>
                <div className="mt-1 font-semibold text-stone-100">{formatDateTime(simulatedRotationStartedAt)}</div>
              </div>
              <div className="rounded-2xl border border-stone-800 bg-stone-950/50 p-4 text-sm text-stone-300">
                Rotation remains real-time, but the dates shown here are displayed on the simulation calendar.
              </div>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

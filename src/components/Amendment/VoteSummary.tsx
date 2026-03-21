import FlagImage from "@/components/FlagImage";

type Choice = "AYE" | "NAY" | "ABSTAIN" | "ABSENT";

function choiceStyles(choice?: Choice | null) {
  switch (choice) {
    case "AYE":
      return {
        swatch: "bg-emerald-500",
        ring: "ring-emerald-500/30",
        label: "Aye",
        text: "text-emerald-200",
      };
    case "NAY":
      return {
        swatch: "bg-rose-500",
        ring: "ring-rose-500/30",
        label: "Nay",
        text: "text-rose-200",
      };
    case "ABSTAIN":
      return {
        swatch: "bg-amber-400",
        ring: "ring-amber-400/30",
        label: "Abstain",
        text: "text-amber-100",
      };
    case "ABSENT":
    default:
      return {
        swatch: "bg-stone-500",
        ring: "ring-stone-500/30",
        label: "Absent",
        text: "text-stone-300",
      };
  }
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-900/80 px-3 py-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-sm text-stone-300">{label}</span>
    </span>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <LegendItem color="bg-emerald-500" label="Aye" />
      <LegendItem color="bg-rose-500" label="Nay" />
      <LegendItem color="bg-amber-400" label="Abstain" />
      <LegendItem color="bg-stone-500" label="Absent" />
    </div>
  );
}

function CountryVoteCard({
  country,
  byCountry,
  emphasized = false,
}: {
  country: { name: string; id: string; slug: string; code: string | null; hasVeto?: boolean };
  byCountry: Map<string, Choice>;
  emphasized?: boolean;
}) {
  const vote = (byCountry.get(country.id) ?? "ABSENT") as Choice;
  const styles = choiceStyles(vote);
  const flagSrc = `/flags/${(country.code || "unknown").toLowerCase()}.svg`;

  return (
    <article
      className={`rounded-[1.6rem] border border-stone-800 bg-stone-900/90 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.2)] ring-1 ${styles.ring} ${
        emphasized ? "min-w-[220px]" : "min-w-[180px]"
      }`}
    >
      <div className="relative h-[88px] overflow-hidden rounded-xl border border-stone-800 bg-white">
        <FlagImage src={flagSrc} alt={`${country.name} flag`} sizes="220px" className="object-cover" />
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-stone-100">{country.name}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">
            {country.hasVeto ? "Veto power" : "Member state"}
          </div>
        </div>
        <span className={`mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 rounded-full ${styles.swatch}`} aria-hidden="true" />
      </div>

      <div className={`mt-4 text-xs uppercase tracking-[0.24em] ${styles.text}`}>{styles.label}</div>
    </article>
  );
}

function VoteRow({
  title,
  subtitle,
  countries,
  byCountry,
  emphasized = false,
}: {
  title: string;
  subtitle: string;
  countries: { name: string; id: string; slug: string; code: string | null; hasVeto?: boolean }[];
  byCountry: Map<string, Choice>;
  emphasized?: boolean;
}) {
  if (countries.length === 0) return null;

  return (
    <section className="rounded-[1.8rem] border border-stone-800 bg-stone-950/55 p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-200">{title}</h3>
          <p className="mt-1 text-sm text-stone-400">{subtitle}</p>
        </div>
        <div className="text-xs uppercase tracking-[0.22em] text-stone-500">{countries.length} countries</div>
      </div>

      <div className={`mt-5 flex flex-wrap gap-4 ${emphasized ? "justify-center" : "justify-center xl:justify-start"}`}>
        {countries.map((country) => (
          <CountryVoteCard key={country.id} country={country} byCountry={byCountry} emphasized={emphasized} />
        ))}
      </div>
    </section>
  );
}

export default function VoteSummary({
  countries,
  byCountry,
}: {
  countries: { name: string; id: string; slug: string; code: string | null; hasVeto?: boolean }[];
  byCountry: Map<string, Choice>;
}) {
  const vetoCountries = countries.filter((country) => country.hasVeto);
  const memberCountries = countries.filter((country) => !country.hasVeto);

  return (
    <section className="rounded-[2rem] border border-stone-800 bg-[linear-gradient(180deg,rgba(28,25,23,0.96),rgba(12,10,9,0.96))] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Voting board</div>
          <h2 className="mt-2 text-xl font-semibold text-stone-100">Member positions at a glance</h2>
        </div>
        <Legend />
      </div>

      <div className="mt-6 space-y-5">
        <VoteRow
          title="Founding veto powers"
          subtitle="These members retain veto authority over League decisions."
          countries={vetoCountries}
          byCountry={byCountry}
          emphasized
        />
        <VoteRow
          title="Other member states"
          subtitle="All remaining active League members."
          countries={memberCountries}
          byCountry={byCountry}
        />
      </div>
    </section>
  );
}

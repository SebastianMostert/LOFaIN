import FlagImage from "@/components/FlagImage";

type Choice = "AYE" | "NAY" | "ABSTAIN" | "ABSENT";

function choiceStyles(choice?: Choice | null) {
  switch (choice) {
    case "AYE":
      return {
        swatch: "bg-emerald-500",
      };
    case "NAY":
      return {
        swatch: "bg-rose-500",
      };
    case "ABSTAIN":
      return {
        swatch: "bg-amber-400",
      };
    case "ABSENT":
    default:
      return {
        swatch: "bg-stone-500",
      };
  }
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`inline-block h-9 w-9 border-2 border-stone-900 ${color}`} />
      <span className="text-sm text-stone-300">{label}</span>
    </div>
  );
}

function CountryVoteSlot({
  country,
  vote,
}: {
  country: { name: string; id: string; slug: string; code: string | null; hasVeto?: boolean };
  vote: Choice;
}) {
  const styles = choiceStyles(vote);
  const flagSrc = `/flags/${(country.code || "unknown").toLowerCase()}.svg`;

  return (
    <div className="flex w-[118px] shrink-0 flex-col items-center gap-5 sm:w-[132px]">
      <div className="relative h-[70px] w-full overflow-hidden border-[3px] border-stone-900 bg-white">
        <FlagImage src={flagSrc} alt={`${country.name} flag`} sizes="132px" className="object-cover" />
      </div>

      <div
        className={`h-14 w-14 border-[3px] border-stone-900 ${styles.swatch}`}
        title={country.name}
      />
    </div>
  );
}

export default function VoteSummary({
  countries,
  byCountry,
}: {
  countries: { name: string; id: string; slug: string; code: string | null; hasVeto?: boolean }[];
  byCountry: Map<string, Choice>;
}) {
  return (
    <section className="mt-8 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
      <div className="mb-8 flex flex-wrap items-start justify-center gap-x-8 gap-y-4 lg:mb-0 lg:flex-col lg:justify-start">
        <LegendItem color="bg-emerald-500" label="Supports amendment" />
        <LegendItem color="bg-rose-500" label="Rejects amendment" />
        <LegendItem color="bg-amber-400" label="Abstains" />
        <LegendItem color="bg-stone-500" label="No vote recorded" />
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="mx-auto flex min-w-max items-start justify-center gap-5 px-1 lg:mx-0 lg:justify-start">
          {countries.map((country) => (
            <CountryVoteSlot
              key={country.id}
              country={country}
              vote={(byCountry.get(country.id) ?? "ABSENT") as Choice}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

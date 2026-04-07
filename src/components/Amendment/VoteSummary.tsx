import FlagImage from "@/components/FlagImage";
import { getCountryFlagAspectRatio, getCountryFlagSrc } from "@/utils/flags";

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
      <span className={`inline-block h-7 w-7 border-2 border-stone-900 sm:h-9 sm:w-9 ${color}`} />
      <span className="text-sm text-stone-300">{label}</span>
    </div>
  );
}

function CountryVoteSlot({
  country,
  vote,
}: {
  country: { name: string; id: string; slug: string; code: string | null; flagImagePath?: string | null; flagAspectRatio?: string | null; hasVeto?: boolean };
  vote: Choice;
}) {
  const styles = choiceStyles(vote);

  return (
    <div className="flex w-[84px] shrink-0 flex-col items-center gap-3 sm:w-[118px] sm:gap-5 lg:w-[132px]">
      <div
        className="relative w-full overflow-hidden border-2 border-stone-900 bg-white sm:border-[3px]"
        style={{ aspectRatio: getCountryFlagAspectRatio(country) }}
      >
        <FlagImage src={getCountryFlagSrc(country)} alt={`${country.name} flag`} sizes="132px" className="object-cover" />
      </div>

      <div
        className={`h-10 w-10 border-2 border-stone-900 sm:h-14 sm:w-14 sm:border-[3px] ${styles.swatch}`}
        title={country.name}
      />
    </div>
  );
}

export default function VoteSummary({
  countries,
  byCountry,
}: {
  countries: { name: string; id: string; slug: string; code: string | null; flagImagePath?: string | null; flagAspectRatio?: string | null; hasVeto?: boolean }[];
  byCountry: Map<string, Choice>;
}) {
  return (
    <section className="mt-8 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mb-0 lg:flex lg:flex-col lg:justify-start">
        <LegendItem color="bg-emerald-500" label="Supports amendment" />
        <LegendItem color="bg-rose-500" label="Rejects amendment" />
        <LegendItem color="bg-amber-400" label="Abstains" />
        <LegendItem color="bg-stone-500" label="No vote recorded" />
      </div>

      <div className="-mx-3 overflow-x-auto pb-2 sm:mx-0">
        <div className="mx-auto flex min-w-max items-start justify-start gap-3 px-3 sm:gap-5 sm:px-1 lg:mx-0">
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

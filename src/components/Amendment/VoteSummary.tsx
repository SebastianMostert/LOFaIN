import FlagImage from "@/components/FlagImage";

type Choice = "AYE" | "NAY" | "ABSTAIN" | "ABSENT";

function choiceColor(choice?: Choice | null) {
    switch (choice) {
        case "AYE": return "bg-emerald-600";
        case "NAY": return "bg-rose-600";
        case "ABSTAIN": return "bg-stone-500";
        case "ABSENT": return "bg-stone-400";
        default: return "bg-stone-500";
    }
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <span className="inline-flex items-center gap-2">
            <span className={`inline-block h-3 w-6 rounded ${color}`} />
            <span className="text-sm text-stone-300">{label}</span>
        </span>
    );
}

function Legend() {
    return (
        <div className="mt-8 flex flex-wrap items-center gap-4">
            <LegendItem color="bg-emerald-600" label="Aye" />
            <LegendItem color="bg-rose-600" label="Nay" />
            <LegendItem color="bg-stone-500" label="Abstain / no vote" />
        </div>
    );
}

const FlagsGrid = ({
    countries,
    byCountry,
}: {
    countries: { name: string; id: string; slug: string; code: string | null }[];
    byCountry: Map<string, Choice>;
}) => (
    <section className="mx-auto mt-12 max-w-[95rem]">
        <div className="flex flex-wrap items-end justify-center gap-16">
            {countries.map((c) => {
                const vote = (byCountry.get(c.id) ?? "ABSENT") as Choice;
                const flagSrc = `/flags/${(c.code || "unknown").toLowerCase()}.svg`;
                return (
                    <div key={c.id} className="flex flex-col items-center">
                        <div className="relative h-[120px] w-[220px] overflow-hidden rounded-[2px] border-[6px] border-stone-900 bg-white">
                            <FlagImage src={flagSrc} alt={`${c.name} flag`} sizes="220px" className="object-cover" />
                        </div>
                        <div className="mt-6 h-[64px] w-[64px] rounded-[2px] border-[6px] border-stone-900 bg-white">
                            <div className={`h-full w-full ${choiceColor(vote)}`} />
                        </div>
                    </div>
                );
            })}
        </div>
    </section>
);

export default function VoteSummary({
    countries,
    byCountry,
}: {
    countries: { name: string; id: string; slug: string; code: string | null }[];
    byCountry: Map<string, Choice>;
}) {
    return (
        <>
            <Legend />
            <FlagsGrid countries={countries} byCountry={byCountry} />
        </>
    );
}

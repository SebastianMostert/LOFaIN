
// app/page.tsx — Home, 1900 Style with Epunda Sans
import Link from "next/link";
import { epunda } from "@/app/fonts";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
      <div className={`${epunda.className} text-2xl font-bold text-stone-100`}>{value}</div>
      <div className="text-xs uppercase tracking-wide text-stone-400">{label}</div>
    </div>
  );
}

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-3 leading-relaxed text-stone-300">{children}</p>
);

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-stone-950">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="max-w-3xl">
            <h1 className={`${epunda.className} text-4xl font-extrabold leading-tight text-stone-100 sm:text-5xl`}>
              Treaty of the League of Free and Independent Nations
            </h1>
            <div className="mt-3 h-px w-28 bg-gradient-to-r from-stone-700 to-stone-400" />
            <section id="preamble" className="prose-dropcap mt-4 text-lg leading-relaxed text-stone-300">
              <P>
                The High Contracting Parties, or more simply known as the Parties, comprised of the French
                Republic, the Union of Soviet Socialist Republics, and the Kingdom of Italy,
              </P>
              <P>WISHING to strengthen and formalise the bonds of friendship and cooperation between their States,</P>
              <P>DETERMINED to defend their sovereignty, independence, and territorial integrity against any threat,</P>
              <P>
                RECOGNISING the value of close economic, industrial, and military cooperation for the benefit of
                their peoples, and
              </P>
              <P>
                AGREEING to coordinate their policies and ambitions beyond Europe, in particular on the continent
                of Africa,
              </P>
            </section>
            {/* <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/treaty"
                className="rounded-md bg-stone-200 px-4 py-2.5 text-sm font-medium text-stone-900 hover:bg-stone-100"
              >
                Read the Treaty
              </Link>
              <Link
                href="/vote"
                className="rounded-md border border-stone-600 px-4 py-2.5 text-sm font-medium text-stone-200 hover:bg-stone-800"
              >
                Cast Your Vote
              </Link>
            </div> */}
          </div>

          {/* Quick Stats */}
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Amendments" value="11" />
            <Stat label="Member States" value="5" />
            <Stat label="Ratified Articles" value="14" />
          </div>
        </div>
      </section >

      {/* Treaty Spotlight */}
      <section className="mx-auto max-w-6xl px-4 pb-20" >
        <article className="relative overflow-hidden rounded-lg border border-stone-700 bg-stone-900 p-6">
          <div className="mb-1 text-xs uppercase tracking-wide text-stone-400">Principal Instrument</div>
          <h3 className={`${epunda.className} text-lg font-semibold text-stone-100`}>
            The Treaty of the League of Free and Independent Nations (1900)
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-300">
            A solemn covenant securing mutual defence, equitable trade, and common councils among free and independent nations. This portal preserves the text entire and facilitates the casting of votes by delegates.
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <Link href="/treaty" className="rounded-md bg-stone-800 px-3 py-1.5 hover:bg-stone-700">Open Treaty</Link>
            <Link href="/vote" className="rounded-md border border-stone-600 px-3 py-1.5 hover:bg-stone-700">Vote</Link>
          </div>
        </article>

        {/* Live Voting Snapshot */}
        <div className="mt-12">
          <div className="mb-6 flex items-end justify-between">
            <h2 className={`${epunda.className} text-xl font-semibold text-stone-100`}>Live Voting Tally</h2>
            <Link href="/vote" className="text-sm text-stone-400 hover:text-stone-200">Proceed to Vote</Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-stone-700 bg-stone-900 p-6">
              <div className="mb-2 text-xs uppercase tracking-wide text-stone-400">Vote No. 1</div>
              <h3 className={`${epunda.className} text-base font-semibold text-stone-100`}>Adoption of the Treaty</h3>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-stone-400">
                  <span>Aye</span>
                  <span>—</span>
                </div>
                <div className="h-2 w-full rounded-full bg-stone-800">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: "0%" }} />
                </div>
              </div>
              <div className="mt-2">
                <div className="mb-1 flex justify-between text-xs text-stone-400">
                  <span>Nay</span>
                  <span>—</span>
                </div>
                <div className="h-2 w-full rounded-full bg-stone-800">
                  <div className="h-2 rounded-full bg-rose-500" style={{ width: "0%" }} />
                </div>
              </div>
              <div className="mt-2">
                <div className="mb-1 flex justify-between text-xs text-stone-400">
                  <span>Abstain</span>
                  <span>—</span>
                </div>
                <div className="h-2 w-full rounded-full bg-stone-800">
                  <div className="h-2 rounded-full bg-stone-400" style={{ width: "0%" }} />
                </div>
              </div>
              <div className="mt-4 text-xs text-stone-400">Threshold: Two-Thirds Majority</div>
            </div>
          </div>
        </div>
      </section >
    </>
  );
}
import { epunda } from "@/app/fonts";
import { prisma } from "@/prisma";
import { toRoman } from "@/utils/roman-numerals";
import { notFound } from "next/navigation";

export const dynamic = "force-static";
export const revalidate = 3600;

/* ---------- small helpers ---------- */

const P = ({ children }: { children: React.ReactNode }) => (
    <p className="mt-3 leading-relaxed text-stone-300">{children}</p>
);

const ArticleShell = ({
    id,
    title,
    children,
}: {
    id: string;
    title: string;
    children: React.ReactNode;
}) => (
    <section id={id} className="scroll-mt-28">
        <h3 className={`${epunda.className} mt-8 text-lg font-semibold text-stone-100`}>{title}</h3>
        <div className="mt-2 text-stone-300">{children}</div>
    </section>
);

const anchorFor = (order: number) => `art-${toRoman(order)}`;

const splitPreambleNicely = (txt: string) =>
    txt
        .replace(/\s+(?=(WISHING|DETERMINED|RECOGNISING|AGREEING)\b)/g, "\n\n")
        .split(/\n{2,}/)
        .map((s) => s.trim())
        .filter(Boolean);

/* ---------- clause renderers ---------- */

const Clause = ({ n, text }: { n: string; text: string }) => (
    <p className="mt-4 flex leading-relaxed">
        <span className="mr-3 w-8 shrink-0 text-right font-semibold text-stone-200">{n}.</span>
        <span className="flex-1">{text}</span>
    </p>
);

const SubClause = ({ letter, text }: { letter: string; text: string }) => (
    <p className="mt-1 flex pl-8 leading-relaxed">
        <span className="mr-3 w-6 shrink-0 text-right font-semibold text-stone-200">({letter})</span>
        <span className="flex-1">{text}</span>
    </p>
);

/**
 * Render an article body:
 * - "1. ..." as numbered clauses
 * - "(a) ..." / "a)" / "a." as lettered sub-clauses
 * - plain paragraphs otherwise
 * - blank lines kept as small gaps
 */
function ArticleBody({ body }: { body: string }) {
    const lines = body.split(/\r?\n/);

    return (
        <div>
            {lines.map((raw, idx) => {
                const line = raw.trim();
                if (!line) return <div key={`gap-${idx}`} className="h-2" />;

                // 1., 12., etc.
                const mNum = line.match(/^(\d+)\.\s+(.*)$/);
                if (mNum) return <Clause key={`n-${idx}`} n={mNum[1]} text={mNum[2]} />;

                // (a) text  |  a) text  |  a. text   (allow A/a)
                const mSub = line.match(
                    /^(?:\(([A-Za-z])\)|([A-Za-z])\)|([A-Za-z])\.)\s+(.*)$/
                );
                if (mSub) {
                    const letter = (mSub[1] || mSub[2] || mSub[3] || "").toLowerCase();
                    return <SubClause key={`s-${idx}`} letter={letter} text={mSub[4] ?? ""} />;
                }

                return (
                    <p key={`p-${idx}`} className="mt-3 leading-relaxed">
                        {line}
                    </p>
                );
            })}
        </div>
    );
}

const TOC = ({ articles }: { articles: { id: string; body: string; order: number; treatyId: string; heading: string; }[] }) => (
    <aside className="order-1 lg:order-1 lg:sticky lg:top-20 lg:self-start">
        <nav
            aria-label="Table of Contents"
            className="rounded-lg border border-stone-700 bg-stone-900 p-4"
        >
            <div className={`${epunda.className} mb-2 text-sm font-semibold uppercase tracking-wide text-stone-200`}>
                Contents
            </div>
            <ul className="space-y-1 text-sm">
                <li>
                    <a
                        href="#preamble"
                        className="block rounded px-2 py-1 text-stone-300 hover:bg-stone-800 hover:text-stone-50"
                    >
                        Preamble
                    </a>
                </li>
                {articles.map((a) => (
                    <li key={a.id}>
                        <a
                            href={`#${anchorFor(a.order)}`}
                            className="block rounded px-2 py-1 text-stone-300 hover:bg-stone-800 hover:text-stone-50"
                        >
                            {a.heading}
                        </a>
                    </li>
                ))}
                <li>
                    <a
                        href="#sign"
                        className="block rounded px-2 py-1 text-stone-300 hover:bg-stone-800 hover:text-stone-50"
                    >
                        Signatories
                    </a>
                </li>
            </ul>
        </nav>
    </aside>
);

/* ---------- page ---------- */

export const metadata = {
    title: "Treaty of the League of Free and Independent Nations",
    description:
        "Authoritative text of the League’s founding treaty, rendered from the canonical database record.",
};

export default async function TreatyPage() {
    const treaty = await prisma.treaty.findUnique({
        where: { slug: "league-treaty-1900" },
        include: { articles: { orderBy: { order: "asc" } } },
    });
    if (!treaty) notFound();

    const preamble = (treaty.preamble ?? "").trim();

    return (
        <main className="bg-stone-950 text-stone-100">
            <section className="mx-auto max-w-6xl px-4 py-10">
                <header className="mb-8">
                    <h1 className={`${epunda.className} text-3xl font-extrabold sm:text-4xl`}>{treaty.title}</h1>
                    <div className="mt-2 h-px w-28 bg-gradient-to-r from-stone-700 to-stone-400" />
                    {treaty.adoptedAt && (
                        <p className="mt-3 text-stone-400">Done at Versailles, the Fifth day of June 1872.</p>
                    )}
                </header>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
                    {/* TOC */}
                    <TOC articles={treaty.articles} />

                    {/* Body */}
                    <article className="order-2 lg:order-2">
                        {/* Preamble */}
                        <section id="preamble" className="scroll-mt-28">
                            <h2 className={`${epunda.className} mb-2 text-xl font-semibold text-stone-100`}>Preamble</h2>
                            {splitPreambleNicely(preamble).map((para, i) => (
                                <P key={i}>{para}</P>
                            ))}
                        </section>

                        {/* Articles */}
                        {treaty.articles.map((a) => (
                            <ArticleShell key={a.id} id={anchorFor(a.order)} title={a.heading}>
                                <ArticleBody body={a.body} />
                            </ArticleShell>
                        ))}

                        {/* Signatories */}
                        <section id="sign" className="mt-10">
                            <h3 className={`${epunda.className} text-lg font-semibold text-stone-100`}>Signatories</h3>
                            <P>
                                In witness whereof, the undersigned Plenipotentiaries have signed this Treaty and affixed their seals.
                            </P>
                            <P>Done at Versailles, the Fifth day of June 1872.</P>
                            <ul className="mt-2 list-disc space-y-1 pl-6 text-stone-300">
                                <li>
                                    <strong>For the French Third Republic:</strong> Pierre Marchand, Deputy of Paris, Plenipotentiary of the
                                    French Third Republic
                                </li>
                                <li>
                                    <strong>For the Union of Soviet Socialist Republics:</strong> Georgy Alexandrovich Plekhanov, People’s
                                    Commissar for Foreign Affairs, Plenipotentiary of the Union of Soviet Socialist Republics
                                </li>
                                <li>
                                    <strong>For the Kingdom of Italy:</strong> Agostino Depretis, Prime Minister of the Kingdom of Italy,
                                    Plenipotentiary of the Kingdom of Italy
                                </li>
                            </ul>
                        </section>
                    </article>
                </div>
            </section>
        </main>
    );
}

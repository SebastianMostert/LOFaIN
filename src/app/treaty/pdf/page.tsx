import type { Metadata } from "next";
import AutoPrint from "../AutoPrint";
import { getLeagueTreaty } from "../data";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const metadata: Metadata = {
  title: "Treaty PDF Preview - League",
  description: "A4 treaty PDF preview.",
  alternates: { canonical: `${baseUrl}/treaty/pdf` },
};

type TreatyArticle = {
  id: string;
  order: number;
  heading: string;
  body: string;
};

function splitPreambleNicely(text: string) {
  return text
    .replace(/\s+(?=(WISHING|DETERMINED|RECOGNISING|AGREEING)\b)/g, "\n\n")
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function ArticleBody({ body }: { body: string }) {
  const lines = body.split(/\r?\n/);
  let previousType: "numbered" | "subclause" | "plain" | null = null;

  return (
    <div className="text-[11pt] leading-[1.41] text-black">
      {lines.map((raw, index) => {
        const line = raw.trim();
        if (!line) return <div key={`gap-${index}`} className="h-1" />;

        const numbered = line.match(/^(\d+)\.\s+(.*)$/);
        if (numbered) {
          const className = previousType === null ? "" : "mt-[8pt]";
          previousType = "numbered";
          return (
            <p key={`n-${index}`} className={`flex items-start gap-2 break-inside-avoid-page ${className}`}>
              <span className="w-3 shrink-0 text-[11pt] leading-[1.41]">{numbered[1]}.</span>
              <span className="flex-1">{numbered[2]}</span>
            </p>
          );
        }

        const subClause = line.match(/^(?:\(([A-Za-z])\)|([A-Za-z])\)|([A-Za-z])\.)\s+(.*)$/);
        if (subClause) {
          const letter = (subClause[1] || subClause[2] || subClause[3] || "").toLowerCase();
          previousType = "subclause";
          return (
            <p key={`s-${index}`} className="mt-0 break-inside-avoid-page pl-10 text-[11pt] leading-[1.41]">
              ({letter}) {subClause[4] ?? ""}
            </p>
          );
        }

        const className = previousType === null ? "" : "mt-[8pt]";
        previousType = "plain";
        return (
          <p key={`p-${index}`} className={`${className} break-inside-avoid-page text-[11pt] leading-[1.41]`}>
            {line}
          </p>
        );
      })}
    </div>
  );
}

function ArticleBlock({ article }: { article: TreatyArticle }) {
  return (
    <section className="mb-[17pt] last:mb-0">
      <h2 className="text-[14pt] font-bold leading-[1.2] text-black">
        {article.heading}
      </h2>
      <div className="mt-1.5">
        <ArticleBody body={article.body} />
      </div>
    </section>
  );
}

function SignatureBlock({
  label,
  line,
}: {
  label: string;
  line: string;
}) {
  return (
    <section className="mb-3 last:mb-0 break-inside-avoid-page">
      <h2 className="text-[11pt] font-bold leading-[1.35] text-black">{label}</h2>
      <p className="mt-0.5 text-[11pt] italic leading-[1.35] text-black">{line}</p>
    </section>
  );
}

export default async function TreatyPdfPreviewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const autoPrint = typeof params.autoprint === "string" && params.autoprint === "1";
  const download = typeof params.download === "string" && params.download === "1";
  const treaty = await getLeagueTreaty();
  const snapshot = treaty.snapshots[treaty.snapshots.length - 1]!;
  const preamble = splitPreambleNicely(snapshot.preamble ?? "");

  return (
    <main
      className={`${download ? "bg-white py-0" : "bg-[#f3f3f3] py-8"} text-black print:bg-white print:py-0`}
      style={{ fontFamily: "Garamond, 'Times New Roman', serif" }}
    >
      <style>{`
        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: white;
        }

        header,
        footer,
        nextjs-portal,
        [data-next-badge-root],
        [data-next-mark],
        [data-nextjs-dialog-overlay],
        [data-nextjs-toast],
        [data-nextjs-dev-tools-button],
        [data-nextjs-dev-tools],
        #__next-build-watcher {
          display: none !important;
          visibility: hidden !important;
        }

        @page {
          size: A4;
          margin: 2.54cm;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .treaty-document {
            width: auto !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
      <AutoPrint enabled={autoPrint} />

      <article
        className={`treaty-document bg-white ${
          download ? "mx-0 w-auto p-0 shadow-none" : "mx-auto w-[210mm] p-[25.4mm] shadow-[0_12px_30px_rgba(0,0,0,0.08)]"
        }`}
      >
        <div className="pt-0">
          <h1 className="mx-auto max-w-[165mm] text-center text-[26pt] font-bold leading-[1.28] text-black">
            {treaty.title}
          </h1>
        </div>

        <section className="mt-[28pt] text-[11pt] leading-[1.37] text-black break-inside-avoid-page">
          {preamble.map((paragraph, index) => (
            <p key={index} className={index === 0 ? "" : "mt-[8pt]"}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="mt-[21pt]">
          {snapshot.articles.map((article) => (
            <ArticleBlock key={article.id} article={article} />
          ))}
        </section>

        <section className="mt-8 space-y-3 text-[11pt] leading-[1.41] text-black break-inside-avoid-page">
          <p>
            In witness whereof, the undersigned Plenipotentiaries have signed this Treaty and affixed their seals.
          </p>
          <p>Done at Versailles, the Fifth day of June 1872.</p>
        </section>

        <section className="mt-10 max-w-[160mm] break-before-page print:mt-0">
          <SignatureBlock
            label="For the French Third Republic:"
            line="Pierre Marchand, Deputy of Paris, Plenipotentiary of the French Third Republic"
          />
          <SignatureBlock
            label="For the Union of Soviet Socialist Republics:"
            line="Georgy Alexandrovich Plekhanov, People’s Commissar for Foreign Affairs, Plenipotentiary of the Union of Soviet Socialist Republics"
          />
          <SignatureBlock
            label="For the Kingdom of Italy:"
            line="Agostino Depretis, Prime Minister of the Kingdom of Italy, Plenipotentiary of the Kingdom of Italy"
          />
        </section>
      </article>
    </main>
  );
}

import { epunda } from "@/app/fonts";
import type { StructuredTitleSection } from "@/app/debate-rules/data";

type Props = {
  eyebrow?: string;
  title: string;
  preamble?: string | null;
  titles: StructuredTitleSection[];
};

export default function StructuredDocument({ eyebrow = "Assembly Record", title, preamble, titles }: Props) {
  return (
    <div className="mx-auto max-w-5xl rounded-[2rem] border border-stone-300 bg-[linear-gradient(180deg,#f8f5ee_0%,#f4f0e7_100%)] px-6 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:px-10 sm:py-14 lg:px-16 lg:py-20">
      <header className="border-b border-stone-300 pb-10 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-stone-500">{eyebrow}</p>
        <h1 className={`${epunda.className} mt-6 text-4xl font-semibold leading-tight sm:text-5xl`}>{title}</h1>
        {preamble && (
          <p className={`${epunda.className} mx-auto mt-6 max-w-3xl text-2xl leading-snug text-stone-700 sm:text-3xl`}>
            {preamble}
          </p>
        )}
      </header>

      <div className="mt-10 space-y-12">
        {titles.map((titleSection) => (
          <section key={titleSection.heading}>
            <h2 className={`${epunda.className} text-3xl font-semibold`}>{titleSection.heading}</h2>
            <div className="mt-6 space-y-10">
              {titleSection.articles.map((article) => (
                <article key={article.heading}>
                  <h3 className={`${epunda.className} text-2xl font-semibold`}>{article.heading}</h3>
                  {article.intro && <p className="mt-4 text-lg leading-9 text-stone-800">{article.intro}</p>}
                  {article.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="mt-5 text-lg leading-9 text-stone-800">
                      {paragraph}
                    </p>
                  ))}
                  {article.items && (
                    <ol className="mt-5 list-decimal space-y-4 pl-10 text-lg leading-9 text-stone-800">
                      {article.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  )}
                  {article.subitems && (
                    <ol className="mt-3 space-y-2 pl-14 text-lg leading-9 text-stone-800 [list-style-type:lower-alpha]">
                      {article.subitems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  )}
                  {article.afterSubitems && (
                    <ol className="mt-4 list-decimal space-y-4 pl-10 text-lg leading-9 text-stone-800" start={3}>
                      {article.afterSubitems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

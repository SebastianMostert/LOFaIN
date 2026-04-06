import { prisma } from "@/prisma";
import debateRulesSeed from "../../../prisma/debate-rules.json";

export type StructuredArticle = {
  heading: string;
  intro?: string;
  paragraphs?: string[];
  items?: string[];
  subitems?: string[];
  afterSubitems?: string[];
};

export type StructuredTitleSection = {
  heading: string;
  articles: StructuredArticle[];
};

type DebateRulesSeed = {
  title: string;
  slug: string;
  type: "DEBATE_RULES";
  adoptedAt?: string;
  summary?: string;
  preamble?: string;
  titles: StructuredTitleSection[];
};

const fallbackRules = debateRulesSeed as DebateRulesSeed;

export async function getDebateRulesDocument() {
  const document = await prisma.leagueDocument.findUnique({
    where: { slug: fallbackRules.slug },
    select: {
      title: true,
      slug: true,
      summary: true,
      preamble: true,
      adoptedAt: true,
      content: true,
    },
  });

  const titles = Array.isArray(document?.content) ? (document.content as StructuredTitleSection[]) : fallbackRules.titles;

  return {
    title: document?.title ?? fallbackRules.title,
    slug: document?.slug ?? fallbackRules.slug,
    summary: document?.summary ?? fallbackRules.summary ?? null,
    preamble: document?.preamble ?? fallbackRules.preamble ?? null,
    adoptedAt: document?.adoptedAt ?? (fallbackRules.adoptedAt ? new Date(fallbackRules.adoptedAt) : null),
    titles,
  };
}

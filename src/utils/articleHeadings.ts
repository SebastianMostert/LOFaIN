import { toRoman } from "@/utils/roman-numerals";

export function stripArticlePrefix(heading: string | null | undefined) {
  const value = (heading ?? "").trim();
  return value.replace(/^Article\s+[A-Za-z0-9IVXLCDM]+\.\s*/i, "").trim();
}

export function formatArticleHeading(order: number, heading: string | null | undefined) {
  const cleaned = stripArticlePrefix(heading);
  return cleaned ? `Article ${toRoman(order)}. ${cleaned}` : `Article ${toRoman(order)}.`;
}

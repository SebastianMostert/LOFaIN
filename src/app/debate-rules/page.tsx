import type { Metadata } from "next";

import StructuredDocument from "@/components/documents/StructuredDocument";
import { getDebateRulesDocument } from "./data";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const metadata: Metadata = {
  title: "Debate Rules",
  description: "Rules of procedure for debates on amendments in the League of Free and Independent Nations.",
  alternates: { canonical: `${baseUrl}/debate-rules` },
  openGraph: {
    title: "Debate Rules",
    description: "Rules of procedure for debates on amendments in the League of Free and Independent Nations.",
    url: `${baseUrl}/debate-rules`,
  },
};

export default async function DebateRulesPage() {
  const document = await getDebateRulesDocument();

  return (
    <main className="bg-stone-200 px-4 py-10 text-stone-950 sm:px-6 lg:px-10">
      <StructuredDocument title={document.title} preamble={document.preamble} titles={document.titles} />
    </main>
  );
}

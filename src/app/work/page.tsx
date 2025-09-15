import { epunda } from "@/app/fonts";
import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const metadata: Metadata = {
  title: "Our Work • League",
  description: "Discover initiatives undertaken by the League of Free and Independent Nations.",
  keywords: ["work", "initiatives", "league"],
  alternates: { canonical: `${baseUrl}/work` },
  openGraph: {
    title: "Our Work • League",
    description: "Discover initiatives undertaken by the League of Free and Independent Nations.",
    url: `${baseUrl}/work`,
    images: [{ url: `${baseUrl}/logo.png`, alt: "League logo" }],
  },
};

export default function WorkPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-stone-100">
      <h1 className={`${epunda.className} text-3xl font-extrabold`}>Our Work</h1>
      <p className="mt-4 leading-relaxed text-stone-300">
        The League is undertaking numerous initiatives to foster solidarity,
        development, and mutual defence among its member states. Detailed
        information about these efforts will appear here soon.
      </p>
    </main>
  );
}

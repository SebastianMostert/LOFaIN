import { prisma } from "@/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import TreatyClient from "./TreatyClient";

export const dynamic = "force-static";
export const revalidate = 3600;

const baseUrl = "https://example.com";

export const metadata: Metadata = {
    title: "Treaty • League",
    description: "Read the foundational treaty of the League of Free and Independent Nations.",
    keywords: ["treaty", "league", "founding document"],
    alternates: { canonical: `${baseUrl}/treaty` },
    openGraph: {
        title: "Treaty • League",
        description: "Read the foundational treaty of the League of Free and Independent Nations.",
        url: `${baseUrl}/treaty`,
        images: [{ url: `${baseUrl}/logo.png`, alt: "League logo" }],
    },
};

export default async function TreatyPage() {
    const treaty = await prisma.treaty.findUnique({
        where: { slug: "league-treaty-1900" },
        include: { articles: { orderBy: { order: "asc" } } },
    });
    if (!treaty) notFound();
    return <TreatyClient treaty={treaty} />;
}

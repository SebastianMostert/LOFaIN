// app/amendments/page.tsx
import { prisma } from "@/prisma";
import { closeExpiredAmendments } from "@/utils/amendments";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

import type { Metadata } from "next";
import AmendmentsClient from "../../components/AmendmentsClient";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const metadata: Metadata = {
    title: "Amendments • League",
    description: "Browse current and past amendments to the League treaty.",
    keywords: ["amendments", "treaty", "league"],
    alternates: { canonical: `${baseUrl}/amendments` },
    openGraph: {
        title: "Amendments • League",
        description: "Browse current and past amendments to the League treaty.",
        url: `${baseUrl}/amendments`,
        images: [{ url: `${baseUrl}/logo.png`, alt: "League logo" }],
    },
};

export default async function AmendmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>>; }) {
    const session = await auth();
    if (!session) redirect("/api/auth/signin?callbackUrl=/amendments");

    await closeExpiredAmendments();

    const items = await prisma.amendment.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            result: true,
            eligibleCount: true,
            opensAt: true,
            closesAt: true,
            votes: { select: { choice: true, countryId: true } }, 
        },
    });

    return <AmendmentsClient
        items={items}
        searchParams={await searchParams}
        userCountryId={session.user?.countryId ?? null}
    />
}

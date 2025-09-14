// app/amendments/page.tsx
import { prisma } from "@/prisma";
import { closeExpiredAmendments } from "@/utils/amendments";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AmendmentsClient from "../../components/AmendmentsClient";

export const dynamic = "force-dynamic";

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

// app/amendments/page.tsx
import { prisma } from "@/prisma";
import { closeExpiredAmendments } from "@/utils/amendments";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AmendmentsClient from "./AmendmentsClient";

export const dynamic = "force-dynamic";

export default async function AmendmentsPage() {
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
            votes: { select: { choice: true } },
        },
    });

    return <AmendmentsClient items={items} />;
}

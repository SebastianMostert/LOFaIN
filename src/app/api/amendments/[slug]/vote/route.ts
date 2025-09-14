// app/api/amendments/[slug]/vote/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { auth } from "@/auth";
import { closeExpiredAmendments } from "@/utils/amendments";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const awaitedParams = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const countryId = session.user?.countryId as string | undefined;
    if (!countryId) return NextResponse.json({ error: "No country assigned" }, { status: 403 });

    const { choice, comment } = await req.json() as { choice: "AYE" | "NAY" | "ABSTAIN" | "ABSENT"; comment?: string };

    await closeExpiredAmendments(awaitedParams.slug);

    const a = await prisma.amendment.findUnique({
        where: { slug: awaitedParams.slug },
        select: { id: true, status: true, opensAt: true },
    });
    if (!a) return NextResponse.json({ error: "Amendment not found" }, { status: 404 });
    if (a.status !== "OPEN") return NextResponse.json({ error: "Voting is closed" }, { status: 400 });

    const now = new Date();
    if (a.opensAt && now < a.opensAt) return NextResponse.json({ error: "Voting not open yet" }, { status: 400 });

    if (choice === "ABSENT") {
        await prisma.vote.delete({
            where: { amendmentId_countryId: { amendmentId: a.id, countryId } },
        }).catch(() => null);
        return NextResponse.json({ ok: true, vote: null });
    }

    const vote = await prisma.vote.upsert({
        where: { amendmentId_countryId: { amendmentId: a.id, countryId } },
        update: { choice, comment },
        create: {
            amendmentId: a.id,
            countryId,
            userId: session.user?.id,
            choice,
            comment,
        },
    });

    return NextResponse.json({ ok: true, vote });
}

// app/api/amendments/[slug]/vote/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { auth } from "@/auth";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const awaitedParams = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const countryId = session.user?.countryId as string | undefined;
    if (!countryId) return NextResponse.json({ error: "No country assigned" }, { status: 403 });

    const { choice, comment } = await req.json() as { choice: "AYE" | "NAY" | "ABSTAIN"; comment?: string };

    const a = await prisma.amendment.findUnique({
        where: { slug: awaitedParams.slug },
        select: { id: true, status: true, opensAt: true, closesAt: true },
    });
    if (!a) return NextResponse.json({ error: "Amendment not found" }, { status: 404 });
    if (a.status !== "OPEN") return NextResponse.json({ error: "Voting is closed" }, { status: 400 });

    const now = new Date();
    if (a.opensAt && now < a.opensAt) return NextResponse.json({ error: "Voting not open yet" }, { status: 400 });
    if (a.closesAt && now > a.closesAt) return NextResponse.json({ error: "Voting period ended" }, { status: 400 });

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

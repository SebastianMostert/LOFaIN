// app/api/amendments/[slug]/apply/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { auth } from "@/auth";
import { closeExpiredAmendments } from "@/utils/amendments";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const awaitedParams = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await closeExpiredAmendments(awaitedParams.slug);

    const a = await prisma.amendment.findUnique({
        where: { slug: awaitedParams.slug },
        include: { treaty: true },
    });
    if (!a) return NextResponse.json({ error: "Amendment not found" }, { status: 404 });
    if (a.status !== "CLOSED" || a.result !== "PASSED")
        return NextResponse.json({ error: "Amendment not passed" }, { status: 400 });

    if (a.op === "ADD") {
        if (!a.newHeading || !a.newBody) return NextResponse.json({ error: "Missing content" }, { status: 400 });
        const order = a.newOrder ?? (await prisma.article.count({ where: { treatyId: a.treatyId } })) + 1;

        await prisma.article.create({
            data: { treatyId: a.treatyId, order, heading: a.newHeading, body: a.newBody },
        });
    } else if (a.op === "EDIT") {
        if (!a.targetArticleId || (!a.newHeading && !a.newBody))
            return NextResponse.json({ error: "Missing target or content" }, { status: 400 });

        await prisma.article.update({
            where: { id: a.targetArticleId },
            data: {
                heading: a.newHeading ?? undefined,
                body: a.newBody ?? undefined,
            },
        });
    } else if (a.op === "REMOVE") {
        if (!a.targetArticleId) return NextResponse.json({ error: "Missing target" }, { status: 400 });

        const toRemove = await prisma.article.findUnique({ where: { id: a.targetArticleId }, select: { treatyId: true, order: true } });
        if (!toRemove) return NextResponse.json({ error: "Article not found" }, { status: 404 });

        await prisma.article.delete({ where: { id: a.targetArticleId } });
        // re-pack orders
        await prisma.article.updateMany({
            where: { treatyId: toRemove.treatyId, order: { gt: toRemove.order } },
            data: { order: { decrement: 1 } },
        });
    }

    return NextResponse.json({ ok: true });
}

// app/api/amendments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { auth } from "@/auth";
import { amendmentSchema } from "@/utils/api/amendments";

async function nextAmendmentSlug() {
    // Find the highest "amendment-#" and increment
    const existing = await prisma.amendment.findMany({
        where: { slug: { startsWith: "amendment-" } },
        select: { slug: true },
    });
    let max = 0;
    for (const { slug } of existing) {
        const m = slug.match(/^amendment-(\d+)$/);
        if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `amendment-${max + 1}`;
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const countryId = session.user?.countryId as string | undefined;
    if (!countryId) return NextResponse.json({ error: "No country assigned" }, { status: 403 });

    const parsed = amendmentSchema.safeParse(await req.json());
    if (!parsed.success) {
        return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
    }

    const {
        title,
        rationale,
        op,
        treatySlug,
        targetArticleId,
        newHeading,
        newBody,
        newOrder,
    } = await req.json();

    if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });
    if (!["ADD", "EDIT", "REMOVE"].includes(op)) return NextResponse.json({ error: "Invalid operation" }, { status: 400 });

    // Per-op validation
    if ((op === "REMOVE" || op === "EDIT") && !targetArticleId) return NextResponse.json({ error: "targetArticleId is required for EDIT/REMOVE" }, { status: 400 });
    if ((op === "ADD" || op === "EDIT") && !newBody) return NextResponse.json({ error: "newBody is required for ADD/EDIT" }, { status: 400 });


    const treaty = await prisma.treaty.findUnique({ where: { slug: treatySlug }, select: { id: true } });
    if (!treaty) return NextResponse.json({ error: "Treaty not found" }, { status: 404 });

    const eligibleCount = await prisma.country.count({ where: { isActive: true } });
    const slug = await nextAmendmentSlug();

    const now = new Date();
    const closesAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h

    const amendment = await prisma.amendment.create({
        data: {
            slug,
            title,
            rationale: rationale ?? null,
            op,
            treatyId: treaty.id,
            targetArticleId: targetArticleId ?? null,
            newHeading: newHeading ?? null,
            newBody: newBody ?? null,
            newOrder: newOrder ?? null,
            status: "OPEN",
            opensAt: now,
            closesAt,
            threshold: 2 / 3,
            eligibleCount,
            proposerCountryId: countryId,
            proposerUserId: session.user?.id ?? null,
        },
    });

    return NextResponse.json({ amendment }, { status: 201 });
}

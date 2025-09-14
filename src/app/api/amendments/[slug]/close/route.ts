// app/api/amendments/[slug]/close/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { auth } from "@/auth";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const awaitedParams = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const a = await prisma.amendment.findUnique({
        where: { slug: awaitedParams.slug },
        select: { id: true, status: true, threshold: true, eligibleCount: true },
    });
    if (!a) return NextResponse.json({ error: "Amendment not found" }, { status: 404 });

    const votes = await prisma.vote.groupBy({
        by: ["choice"],
        where: { amendmentId: a.id },
        _count: true,
    });

    const counts = { AYE: 0, NAY: 0, ABSTAIN: 0 };
    for (const v of votes) counts[v.choice as "AYE" | "NAY" | "ABSTAIN"] = v._count;

    const eligible = a.eligibleCount ?? (await prisma.country.count({ where: { isActive: true } }));
    const threshold = a.threshold ?? 2 / 3;
    const needed = Math.ceil(eligible * threshold);
    const passed = counts.AYE >= needed;

    await prisma.amendment.update({
        where: { id: a.id },
        data: { status: passed ? "PASSED" : "FAILED" },
    });

    return NextResponse.json({ status: passed ? "PASSED" : "FAILED", counts, eligible, needed });
}

// app/api/amendments/[slug]/close/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { auth } from "@/auth";
import { finalizeAmendment } from "@/utils/amendments";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const awaitedParams = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const a = await prisma.amendment.findUnique({
        where: { slug: awaitedParams.slug },
        select: { id: true, threshold: true, eligibleCount: true },
    });
    if (!a) return NextResponse.json({ error: "Amendment not found" }, { status: 404 });

    const { passed, counts, eligible, needed } = await finalizeAmendment(a);

    return NextResponse.json({
        status: "CLOSED",
        result: passed ? "PASSED" : "FAILED",
        counts,
        eligible,
        needed,
    });
}

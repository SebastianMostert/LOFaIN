import { prisma } from "@/prisma";

export async function finalizeAmendment(a: { id: string; threshold: number | null; eligibleCount: number | null }) {
    const votes = await prisma.vote.groupBy({
        by: ["choice"],
        where: { amendmentId: a.id },
        _count: true,
    });
    const counts: Record<"AYE" | "NAY" | "ABSTAIN", number> = { AYE: 0, NAY: 0, ABSTAIN: 0 };
    for (const v of votes) counts[v.choice as "AYE" | "NAY" | "ABSTAIN"] = v._count;
    const eligible = a.eligibleCount ?? (await prisma.country.count({ where: { isActive: true } }));
    const threshold = a.threshold ?? 2 / 3;
    const needed = Math.ceil(eligible * threshold);
    const passed = counts.AYE >= needed;
    await prisma.amendment.update({
        where: { id: a.id },
        data: {
            closesAt: new Date(),
            status: "CLOSED",
            result: passed ? "PASSED" : "FAILED",
        },
    });
    return { passed, counts, eligible, needed };
}

export async function closeExpiredAmendments(slug?: string) {
    const now = new Date();
    const where = slug
        ? { slug, status: "OPEN" as const, closesAt: { lte: now } }
        : { status: "OPEN" as const, closesAt: { lte: now } };
    const due = await prisma.amendment.findMany({
        where,
        select: { id: true, threshold: true, eligibleCount: true },
    });
    await Promise.all(due.map(a => finalizeAmendment(a)));
}

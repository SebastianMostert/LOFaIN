import { prisma } from "@/prisma";
const POLL_INTERVAL_MS = 1000 * 60 * 60; // 1 hour
const NOTIFY_WINDOW_MS = 1000 * 60 * 60 * 24; // 24 hours

type FinalizeArgs = {
    id: string;
    threshold: number | null;
    eligibleCount: number | null;
    quorum?: number | null;
};

export async function finalizeAmendment(a: FinalizeArgs) {
    const votes = await prisma.vote.findMany({
        where: { amendmentId: a.id },
        select: { choice: true, country: { select: { name: true, hasVeto: true } } },
    });
    const counts: Record<"AYE" | "NAY" | "ABSTAIN" | "ABSENT", number> = { AYE: 0, NAY: 0, ABSTAIN: 0, ABSENT: 0 };
    const vetoers: string[] = [];
    for (const v of votes) {
        counts[v.choice as "AYE" | "NAY" | "ABSTAIN" | "ABSENT"]++;
        if (v.choice === "NAY" && v.country.hasVeto) vetoers.push(v.country.name);
    }
    const eligible = a.eligibleCount ?? (await prisma.country.count({ where: { isActive: true } }));
    const threshold = a.threshold ?? 2 / 3;
    const needed = Math.ceil(eligible * threshold);
    const quorum = a.quorum ?? 0;
    const totalVotes = votes.length;

    let passed = counts.AYE >= needed;
    let failureReason: string | null = null;
    if (vetoers.length > 0) {
        passed = false;
        failureReason = `Veto by ${vetoers.join(", ")}`;
    } else if (totalVotes < quorum) {
        passed = false;
        failureReason = `Quorum not met: ${totalVotes} of ${quorum} required`;
    } else if (!passed) {
        failureReason = `Threshold not met: ${counts.AYE} of ${needed} required`;
    }

    await prisma.amendment.update({
        where: { id: a.id },
        data: {
            closesAt: new Date(),
            status: "CLOSED",
            result: passed ? "PASSED" : "FAILED",
            failureReason,
        },
    });
    return { passed, counts, eligible, needed, quorum, totalVotes, failureReason, vetoed: vetoers.length > 0 };
}

export async function closeExpiredAmendments(slug?: string) {
    const now = new Date();
    const where = slug
        ? { slug, status: "OPEN" as const, closesAt: { lte: now } }
        : { status: "OPEN" as const, closesAt: { lte: now } };
    const due = await prisma.amendment.findMany({
        where,
        select: { id: true, threshold: true, eligibleCount: true, quorum: true },
    });
    await Promise.all(due.map(a => finalizeAmendment(a)));
}

async function checkUpcomingClosures() {
    const now = new Date();
    const soon = new Date(now.getTime() + NOTIFY_WINDOW_MS);
    const upcoming = await prisma.amendment.findMany({
        where: { status: "OPEN", closesAt: { lte: soon, gt: now } },
    });
    if (upcoming.length > 0) {
        console.log("Amendments closing soon:", upcoming.map(a => a.title));
    }
}

async function checkNewlyOpened() {
    const since = new Date(Date.now() - POLL_INTERVAL_MS);
    const opened = await prisma.amendment.findMany({
        where: { status: "OPEN", opensAt: { gte: since } },
    });
    if (opened.length > 0) {
        console.log("New amendments opened:", opened.map(a => a.title));
    }
}

export function startAmendmentWatcher() {
    setInterval(async () => {
        await checkUpcomingClosures();
        await checkNewlyOpened();
    }, POLL_INTERVAL_MS);
}

// Start the watcher when this module is imported
startAmendmentWatcher();

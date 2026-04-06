import type { Prisma } from "@prisma/client";

export const motionPayloadSelect = {
    id: true,
    type: true,
    status: true,
    title: true,
    rationale: true,
    resolutionNote: true,
    submittedAt: true,
    openedAt: true,
    closedAt: true,
    resolvedAt: true,
    createdAt: true,
    targetThreadId: true,
    targetPostId: true,
    targetCountryId: true,
    createdByCountryId: true,
    context: true,
    createdByCountry: { select: { name: true } },
    votes: {
        select: {
            countryId: true,
            choice: true,
        },
    },
} satisfies Prisma.ModMotionSelect;

export type MotionRecord = Prisma.ModMotionGetPayload<{
    select: typeof motionPayloadSelect;
}>;

type MotionContext = {
    formalWording?: unknown;
    seconderId?: unknown;
    seconderName?: unknown;
    secondedAt?: unknown;
    expiresAt?: unknown;
    autoPassAt?: unknown;
    deniedByChairId?: unknown;
    deniedReason?: unknown;
    chatMessageId?: unknown;
};

function readMotionContext(context: unknown): MotionContext {
    return context && typeof context === "object" ? context as MotionContext : {};
}

function readOptionalString(value: unknown) {
    return typeof value === "string" && value.trim() ? value : null;
}

export function getMotionFormalWording(proposerName: string, title: string, rationale?: string | null) {
    const detail = rationale?.trim();
    return detail
        ? `The delegation of ${proposerName} moves ${title.toLowerCase()}. Note: ${detail}`
        : `The delegation of ${proposerName} moves ${title.toLowerCase()}.`;
}

export function toMotionStatusLabel(status: MotionRecord["status"]) {
    return status;
}

export function toDiscussionMotionPayload(motion: MotionRecord) {
    const context = readMotionContext(motion.context);
    const deniedByChairId = readOptionalString(context.deniedByChairId);
    const seconderId = readOptionalString(context.seconderId);
    let statusLabel = "Draft";

    if (motion.status === "PROPOSED") statusLabel = "Awaiting second";
    else if (motion.status === "VOTING") statusLabel = "Seconded";
    else if (motion.status === "PASSED" || motion.status === "EXECUTED") statusLabel = "Passed";
    else if (motion.status === "WITHDRAWN") statusLabel = "Withdrawn";
    else if (motion.status === "FAILED") statusLabel = deniedByChairId ? "Denied" : seconderId ? "Failed" : "Lapsed";

    return {
        id: motion.id,
        type: motion.type,
        status: motion.status,
        statusLabel,
        title: motion.title,
        rationale: motion.rationale ?? null,
        formalWording: readOptionalString(context.formalWording) ?? getMotionFormalWording(
            motion.createdByCountry?.name ?? "Unknown delegation",
            motion.title,
            motion.rationale,
        ),
        resolutionNote: motion.resolutionNote ?? null,
        createdAt: motion.createdAt.toISOString(),
        submittedAt: motion.submittedAt?.toISOString() ?? null,
        openedAt: motion.openedAt?.toISOString() ?? null,
        closedAt: motion.closedAt?.toISOString() ?? null,
        resolvedAt: motion.resolvedAt?.toISOString() ?? null,
        targetThreadId: motion.targetThreadId ?? null,
        targetPostId: motion.targetPostId ?? null,
        targetCountryId: motion.targetCountryId ?? null,
        proposerId: motion.createdByCountryId ?? null,
        proposerName: motion.createdByCountry?.name ?? null,
        seconderId,
        seconderName: readOptionalString(context.seconderName),
        secondedAt: readOptionalString(context.secondedAt),
        expiresAt: readOptionalString(context.expiresAt),
        autoPassAt: readOptionalString(context.autoPassAt),
        deniedByChairId,
        deniedReason: readOptionalString(context.deniedReason),
        chatMessageId: readOptionalString(context.chatMessageId) ?? motion.id,
        votes: motion.votes,
    };
}

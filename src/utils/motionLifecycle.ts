import { prisma } from "@/prisma";
import { motionPayloadSelect, toDiscussionMotionPayload } from "@/utils/motionPayload";

export const MOTION_AUTO_PASS_DELAY_MS = 10_000;
export const MOTION_LAPSE_DELAY_MS = 10_000;

function readContext(context: unknown) {
    return context && typeof context === "object" ? context as Record<string, unknown> : {};
}

export async function finalizeMotionIfDue(motionId: string) {
    const motion = await prisma.modMotion.findUnique({
        where: { id: motionId },
        select: motionPayloadSelect,
    });

    if (!motion || (motion.status !== "VOTING" && motion.status !== "PROPOSED")) {
        return motion ? toDiscussionMotionPayload(motion) : null;
    }

    const context = readContext(motion.context);
    const now = Date.now();

    if (motion.status === "PROPOSED") {
        const expiresAt = typeof context.expiresAt === "string" ? Date.parse(context.expiresAt) : Number.NaN;
        if (Number.isNaN(expiresAt) || expiresAt > now) {
            return toDiscussionMotionPayload(motion);
        }

        const updated = await prisma.$transaction(async (tx) => {
            const current = await tx.modMotion.findUnique({
                where: { id: motionId },
                select: motionPayloadSelect,
            });

            if (!current || current.status !== "PROPOSED") {
                return current;
            }

            const currentContext = readContext(current.context);
            const currentExpiresAt = typeof currentContext.expiresAt === "string" ? Date.parse(currentContext.expiresAt) : Number.NaN;
            if (Number.isNaN(currentExpiresAt) || currentExpiresAt > Date.now()) {
                return current;
            }

            return tx.modMotion.update({
                where: { id: motionId },
                data: {
                    status: "FAILED",
                    closedAt: new Date(),
                    resolvedAt: new Date(),
                    resolutionNote: current.resolutionNote ?? "Motion lapsed for want of a second.",
                },
                select: motionPayloadSelect,
            });
        });

        return updated ? toDiscussionMotionPayload(updated) : null;
    }

    const autoPassAt = typeof context.autoPassAt === "string" ? Date.parse(context.autoPassAt) : Number.NaN;
    if (Number.isNaN(autoPassAt) || autoPassAt > now) {
        return toDiscussionMotionPayload(motion);
    }

    const updated = await prisma.$transaction(async (tx) => {
        const current = await tx.modMotion.findUnique({
            where: { id: motionId },
            select: motionPayloadSelect,
        });

        if (!current || current.status !== "VOTING") {
            return current;
        }

        const currentContext = readContext(current.context);
        const currentAutoPassAt = typeof currentContext.autoPassAt === "string" ? Date.parse(currentContext.autoPassAt) : Number.NaN;
        if (Number.isNaN(currentAutoPassAt) || currentAutoPassAt > Date.now()) {
            return current;
        }

        const updatedMotion = await tx.modMotion.update({
            where: { id: motionId },
            data: {
                status: "PASSED",
                closedAt: new Date(),
                resolvedAt: new Date(),
                resolutionNote: current.resolutionNote ?? "Seconded motion passed without chair objection.",
            },
            select: motionPayloadSelect,
        });

        if (updatedMotion.targetThreadId) {
            if (updatedMotion.type === "LOCK_THREAD") {
                await tx.discussionThread.update({
                    where: { id: updatedMotion.targetThreadId },
                    data: { isLocked: true },
                });
            }

            if (updatedMotion.type === "UNLOCK_THREAD") {
                await tx.discussionThread.update({
                    where: { id: updatedMotion.targetThreadId },
                    data: { isLocked: false },
                });
            }

            if (updatedMotion.type === "PIN_THREAD") {
                await tx.discussionThread.update({
                    where: { id: updatedMotion.targetThreadId },
                    data: { isPinned: true },
                });
            }

            if (updatedMotion.type === "UNPIN_THREAD") {
                await tx.discussionThread.update({
                    where: { id: updatedMotion.targetThreadId },
                    data: { isPinned: false },
                });
            }

            if (updatedMotion.type === "ARCHIVE_THREAD") {
                await tx.discussionThread.update({
                    where: { id: updatedMotion.targetThreadId },
                    data: { isArchived: true },
                });
            }
        }

        if (updatedMotion.type === "REMOVE_POST" && updatedMotion.targetPostId) {
            await tx.discussionPost.update({
                where: { id: updatedMotion.targetPostId },
                data: {
                    isDeleted: true,
                    deletedAt: new Date(),
                },
            });
        }

        if (updatedMotion.type === "RESTORE_POST" && updatedMotion.targetPostId) {
            await tx.discussionPost.update({
                where: { id: updatedMotion.targetPostId },
                data: {
                    isDeleted: false,
                    deletedAt: null,
                },
            });
        }

        return updatedMotion;
    });

    return updated ? toDiscussionMotionPayload(updated) : null;
}

export async function finalizeDueMotionsForThread(threadId: string) {
    const dueMotions = await prisma.modMotion.findMany({
        where: {
            targetThreadId: threadId,
            status: "VOTING",
        },
        select: { id: true },
    });

    const finalized = await Promise.all(dueMotions.map(async (motion) => finalizeMotionIfDue(motion.id)));
    return finalized.filter((motion) => motion !== null);
}

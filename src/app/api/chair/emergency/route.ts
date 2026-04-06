import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { ApiError, requireAuthContext } from "@/utils/api/guards";
import { getChairAssignmentForThread } from "@/utils/chair";
import { broadcastDiscussionEvent } from "@/utils/discussionEvents";
import { assertDebateQuorumForThread } from "@/utils/discussionQuorum";
import { toDiscussionSystemEntry } from "@/utils/queueChairActions";
import z from "zod";

const emergencySchema = z.discriminatedUnion("action", [
    z.object({
        action: z.literal("OPEN_DEBATE"),
        threadId: z.string(),
        note: z.string().optional(),
    }),
    z.object({
        action: z.literal("CLOSE_DEBATE"),
        threadId: z.string(),
        note: z.string().optional(),
    }),
    z.object({
        action: z.literal("LOCK_THREAD"),
        threadId: z.string(),
        note: z.string().optional(),
    }),
    z.object({
        action: z.literal("UNLOCK_THREAD"),
        threadId: z.string(),
        note: z.string().optional(),
    }),
    z.object({
        action: z.literal("PIN_THREAD"),
        threadId: z.string(),
        note: z.string().optional(),
    }),
    z.object({
        action: z.literal("UNPIN_THREAD"),
        threadId: z.string(),
        note: z.string().optional(),
    }),
    z.object({
        action: z.literal("ARCHIVE_THREAD"),
        threadId: z.string(),
        archived: z.boolean().optional(),
        note: z.string().optional(),
    }),
    z.object({
        action: z.literal("RESTORE_POST"),
        postId: z.string(),
        note: z.string().optional(),
    }),
]);

type EmergencyRequest = z.infer<typeof emergencySchema>;

async function ensureThread(threadId: string) {
    const thread = await prisma.discussionThread.findUnique({
        where: { id: threadId },
        select: { id: true },
    });

    if (!thread) {
        throw new ApiError(404, "Thread not found");
    }

    return thread;
}

async function ensurePresidingChair(countryId: string, threadId: string) {
    const chairAssignment = await getChairAssignmentForThread(threadId);
    if (chairAssignment.effectiveChair.id !== countryId) {
        throw new ApiError(403, "Only the presiding chair may perform this action");
    }

    return chairAssignment;
}

export async function POST(req: Request) {
    try {
        const { userId, country } = await requireAuthContext();
        const parsed = emergencySchema.safeParse(await req.json());

        if (!parsed.success) {
            return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
        }

        const payload: EmergencyRequest = parsed.data;
        const now = new Date();

        if (payload.action === "RESTORE_POST") {
            const post = await prisma.discussionPost.findUnique({
                where: { id: payload.postId },
                select: { id: true, isDeleted: true, threadId: true },
            });

            if (!post) {
                throw new ApiError(404, "Post not found");
            }

            const chairAssignment = await ensurePresidingChair(country.id, post.threadId);
            await assertDebateQuorumForThread(post.threadId);

            const restoredPost = await prisma.discussionPost.update({
                where: { id: post.id },
                data: { isDeleted: false, deletedAt: null },
                select: {
                    id: true,
                    threadId: true,
                    isDeleted: true,
                    deletedAt: true,
                },
            });

            await prisma.chairActionLog.create({
                data: {
                    type: "RESTORE_POST",
                    actorCountryId: country.id,
                    actorUserId: userId ?? null,
                    postId: restoredPost.id,
                    threadId: restoredPost.threadId,
                    note: payload.note ?? null,
                    metadata: {
                        action: payload.action,
                        chairCountryId: chairAssignment.effectiveChair.id,
                        chairCountryName: chairAssignment.effectiveChair.name,
                        substituteReason: chairAssignment.substituteReason,
                    },
                },
            });

            return NextResponse.json({ post: restoredPost });
        }

        const thread = await ensureThread(payload.threadId);
        const chairAssignment = await ensurePresidingChair(country.id, thread.id);
        await assertDebateQuorumForThread(thread.id);
        let updatedThread;
        let type: "OPEN_DEBATE" | "CLOSE_DEBATE" | "LOCK_THREAD" | "UNLOCK_THREAD" | "PIN_THREAD" | "UNPIN_THREAD" | "ARCHIVE_THREAD";
        let metadata: Record<string, unknown> | undefined;

        switch (payload.action) {
            case "OPEN_DEBATE": {
                updatedThread = await prisma.discussionThread.update({
                    where: { id: thread.id },
                    data: { debatePhase: "FORMAL_DEBATE" },
                });
                type = "OPEN_DEBATE";
                break;
            }
            case "CLOSE_DEBATE":
                updatedThread = await prisma.discussionThread.update({
                    where: { id: thread.id },
                    data: { debatePhase: "INFORMAL_CAUCUS" },
                });
                type = "CLOSE_DEBATE";
                break;
            case "LOCK_THREAD":
                updatedThread = await prisma.discussionThread.update({
                    where: { id: thread.id },
                    data: { isLocked: true },
                });
                type = "LOCK_THREAD";
                break;
            case "UNLOCK_THREAD":
                updatedThread = await prisma.discussionThread.update({
                    where: { id: thread.id },
                    data: { isLocked: false },
                });
                type = "UNLOCK_THREAD";
                break;
            case "PIN_THREAD":
                updatedThread = await prisma.discussionThread.update({
                    where: { id: thread.id },
                    data: { isPinned: true },
                });
                type = "PIN_THREAD";
                break;
            case "UNPIN_THREAD":
                updatedThread = await prisma.discussionThread.update({
                    where: { id: thread.id },
                    data: { isPinned: false },
                });
                type = "UNPIN_THREAD";
                break;
            case "ARCHIVE_THREAD": {
                const archived = payload.archived ?? true;
                updatedThread = await prisma.discussionThread.update({
                    where: { id: thread.id },
                    data: { isArchived: archived },
                });
                type = "ARCHIVE_THREAD";
                metadata = { archived };
                break;
            }
            default:
                throw new ApiError(400, "Unsupported action");
        }

        const log = await prisma.chairActionLog.create({
            data: {
                type,
                actorCountryId: country.id,
                actorUserId: userId ?? null,
                threadId: updatedThread.id,
                note: payload.note ?? null,
                metadata: {
                    action: payload.action,
                    ...(metadata ?? {}),
                    chairCountryId: chairAssignment.effectiveChair.id,
                    chairCountryName: chairAssignment.effectiveChair.name,
                    substituteReason: chairAssignment.substituteReason,
                    timestamp: now.toISOString(),
                },
            },
            select: {
                id: true,
                type: true,
                note: true,
                createdAt: true,
                metadata: true,
            },
        });

        const entry = toDiscussionSystemEntry({
            ...log,
            actorCountryName: country.name,
        });

        if (entry) {
            await broadcastDiscussionEvent(updatedThread.id, { type: "chair.log", entry });
        }

        await broadcastDiscussionEvent(updatedThread.id, {
            type: "thread.updated",
            thread: {
                debatePhase: updatedThread.debatePhase,
                isLocked: updatedThread.isLocked,
                isPinned: updatedThread.isPinned,
                isArchived: updatedThread.isArchived,
            },
        });

        return NextResponse.json({ thread: updatedThread });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("Failed to process emergency chair action", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

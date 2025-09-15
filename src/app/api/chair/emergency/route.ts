import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { ApiError, requireAuthContext } from "@/utils/api/guards";
import z from "zod";

const emergencySchema = z.discriminatedUnion("action", [
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

export async function POST(req: Request) {
    try {
        const { userId, country } = await requireAuthContext({ requireChair: true });
        const parsed = emergencySchema.safeParse(await req.json());

        if (!parsed.success) {
            return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
        }

        const payload: EmergencyRequest = parsed.data;
        const now = new Date();

        if (payload.action === "RESTORE_POST") {
            const post = await prisma.discussionPost.findUnique({
                where: { id: payload.postId },
                select: { id: true, isDeleted: true },
            });

            if (!post) {
                throw new ApiError(404, "Post not found");
            }

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
                    },
                },
            });

            return NextResponse.json({ post: restoredPost });
        }

        const thread = await ensureThread(payload.threadId);
        let updatedThread;
        let type: "LOCK_THREAD" | "UNLOCK_THREAD" | "PIN_THREAD" | "UNPIN_THREAD" | "ARCHIVE_THREAD";
        let metadata: Record<string, unknown> | undefined;

        switch (payload.action) {
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

        await prisma.chairActionLog.create({
            data: {
                type,
                actorCountryId: country.id,
                actorUserId: userId ?? null,
                threadId: updatedThread.id,
                note: payload.note ?? null,
                metadata: {
                    action: payload.action,
                    ...(metadata ?? {}),
                    timestamp: now.toISOString(),
                },
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

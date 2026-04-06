import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { ApiError, requireAuthContext } from "@/utils/api/guards";
import { broadcastDiscussionEvent } from "@/utils/discussionEvents";
import { MOTION_AUTO_PASS_DELAY_MS, MOTION_LAPSE_DELAY_MS } from "@/utils/motionLifecycle";
import { getMotionFormalWording, motionPayloadSelect, toDiscussionMotionPayload } from "@/utils/motionPayload";
import z from "zod";

const createMotionSchema = z.object({
    type: z.enum([
        "LOCK_THREAD",
        "UNLOCK_THREAD",
        "PIN_THREAD",
        "UNPIN_THREAD",
        "ARCHIVE_THREAD",
        "REMOVE_POST",
        "RESTORE_POST",
        "ISSUE_SANCTION",
        "LIFT_SANCTION",
    ]),
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    rationale: z.string().optional(),
    context: z.unknown().optional(),
    targetThreadId: z.string().optional(),
    targetPostId: z.string().optional(),
    targetCountryId: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const { userId, country } = await requireAuthContext();
        const parsed = createMotionSchema.safeParse(await req.json());

        if (!parsed.success) {
            return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
        }

        const { targetThreadId, targetPostId, targetCountryId } = parsed.data;

        if (targetThreadId) {
            const thread = await prisma.discussionThread.findUnique({
                where: { id: targetThreadId },
                select: { id: true, debatePhase: true },
            });

            if (!thread) {
                throw new ApiError(404, "Target thread not found");
            }

            if (thread.debatePhase !== "FORMAL_DEBATE") {
                throw new ApiError(409, "Motions are unavailable during informal caucus");
            }
        }

        if (targetPostId) {
            const post = await prisma.discussionPost.findUnique({
                where: { id: targetPostId },
                select: { id: true, threadId: true },
            });

            if (!post) {
                throw new ApiError(404, "Target post not found");
            }

            if (targetThreadId && post.threadId !== targetThreadId) {
                throw new ApiError(400, "Target post must belong to the specified thread");
            }
        }

        if (targetCountryId) {
            const targetCountry = await prisma.country.findUnique({
                where: { id: targetCountryId },
                select: { id: true },
            });

            if (!targetCountry) {
                throw new ApiError(404, "Target country not found");
            }
        }

        const submittedAt = new Date();
        const expiresAt = new Date(submittedAt.getTime() + MOTION_LAPSE_DELAY_MS);
        const formalWording = getMotionFormalWording(
            country.name,
            parsed.data.title,
            parsed.data.rationale,
        );

        const motion = await prisma.modMotion.create({
            data: {
                type: parsed.data.type,
                status: "PROPOSED",
                title: parsed.data.title,
                description: parsed.data.description ?? null,
                rationale: parsed.data.rationale ?? null,
                context: {
                    ...(parsed.data.context && typeof parsed.data.context === "object" ? parsed.data.context as Record<string, unknown> : {}),
                    formalWording,
                    chatMessageId: crypto.randomUUID(),
                    autoPassDelayMs: MOTION_AUTO_PASS_DELAY_MS,
                    expiresAt: expiresAt.toISOString(),
                },
                targetThreadId: parsed.data.targetThreadId ?? null,
                targetPostId: parsed.data.targetPostId ?? null,
                targetCountryId: parsed.data.targetCountryId ?? null,
                createdByCountryId: country.id,
                createdByUserId: userId ?? null,
                submittedAt,
            },
            select: motionPayloadSelect,
        });

        const payload = toDiscussionMotionPayload(motion);

        if (motion.targetThreadId) {
            await broadcastDiscussionEvent(motion.targetThreadId, {
                type: "motion.created",
                motion: payload,
            });
        }

        return NextResponse.json({ motion: payload }, { status: 201 });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("Failed to create motion", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

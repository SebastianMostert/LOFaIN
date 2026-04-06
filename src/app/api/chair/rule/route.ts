import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { ApiError, requireAuthContext } from "@/utils/api/guards";
import { broadcastDiscussionEvent } from "@/utils/discussionEvents";
import { getChairAssignmentForMotion } from "@/utils/chair";
import { assertDebateQuorumForThread } from "@/utils/discussionQuorum";
import { motionPayloadSelect, toDiscussionMotionPayload } from "@/utils/motionPayload";
import z from "zod";

const ruleSchema = z.object({
    motionId: z.string(),
    outcome: z.enum(["PASSED", "FAILED", "EXECUTED"]),
    note: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const { userId, country } = await requireAuthContext();
        const parsed = ruleSchema.safeParse(await req.json());

        if (!parsed.success) {
            return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
        }

        const motion = await prisma.modMotion.findUnique({
            where: { id: parsed.data.motionId },
            select: { id: true, targetThreadId: true },
        });

        if (!motion) {
            throw new ApiError(404, "Motion not found");
        }

        const chairAssignment = await getChairAssignmentForMotion(motion.id);
        if (chairAssignment.effectiveChair.id !== country.id) {
            throw new ApiError(403, "Only the presiding chair may rule on this motion");
        }
        if (!motion.targetThreadId) {
            throw new ApiError(409, "This motion is not attached to an active debate thread");
        }
        await assertDebateQuorumForThread(motion.targetThreadId);

        const now = new Date();

        const updatedMotion = await prisma.$transaction(async (tx) => {
            const current = await tx.modMotion.findUnique({
                where: { id: motion.id },
                select: { context: true },
            });
            const updated = await tx.modMotion.update({
                where: { id: motion.id },
                data: {
                    status: parsed.data.outcome,
                    closedAt: now,
                    resolvedAt: now,
                    resolutionNote: parsed.data.note ?? null,
                    context: parsed.data.outcome === "FAILED"
                        ? {
                            ...(current?.context && typeof current.context === "object" ? current.context as Record<string, unknown> : {}),
                            deniedByChairId: country.id,
                            deniedReason: parsed.data.note ?? "Denied by chair",
                          }
                        : undefined,
                },
            });

            await tx.chairActionLog.create({
                data: {
                    type: "LOG_NOTE",
                    actorCountryId: country.id,
                    actorUserId: userId ?? null,
                    motionId: updated.id,
                    note: parsed.data.note ?? `${parsed.data.outcome} ruling issued`,
                    metadata: {
                        outcome: parsed.data.outcome,
                        chairCountryId: chairAssignment.effectiveChair.id,
                        chairCountryName: chairAssignment.effectiveChair.name,
                        substituteReason: chairAssignment.substituteReason,
                    },
                },
            });

            return tx.modMotion.findUnique({
                where: { id: updated.id },
                select: motionPayloadSelect,
            });
        });

        if (!updatedMotion) {
            throw new ApiError(404, "Motion not found after ruling");
        }

        const payload = toDiscussionMotionPayload(updatedMotion);
        if (payload.targetThreadId) {
            await broadcastDiscussionEvent(payload.targetThreadId, {
                type: "motion.updated",
                motion: payload,
            });
        }

        return NextResponse.json({ motion: payload });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("Failed to record chair ruling", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

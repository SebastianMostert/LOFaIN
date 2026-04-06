import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { ApiError, requireAuthContext } from "@/utils/api/guards";
import { broadcastDiscussionEvent } from "@/utils/discussionEvents";
import { MOTION_AUTO_PASS_DELAY_MS } from "@/utils/motionLifecycle";
import { motionPayloadSelect, toDiscussionMotionPayload } from "@/utils/motionPayload";
import { getChairAssignmentForMotion } from "@/utils/chair";
import z from "zod";

const secondMotionSchema = z.object({
    note: z.string().optional(),
});

type MotionContext = {
    seconds?: string[];
    [key: string]: unknown;
};

function normaliseContext(context: unknown): MotionContext {
    if (!context || typeof context !== "object") {
        return {};
    }

    const parsed = context as MotionContext;
    const seconds = Array.isArray(parsed.seconds)
        ? parsed.seconds.filter((value): value is string => typeof value === "string")
        : [];

    return { ...parsed, seconds };
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ motionId: string }> },
) {
    try {
        const awaitedParams = await params;
        const { country } = await requireAuthContext();
        const parsed = secondMotionSchema.safeParse(await req.json());

        if (!parsed.success) {
            return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
        }

        const motion = await prisma.modMotion.findUnique({
            where: { id: awaitedParams.motionId },
            select: {
                id: true,
                status: true,
                context: true,
                createdByCountryId: true,
                targetThreadId: true,
            },
        });

        if (!motion) {
            throw new ApiError(404, "Motion not found");
        }

        if (motion.status !== "PROPOSED") {
            throw new ApiError(409, "Motion cannot be seconded in its current state");
        }

        if (!motion.targetThreadId) {
            throw new ApiError(400, "Motion is missing a target thread");
        }

        if (motion.createdByCountryId === country.id) {
            throw new ApiError(403, "The proposer may not second their own motion");
        }

        const chairAssignment = await getChairAssignmentForMotion(motion.id);
        if (chairAssignment.effectiveChair.id === country.id) {
            throw new ApiError(403, "The presiding chair may not second this motion");
        }

        const context = normaliseContext(motion.context);
        const seconds = new Set(context.seconds ?? []);

        if (seconds.has(country.id)) {
            throw new ApiError(409, "Country has already seconded this motion");
        }

        if (seconds.size > 0) {
            throw new ApiError(409, "This motion has already been seconded");
        }

        seconds.add(country.id);
        const now = new Date();
        const autoPassAt = new Date(now.getTime() + MOTION_AUTO_PASS_DELAY_MS);

        const updatedMotion = await prisma.modMotion.update({
            where: { id: motion.id },
            data: {
                status: "VOTING",
                openedAt: now,
                context: {
                    ...context,
                    seconds: Array.from(seconds),
                    seconderId: country.id,
                    seconderName: country.name,
                    secondedAt: now.toISOString(),
                    autoPassAt: autoPassAt.toISOString(),
                },
            },
            select: motionPayloadSelect,
        });

        const payload = toDiscussionMotionPayload(updatedMotion);
        await broadcastDiscussionEvent(motion.targetThreadId, {
            type: "motion.updated",
            motion: payload,
        });

        return NextResponse.json({ motion: payload });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("Failed to second motion", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

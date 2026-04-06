import { NextResponse } from "next/server";

import { ApiError, requireAuthContext } from "@/utils/api/guards";
import { broadcastDiscussionEvent } from "@/utils/discussionEvents";
import { finalizeMotionIfDue } from "@/utils/motionLifecycle";

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ motionId: string }> },
) {
    try {
        await requireAuthContext();
        const awaitedParams = await params;

        const motion = await finalizeMotionIfDue(awaitedParams.motionId);
        if (!motion) {
            throw new ApiError(404, "Motion not found");
        }

        if (motion.targetThreadId) {
            await broadcastDiscussionEvent(motion.targetThreadId, {
                type: "motion.updated",
                motion,
            });
        }

        return NextResponse.json({ motion });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("Failed to finalize motion", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

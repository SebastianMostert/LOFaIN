import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { ApiError, requireAuthContext } from "@/utils/api/guards";
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
            select: { id: true, status: true, context: true },
        });

        if (!motion) {
            throw new ApiError(404, "Motion not found");
        }

        if (motion.status !== "PROPOSED" && motion.status !== "VOTING") {
            throw new ApiError(409, "Motion cannot be seconded in its current state");
        }

        const context = normaliseContext(motion.context);
        const seconds = new Set(context.seconds ?? []);

        if (seconds.has(country.id)) {
            throw new ApiError(409, "Country has already seconded this motion");
        }

        seconds.add(country.id);
        const now = new Date();

        const updatedMotion = await prisma.modMotion.update({
            where: { id: motion.id },
            data: {
                status: motion.status === "PROPOSED" ? "VOTING" : motion.status,
                openedAt: motion.status === "PROPOSED" ? now : undefined,
                context: {
                    ...context,
                    seconds: Array.from(seconds),
                },
            },
        });

        return NextResponse.json({ motion: updatedMotion });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("Failed to second motion", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

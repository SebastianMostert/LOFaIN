import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { ApiError, requireAuthContext } from "@/utils/api/guards";
import z from "zod";

const withdrawSchema = z.object({
    note: z.string().optional(),
});

const FINAL_STATUSES = new Set([
    "PASSED",
    "FAILED",
    "WITHDRAWN",
    "EXECUTED",
]);

export async function POST(
    req: Request,
    { params }: { params: Promise<{ motionId: string }> },
) {
    try {
        const awaitedParams = await params;
        const { country } = await requireAuthContext();
        const parsed = withdrawSchema.safeParse(await req.json());

        if (!parsed.success) {
            return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
        }

        const motion = await prisma.modMotion.findUnique({
            where: { id: awaitedParams.motionId },
            select: { id: true, status: true, createdByCountryId: true },
        });

        if (!motion) {
            throw new ApiError(404, "Motion not found");
        }

        if (motion.createdByCountryId !== country.id) {
            throw new ApiError(403, "Only the proposing country may withdraw the motion");
        }

        if (FINAL_STATUSES.has(motion.status)) {
            throw new ApiError(409, "Motion is already resolved");
        }

        const updatedMotion = await prisma.modMotion.update({
            where: { id: motion.id },
            data: {
                status: "WITHDRAWN",
                closedAt: new Date(),
                resolvedAt: new Date(),
                resolutionNote: parsed.data.note ?? null,
            },
        });

        return NextResponse.json({ motion: updatedMotion });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("Failed to withdraw motion", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

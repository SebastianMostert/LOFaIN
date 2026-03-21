import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { ApiError, requireAuthContext } from "@/utils/api/guards";
import { getChairAssignmentForMotion } from "@/utils/chair";
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
            select: { id: true },
        });

        if (!motion) {
            throw new ApiError(404, "Motion not found");
        }

        const chairAssignment = await getChairAssignmentForMotion(motion.id);
        if (chairAssignment.effectiveChair.id !== country.id) {
            throw new ApiError(403, "Only the presiding chair may rule on this motion");
        }

        const now = new Date();

        const updatedMotion = await prisma.$transaction(async (tx) => {
            const updated = await tx.modMotion.update({
                where: { id: motion.id },
                data: {
                    status: parsed.data.outcome,
                    closedAt: now,
                    resolvedAt: now,
                    resolutionNote: parsed.data.note ?? null,
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

            return updated;
        });

        return NextResponse.json({ motion: updatedMotion });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("Failed to record chair ruling", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

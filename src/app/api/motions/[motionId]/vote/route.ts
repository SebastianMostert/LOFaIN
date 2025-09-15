import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { ApiError, requireAuthContext } from "@/utils/api/guards";
import z from "zod";

const voteSchema = z.object({
    choice: z.enum(["APPROVE", "REJECT", "ABSTAIN"]),
    comment: z.string().optional(),
});

interface VoteTally {
    approve: number;
    reject: number;
    abstain: number;
}

function countVotes(votes: { choice: "APPROVE" | "REJECT" | "ABSTAIN" }[]): VoteTally {
    const tally: VoteTally = { approve: 0, reject: 0, abstain: 0 };
    for (const vote of votes) {
        if (vote.choice === "APPROVE") tally.approve += 1;
        else if (vote.choice === "REJECT") tally.reject += 1;
        else tally.abstain += 1;
    }
    return tally;
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ motionId: string }> },
) {
    try {
        const awaitedParams = await params;
        const { userId, country, quorum } = await requireAuthContext();
        const parsed = voteSchema.safeParse(await req.json());

        if (!parsed.success) {
            return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
        }

        const motion = await prisma.modMotion.findUnique({
            where: { id: awaitedParams.motionId },
            select: { id: true, status: true },
        });

        if (!motion) {
            throw new ApiError(404, "Motion not found");
        }

        if (motion.status !== "VOTING") {
            throw new ApiError(409, "Motion is not open for voting");
        }

        const result = await prisma.$transaction(async (tx) => {
            await tx.modVote.upsert({
                where: {
                    motionId_countryId: {
                        motionId: motion.id,
                        countryId: country.id,
                    },
                },
                update: {
                    choice: parsed.data.choice,
                    comment: parsed.data.comment ?? null,
                },
                create: {
                    motionId: motion.id,
                    countryId: country.id,
                    userId: userId ?? null,
                    choice: parsed.data.choice,
                    comment: parsed.data.comment ?? null,
                },
            });

            const votes = await tx.modVote.findMany({
                where: { motionId: motion.id },
                select: { choice: true },
            });

            const tally = countVotes(votes);
            let updatedMotion = await tx.modMotion.findUnique({ where: { id: motion.id } });
            if (!updatedMotion) {
                throw new ApiError(404, "Motion not found after voting");
            }

            if (updatedMotion.status === "VOTING" && votes.length >= quorum.required) {
                const passes = tally.approve > tally.reject;
                const newStatus = passes ? "PASSED" : "FAILED";
                const note = passes
                    ? `Motion passed ${tally.approve}-${tally.reject}-${tally.abstain}`
                    : `Motion failed ${tally.approve}-${tally.reject}-${tally.abstain}`;

                updatedMotion = await tx.modMotion.update({
                    where: { id: motion.id },
                    data: {
                        status: newStatus,
                        closedAt: new Date(),
                        resolvedAt: new Date(),
                        resolutionNote: note,
                    },
                });
            }

            return { tally, motion: updatedMotion, totalVotes: votes.length };
        });

        return NextResponse.json({
            motion: result.motion,
            tally: result.tally,
            totalVotes: result.totalVotes,
            quorum: quorum.required,
        });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("Failed to record motion vote", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

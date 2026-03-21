import { NextResponse } from "next/server";

import { prisma } from "@/prisma";
import { countEligibleVotingCountries } from "@/utils/country";
import { ApiError, requireAuthContext } from "@/utils/api/guards";

const VOTING_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> },
) {
    try {
        const awaitedParams = await params;
        const { session, country } = await requireAuthContext();

        const amendment = await prisma.amendment.findUnique({
            where: { slug: awaitedParams.slug },
            select: {
                id: true,
                slug: true,
                status: true,
                proposerCountryId: true,
                proposerUserId: true,
            },
        });

        if (!amendment) {
            throw new ApiError(404, "Amendment not found");
        }

        if (amendment.status !== "DRAFT") {
            throw new ApiError(409, "Voting can only be opened for amendments in debate");
        }

        const isProposer =
            amendment.proposerCountryId === country.id ||
            (amendment.proposerUserId != null && amendment.proposerUserId === (session.user?.id ?? null));

        if (!isProposer) {
            throw new ApiError(403, "Only the proposer can open voting");
        }

        const opensAt = new Date();
        const closesAt = new Date(opensAt.getTime() + VOTING_WINDOW_MS);
        const eligibleCount = await countEligibleVotingCountries(opensAt);

        const updated = await prisma.amendment.update({
            where: { id: amendment.id },
            data: {
                status: "OPEN",
                opensAt,
                closesAt,
                eligibleCount,
            },
            select: {
                id: true,
                slug: true,
                status: true,
                opensAt: true,
                closesAt: true,
                eligibleCount: true,
            },
        });

        return NextResponse.json({ amendment: updated });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("Failed to open amendment voting", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

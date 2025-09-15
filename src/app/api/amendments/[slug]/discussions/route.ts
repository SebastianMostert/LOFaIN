import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { ApiError, requireAuthContext } from "@/utils/api/guards";

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> },
) {
    try {
        const awaitedParams = await params;
        const { session, country } = await requireAuthContext();

        const amendment = await prisma.amendment.findUnique({
            where: { slug: awaitedParams.slug },
            select: { id: true, title: true },
        });

        if (!amendment) {
            throw new ApiError(404, "Amendment not found");
        }

        const threadSlug = `amendment-${awaitedParams.slug}-discussion`;
        let thread = await prisma.discussionThread.findUnique({ where: { slug: threadSlug } });

        if (!thread) {
            thread = await prisma.discussionThread.create({
                data: {
                    slug: threadSlug,
                    title: `Discussion: ${amendment.title}`,
                    summary: `Discussion thread for amendment ${awaitedParams.slug}`,
                    createdByCountryId: country.id,
                    createdByUserId: session.user?.id ?? null,
                },
            });

            return NextResponse.json({ thread, created: true }, { status: 201 });
        }

        return NextResponse.json({ thread, created: false });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("Failed to bootstrap amendment discussion thread", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

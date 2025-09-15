import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { ApiError, requireAuthContext } from "@/utils/api/guards";
import z from "zod";

const createPostSchema = z.object({
    body: z.string().min(1, "Body is required"),
    parentPostId: z.string().optional(),
});

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ threadId: string }> },
) {
    try {
        const awaitedParams = await params;
        await requireAuthContext();

        const thread = await prisma.discussionThread.findUnique({
            where: { id: awaitedParams.threadId },
            select: { id: true },
        });

        if (!thread) {
            throw new ApiError(404, "Thread not found");
        }

        const posts = await prisma.discussionPost.findMany({
            where: { threadId: thread.id },
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                body: true,
                parentPostId: true,
                isEdited: true,
                isDeleted: true,
                deletedAt: true,
                editedAt: true,
                createdAt: true,
                updatedAt: true,
                authorUser: { select: { id: true, name: true, image: true } },
                authorCountry: {
                    select: { id: true, name: true, slug: true, code: true, colorHex: true },
                },
            },
        });

        return NextResponse.json({ posts });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("Failed to load discussion posts", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ threadId: string }> },
) {
    try {
        const awaitedParams = await params;
        const { userId, country } = await requireAuthContext();
        const parsed = createPostSchema.safeParse(await req.json());

        if (!parsed.success) {
            return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
        }

        const thread = await prisma.discussionThread.findUnique({
            where: { id: awaitedParams.threadId },
            select: { id: true, isLocked: true, isArchived: true },
        });

        if (!thread) {
            throw new ApiError(404, "Thread not found");
        }

        if (thread.isLocked || thread.isArchived) {
            throw new ApiError(403, "Thread is not accepting new posts");
        }

        if (parsed.data.parentPostId) {
            const parentPost = await prisma.discussionPost.findUnique({
                where: { id: parsed.data.parentPostId },
                select: { threadId: true },
            });

            if (!parentPost || parentPost.threadId !== thread.id) {
                throw new ApiError(400, "Parent post must belong to the same thread");
            }
        }

        const post = await prisma.discussionPost.create({
            data: {
                threadId: thread.id,
                body: parsed.data.body,
                parentPostId: parsed.data.parentPostId ?? null,
                authorCountryId: country.id,
                authorUserId: userId ?? null,
            },
            select: {
                id: true,
                body: true,
                parentPostId: true,
                isEdited: true,
                isDeleted: true,
                deletedAt: true,
                editedAt: true,
                createdAt: true,
                updatedAt: true,
                authorUser: { select: { id: true, name: true, image: true } },
                authorCountry: {
                    select: { id: true, name: true, slug: true, code: true, colorHex: true },
                },
            },
        });

        await prisma.discussionThread.update({
            where: { id: thread.id },
            data: { lastPostAt: new Date() },
        });

        return NextResponse.json({ post }, { status: 201 });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("Failed to create discussion post", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

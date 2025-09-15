import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { ApiError, requireAuthContext } from "@/utils/api/guards";
import z from "zod";

const updatePostSchema = z.object({
    body: z.string().min(1, "Body is required"),
});

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ threadId: string; postId: string }> },
) {
    try {
        const awaitedParams = await params;
        await requireAuthContext();

        const post = await prisma.discussionPost.findFirst({
            where: { id: awaitedParams.postId, threadId: awaitedParams.threadId },
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

        if (!post) {
            throw new ApiError(404, "Post not found");
        }

        return NextResponse.json({ post });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("Failed to load discussion post", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ threadId: string; postId: string }> },
) {
    try {
        const awaitedParams = await params;
        const { country } = await requireAuthContext();
        const parsed = updatePostSchema.safeParse(await req.json());

        if (!parsed.success) {
            return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
        }

        const post = await prisma.discussionPost.findFirst({
            where: { id: awaitedParams.postId, threadId: awaitedParams.threadId },
            select: { id: true, authorCountryId: true, thread: { select: { isLocked: true, isArchived: true } } },
        });

        if (!post) {
            throw new ApiError(404, "Post not found");
        }

        if (post.thread.isLocked || post.thread.isArchived) {
            throw new ApiError(403, "Thread is not accepting updates");
        }

        if (post.authorCountryId !== country.id) {
            throw new ApiError(403, "Cannot edit another country's post");
        }

        const updated = await prisma.discussionPost.update({
            where: { id: post.id },
            data: {
                body: parsed.data.body,
                isEdited: true,
                editedAt: new Date(),
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

        return NextResponse.json({ post: updated });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("Failed to update discussion post", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ threadId: string; postId: string }> },
) {
    try {
        const awaitedParams = await params;
        const { country } = await requireAuthContext();

        const post = await prisma.discussionPost.findFirst({
            where: { id: awaitedParams.postId, threadId: awaitedParams.threadId },
            select: { id: true, isDeleted: true, authorCountryId: true },
        });

        if (!post) {
            throw new ApiError(404, "Post not found");
        }

        if (post.authorCountryId !== country.id) {
            throw new ApiError(403, "Cannot delete another country's post");
        }

        if (post.isDeleted) {
            throw new ApiError(409, "Post already deleted");
        }

        await prisma.discussionPost.update({
            where: { id: post.id },
            data: { isDeleted: true, deletedAt: new Date() },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("Failed to delete discussion post", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

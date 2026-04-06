import type { Prisma } from "@prisma/client";

import type { DiscussionPostPayload } from "@/utils/discussionRealtime";

export const discussionPostPayloadSelect = {
    id: true,
    threadId: true,
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
} satisfies Prisma.DiscussionPostSelect;

type DiscussionPostRecord = Prisma.DiscussionPostGetPayload<{
    select: typeof discussionPostPayloadSelect;
}>;

const LEGACY_QUOTE_MARKER_PATTERN = /\[\[quote\|[^|\]]+\|([^\]]+)\]\]/g;

function sanitizeLegacyQuoteMarkup(body: string) {
    return body.replace(LEGACY_QUOTE_MARKER_PATTERN, (_match, encodedText: string) => {
        try {
            return decodeURIComponent(encodedText);
        } catch {
            return "";
        }
    }).trim();
}

function toPayload(post: DiscussionPostRecord): DiscussionPostPayload {
    return {
        id: post.id,
        body: sanitizeLegacyQuoteMarkup(post.body),
        parentPostId: post.parentPostId,
        isEdited: post.isEdited,
        isDeleted: post.isDeleted,
        deletedAt: post.deletedAt ? post.deletedAt.toISOString() : null,
        editedAt: post.editedAt ? post.editedAt.toISOString() : null,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        authorUser: post.authorUser,
        authorCountry: post.authorCountry,
    };
}

export async function toDiscussionPostPayloads(postRecords: DiscussionPostRecord[]) {
    return postRecords.map((post) => toPayload(post));
}

export async function toDiscussionPostPayload(postRecord: DiscussionPostRecord) {
    const [payload] = await toDiscussionPostPayloads([postRecord]);
    return payload;
}

import type {
    DiscussionPostPayload,
    DiscussionSystemEntry,
    DiscussionThreadStatePayload,
} from "@/utils/discussionRealtime";

import type { GroupedRecordItem, MotionItem, RecordItem, RecordSystemItem } from "./liveDiscussionTypes";

export function upsertMotion(motions: MotionItem[], motion: MotionItem) {
    const next = motions.filter((entry) => entry.id !== motion.id);
    next.push(motion);
    next.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
    return next;
}

export function applyThreadEffectsFromMotion(
    current: DiscussionThreadStatePayload,
    motion: MotionItem,
) {
    if (motion.status !== "PASSED") {
        return current;
    }

    if (motion.type === "LOCK_THREAD") return { ...current, isLocked: true };
    if (motion.type === "UNLOCK_THREAD") return { ...current, isLocked: false };
    if (motion.type === "PIN_THREAD") return { ...current, isPinned: true };
    if (motion.type === "UNPIN_THREAD") return { ...current, isPinned: false };
    if (motion.type === "ARCHIVE_THREAD") return { ...current, isArchived: true };

    return current;
}

export function applyPostEffectsFromMotion(current: DiscussionPostPayload[], motion: MotionItem) {
    if (motion.status !== "PASSED" || !motion.targetPostId) {
        return current;
    }

    if (motion.type === "REMOVE_POST") {
        return current.map((post) => (
            post.id === motion.targetPostId
                ? { ...post, isDeleted: true, body: "" }
                : post
        ));
    }

    if (motion.type === "RESTORE_POST") {
        return current.map((post) => (
            post.id === motion.targetPostId
                ? { ...post, isDeleted: false }
                : post
        ));
    }

    return current;
}

export function getResolvedMotionSummary(motion: MotionItem) {
    const proposer = motion.proposerName ?? "Unknown delegation";
    const outcome = motion.statusLabel.toLowerCase();
    return `${motion.title} by ${proposer} ${outcome}`;
}

export function upsertPost(posts: DiscussionPostPayload[], post: DiscussionPostPayload) {
    const next = posts.filter((entry) => entry.id !== post.id);
    next.push(post);
    next.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
    return next;
}

export function upsertSystemEntry(entries: DiscussionSystemEntry[], entry: DiscussionSystemEntry) {
    const next = entries.filter((current) => current.id !== entry.id);
    next.push(entry);
    next.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
    return next;
}

function canGroupPosts(left: DiscussionPostPayload, right: DiscussionPostPayload) {
    return left.authorCountry?.id === right.authorCountry?.id
        && left.authorUser?.id === right.authorUser?.id;
}

function canGroupSystemEntries(left: RecordSystemItem, right: RecordSystemItem) {
    return Date.parse(right.createdAt) - Date.parse(left.createdAt) <= 90_000;
}

export function groupRecordItems(items: RecordItem[]): GroupedRecordItem[] {
    const grouped: GroupedRecordItem[] = [];
    let pendingSystemItems: RecordSystemItem[] = [];

    const flushSystemItems = () => {
        if (pendingSystemItems.length === 0) return;
        if (pendingSystemItems.length === 1) {
            grouped.push(pendingSystemItems[0]);
        } else {
            grouped.push({
                type: "system-group",
                id: pendingSystemItems[0].id,
                createdAt: pendingSystemItems[0].createdAt,
                entries: pendingSystemItems.map((item) => item.entry),
            });
        }
        pendingSystemItems = [];
    };

    for (const item of items) {
        if (item.type === "system") {
            const previousSystemItem = pendingSystemItems[pendingSystemItems.length - 1];
            if (!previousSystemItem || canGroupSystemEntries(previousSystemItem, item)) {
                pendingSystemItems.push(item);
            } else {
                flushSystemItems();
                pendingSystemItems.push(item);
            }
            continue;
        }

        flushSystemItems();
        if (item.type === "motion") {
            grouped.push(item);
            continue;
        }

        const previous = grouped[grouped.length - 1];
        if (previous?.type === "post-group" && canGroupPosts(previous.posts[previous.posts.length - 1], item.post)) {
            previous.posts.push(item.post);
            continue;
        }

        grouped.push({
            type: "post-group",
            id: item.id,
            createdAt: item.createdAt,
            posts: [item.post],
        });
    }

    flushSystemItems();
    return grouped;
}

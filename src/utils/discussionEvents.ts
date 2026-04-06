import { getPartyKitRoomHttpUrl } from "@/utils/partykit";
import type { DiscussionMotionPayload, DiscussionPostPayload, DiscussionSystemEntry, DiscussionThreadStatePayload } from "@/utils/discussionRealtime";

type DiscussionEvent =
    | { type: "post.created"; post: DiscussionPostPayload }
    | { type: "post.updated"; post: DiscussionPostPayload }
    | { type: "post.deleted"; postId: string }
    | { type: "chair.log"; entry: DiscussionSystemEntry }
    | { type: "thread.updated"; thread: DiscussionThreadStatePayload }
    | { type: "motion.created"; motion: DiscussionMotionPayload }
    | { type: "motion.updated"; motion: DiscussionMotionPayload };

function getControlSecret() {
    return process.env.DISCUSSION_REALTIME_SECRET ?? process.env.PARTYKIT_SHARED_SECRET ?? "discussion-dev-secret";
}

export async function broadcastDiscussionEvent(threadId: string, event: DiscussionEvent) {
    const response = await fetch(getPartyKitRoomHttpUrl(threadId, "/events"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-discussion-secret": getControlSecret(),
        },
        body: JSON.stringify(event),
        cache: "no-store",
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Failed to broadcast discussion event (${response.status}): ${text}`);
    }
}

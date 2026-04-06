import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { getChairAssignmentForThread } from "@/utils/chair";
import { ApiError, requireAuthContext } from "@/utils/api/guards";
import { assertDebateQuorumForThread } from "@/utils/discussionQuorum";
import { broadcastDiscussionEvent } from "@/utils/discussionEvents";
import { getPartyKitRoomHttpUrl } from "@/utils/partykit";
import {
  buildQueueChairActionMetadata,
  buildQueueChairActionNote,
  loadDiscussionRoomState,
  resolveQueueChairTarget,
  toDiscussionSystemEntry,
} from "@/utils/queueChairActions";

export const runtime = "nodejs";

type QueueRecognizeBody = {
  threadId?: string;
  countryId?: string | null;
  devOverrideModeration?: boolean;
};

export async function POST(request: Request) {
  let body: QueueRecognizeBody;

  try {
    body = (await request.json()) as QueueRecognizeBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const threadId = typeof body.threadId === 'string' ? body.threadId.trim() : '';
  const targetId = typeof body.countryId === 'string' ? body.countryId.trim() : '';

  if (!threadId) {
    return NextResponse.json({ error: 'threadId is required' }, { status: 400 });
  }

  const countryId = targetId.length > 0 ? targetId : undefined;

  try {
    const { userId, country } = await requireAuthContext();
    const thread = await prisma.discussionThread.findUnique({
      where: { id: threadId },
      select: { id: true, debatePhase: true },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (thread.debatePhase !== "FORMAL_DEBATE") {
      return NextResponse.json({ error: "Speakers list is unavailable during informal caucus" }, { status: 409 });
    }

    const chairAssignment = await getChairAssignmentForThread(threadId);
    const canModerate = chairAssignment.effectiveChair.id === country.id;
    const allowDevOverride = process.env.NODE_ENV !== "production" && body.devOverrideModeration === true;
    if (!canModerate) {
      if (!allowDevOverride) {
        return NextResponse.json({ error: "Chair privileges required" }, { status: 403 });
      }
    }
    await assertDebateQuorumForThread(threadId);

    const roomState = await loadDiscussionRoomState(threadId);
    const target = resolveQueueChairTarget("RECOGNIZE_SPEAKER", roomState, countryId);

    const response = await fetch(getPartyKitRoomHttpUrl(threadId, "/actions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-discussion-secret": process.env.DISCUSSION_REALTIME_SECRET ?? process.env.PARTYKIT_SHARED_SECRET ?? "discussion-dev-secret",
      },
      body: JSON.stringify({
        type: "queue.recognize",
        countryId,
        actor: {
          countryId: country.id,
          countryName: country.name,
          countryCode: null,
          canModerate: canModerate || allowDevOverride,
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Unable to recognize speaker" }, { status: response.status });
    }

    const log = await prisma.chairActionLog.create({
      data: {
        type: "LOG_NOTE",
        actorCountryId: country.id,
        actorUserId: userId ?? null,
        threadId,
        note: buildQueueChairActionNote("RECOGNIZE_SPEAKER", country.name, target),
        metadata: buildQueueChairActionMetadata("RECOGNIZE_SPEAKER", chairAssignment, target),
      },
      select: {
        id: true,
        type: true,
        note: true,
        createdAt: true,
        metadata: true,
      },
    });

    const entry = toDiscussionSystemEntry({
      ...log,
      actorCountryName: country.name,
    });
    if (entry) {
      await broadcastDiscussionEvent(threadId, { type: "chair.log", entry });
    }

    const queue = await response.json();
    return NextResponse.json({ queue });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to recognize speaker.", error);
    return NextResponse.json({ error: "Unable to recognize speaker" }, { status: 500 });
  }
}

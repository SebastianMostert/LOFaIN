import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { requireAuthContext } from "@/utils/api/guards";
import { broadcastDiscussionEvent } from "@/utils/discussionEvents";
import { getPartyKitRoomHttpUrl } from "@/utils/partykit";
import {
  buildQueueChairActionNote,
  loadDiscussionRoomState,
  resolveQueueChairTarget,
  toDiscussionSystemEntry,
} from "@/utils/queueChairActions";

export const runtime = "nodejs";

type QueueRequestBody = {
  threadId?: string;
  countryId?: string;
};

export async function POST(request: Request) {
  let body: QueueRequestBody;

  try {
    body = (await request.json()) as QueueRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const threadId = typeof body.threadId === 'string' ? body.threadId.trim() : '';
  const countryId = typeof body.countryId === 'string' ? body.countryId.trim() : '';

  if (!threadId) {
    return NextResponse.json({ error: 'threadId is required' }, { status: 400 });
  }

  if (!countryId) {
    return NextResponse.json({ error: 'countryId is required' }, { status: 400 });
  }

  try {
    const { userId, country } = await requireAuthContext();
    if (country.id !== countryId) {
      return NextResponse.json({ error: "Cannot enqueue another country" }, { status: 403 });
    }

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

    const roomState = await loadDiscussionRoomState(threadId);
    const target = resolveQueueChairTarget("REQUEST_FLOOR", roomState, countryId);

    const response = await fetch(getPartyKitRoomHttpUrl(threadId, "/actions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-discussion-secret": process.env.DISCUSSION_REALTIME_SECRET ?? process.env.PARTYKIT_SHARED_SECRET ?? "discussion-dev-secret",
      },
      body: JSON.stringify({
        type: "queue.request",
        actor: {
          countryId: country.id,
          countryName: country.name,
          countryCode: null,
          canModerate: false,
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Unable to request queue position" }, { status: response.status });
    }

    const log = await prisma.chairActionLog.create({
      data: {
        type: "LOG_NOTE",
        actorCountryId: country.id,
        actorUserId: userId ?? null,
        threadId,
        note: buildQueueChairActionNote("REQUEST_FLOOR", country.name, target),
        metadata: {
          chairAction: "REQUEST_FLOOR",
          procedural: true,
          targetCountryId: target?.participant.countryId ?? country.id,
          targetCountryName: target?.participant.countryName ?? country.name,
          targetSource: "queued",
        },
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
    console.error("Failed to enqueue request.", error);
    return NextResponse.json({ error: "Unable to request queue position" }, { status: 500 });
  }
}

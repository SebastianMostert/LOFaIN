import { NextResponse } from "next/server";
import { getChairAssignmentForThread } from "@/utils/chair";
import { requireAuthContext } from "@/utils/api/guards";
import { getPartyKitRoomHttpUrl } from "@/utils/partykit";

export const runtime = "nodejs";

type QueueSkipBody = {
  threadId?: string;
  countryId?: string | null;
};

export async function POST(request: Request) {
  let body: QueueSkipBody;

  try {
    body = (await request.json()) as QueueSkipBody;
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
    const { country } = await requireAuthContext();
    const chairAssignment = await getChairAssignmentForThread(threadId);
    const canModerate = chairAssignment.effectiveChair.id === country.id;
    if (!canModerate) {
      return NextResponse.json({ error: "Chair privileges required" }, { status: 403 });
    }

    const response = await fetch(getPartyKitRoomHttpUrl(threadId, "/actions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-discussion-secret": process.env.DISCUSSION_REALTIME_SECRET ?? process.env.PARTYKIT_SHARED_SECRET ?? "discussion-dev-secret",
      },
      body: JSON.stringify({
        type: "queue.skip",
        countryId,
        actor: {
          countryId: country.id,
          countryName: country.name,
          countryCode: null,
          canModerate,
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Unable to skip queue entry" }, { status: response.status });
    }

    const queue = await response.json();
    return NextResponse.json({ queue });
  } catch (error) {
    console.error("Failed to skip queue entry.", error);
    return NextResponse.json({ error: "Unable to skip queue entry" }, { status: 500 });
  }
}

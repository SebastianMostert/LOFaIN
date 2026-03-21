import { NextResponse } from "next/server";
import { requireAuthContext } from "@/utils/api/guards";
import { getPartyKitRoomHttpUrl } from "@/utils/partykit";

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
    const { country } = await requireAuthContext();
    if (country.id !== countryId) {
      return NextResponse.json({ error: "Cannot enqueue another country" }, { status: 403 });
    }

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

    const queue = await response.json();
    return NextResponse.json({ queue });
  } catch (error) {
    console.error("Failed to enqueue request.", error);
    return NextResponse.json({ error: "Unable to request queue position" }, { status: 500 });
  }
}

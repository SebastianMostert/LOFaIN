import { NextResponse } from 'next/server';

import { handleQueueRequest } from '@/app/api/socket/queueActions';

export const runtime = 'edge';

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
    const queue = handleQueueRequest(threadId, countryId);
    return NextResponse.json({ queue });
  } catch (error) {
    console.error('Failed to enqueue request.', error);
    return NextResponse.json({ error: 'Unable to request queue position' }, { status: 500 });
  }
}

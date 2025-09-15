import { NextResponse } from 'next/server';

import { handleQueueSkip } from '@/app/api/socket/queueActions';

export const runtime = 'edge';

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
    const queue = handleQueueSkip(threadId, countryId);
    return NextResponse.json({ queue });
  } catch (error) {
    console.error('Failed to skip queue entry.', error);
    return NextResponse.json({ error: 'Unable to skip queue entry' }, { status: 500 });
  }
}

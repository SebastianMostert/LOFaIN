import { NextResponse } from 'next/server';

import { handleQueueRecognize } from '@/app/api/socket/queueActions';

export const runtime = 'edge';

type QueueRecognizeBody = {
  threadId?: string;
  countryId?: string | null;
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
    const queue = handleQueueRecognize(threadId, countryId);
    return NextResponse.json({ queue });
  } catch (error) {
    console.error('Failed to recognize speaker.', error);
    return NextResponse.json({ error: 'Unable to recognize speaker' }, { status: 500 });
  }
}

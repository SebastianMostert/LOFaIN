import { broadcastToRoom } from './state';
import {
  getQueueState,
  recognizeFromQueue,
  requestToQueue,
  serializeQueueState,
  skipFromQueue,
  type QueueState,
} from './queueStore';

export type SerializedQueueState = ReturnType<typeof serializeQueueState>;

function broadcastQueueState(threadId: string, state?: QueueState) {
  const nextState = state ?? getQueueState(threadId);
  broadcastToRoom(threadId, {
    event: 'queue:update',
    payload: serializeQueueState(nextState),
  });
}

export function handleQueueRequest(threadId: string, countryId: string): SerializedQueueState {
  const state = requestToQueue(threadId, countryId);
  broadcastQueueState(threadId, state);
  return serializeQueueState(state);
}

export function handleQueueRecognize(
  threadId: string,
  countryId?: string | null,
): SerializedQueueState {
  const state = recognizeFromQueue(threadId, countryId);
  broadcastQueueState(threadId, state);
  return serializeQueueState(state);
}

export function handleQueueSkip(
  threadId: string,
  countryId?: string | null,
): SerializedQueueState {
  const state = skipFromQueue(threadId, countryId);
  broadcastQueueState(threadId, state);
  return serializeQueueState(state);
}

export function readSerializedQueue(threadId: string): SerializedQueueState {
  return serializeQueueState(getQueueState(threadId));
}

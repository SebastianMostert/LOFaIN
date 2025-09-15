import { Buffer } from 'buffer';
import type { RawData } from 'next/dist/compiled/ws';

import {
  type PresenceConnection,
  type ServerWebSocket,
  broadcastToRoom,
  deleteConnection,
  getOrCreateRoom,
  listPresentCountryIds,
  rooms,
} from './state';
import {
  handleQueueRecognize,
  handleQueueRequest,
  handleQueueSkip,
} from './queueActions';

export const HEARTBEAT_INTERVAL_MS = 5_000;
export const HEARTBEAT_TIMEOUT_MS = 15_000;
export const DEFAULT_ROOM_ID = 'presence';

type PresenceEvent = {
  event: string;
  payload?: unknown;
};

type PresenceHeartbeatPayload = {
  countryId?: string;
  threadId?: string;
};

type QueueEventPayload = {
  threadId?: string;
  countryId?: string;
};

export function handlePresenceConnection(
  socket: ServerWebSocket,
  rawRoomId?: string | null,
) {
  const roomId = resolveRoomId(rawRoomId);
  registerConnection(roomId, socket);
}

function resolveRoomId(roomId?: string | null) {
  if (typeof roomId === 'string' && roomId.trim().length > 0) {
    return roomId.trim();
  }

  return DEFAULT_ROOM_ID;
}

function registerConnection(roomId: string, socket: ServerWebSocket) {
  const connectionId = crypto.randomUUID();
  const room = getOrCreateRoom(roomId);

  const connection: PresenceConnection = {
    socket,
    countryId: null,
    lastHeartbeat: Date.now(),
    heartbeatTimer: null,
  };

  room.set(connectionId, connection);

  const heartbeatTimer = setInterval(() => {
    if (Date.now() - connection.lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
      safeClose(socket, 4000, 'Heartbeat timeout');
    }
  }, HEARTBEAT_INTERVAL_MS);

  connection.heartbeatTimer = heartbeatTimer;

  attachMessageHandler(socket, (raw) => {
    const message = safeParseMessage(raw);
    if (!message) {
      return;
    }

    switch (message.event) {
      case 'presence:heartbeat':
        handleHeartbeat(roomId, connectionId, connection, message.payload);
        break;
      case 'queue:request':
        handleQueueRequestMessage(roomId, connection, message.payload);
        break;
      case 'queue:recognize':
        handleQueueRecognizeMessage(roomId, connection, message.payload);
        break;
      case 'queue:skip':
        handleQueueSkipMessage(roomId, connection, message.payload);
        break;
      default:
        break;
    }
  });

  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    clearIntervalIfNeeded(connection.heartbeatTimer);
    connection.heartbeatTimer = null;
    const roomState = rooms.get(roomId);
    if (!roomState || !roomState.has(connectionId)) {
      return;
    }

    deleteConnection(roomId, connectionId);
    broadcastPresence(roomId);
  };

  attachEventHandler(socket, 'close', cleanup);
  attachEventHandler(socket, 'error', cleanup);
}

function attachEventHandler(
  socket: ServerWebSocket,
  event: 'close' | 'error',
  handler: (...args: unknown[]) => void,
) {
  const candidate = socket as unknown as {
    addEventListener?: (type: string, listener: (...args: unknown[]) => void) => void;
    removeEventListener?: (type: string, listener: (...args: unknown[]) => void) => void;
    on?: (type: string, listener: (...args: unknown[]) => void) => void;
  };

  if (typeof candidate.addEventListener === 'function') {
    candidate.addEventListener(event, handler);
    return;
  }

  if (typeof candidate.on === 'function') {
    candidate.on(event, handler);
  }
}

function attachMessageHandler(socket: ServerWebSocket, handler: (raw: string) => void) {
  const candidate = socket as unknown as {
    addEventListener?: (type: string, listener: (event: MessageEvent) => void) => void;
    on?: (type: string, listener: (...args: unknown[]) => void) => void;
  };

  if (typeof candidate.addEventListener === 'function') {
    candidate.addEventListener('message', (event: MessageEvent) => {
      const raw = typeof event.data === 'string' ? event.data : null;
      if (raw) {
        handler(raw);
      }
    });
    return;
  }

  if (typeof candidate.on === 'function') {
    candidate.on('message', (data: RawData) => {
      const normalized = normalizeRawData(data);
      if (normalized) {
        handler(normalized);
      }
    });
  }
}

function normalizeRawData(data: RawData): string | null {
  if (typeof data === 'string') {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString('utf-8');
  }

  if (Array.isArray(data)) {
    return Buffer.concat(
      data.map((item) =>
        item instanceof Buffer
          ? item
          : item instanceof ArrayBuffer
            ? Buffer.from(item)
            : Buffer.from(item as Uint8Array),
      ),
    ).toString('utf-8');
  }

  if (data instanceof Buffer) {
    return data.toString('utf-8');
  }

  return null;
}

function handleHeartbeat(
  roomId: string,
  connectionId: string,
  connection: PresenceConnection,
  payload: unknown,
) {
  if (!payload || typeof payload !== 'object') {
    return;
  }

  const { countryId } = payload as PresenceHeartbeatPayload;
  if (typeof countryId === 'string' && countryId.trim().length > 0) {
    connection.countryId = countryId.trim();
  }

  connection.lastHeartbeat = Date.now();

  const room = rooms.get(roomId);
  if (!room || !room.has(connectionId)) {
    return;
  }

  broadcastPresence(roomId);
}

function handleQueueRequestMessage(
  roomId: string,
  connection: PresenceConnection,
  payload: unknown,
) {
  const { threadId, countryId } = parseQueuePayload(payload);
  const resolvedThreadId = resolveThreadId(roomId, threadId);
  const resolvedCountryId = resolveCountryId(connection, countryId);

  if (!resolvedThreadId || !resolvedCountryId) {
    return;
  }

  try {
    handleQueueRequest(resolvedThreadId, resolvedCountryId);
  } catch (error) {
    console.error('Failed to process queue request message.', error);
  }
}

function handleQueueRecognizeMessage(
  roomId: string,
  connection: PresenceConnection,
  payload: unknown,
) {
  const { threadId, countryId } = parseQueuePayload(payload);
  const resolvedThreadId = resolveThreadId(roomId, threadId);

  if (!resolvedThreadId) {
    return;
  }

  const targetCountry =
    typeof countryId === 'string' && countryId.trim().length > 0
      ? countryId.trim()
      : connection.countryId ?? null;

  try {
    handleQueueRecognize(resolvedThreadId, targetCountry);
  } catch (error) {
    console.error('Failed to process queue recognize message.', error);
  }
}

function handleQueueSkipMessage(
  roomId: string,
  connection: PresenceConnection,
  payload: unknown,
) {
  const { threadId, countryId } = parseQueuePayload(payload);
  const resolvedThreadId = resolveThreadId(roomId, threadId);

  if (!resolvedThreadId) {
    return;
  }

  const targetCountry =
    typeof countryId === 'string' && countryId.trim().length > 0
      ? countryId.trim()
      : connection.countryId ?? null;

  try {
    handleQueueSkip(resolvedThreadId, targetCountry);
  } catch (error) {
    console.error('Failed to process queue skip message.', error);
  }
}

function broadcastPresence(roomId: string) {
  if (!rooms.has(roomId)) {
    return;
  }

  const presentCountries = listPresentCountryIds(roomId);
  const quorum = presentCountries.length;
  const motionsSuspended = quorum < 3;

  broadcastToRoom(roomId, {
    event: 'presence:update',
    payload: {
      presentCountries,
      countryIds: presentCountries,
      presentCount: quorum,
      quorum,
      motionsSuspended,
    },
  });
}

function parseQueuePayload(payload: unknown): QueueEventPayload {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const { threadId, countryId } = payload as QueueEventPayload;
  return {
    threadId: typeof threadId === 'string' ? threadId : undefined,
    countryId: typeof countryId === 'string' ? countryId : undefined,
  };
}

function resolveThreadId(roomId: string, rawThreadId?: string): string | null {
  if (typeof rawThreadId === 'string' && rawThreadId.trim().length > 0) {
    return rawThreadId.trim();
  }

  if (roomId && roomId !== DEFAULT_ROOM_ID) {
    return roomId;
  }

  return null;
}

function resolveCountryId(
  connection: PresenceConnection,
  rawCountryId?: string,
): string | null {
  if (typeof rawCountryId === 'string' && rawCountryId.trim().length > 0) {
    return rawCountryId.trim();
  }

  if (typeof connection.countryId === 'string' && connection.countryId.length > 0) {
    return connection.countryId;
  }

  return null;
}

function safeClose(socket: ServerWebSocket, code: number, reason: string) {
  try {
    socket.close(code, reason);
  } catch (error) {
    console.error('Failed to close WebSocket connection.', error);
  }
}

function clearIntervalIfNeeded(timer: PresenceConnection['heartbeatTimer']) {
  if (timer != null) {
    clearInterval(timer);
  }
}

function safeParseMessage(raw: string): PresenceEvent | null {
  try {
    return JSON.parse(raw) as PresenceEvent;
  } catch (error) {
    console.warn('Received invalid WebSocket payload.', error);
    return null;
  }
}

import { NextRequest } from 'next/server';

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

export const runtime = 'edge';

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

const HEARTBEAT_INTERVAL_MS = 5_000;
const HEARTBEAT_TIMEOUT_MS = 15_000;
const DEFAULT_ROOM_ID = 'presence';

export function GET(request: NextRequest) {
  if (request.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected WebSocket upgrade.', { status: 426 });
  }

  const roomId = request.nextUrl.searchParams.get('room') ?? DEFAULT_ROOM_ID;
  const pair = new WebSocketPair();
  const client = pair[0] as ServerWebSocket;
  const server = pair[1] as ServerWebSocket;

  server.accept?.();
  registerConnection(roomId, server);

  return new Response(null, {
    status: 101,
    webSocket: client,
  } as ResponseInit & { webSocket: ServerWebSocket });
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

  socket.addEventListener('message', (event) => {
    if (typeof event.data !== 'string') {
      return;
    }

    const message = safeParseMessage(event.data);
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

  socket.addEventListener('close', cleanup);
  socket.addEventListener('error', cleanup);
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

import { NextRequest } from 'next/server';

export const runtime = 'edge';

type PresenceEvent = {
  event: string;
  payload?: unknown;
};

type PresenceHeartbeatPayload = {
  countryId: string;
};

type ServerWebSocket = WebSocket & {
  accept?: () => void;
};

type PresenceConnection = {
  socket: ServerWebSocket;
  countryId: string | null;
  lastHeartbeat: number;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
};

type PresenceRoomState = Map<string, PresenceConnection>;

type PresenceRoomsStore = Map<string, PresenceRoomState>;

const HEARTBEAT_INTERVAL_MS = 5_000;
const HEARTBEAT_TIMEOUT_MS = 15_000;
const DEFAULT_ROOM_ID = 'presence';

const globalPresence = globalThis as typeof globalThis & {
  __presenceRoomsStore?: PresenceRoomsStore;
};

const rooms: PresenceRoomsStore =
  globalPresence.__presenceRoomsStore ?? (globalPresence.__presenceRoomsStore = new Map());

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

    if (message.event === 'presence:heartbeat') {
      handleHeartbeat(roomId, connectionId, connection, message.payload);
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
    if (!roomState) {
      return;
    }

    roomState.delete(connectionId);
    if (roomState.size === 0) {
      rooms.delete(roomId);
    }

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
  if (!payload || typeof payload !== 'object' || !('countryId' in payload)) {
    return;
  }

  const { countryId } = payload as PresenceHeartbeatPayload;
  if (typeof countryId !== 'string' || countryId.length === 0) {
    return;
  }

  connection.countryId = countryId;
  connection.lastHeartbeat = Date.now();

  const room = rooms.get(roomId);
  if (!room || !room.has(connectionId)) {
    return;
  }

  broadcastPresence(roomId);
}

function broadcastPresence(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  const countryIds = Array.from(
    new Set(
      Array.from(room.values())
        .map((connection) => connection.countryId)
        .filter((countryId): countryId is string => typeof countryId === 'string' && countryId.length > 0),
    ),
  );

  const payload = JSON.stringify({
    event: 'presence:update',
    payload: {
      countryIds,
    },
  });

  for (const connection of room.values()) {
    safeSend(connection.socket, payload);
  }
}

function getOrCreateRoom(roomId: string): PresenceRoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Map();
    rooms.set(roomId, room);
  }

  return room;
}

function safeSend(socket: ServerWebSocket, data: string) {
  try {
    socket.send(data);
  } catch (error) {
    console.error('Failed to send WebSocket message.', error);
  }
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

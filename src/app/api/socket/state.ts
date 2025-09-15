export type ServerWebSocket = WebSocket & {
  accept?: () => void;
};

export type PresenceConnection = {
  socket: ServerWebSocket;
  countryId: string | null;
  lastHeartbeat: number;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
};

export type PresenceRoomState = Map<string, PresenceConnection>;
export type PresenceRoomsStore = Map<string, PresenceRoomState>;

const globalPresence = globalThis as typeof globalThis & {
  __presenceRoomsStore?: PresenceRoomsStore;
};

export const rooms: PresenceRoomsStore =
  globalPresence.__presenceRoomsStore ?? (globalPresence.__presenceRoomsStore = new Map());

export function getOrCreateRoom(roomId: string): PresenceRoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Map();
    rooms.set(roomId, room);
  }

  return room;
}

export function deleteConnection(roomId: string, connectionId: string) {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  room.delete(connectionId);
  if (room.size === 0) {
    rooms.delete(roomId);
  }
}

export function listPresentCountryIds(roomId: string): string[] {
  const room = rooms.get(roomId);
  if (!room) {
    return [];
  }

  return Array.from(
    new Set(
      Array.from(room.values())
        .map((connection) => connection.countryId)
        .filter((countryId): countryId is string => typeof countryId === 'string' && countryId.length > 0),
    ),
  );
}

export function broadcastToRoom(roomId: string, message: unknown) {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  const payload = typeof message === 'string' ? message : JSON.stringify(message);

  for (const connection of room.values()) {
    try {
      connection.socket.send(payload);
    } catch (error) {
      console.error('Failed to send WebSocket message.', error);
    }
  }
}

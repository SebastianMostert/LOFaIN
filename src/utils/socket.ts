export const DEFAULT_PRESENCE_ROOM = 'presence';
export const DEFAULT_HEARTBEAT_INTERVAL_MS = 7_500;

export type PresenceUpdateHandler = (countryIds: string[]) => void;

export interface PresenceClientOptions {
  countryId: string;
  roomId?: string;
  heartbeatIntervalMs?: number;
  onOpen?: (socket: WebSocket) => void;
  onUpdate?: PresenceUpdateHandler;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

export interface PresenceClientConnection {
  socket: WebSocket;
  sendHeartbeat: () => void;
  updateCountry: (countryId: string) => void;
  disconnect: () => void;
}

export function connectToPresenceSocket(
  options: PresenceClientOptions,
): PresenceClientConnection | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const roomId = options.roomId ?? DEFAULT_PRESENCE_ROOM;
  const heartbeatInterval = options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
  let currentCountryId = options.countryId;

  const url = new URL('/api/socket', window.location.origin);
  url.searchParams.set('room', roomId);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

  const socket = new WebSocket(url);
  let heartbeatTimer: number | null = null;

  const sendHeartbeat = () => {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(
      JSON.stringify({
        event: 'presence:heartbeat',
        payload: {
          countryId: currentCountryId,
        },
      }),
    );
  };

  socket.addEventListener('open', () => {
    sendHeartbeat();
    heartbeatTimer = window.setInterval(sendHeartbeat, heartbeatInterval);
    options.onOpen?.(socket);
  });

  socket.addEventListener('message', (event) => {
    if (typeof event.data !== 'string') {
      return;
    }

    try {
      const message = JSON.parse(event.data) as {
        event?: string;
        payload?: { countryIds?: unknown };
      };

      if (message.event === 'presence:update' && Array.isArray(message.payload?.countryIds)) {
        options.onUpdate?.(message.payload.countryIds.filter(isString));
      }
    } catch (error) {
      console.warn('Failed to parse presence update payload.', error);
    }
  });

  socket.addEventListener('error', (event) => {
    options.onError?.(event);
  });

  socket.addEventListener('close', (event) => {
    if (heartbeatTimer !== null) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    options.onClose?.(event);
  });

  const disconnect = () => {
    if (heartbeatTimer !== null) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  };

  const updateCountry = (countryId: string) => {
    currentCountryId = countryId;
    sendHeartbeat();
  };

  return {
    socket,
    sendHeartbeat,
    updateCountry,
    disconnect,
  };
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

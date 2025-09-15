export const DEFAULT_PRESENCE_ROOM = 'presence';
export const DEFAULT_HEARTBEAT_INTERVAL_MS = 7_500;

export type PresenceUpdatePayload = {
  presentCountries: string[];
  presentCount: number;
  quorum: number;
  motionsSuspended: boolean;
};

export type QueueUpdatePayload = {
  threadId: string;
  queue: string[];
  recognized: string | null;
  updatedAt: number;
};

export type PresenceUpdateHandler = (payload: PresenceUpdatePayload) => void;
export type QueueUpdateHandler = (payload: QueueUpdatePayload) => void;

export interface PresenceClientOptions {
  countryId: string;
  roomId?: string;
  heartbeatIntervalMs?: number;
  onOpen?: (socket: WebSocket) => void;
  onUpdate?: PresenceUpdateHandler;
  onQueueUpdate?: QueueUpdateHandler;
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
        payload?: unknown;
      };

      switch (message.event) {
        case 'presence:update': {
          const payload = parsePresenceUpdate(message.payload);
          if (payload) {
            options.onUpdate?.(payload);
          }
          break;
        }
        case 'queue:update': {
          const payload = parseQueueUpdate(message.payload);
          if (payload) {
            options.onQueueUpdate?.(payload);
          }
          break;
        }
        default:
          break;
      }
    } catch (error) {
      console.warn('Failed to parse WebSocket payload.', error);
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

function parsePresenceUpdate(payload: unknown): PresenceUpdatePayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const raw = payload as Record<string, unknown>;
  const countriesSource = Array.isArray(raw.presentCountries)
    ? raw.presentCountries
    : Array.isArray(raw.countryIds)
      ? raw.countryIds
      : [];

  const presentCountries = countriesSource.filter(isString);
  const presentCount = typeof raw.presentCount === 'number' ? raw.presentCount : presentCountries.length;
  const quorum = typeof raw.quorum === 'number' ? raw.quorum : presentCountries.length;
  const motionsSuspended = typeof raw.motionsSuspended === 'boolean'
    ? raw.motionsSuspended
    : presentCountries.length < 3;

  return {
    presentCountries,
    presentCount,
    quorum,
    motionsSuspended,
  };
}

function parseQueueUpdate(payload: unknown): QueueUpdatePayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const raw = payload as Record<string, unknown>;
  const threadId = typeof raw.threadId === 'string' ? raw.threadId : null;
  if (!threadId) {
    return null;
  }

  const queue = Array.isArray(raw.queue) ? raw.queue.filter(isString) : [];
  const recognized = typeof raw.recognized === 'string' ? raw.recognized : null;
  const updatedAt = typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now();

  return {
    threadId,
    queue,
    recognized,
    updatedAt,
  };
}

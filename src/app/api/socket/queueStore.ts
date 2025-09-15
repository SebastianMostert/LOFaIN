export type QueueEntry = {
  countryId: string;
  requestedAt: number;
};

export type QueueState = {
  threadId: string;
  queue: QueueEntry[];
  recognized: string | null;
  updatedAt: number;
};

type QueueStore = Map<string, QueueState>;

const globalQueue = globalThis as typeof globalThis & {
  __queueStore?: QueueStore;
};

const store: QueueStore = globalQueue.__queueStore ?? (globalQueue.__queueStore = new Map());

export function getQueueState(threadId: string): QueueState {
  const normalizedThreadId = threadId.trim();
  if (!normalizedThreadId) {
    throw new Error('threadId is required to read queue state.');
  }

  let state = store.get(normalizedThreadId);

  if (!state) {
    state = {
      threadId: normalizedThreadId,
      queue: [],
      recognized: null,
      updatedAt: Date.now(),
    };
    store.set(normalizedThreadId, state);
  }

  return state;
}

export function serializeQueueState(state: QueueState) {
  return {
    threadId: state.threadId,
    queue: state.queue.map((entry) => entry.countryId),
    recognized: state.recognized,
    updatedAt: state.updatedAt,
  };
}

export function requestToQueue(threadId: string, countryId: string): QueueState {
  const state = getQueueState(threadId);
  const trimmed = countryId.trim();
  if (!trimmed) {
    return state;
  }

  if (state.recognized === trimmed) {
    return state;
  }

  if (!state.queue.some((entry) => entry.countryId === trimmed)) {
    state.queue.push({ countryId: trimmed, requestedAt: Date.now() });
    state.updatedAt = Date.now();
  }

  return state;
}

export function recognizeFromQueue(threadId: string, countryId?: string | null): QueueState {
  const state = getQueueState(threadId);

  let target: string | null = null;
  if (typeof countryId === 'string' && countryId.trim().length > 0) {
    target = countryId.trim();
  } else if (state.queue.length > 0) {
    const next = state.queue.shift();
    target = next?.countryId ?? null;
  }

  if (target === state.recognized) {
    return state;
  }

  if (target) {
    state.queue = state.queue.filter((entry) => entry.countryId !== target);
    state.recognized = target;
  } else {
    state.recognized = null;
  }

  state.updatedAt = Date.now();
  return state;
}

export function skipFromQueue(threadId: string, countryId?: string | null): QueueState {
  const state = getQueueState(threadId);
  let changed = false;

  if (typeof countryId === 'string' && countryId.trim().length > 0) {
    const trimmed = countryId.trim();
    const originalLength = state.queue.length;
    state.queue = state.queue.filter((entry) => entry.countryId !== trimmed);
    if (state.recognized === trimmed) {
      state.recognized = null;
      changed = true;
    }
    if (state.queue.length !== originalLength) {
      changed = true;
    }
  } else if (state.recognized) {
    state.recognized = null;
    changed = true;
  } else if (state.queue.length > 0) {
    state.queue.shift();
    changed = true;
  }

  if (changed) {
    state.updatedAt = Date.now();
  }

  return state;
}

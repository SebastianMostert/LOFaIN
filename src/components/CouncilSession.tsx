"use client";

import { useEffect, useMemo, useState } from 'react';

import {
  connectToPresenceSocket,
  type PresenceClientConnection,
  type PresenceUpdatePayload,
  type QueueUpdatePayload,
} from '@/utils/socket';

interface CountrySummary {
  id: string;
  name: string;
  code: string | null;
}

interface CouncilSessionProps {
  threadId: string;
  currentCountryId: string | null;
  countries: CountrySummary[];
}

type ActionStatus = 'idle' | 'pending' | 'success' | 'error';

interface ActionState {
  status: ActionStatus;
  message: string | null;
}

const DEFAULT_PRESENCE: PresenceUpdatePayload = {
  presentCountries: [],
  presentCount: 0,
  quorum: 0,
  motionsSuspended: true,
};

const DEFAULT_QUEUE: QueueUpdatePayload = {
  threadId: '',
  queue: [],
  recognized: null,
  updatedAt: Date.now(),
};

export function CouncilSession({ threadId, currentCountryId, countries }: CouncilSessionProps) {
  const [presence, setPresence] = useState<PresenceUpdatePayload>(DEFAULT_PRESENCE);
  const [queueState, setQueueState] = useState<QueueUpdatePayload>({
    ...DEFAULT_QUEUE,
    threadId,
  });
  const [connection, setConnection] = useState<PresenceClientConnection | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>({ status: 'idle', message: null });

  const countryMap = useMemo(() => new Map(countries.map((c) => [c.id, c])), [countries]);

  useEffect(() => {
    const connectionInstance = connectToPresenceSocket({
      roomId: threadId,
      countryId: currentCountryId ?? 'observer',
      onUpdate: (payload) => setPresence(payload),
      onQueueUpdate: (payload) => {
        if (payload.threadId === threadId) {
          setQueueState(payload);
        }
      },
      onError: () => setConnectionError('WebSocket error encountered.'),
      onClose: () => setConnection(null),
    });

    if (!connectionInstance) {
      setConnection(null);
      setConnectionError('Live updates are unavailable in this environment.');
      return;
    }

    setConnection(connectionInstance);
    setConnectionError(null);
    setActionState({ status: 'idle', message: null });

    return () => {
      connectionInstance?.disconnect();
    };
  }, [threadId, currentCountryId]);

  const presentCountries = presence.presentCountries.map((id) => countryMap.get(id)?.name ?? id);
  const queuedCountries = queueState.queue.map((id) => countryMap.get(id)?.name ?? id);
  const recognizedName = queueState.recognized ? countryMap.get(queueState.recognized)?.name ?? queueState.recognized : null;

  const motionsSuspended = presence.motionsSuspended;

  const performQueueAction = async (path: string, payload: Record<string, unknown>, successMessage: string) => {
    setActionState({ status: 'pending', message: null });
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = typeof data?.error === 'string' ? data.error : 'Request failed';
        throw new Error(errorMessage);
      }

      if (data?.queue && typeof data.queue === 'object') {
        const nextQueue = data.queue as Partial<QueueUpdatePayload> & { threadId?: string };
        if (nextQueue.threadId === threadId) {
          setQueueState((prev) => ({
            threadId,
            queue: Array.isArray(nextQueue.queue)
              ? nextQueue.queue.filter((value): value is string => typeof value === 'string')
              : [],
            recognized:
              typeof nextQueue.recognized === 'string'
                ? nextQueue.recognized
                : nextQueue.recognized == null
                  ? null
                  : prev.recognized,
            updatedAt: typeof nextQueue.updatedAt === 'number' ? nextQueue.updatedAt : Date.now(),
          }));
        }
      }

      setActionState({ status: 'success', message: successMessage });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      setActionState({ status: 'error', message });
    }
  };

  const requestToSpeak = async () => {
    if (!currentCountryId) {
      setActionState({ status: 'error', message: 'You must have a country assignment to request the floor.' });
      return;
    }

    await performQueueAction('/api/queue/request', { threadId, countryId: currentCountryId }, 'Requested the floor.');
  };

  const recognizeNext = async () => {
    const nextCountryId = queueState.queue[0] ?? null;
    await performQueueAction('/api/queue/recognize', { threadId, countryId: nextCountryId }, 'Recognized next speaker.');
  };

  const skipCurrent = async () => {
    const target = queueState.recognized ?? queueState.queue[0] ?? null;
    await performQueueAction('/api/queue/skip', { threadId, countryId: target }, 'Skipped current speaker.');
  };

  return (
    <section className="space-y-6">
      <header className="rounded-lg border border-stone-700 bg-stone-900 p-5">
        <h2 className="text-lg font-semibold text-stone-100">Session Presence</h2>
        <p className="mt-2 text-sm text-stone-300">
          Quorum: <span className="font-medium text-stone-100">{presence.quorum}</span> present countries
        </p>
        <p className="mt-1 text-sm text-stone-400">
          {presentCountries.length === 0 ? 'No countries currently connected.' : presentCountries.join(', ')}
        </p>
        {motionsSuspended ? (
          <p className="mt-3 rounded border border-amber-700 bg-amber-900/30 px-3 py-2 text-sm text-amber-100">
            Motions are suspended until at least three countries are present.
          </p>
        ) : (
          <p className="mt-3 rounded border border-emerald-700 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-100">
            Quorum met. Motions may proceed.
          </p>
        )}
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-lg border border-stone-700 bg-stone-900 p-5">
          <h3 className="text-base font-semibold text-stone-100">Speaker Queue</h3>
          <p className="mt-2 text-sm text-stone-400">
            Recognized speaker:{' '}
            {recognizedName ? (
              <span className="font-medium text-stone-100">{recognizedName}</span>
            ) : (
              <span className="italic">None</span>
            )}
          </p>
          <ol className="mt-3 space-y-2 text-sm text-stone-300">
            {queuedCountries.length === 0 && (
              <li className="italic text-stone-500">Queue is currently empty.</li>
            )}
            {queuedCountries.map((name, index) => (
              <li
                key={`${queueState.queue[index]}-${index}`}
                className="rounded border border-stone-700 bg-stone-800/60 px-3 py-2"
              >
                {index + 1}. {name}
              </li>
            ))}
          </ol>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              onClick={requestToSpeak}
              className="rounded border border-stone-600 bg-stone-800 px-3 py-1.5 text-stone-100 hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!currentCountryId || actionState.status === 'pending'}
            >
              Request to speak
            </button>
            <button
              type="button"
              onClick={recognizeNext}
              className="rounded border border-emerald-700 bg-emerald-900/30 px-3 py-1.5 text-emerald-100 hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={queuedCountries.length === 0 || actionState.status === 'pending'}
            >
              Recognize next
            </button>
            <button
              type="button"
              onClick={skipCurrent}
              className="rounded border border-rose-700 bg-rose-900/30 px-3 py-1.5 text-rose-100 hover:bg-rose-900/40 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={(queueState.recognized == null && queueState.queue.length === 0) || actionState.status === 'pending'}
            >
              Skip speaker
            </button>
          </div>

          {actionState.status !== 'idle' && actionState.message && (
            <p
              className={`mt-3 text-sm ${
                actionState.status === 'error'
                  ? 'text-rose-300'
                  : actionState.status === 'success'
                    ? 'text-emerald-300'
                    : 'text-stone-400'
              }`}
            >
              {actionState.message}
            </p>
          )}
        </article>

        <article className="rounded-lg border border-stone-700 bg-stone-900 p-5">
          <h3 className="text-base font-semibold text-stone-100">Motion Panel</h3>
          <p className="mt-2 text-sm text-stone-300">
            Submit motions to the council. Availability depends on quorum.
          </p>
          <button
            type="button"
            className="mt-4 rounded border border-sky-700 bg-sky-900/40 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-900/60 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={motionsSuspended || actionState.status === 'pending'}
          >
            Open motion form
          </button>
          {motionsSuspended && (
            <p className="mt-3 text-sm text-amber-200">
              Motion submission disabled while fewer than three countries are present.
            </p>
          )}
        </article>
      </section>

      {connectionError && (
        <div className="rounded border border-rose-700 bg-rose-900/40 px-4 py-3 text-sm text-rose-100">
          {connectionError}
        </div>
      )}

      <div className="text-xs text-stone-500">
        Connection status:{' '}
        <span className={`font-medium ${connection ? 'text-emerald-300' : 'text-stone-300'}`}>
          {connection ? 'connected' : 'disconnected'}
        </span>
      </div>
    </section>
  );
}

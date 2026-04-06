import type * as Party from "partykit/server";

import {
    type DiscussionChairNotice,
    type DiscussionClientEvent,
    type DiscussionParticipant,
    type DiscussionRoomState,
    type DiscussionServerEvent,
    verifyDiscussionRealtimeAuth,
} from "../src/utils/discussionRealtime";
function getControlSecret() {
    return process.env.DISCUSSION_REALTIME_SECRET ?? process.env.PARTYKIT_SHARED_SECRET ?? "discussion-dev-secret";
}

type StoredState = {
    queuedCountries: DiscussionParticipant[];
    recognizedSpeaker: DiscussionParticipant | null;
    recognizedAt: string | null;
};

type ConnectionState = DiscussionParticipant & {
    canModerate: boolean;
};

const STORAGE_KEY = "discussion-room-state";

export default class Server implements Party.Server {
    static async onBeforeConnect(req: Party.Request) {
        const url = new URL(req.url);
        const auth = await verifyDiscussionRealtimeAuth(url.searchParams.get("auth"));

        if (!auth) {
            return new Response("Unauthorized", { status: 401 });
        }

        if (auth.threadId !== url.pathname.split("/").pop()) {
            return new Response("Thread mismatch", { status: 403 });
        }

        return req;
    }

    readonly options = { hibernate: false };
    private queuedCountries: DiscussionParticipant[] = [];
    private recognizedSpeaker: DiscussionParticipant | null = null;
    private recognizedAt: string | null = null;

    constructor(readonly room: Party.Room) {}

    async onStart() {
        const stored = await this.room.storage.get<StoredState>(STORAGE_KEY);
        if (stored) {
            this.queuedCountries = stored.queuedCountries ?? [];
            this.recognizedSpeaker = stored.recognizedSpeaker ?? null;
            this.recognizedAt = stored.recognizedAt ?? null;
        }
    }

    async onConnect(connection: Party.Connection<ConnectionState>, ctx: Party.ConnectionContext) {
        const url = new URL(ctx.request.url);
        const auth = await verifyDiscussionRealtimeAuth(url.searchParams.get("auth"));

        if (!auth) {
            connection.close(4401, "Unauthorized");
            return;
        }

        connection.setState({
            countryId: auth.countryId,
            countryName: auth.countryName,
            countryCode: auth.countryCode,
            canModerate: auth.canModerate,
        });

        connection.send(JSON.stringify(this.asEvent("snapshot")));
        this.broadcastState();
    }

    onClose() {
        this.broadcastState();
    }

    async onMessage(message: string | ArrayBuffer | ArrayBufferView, sender: Party.Connection<ConnectionState>) {
        if (typeof message !== "string") return;

        const parsed = JSON.parse(message) as DiscussionClientEvent;
        const actor = sender.state;
        if (!actor) return;

        switch (parsed.type) {
            case "queue.request":
                if (!(await this.enqueueSpeaker(actor))) {
                    sender.send(JSON.stringify(this.asEvent("snapshot")));
                }
                break;
            case "queue.recognize":
                if (!this.canModerate(actor, parsed.devOverrideModeration)) {
                    sender.send(JSON.stringify({ type: "error", message: "Chair privileges required" } satisfies DiscussionServerEvent));
                    return;
                }
                if (!(await this.recognizeSpeaker(parsed.countryId))) {
                    sender.send(JSON.stringify(this.asEvent("snapshot")));
                }
                break;
            case "queue.skip":
                if (!this.canModerate(actor, parsed.devOverrideModeration)) {
                    sender.send(JSON.stringify({ type: "error", message: "Chair privileges required" } satisfies DiscussionServerEvent));
                    return;
                }
                if (!(await this.skipSpeaker(parsed.countryId))) {
                    sender.send(JSON.stringify(this.asEvent("snapshot")));
                }
                break;
            case "queue.nudge":
                if (!this.canModerate(actor, parsed.devOverrideModeration)) {
                    sender.send(JSON.stringify({ type: "error", message: "Chair privileges required" } satisfies DiscussionServerEvent));
                    return;
                }
                if (!(await this.nudgeSpeaker(parsed.countryId))) {
                    sender.send(JSON.stringify(this.asEvent("snapshot")));
                }
                break;
            case "queue.stop":
                if (!this.canModerate(actor, parsed.devOverrideModeration)) {
                    sender.send(JSON.stringify({ type: "error", message: "Chair privileges required" } satisfies DiscussionServerEvent));
                    return;
                }
                if (!(await this.stopSpeaker(parsed.countryId))) {
                    sender.send(JSON.stringify(this.asEvent("snapshot")));
                }
                break;
            default:
                sender.send(JSON.stringify({ type: "error", message: "Unsupported event" } satisfies DiscussionServerEvent));
        }
    }

    async onRequest(req: Party.Request) {
        const url = new URL(req.url);

        if (req.method === "GET" && url.pathname.endsWith("/state")) {
            return Response.json(this.snapshot());
        }

        if (req.method === "POST" && url.pathname.endsWith("/events")) {
            if (req.headers.get("x-discussion-secret") !== getControlSecret()) {
                return new Response("Unauthorized", { status: 401 });
            }

            const event = await req.json();
            this.room.broadcast(JSON.stringify(event));
            return Response.json({ ok: true });
        }

        if (req.method === "POST" && url.pathname.endsWith("/actions")) {
            if (req.headers.get("x-discussion-secret") !== getControlSecret()) {
                return new Response("Unauthorized", { status: 401 });
            }

            const body = await req.json() as
                | { type: "queue.request"; actor: ConnectionState }
                | { type: "queue.recognize"; actor: ConnectionState; countryId?: string }
                | { type: "queue.skip"; actor: ConnectionState; countryId?: string }
                | { type: "queue.nudge"; actor: ConnectionState; countryId?: string }
                | { type: "queue.stop"; actor: ConnectionState; countryId?: string };

            switch (body.type) {
                case "queue.request":
                    await this.enqueueSpeaker(body.actor);
                    break;
                case "queue.recognize":
                    if (!body.actor.canModerate) return new Response("Forbidden", { status: 403 });
                    await this.recognizeSpeaker(body.countryId);
                    break;
                case "queue.skip":
                    if (!body.actor.canModerate) return new Response("Forbidden", { status: 403 });
                    await this.skipSpeaker(body.countryId);
                    break;
                case "queue.nudge":
                    if (!body.actor.canModerate) return new Response("Forbidden", { status: 403 });
                    await this.nudgeSpeaker(body.countryId);
                    break;
                case "queue.stop":
                    if (!body.actor.canModerate) return new Response("Forbidden", { status: 403 });
                    await this.stopSpeaker(body.countryId);
                    break;
                default:
                    return new Response("Unsupported action", { status: 400 });
            }

            return Response.json(this.snapshot());
        }

        return new Response("Not found", { status: 404 });
    }

    private getPresentCountries() {
        const seen = new Map<string, DiscussionParticipant>();
        for (const connection of this.room.getConnections<ConnectionState>()) {
            if (!connection.state) continue;
            if (!seen.has(connection.state.countryId)) {
                seen.set(connection.state.countryId, {
                    countryId: connection.state.countryId,
                    countryName: connection.state.countryName,
                    countryCode: connection.state.countryCode,
                });
            }
        }

        return [...seen.values()].sort((left, right) => left.countryName.localeCompare(right.countryName));
    }

    private snapshot(): DiscussionRoomState {
        return {
            presentCountries: this.getPresentCountries(),
            queuedCountries: this.queuedCountries,
            recognizedSpeaker: this.recognizedSpeaker,
            recognizedAt: this.recognizedAt,
        };
    }

    private canModerate(actor: ConnectionState, devOverrideModeration?: boolean) {
        return actor.canModerate || (process.env.NODE_ENV !== "production" && devOverrideModeration === true);
    }

    private asEvent(type: "snapshot" | "state"): DiscussionServerEvent {
        return { type, ...this.snapshot() };
    }

    private async persistState() {
        await this.room.storage.put(STORAGE_KEY, {
            queuedCountries: this.queuedCountries,
            recognizedSpeaker: this.recognizedSpeaker,
            recognizedAt: this.recognizedAt,
        } satisfies StoredState);
    }

    private broadcastState() {
        this.room.broadcast(JSON.stringify(this.asEvent("state")));
    }

    private broadcastNotice(notice: DiscussionChairNotice) {
        this.room.broadcast(JSON.stringify({
            type: "chair.notice",
            notice,
        } satisfies DiscussionServerEvent));
    }

    private async enqueueSpeaker(actor: DiscussionParticipant) {
        const alreadyQueued = this.queuedCountries.some((entry) => entry.countryId === actor.countryId);
        const alreadyRecognized = this.recognizedSpeaker?.countryId === actor.countryId;
        if (alreadyQueued || alreadyRecognized) return false;

        this.queuedCountries = [...this.queuedCountries, actor];
        await this.persistState();
        this.broadcastState();
        return true;
    }

    private async recognizeSpeaker(countryId?: string) {
        if (countryId) {
            const match = this.queuedCountries.find((entry) => entry.countryId === countryId);
            if (!match) return false;
            this.recognizedSpeaker = match;
            this.queuedCountries = this.queuedCountries.filter((entry) => entry.countryId !== countryId);
        } else {
            const [next, ...rest] = this.queuedCountries;
            if (!next) return false;
            this.recognizedSpeaker = next;
            this.queuedCountries = rest;
        }

        this.recognizedAt = new Date().toISOString();
        await this.persistState();
        this.broadcastState();
        return true;
    }

    private async skipSpeaker(countryId?: string) {
        if (countryId) {
            const hadRecognized = this.recognizedSpeaker?.countryId === countryId;
            const hadQueued = this.queuedCountries.some((entry) => entry.countryId === countryId);
            if (!hadRecognized && !hadQueued) return false;
            if (this.recognizedSpeaker?.countryId === countryId) {
                this.recognizedSpeaker = null;
                this.recognizedAt = null;
            }
            this.queuedCountries = this.queuedCountries.filter((entry) => entry.countryId !== countryId);
        } else if (this.recognizedSpeaker) {
            this.recognizedSpeaker = null;
            this.recognizedAt = null;
        } else {
            if (this.queuedCountries.length === 0) return false;
            this.queuedCountries = this.queuedCountries.slice(1);
        }

        await this.persistState();
        this.broadcastState();
        return true;
    }

    private async nudgeSpeaker(countryId?: string) {
        if (!this.recognizedSpeaker) return false;
        if (countryId && this.recognizedSpeaker.countryId !== countryId) return false;

        this.broadcastNotice({
            action: "NUDGE_SPEAKER",
            target: this.recognizedSpeaker,
            issuedAt: new Date().toISOString(),
        });
        return true;
    }

    private async stopSpeaker(countryId?: string) {
        if (!this.recognizedSpeaker) return false;
        if (countryId && this.recognizedSpeaker.countryId !== countryId) return false;

        const stoppedSpeaker = this.recognizedSpeaker;
        this.recognizedSpeaker = null;
        this.recognizedAt = null;

        await this.persistState();
        this.broadcastState();
        this.broadcastNotice({
            action: "STOP_SPEAKER",
            target: stoppedSpeaker,
            issuedAt: new Date().toISOString(),
        });
        return true;
    }
}

Server satisfies Party.Worker;

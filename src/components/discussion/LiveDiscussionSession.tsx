"use client";

import PartySocket from "partysocket";
import { useEffect, useRef, useState } from "react";

import FlagImage from "@/components/FlagImage";
import { CouncilSessionUI } from "@/components/CouncilSession";
import { SPEAKER_RECOGNITION_MS } from "@/constants/discussion";
import { getPartyKitHost, getPartyKitPartyName } from "@/utils/partykit";
import type { DiscussionParticipant, DiscussionPostPayload, DiscussionServerEvent } from "@/utils/discussionRealtime";
import TimeDisplay from "../Vote/TimeDisplay";

type Props = {
    threadId: string;
    authToken: string;
    currentCountryId: string | null;
    quorumRequired: number;
    initialPosts: DiscussionPostPayload[];
    initialPresentCountries: DiscussionParticipant[];
    initialQueuedCountries: DiscussionParticipant[];
    initialRecognizedSpeaker: DiscussionParticipant | null;
    canModerate: boolean;
};

const DEV_OVERRIDE_STORAGE_KEY = "discussion-dev-overrides";

function upsertPost(posts: DiscussionPostPayload[], post: DiscussionPostPayload) {
    const next = posts.filter((entry) => entry.id !== post.id);
    next.push(post);
    next.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
    return next;
}

export default function LiveDiscussionSession({
    threadId,
    authToken,
    currentCountryId,
    quorumRequired,
    initialPosts,
    initialPresentCountries,
    initialQueuedCountries,
    initialRecognizedSpeaker,
    canModerate,
}: Props) {
    const socketRef = useRef<PartySocket | null>(null);
    const [connected, setConnected] = useState(false);
    const [presentCountries, setPresentCountries] = useState(initialPresentCountries);
    const [queuedCountries, setQueuedCountries] = useState(initialQueuedCountries);
    const [recognizedSpeaker, setRecognizedSpeaker] = useState(initialRecognizedSpeaker);
    const [recognizedAt, setRecognizedAt] = useState<string | null>(null);
    const [posts, setPosts] = useState(initialPosts);
    const [body, setBody] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pendingAction, setPendingAction] = useState<"request" | "moderate" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [devChairPowers, setDevChairPowers] = useState(false);
    const [assumeDebateQuorum, setAssumeDebateQuorum] = useState(false);
    const [assumeVotingQuorum, setAssumeVotingQuorum] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(DEV_OVERRIDE_STORAGE_KEY);
            if (!stored) return;

            const parsed = JSON.parse(stored) as {
                devChairPowers?: boolean;
                assumeDebateQuorum?: boolean;
                assumeVotingQuorum?: boolean;
            };

            setDevChairPowers(Boolean(parsed.devChairPowers));
            setAssumeDebateQuorum(Boolean(parsed.assumeDebateQuorum));
            setAssumeVotingQuorum(Boolean(parsed.assumeVotingQuorum));
        } catch {
            window.localStorage.removeItem(DEV_OVERRIDE_STORAGE_KEY);
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem(DEV_OVERRIDE_STORAGE_KEY, JSON.stringify({
            devChairPowers,
            assumeDebateQuorum,
            assumeVotingQuorum,
        }));
    }, [assumeDebateQuorum, assumeVotingQuorum, devChairPowers]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        const socket = new PartySocket({
            host: getPartyKitHost(),
            party: getPartyKitPartyName(),
            room: threadId,
            query: async () => ({ auth: authToken }),
        });

        socketRef.current = socket;

        const handleOpen = () => {
            setConnected(true);
            setError(null);
        };
        const handleClose = () => setConnected(false);
        const handleMessage = (event: MessageEvent) => {
            const payload = JSON.parse(event.data) as DiscussionServerEvent;

            switch (payload.type) {
                case "snapshot":
                case "state":
                    setPresentCountries(payload.presentCountries);
                    setQueuedCountries(payload.queuedCountries);
                    setRecognizedSpeaker(payload.recognizedSpeaker);
                    setRecognizedAt(payload.recognizedAt);
                    setPendingAction(null);
                    break;
                case "post.created":
                case "post.updated":
                    setPosts((current) => upsertPost(current, payload.post));
                    break;
                case "post.deleted":
                    setPosts((current) => current.map((post) => (
                        post.id === payload.postId
                            ? { ...post, isDeleted: true, body: "" }
                            : post
                    )));
                    break;
                case "error":
                    setError(payload.message);
                    setPendingAction(null);
                    break;
            }
        };

        socket.addEventListener("open", handleOpen);
        socket.addEventListener("close", handleClose);
        socket.addEventListener("message", handleMessage);

        return () => {
            socket.removeEventListener("open", handleOpen);
            socket.removeEventListener("close", handleClose);
            socket.removeEventListener("message", handleMessage);
            socket.close();
        };
    }, [authToken, threadId]);

    async function submitPost() {
        if (!body.trim() || isSubmitting) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch(`/api/discussions/${encodeURIComponent(threadId)}/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: body.trim() }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                setError(payload?.error ?? "Failed to post message");
                return;
            }

            if (payload?.post) {
                setPosts((current) => upsertPost(current, payload.post as DiscussionPostPayload));
            }
            setBody("");
        } finally {
            setIsSubmitting(false);
        }
    }

    function sendQueueEvent(payload: { type: "queue.request" } | { type: "queue.recognize"; countryId?: string } | { type: "queue.skip"; countryId?: string }) {
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            setError("Realtime connection is not ready");
            return;
        }

        const needsDevOverride = !canModerate && devChairPowers && payload.type !== "queue.request";
        setPendingAction(payload.type === "queue.request" ? "request" : "moderate");
        setError(null);
        socket.send(JSON.stringify(
            needsDevOverride
                ? { ...payload, devOverrideModeration: true }
                : payload,
        ));
    }

    const effectiveCanModerate = canModerate || devChairPowers;
    const showDevTools = process.env.NODE_ENV !== "production";
    const parsedRecognizedAt = recognizedAt ? Date.parse(recognizedAt) : Number.NaN;
    const recognitionEndsAt = Number.isNaN(parsedRecognizedAt) ? null : parsedRecognizedAt + SPEAKER_RECOGNITION_MS;
    const recognitionRemainingMs = recognitionEndsAt ? recognitionEndsAt - now : 0;
    const recognitionIsOvertime = Boolean(recognizedSpeaker && recognitionRemainingMs < 0);
    const recognitionCountdownLabel = recognizedSpeaker
        ? `${recognitionRemainingMs < 0 ? "-" : ""}${Math.floor(Math.abs(recognitionRemainingMs) / 60_000)
            .toString()
            .padStart(1, "0")}:${Math.floor((Math.abs(recognitionRemainingMs) % 60_000) / 1000)
                .toString()
                .padStart(2, "0")}`
        : null;
    const isCurrentCountryRecognized = Boolean(
        currentCountryId
        && recognizedSpeaker
        && recognizedSpeaker.countryId === currentCountryId,
    );

    return (
        <div className="space-y-8">
            <CouncilSessionUI
                recognizedName={recognizedSpeaker?.countryName ?? null}
                recognitionCountdownLabel={recognitionCountdownLabel}
                recognitionIsOvertime={recognitionIsOvertime}
                queuedCountries={queuedCountries.map((country) => country.countryName)}
                connected={connected}
                statusMessage={error}
                statusTone={error ? "error" : connected ? "success" : "info"}
                requestToSpeakDisabled={!connected || pendingAction === "request"}
                moderateDisabled={!connected || pendingAction === "moderate"}
                canModerate={effectiveCanModerate}
                onRequestToSpeak={() => sendQueueEvent({ type: "queue.request" })}
                onRecognizeNext={() => sendQueueEvent({ type: "queue.recognize" })}
                onSkipSpeaker={() => sendQueueEvent({ type: "queue.skip" })}
            />

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <article className="rounded-3xl border border-stone-700 bg-stone-900 p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-stone-100">Debate Record</h2>
                            <p className="mt-1 text-sm text-stone-400">Persisted remarks with live updates from the chamber.</p>
                        </div>
                        <div className="text-xs text-stone-500">{posts.length} posts</div>
                    </div>

                    <div className="mt-5 space-y-3">
                        {posts.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-stone-700 bg-stone-950/50 p-6 text-sm text-stone-400">
                                No interventions have been recorded yet.
                            </div>
                        )}
                        {posts.map((post) => (
                            <article key={post.id} className="rounded-2xl border border-stone-800 bg-stone-950/50 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="relative h-10 w-14 overflow-hidden rounded-md border border-stone-700 bg-stone-900">
                                        <FlagImage
                                            src={`/flags/${(post.authorCountry?.code ?? "unknown").toLowerCase()}.svg`}
                                            alt={post.authorCountry?.name ?? "Unknown flag"}
                                            sizes="56px"
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                            <span className="font-semibold text-stone-100">{post.authorCountry?.name ?? "Unknown country"}</span>
                                            {post.authorUser?.name && <span className="text-stone-400">by {post.authorUser.name}</span>}
                                            <span className="text-xs text-stone-500">{new Date(post.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-300">
                                            {post.isDeleted ? <span className="italic text-stone-500">This intervention was withdrawn.</span> : post.body}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </article>

                <aside className="space-y-6">
                    <section className="rounded-3xl border border-stone-700 bg-stone-900 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-stone-100">New Intervention</h2>
                                <p className="mt-1 text-sm text-stone-400">Submit a written statement to the debate record.</p>
                            </div>
                            {isCurrentCountryRecognized && recognitionCountdownLabel && (
                                <div className={`rounded-2xl border px-4 py-3 text-right ${recognitionIsOvertime ? "border-rose-500/70 bg-rose-950/35" : "border-amber-500/60 bg-amber-950/30"}`}>
                                    <div className="text-xs uppercase tracking-[0.18em] text-amber-200/80">Your Time</div>
                                    <TimeDisplay recognitionCountdownLabel={recognitionCountdownLabel} recognitionIsOvertime={recognitionIsOvertime} />
                                </div>
                            )}
                        </div>
                        <textarea
                            value={body}
                            onChange={(event) => setBody(event.target.value)}
                            rows={8}
                            className="mt-4 w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-stone-100"
                            placeholder="State your position, proposed edits, or procedural point."
                        />
                        <button
                            type="button"
                            onClick={submitPost}
                            disabled={isSubmitting || !body.trim()}
                            className="mt-4 rounded-full border border-stone-200 bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? "Submitting..." : "Submit statement"}
                        </button>
                    </section>

                    {showDevTools && (
                        <section className="rounded-3xl border border-amber-700/60 bg-amber-950/20 p-5">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-amber-100">Dev Tools</h2>
                                    <p className="mt-1 text-sm text-amber-200/80">Local testing overrides for this browser session.</p>
                                </div>
                                <span className="rounded-full border border-amber-700/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                                    Local
                                </span>
                            </div>

                            <div className="mt-5 space-y-3">
                                <label className="flex items-start justify-between gap-4 rounded-2xl border border-amber-700/40 bg-stone-950/40 px-4 py-3">
                                    <div>
                                        <div className="text-sm font-medium text-stone-100">Give chair powers</div>
                                        <div className="mt-1 text-xs text-stone-400">Enables recognize and skip controls without being the live chair.</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={devChairPowers}
                                        onChange={(event) => setDevChairPowers(event.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-stone-600 bg-stone-900 text-amber-400"
                                    />
                                </label>

                                <label className="flex items-start justify-between gap-4 rounded-2xl border border-amber-700/40 bg-stone-950/40 px-4 py-3">
                                    <div>
                                        <div className="text-sm font-medium text-stone-100">Assume debate quorum</div>
                                        <div className="mt-1 text-xs text-stone-400">Forces the debate state to treat quorum as met even if presence is low.</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={assumeDebateQuorum}
                                        onChange={(event) => setAssumeDebateQuorum(event.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-stone-600 bg-stone-900 text-amber-400"
                                    />
                                </label>

                                <label className="flex items-start justify-between gap-4 rounded-2xl border border-amber-700/40 bg-stone-950/40 px-4 py-3">
                                    <div>
                                        <div className="text-sm font-medium text-stone-100">Assume voting quorum</div>
                                        <div className="mt-1 text-xs text-stone-400">Marks vote quorum as satisfied for local UI testing on linked flows.</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={assumeVotingQuorum}
                                        onChange={(event) => setAssumeVotingQuorum(event.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-stone-600 bg-stone-900 text-amber-400"
                                    />
                                </label>
                            </div>

                            <p className="mt-4 text-xs text-amber-200/80">
                                Present now: {presentCountries.length}/{quorumRequired}.
                                {" "}
                                Debate quorum: {assumeDebateQuorum ? "assumed" : "live presence"}.
                                {" "}
                                Voting quorum: {assumeVotingQuorum ? "assumed" : "live rules"}.
                            </p>
                        </section>
                    )}
                </aside>
            </section>
            <style jsx>{`
                @keyframes overtimeBlink {
                    0%,
                    49.999% {
                        opacity: 1;
                    }

                    50%,
                    100% {
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
}

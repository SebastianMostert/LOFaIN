"use client";

import Link from "next/link";
import PartySocket from "partysocket";
import { useCallback, useEffect, useRef, useState } from "react";

import FlagImage from "@/components/FlagImage";
import { CouncilSessionUI } from "@/components/CouncilSession";
import { SPEAKER_RECOGNITION_MS } from "@/constants/discussion";
import { getPartyKitHost, getPartyKitPartyName } from "@/utils/partykit";
import type {
    DiscussionChairNotice,
    DiscussionPostPayload,
    DiscussionServerEvent,
} from "@/utils/discussionRealtime";
import TimeDisplay from "../Vote/TimeDisplay";
import {
    DEV_OVERRIDE_STORAGE_KEY,
    DISCUSSION_DRAFT_STORAGE_KEY,
    PROPOSABLE_MOTIONS,
    PROPOSABLE_POINTS,
    STOP_SPEAKER_LOCK_MS,
    SUBMITTABLE_MOTION_TYPES,
} from "./liveDiscussionConfig";
import type { LiveDiscussionSessionProps, MotionItem, RecordItem } from "./liveDiscussionTypes";
import {
    applyPostEffectsFromMotion,
    applyThreadEffectsFromMotion,
    getResolvedMotionSummary,
    groupRecordItems,
    upsertMotion,
    upsertPost,
    upsertSystemEntry,
} from "./liveDiscussionUtils";

export default function LiveDiscussionSession({
    threadId,
    authToken,
    currentCountryId,
    quorumRequired,
    presidingStateName,
    presidingNote,
    proposal,
    initialPosts,
    availableCountries,
    initialSystemEntries,
    initialPresentCountries,
    initialQueuedCountries,
    initialRecognizedSpeaker,
    initialRecognizedAt,
    initialThreadState,
    initialMotions,
    canModerate,
}: LiveDiscussionSessionProps) {
    const socketRef = useRef<PartySocket | null>(null);
    const recordScrollRef = useRef<HTMLDivElement | null>(null);
    const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "reconnecting">("connecting");
    const [presentCountries, setPresentCountries] = useState(initialPresentCountries);
    const [queuedCountries, setQueuedCountries] = useState(initialQueuedCountries);
    const [recognizedSpeaker, setRecognizedSpeaker] = useState(initialRecognizedSpeaker);
    const [recognizedAt, setRecognizedAt] = useState<string | null>(initialRecognizedAt);
    const [posts, setPosts] = useState(initialPosts);
    const [systemEntries, setSystemEntries] = useState(initialSystemEntries);
    const [threadState, setThreadState] = useState(initialThreadState);
    const [motions, setMotions] = useState(initialMotions);
    const [body, setBody] = useState("");
    const [isMotionModalOpen, setIsMotionModalOpen] = useState(false);
    const [isPointModalOpen, setIsPointModalOpen] = useState(false);
    const [selectedMotionType, setSelectedMotionType] = useState<(typeof PROPOSABLE_MOTIONS)[number]["type"]>("LOCK_THREAD");
    const [motionRationale, setMotionRationale] = useState("");
    const [motionTargetPost, setMotionTargetPost] = useState("");
    const [motionTargetCountry, setMotionTargetCountry] = useState("");
    const [selectedPointType, setSelectedPointType] = useState<(typeof PROPOSABLE_POINTS)[number]["type"]>("PERSONAL_PRIVILEGE");
    const [pointNote, setPointNote] = useState("");
    const [chairActionNote, setChairActionNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmittingMotion, setIsSubmittingMotion] = useState(false);
    const [activeMotionId, setActiveMotionId] = useState<string | null>(null);
    const [isApplyingChairAction, setIsApplyingChairAction] = useState(false);
    const [isChairPanelOpen, setIsChairPanelOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<"request" | "moderate" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [motionError, setMotionError] = useState<string | null>(null);
    const [chairActionError, setChairActionError] = useState<string | null>(null);
    const [chairNotice, setChairNotice] = useState<DiscussionChairNotice | null>(null);
    const [devChairPowers, setDevChairPowers] = useState(false);
    const [assumeDebateQuorum, setAssumeDebateQuorum] = useState(false);
    const [assumeVotingQuorum, setAssumeVotingQuorum] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const [speakerStopLockUntil, setSpeakerStopLockUntil] = useState<number | null>(null);
    const [showSystemEntries, setShowSystemEntries] = useState(true);
    const [unseenRecordCount, setUnseenRecordCount] = useState(0);
    const [isFollowingLive, setIsFollowingLive] = useState(true);
    const handledStopNoticeRef = useRef<string | null>(null);
    const previousRecordCountRef = useRef(initialPosts.length + initialSystemEntries.length);

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
        const draftKey = `${DISCUSSION_DRAFT_STORAGE_KEY}:${threadId}`;

        try {
            const storedDraft = window.localStorage.getItem(draftKey);
            if (storedDraft) {
                setBody(storedDraft);
            }
        } catch {
            window.localStorage.removeItem(draftKey);
        }
    }, [threadId]);

    useEffect(() => {
        const draftKey = `${DISCUSSION_DRAFT_STORAGE_KEY}:${threadId}`;
        try {
            if (body.trim()) {
                window.localStorage.setItem(draftKey, body);
            } else {
                window.localStorage.removeItem(draftKey);
            }
        } catch {
            window.localStorage.removeItem(draftKey);
        }
    }, [body, threadId]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!isMotionModalOpen && !isPointModalOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isMotionModalOpen, isPointModalOpen]);

    useEffect(() => {
        const socket = new PartySocket({
            host: getPartyKitHost(),
            party: getPartyKitPartyName(),
            room: threadId,
            query: async () => ({ auth: authToken }),
        });

        socketRef.current = socket;

        const handleOpen = () => {
            setConnectionState("connected");
            setError(null);
        };
        const handleClose = () => {
            setConnectionState((current) => current === "connected" ? "reconnecting" : "connecting");
        };
        const handleMessage = (event: MessageEvent) => {
            const payload = JSON.parse(event.data) as DiscussionServerEvent;

            switch (payload.type) {
                case "snapshot":
                case "state":
                    setPresentCountries(payload.presentCountries);
                    setQueuedCountries(payload.queuedCountries);
                    setRecognizedSpeaker(payload.recognizedSpeaker);
                    setRecognizedAt(payload.recognizedAt);
                    setError(null);
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
                case "chair.notice":
                    setError(null);
                    setChairNotice(payload.notice);
                    setPendingAction(null);
                    break;
                case "chair.log":
                    setSystemEntries((current) => upsertSystemEntry(current, payload.entry));
                    break;
                case "thread.updated":
                    setThreadState(payload.thread);
                    if (payload.thread.debatePhase !== "FORMAL_DEBATE") {
                        setIsMotionModalOpen(false);
                        setIsPointModalOpen(false);
                    }
                    break;
                case "motion.created":
                case "motion.updated":
                    applyMotionUpdate(payload.motion);
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
        await submitPostBody(body);
    }

    const submitPostBody = useCallback(async (nextBody: string) => {
        if (!nextBody.trim() || isSubmitting) return false;

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch(`/api/discussions/${encodeURIComponent(threadId)}/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: nextBody.trim() }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                setError(payload?.error ?? "Failed to post message");
                return false;
            }

            if (payload?.post) {
                setPosts((current) => upsertPost(current, payload.post as DiscussionPostPayload));
            }
            setBody("");
            try {
                window.localStorage.removeItem(`${DISCUSSION_DRAFT_STORAGE_KEY}:${threadId}`);
            } catch {
                window.localStorage.removeItem(`${DISCUSSION_DRAFT_STORAGE_KEY}:${threadId}`);
            }
            return true;
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting, threadId]);

    async function submitChairAction(path: "recognize" | "skip" | "nudge" | "stop", countryId?: string) {
        setPendingAction("moderate");
        setError(null);

        try {
            const response = await fetch(`/api/queue/${path}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    threadId,
                    countryId: countryId ?? null,
                    devOverrideModeration: devChairPowers && !canModerate,
                }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                setError(payload?.error ?? "Chair action failed");
                setPendingAction(null);
            }
        } catch {
            setError("Chair action failed");
            setPendingAction(null);
        }
    }

    async function submitQueueRequest() {
        if (!currentCountryId) {
            setError("No country assigned");
            return;
        }

        setPendingAction("request");
        setError(null);

        try {
            const response = await fetch("/api/queue/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    threadId,
                    countryId: currentCountryId,
                }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                setError(payload?.error ?? "Unable to join the waiting floor");
                setPendingAction(null);
            }
        } catch {
            setError("Unable to join the waiting floor");
            setPendingAction(null);
        }
    }

    function sendQueueEvent(
        payload:
        | { type: "queue.request" }
        | { type: "queue.recognize"; countryId?: string }
        | { type: "queue.skip"; countryId?: string }
        | { type: "queue.nudge"; countryId?: string }
        | { type: "queue.stop"; countryId?: string },
    ) {
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
    const currentCountryNotice = chairNotice && currentCountryId === chairNotice.target.countryId ? chairNotice : null;
    const speakerInputLocked = speakerStopLockUntil !== null && speakerStopLockUntil > now;
    const connected = connectionState === "connected";
    const connectionStatusMessage = !error
        ? connectionState === "reconnecting"
            ? "Reconnecting to chamber..."
            : connectionState === "connecting"
                ? "Connecting to chamber..."
                : null
        : null;
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
    const isCurrentCountryQueued = Boolean(
        currentCountryId
        && queuedCountries.some((country) => country.countryId === currentCountryId),
    );
    const isFormalDebate = threadState.debatePhase === "FORMAL_DEBATE";
    const debateQuorumMet = assumeDebateQuorum || presentCountries.length >= quorumRequired;
    const chairModerationEnabled = effectiveCanModerate && debateQuorumMet;
    const chairActionsBlockedByQuorum = !debateQuorumMet;
    const requestToSpeakDisabled = !connected
        || !isFormalDebate
        || threadState.isLocked
        || threadState.isArchived
        || pendingAction === "request"
        || isCurrentCountryQueued
        || isCurrentCountryRecognized;
    const showRecognizeNext = effectiveCanModerate && !recognizedSpeaker && queuedCountries.length > 0;
    const showNudgeSpeaker = effectiveCanModerate && Boolean(recognizedSpeaker);
    const showStopSpeaker = effectiveCanModerate && Boolean(recognizedSpeaker);
    const showSkipWaiting = effectiveCanModerate && queuedCountries.length > 0;
    const rawRecordItems: RecordItem[] = [
        ...posts.map((post) => ({ type: "post" as const, createdAt: post.createdAt, id: post.id, post })),
        ...systemEntries.map((entry) => ({ type: "system" as const, createdAt: entry.createdAt, id: entry.id, entry })),
        ...motions.map((motion) => ({ type: "motion" as const, createdAt: motion.createdAt, id: motion.chatMessageId, motion })),
    ].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
    const visibleRecordItems = showSystemEntries ? rawRecordItems : rawRecordItems.filter((item) => item.type !== "system");
    const groupedRecordItems = groupRecordItems(visibleRecordItems);
    const submitDisabledReason = speakerInputLocked
        ? "The chair removed your delegation from the floor. Writing reopens in a few seconds."
        : threadState.isArchived
            ? "This debate has been archived."
            : threadState.isLocked
                ? "The meeting is suspended."
        : !connected
            ? "Reconnect to the chamber before submitting."
            : !body.trim()
                ? "Write a statement before submitting."
                : null;
    const requestToSpeakReason = isCurrentCountryRecognized
        ? "Your delegation already has the floor."
        : isCurrentCountryQueued
            ? "Your delegation is already waiting in the queue."
            : !isFormalDebate
                ? "The chamber is in informal caucus."
            : threadState.isArchived
                ? "This debate has been archived."
                : threadState.isLocked
                    ? "The meeting is suspended."
            : !connected
                ? "Reconnect to request the floor."
                : null;
    const selectedMotion = PROPOSABLE_MOTIONS.find((motion) => motion.type === selectedMotionType) ?? PROPOSABLE_MOTIONS[0];
    const selectedPoint = PROPOSABLE_POINTS.find((point) => point.type === selectedPointType) ?? PROPOSABLE_POINTS[0];
    const selectedTargetPost = motionTargetPost
        ? initialPosts.find((post) => post.id === motionTargetPost) ?? null
        : null;
    const selectedTargetCountry = motionTargetCountry
        ? availableCountries.find((country) => country.id === motionTargetCountry) ?? null
        : null;
    const motionSupported = SUBMITTABLE_MOTION_TYPES.includes(selectedMotion.type);
    const motionNeedsPostSelection = selectedMotion.needsPost && !motionTargetPost;
    const motionNeedsCountrySelection = selectedMotion.needsCountry && !motionTargetCountry;
    const motionSubmitDisabled = !currentCountryId
        || !isFormalDebate
        || isSubmittingMotion
        || !motionSupported
        || motionNeedsPostSelection
        || motionNeedsCountrySelection;
    const hasManageableMotion = motions.some((motion) => motion.status === "PROPOSED" || motion.status === "VOTING");
    function applyMotionUpdate(motion: MotionItem) {
        setMotions((current) => upsertMotion(current, motion));
        setThreadState((current) => applyThreadEffectsFromMotion(current, motion));
        setPosts((current) => applyPostEffectsFromMotion(current, motion));
    }

    useEffect(() => {
        if (isFormalDebate) return;
        setIsMotionModalOpen(false);
        setIsPointModalOpen(false);
    }, [isFormalDebate]);

    useEffect(() => {
        if (!currentCountryNotice || currentCountryNotice.action !== "STOP_SPEAKER") return;

        const noticeKey = `${currentCountryNotice.target.countryId}:${currentCountryNotice.issuedAt}`;
        if (handledStopNoticeRef.current === noticeKey) return;
        handledStopNoticeRef.current = noticeKey;

        setSpeakerStopLockUntil(Date.parse(currentCountryNotice.issuedAt) + STOP_SPEAKER_LOCK_MS);

        if (body.trim() && !isSubmitting) {
            void submitPostBody(body);
        }
    }, [body, currentCountryNotice, isSubmitting, submitPostBody]);

    const scrollRecordToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
        const container = recordScrollRef.current;
        if (!container) return;
        container.scrollTo({ top: container.scrollHeight, behavior });
    }, []);

    const isRecordNearBottom = useCallback(() => {
        const container = recordScrollRef.current;
        if (!container) return true;
        return container.scrollHeight - container.scrollTop - container.clientHeight < 96;
    }, []);

    useEffect(() => {
        const container = recordScrollRef.current;
        if (!container) return;

        const handleScroll = () => {
            const nearBottom = isRecordNearBottom();
            setIsFollowingLive(nearBottom);
            if (nearBottom) {
                setUnseenRecordCount(0);
            }
        };

        container.addEventListener("scroll", handleScroll);
        return () => container.removeEventListener("scroll", handleScroll);
    }, [isRecordNearBottom]);

    useEffect(() => {
        const nextCount = rawRecordItems.length;
        const previousCount = previousRecordCountRef.current;

        if (nextCount <= previousCount) {
            previousRecordCountRef.current = nextCount;
            return;
        }

        if (isRecordNearBottom()) {
            window.requestAnimationFrame(() => scrollRecordToBottom(previousCount === 0 ? "auto" : "smooth"));
            setUnseenRecordCount(0);
            setIsFollowingLive(true);
        } else {
            setUnseenRecordCount((current) => current + (nextCount - previousCount));
            setIsFollowingLive(false);
        }

        previousRecordCountRef.current = nextCount;
    }, [isRecordNearBottom, rawRecordItems.length, scrollRecordToBottom]);

    function renderPostBody(post: DiscussionPostPayload) {
        if (post.isDeleted) {
            return <span className="italic text-stone-500">This intervention was withdrawn.</span>;
        }

        return <div className="whitespace-pre-wrap text-sm leading-relaxed text-stone-300">{post.body}</div>;
    }

    async function submitMotion() {
        if (motionSubmitDisabled) return;

        setIsSubmittingMotion(true);
        setMotionError(null);

        try {
            const response = await fetch("/api/motions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: selectedMotion.type,
                    title: selectedMotion.title,
                    rationale: motionRationale.trim() || undefined,
                    targetPostId: motionTargetPost.trim() || undefined,
                    targetCountryId: motionTargetCountry.trim() || undefined,
                    targetThreadId: threadId,
                }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                setMotionError(payload?.error ?? "Failed to create motion");
                return;
            }

            const created = payload?.motion as MotionItem | undefined;
            if (created) {
                applyMotionUpdate(created);
            }

            setMotionRationale("");
            setMotionTargetPost("");
            setMotionTargetCountry("");
            setIsMotionModalOpen(false);
        } catch {
            setMotionError("Failed to create motion");
        } finally {
            setIsSubmittingMotion(false);
        }
    }

    async function updateMotion(motionId: string, path: "second" | "withdraw", bodyPayload: Record<string, unknown>) {
        setActiveMotionId(motionId);
        setMotionError(null);

        try {
            const response = await fetch(`/api/motions/${encodeURIComponent(motionId)}/${path}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyPayload),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                setMotionError(payload?.error ?? "Motion action failed");
                return;
            }

            const updatedMotion = payload?.motion as MotionItem | undefined;
            if (!updatedMotion) return;

            applyMotionUpdate(updatedMotion);
        } catch {
            setMotionError("Motion action failed");
        } finally {
            setActiveMotionId(null);
        }
    }

    async function denyMotion(motionId: string) {
        setActiveMotionId(motionId);
        setMotionError(null);

        try {
            const response = await fetch("/api/chair/rule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    motionId,
                    outcome: "FAILED",
                    note: chairActionNote.trim() || undefined,
                }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                setMotionError(payload?.error ?? "Failed to rule on motion");
                return;
            }

            const updatedMotion = payload?.motion as MotionItem | undefined;
            if (updatedMotion) {
                applyMotionUpdate(updatedMotion);
            }
        } catch {
            setMotionError("Failed to deny motion");
        } finally {
            setActiveMotionId(null);
        }
    }

    const finalizeMotion = useCallback(async (motionId: string) => {
        setActiveMotionId(motionId);

        try {
            const response = await fetch(`/api/motions/${encodeURIComponent(motionId)}/finalize`, {
                method: "POST",
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                return;
            }

            const updatedMotion = payload?.motion as MotionItem | undefined;
            if (updatedMotion) {
                applyMotionUpdate(updatedMotion);
            }
        } catch {
            // Ignore background finalization failures; a later refresh or action will retry.
        } finally {
            setActiveMotionId((current) => current === motionId ? null : current);
        }
    }, []);

    useEffect(() => {
        const pendingMotion = motions.find((motion) => (
            (motion.status === "PROPOSED" && motion.expiresAt && Date.parse(motion.expiresAt) > Date.now())
            || (motion.status === "VOTING" && motion.autoPassAt && Date.parse(motion.autoPassAt) > Date.now())
        ));

        const dueAt = pendingMotion?.status === "PROPOSED" ? pendingMotion.expiresAt : pendingMotion?.autoPassAt;
        if (!pendingMotion || !dueAt) {
            return;
        }

        const timeout = window.setTimeout(() => {
            void finalizeMotion(pendingMotion.id);
        }, Math.max(0, Date.parse(dueAt) - Date.now()));

        return () => window.clearTimeout(timeout);
    }, [finalizeMotion, motions]);

    async function applyEmergencyChairAction(
        action: "OPEN_DEBATE" | "CLOSE_DEBATE" | "LOCK_THREAD" | "UNLOCK_THREAD" | "PIN_THREAD" | "UNPIN_THREAD" | "ARCHIVE_THREAD",
        archived?: boolean,
    ) {
        setIsApplyingChairAction(true);
        setChairActionError(null);

        try {
            const response = await fetch("/api/chair/emergency", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    threadId,
                    archived,
                    note: chairActionNote.trim() || undefined,
                }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                setChairActionError(payload?.error ?? "Chair action failed");
                return;
            }

            setThreadState((current) => {
                if (action === "OPEN_DEBATE") return { ...current, debatePhase: "FORMAL_DEBATE" };
                if (action === "CLOSE_DEBATE") return { ...current, debatePhase: "INFORMAL_CAUCUS" };
                if (action === "LOCK_THREAD") return { ...current, isLocked: true };
                if (action === "UNLOCK_THREAD") return { ...current, isLocked: false };
                if (action === "PIN_THREAD") return { ...current, isPinned: true };
                if (action === "UNPIN_THREAD") return { ...current, isPinned: false };
                if (action === "ARCHIVE_THREAD") return { ...current, isArchived: archived ?? true };
                return current;
            });
        } catch {
            setChairActionError("Chair action failed");
        } finally {
            setIsApplyingChairAction(false);
        }
    }

    return (
        <div className="space-y-8">
            {effectiveCanModerate && (
                <div className={`pointer-events-none fixed left-0 top-24 z-40 max-w-[calc(100vw-3rem)] transition-transform duration-300 ${isChairPanelOpen ? "translate-x-0" : "-translate-x-full"}`}>
                    <aside
                        className="pointer-events-auto relative mt-6 w-[min(22rem,calc(100vw-3rem))] rounded-r-3xl border border-l-0 border-stone-700 bg-[linear-gradient(180deg,rgba(28,25,23,0.98),rgba(12,10,9,0.98))] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.45)]"
                    >
                        <button
                            type="button"
                            onClick={() => setIsChairPanelOpen((current) => !current)}
                            className="absolute left-full top-8 rounded-r-xl border border-l-0 border-stone-700 bg-stone-950/95 px-2 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-200 shadow-[0_18px_50px_rgba(0,0,0,0.35)] transition hover:border-stone-500 hover:text-stone-100 [writing-mode:vertical-rl]"
                        >
                            Chair Actions
                        </button>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-stone-100">Chair Actions</h2>
                                <p className="mt-1 text-sm text-stone-400">Immediate presiding interventions on this thread.</p>
                            </div>
                            <span className="rounded-full border border-stone-700 bg-stone-950/60 px-3 py-1 text-[11px] text-stone-300">
                                {hasManageableMotion ? "Active motions" : "Direct controls"}
                            </span>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2 text-xs text-stone-300">
                            <span className={`rounded-full border px-2.5 py-1 ${isFormalDebate ? "border-emerald-700/50 bg-emerald-950/30 text-emerald-100" : "border-sky-700/50 bg-sky-950/30 text-sky-100"}`}>
                                {isFormalDebate ? "Formal debate open" : "Informal caucus"}
                            </span>
                            <span className={`rounded-full border px-2.5 py-1 ${threadState.isLocked ? "border-amber-700/50 bg-amber-950/30 text-amber-100" : "border-stone-700 bg-stone-950/60"}`}>
                                {threadState.isLocked ? "Thread locked" : "Thread open"}
                            </span>
                            <span className={`rounded-full border px-2.5 py-1 ${threadState.isPinned ? "border-sky-700/50 bg-sky-950/30 text-sky-100" : "border-stone-700 bg-stone-950/60"}`}>
                                {threadState.isPinned ? "Pinned" : "Not pinned"}
                            </span>
                            <span className={`rounded-full border px-2.5 py-1 ${threadState.isArchived ? "border-rose-700/50 bg-rose-950/30 text-rose-100" : "border-stone-700 bg-stone-950/60"}`}>
                                {threadState.isArchived ? "Archived" : "Active"}
                            </span>
                        </div>

                        <textarea
                            value={chairActionNote}
                            onChange={(event) => setChairActionNote(event.target.value)}
                            rows={4}
                            className="mt-4 w-full rounded-2xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
                            placeholder="Optional note for rulings or emergency actions"
                        />
                        {chairActionError && (
                            <div className="mt-3 rounded-2xl border border-rose-700/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-100">
                                {chairActionError}
                            </div>
                        )}

                        <div className="mt-4 grid gap-2">
                            <button
                                type="button"
                                onClick={() => void applyEmergencyChairAction(isFormalDebate ? "CLOSE_DEBATE" : "OPEN_DEBATE")}
                                disabled={isApplyingChairAction || chairActionsBlockedByQuorum}
                                className="rounded-2xl border border-stone-700 bg-stone-950/70 px-4 py-2 text-left text-sm text-stone-100 hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isFormalDebate ? "Return to informal caucus" : "Open formal debate"}
                            </button>
                            {chairActionsBlockedByQuorum && (
                                <div className="rounded-2xl border border-amber-700/50 bg-amber-950/25 px-4 py-2 text-sm text-amber-100">
                                    While debate quorum has not been reached, chair actions cannot be performed.
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => void applyEmergencyChairAction(threadState.isLocked ? "UNLOCK_THREAD" : "LOCK_THREAD")}
                                disabled={isApplyingChairAction || chairActionsBlockedByQuorum}
                                className="rounded-2xl border border-stone-700 bg-stone-950/70 px-4 py-2 text-left text-sm text-stone-100 hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {threadState.isLocked ? "Unlock thread immediately" : "Lock thread immediately"}
                            </button>
                            <button
                                type="button"
                                onClick={() => void applyEmergencyChairAction(threadState.isPinned ? "UNPIN_THREAD" : "PIN_THREAD")}
                                disabled={isApplyingChairAction || chairActionsBlockedByQuorum}
                                className="rounded-2xl border border-stone-700 bg-stone-950/70 px-4 py-2 text-left text-sm text-stone-100 hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {threadState.isPinned ? "Unpin thread immediately" : "Pin thread immediately"}
                            </button>
                            <button
                                type="button"
                                onClick={() => void applyEmergencyChairAction("ARCHIVE_THREAD", !threadState.isArchived)}
                                disabled={isApplyingChairAction || chairActionsBlockedByQuorum}
                                className="rounded-2xl border border-stone-700 bg-stone-950/70 px-4 py-2 text-left text-sm text-stone-100 hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {threadState.isArchived ? "Restore archived thread" : "Archive thread immediately"}
                            </button>
                        </div>
                    </aside>
                </div>
            )}
            <section className="grid gap-6 xl:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.05fr)]">
                <aside className="xl:sticky xl:top-32 xl:self-start">
                    <article className="rounded-3xl border border-amber-700/50 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_32%),linear-gradient(180deg,_rgba(28,25,23,0.96),_rgba(12,10,9,0.98))] p-3.5">
                        <div className="flex flex-wrap items-start justify-between gap-2.5">
                            <div>
                                <div className="text-xs uppercase tracking-[0.28em] text-amber-200/80">Proposal On Floor</div>
                                <h2 className="mt-1 text-lg font-semibold text-stone-50">{proposal.title}</h2>
                            </div>
                            <span className="rounded-full border border-amber-700/40 bg-stone-950/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100">
                                {proposal.op}
                            </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-300">
                            <a href="#proposal-proposed-text" className="rounded-full border border-stone-700 bg-stone-950/60 px-2.5 py-1 hover:border-stone-500 hover:text-stone-100">
                                Proposed text
                            </a>
                            <Link href="/debate-rules" className="rounded-full border border-stone-700 bg-stone-950/60 px-2.5 py-1 hover:border-stone-500 hover:text-stone-100">
                                Debate rules
                            </Link>
                            {proposal.currentBody && proposal.op === "EDIT" && (
                                <a href="#proposal-current-text" className="rounded-full border border-stone-700 bg-stone-950/60 px-2.5 py-1 hover:border-stone-500 hover:text-stone-100">
                                    Current text
                                </a>
                            )}
                            {proposal.targetArticleHeading && (
                                <span className="rounded-full border border-stone-700 bg-stone-950/60 px-2.5 py-1">
                                    Target: {proposal.targetArticleHeading}
                                </span>
                            )}
                            <span className="rounded-full border border-stone-700 bg-stone-950/60 px-2.5 py-1">
                                Presiding state: {presidingStateName}
                            </span>
                            <span className="rounded-full border border-stone-700 bg-stone-950/60 px-2.5 py-1">
                                Debate quorum: {quorumRequired} delegations
                            </span>
                        </div>

                        {presidingNote && (
                            <div className="mt-2.5 rounded-2xl border border-sky-700/60 bg-sky-950/30 px-2.5 py-2 text-sm text-sky-100">
                                {presidingNote}
                            </div>
                        )}

                        {proposal.rationale && (
                            <div id="proposal-rationale" className="mt-2.5 scroll-mt-32 rounded-2xl border border-stone-800 bg-stone-950/55 p-2.5">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Rationale</div>
                                <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-300">{proposal.rationale}</div>
                            </div>
                        )}

                        {proposal.proposedHeading && (
                            <div id="proposal-proposed-text" className="mt-3 scroll-mt-32">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Proposed Text</div>
                                <div className="mt-1 text-[15px] font-semibold text-stone-100">{proposal.proposedHeading}</div>
                            </div>
                        )}

                        <div id="proposal-proposed-text" className="mt-2.5 scroll-mt-32 rounded-2xl border border-amber-700/30 bg-stone-950/65 p-2.5">
                            {proposal.proposedBody ? (
                                <div className="whitespace-pre-wrap text-sm leading-relaxed text-stone-200">{proposal.proposedBody}</div>
                            ) : proposal.op === "REMOVE" ? (
                                <div className="text-sm text-rose-200">This proposal removes the targeted article from the treaty.</div>
                            ) : (
                                <div className="text-sm italic text-stone-500">No proposed body text was provided.</div>
                            )}
                        </div>

                        {proposal.currentBody && proposal.op === "EDIT" && (
                            <div id="proposal-current-text" className="mt-3 scroll-mt-32 rounded-2xl border border-stone-800 bg-stone-950/45 p-2.5">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Current Text</div>
                                <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-400">{proposal.currentBody}</div>
                            </div>
                        )}
                    </article>
                </aside>

                <div className="space-y-6">
                    {isFormalDebate ? (
                        <CouncilSessionUI
                            recognizedName={recognizedSpeaker?.countryName ?? null}
                            recognitionCountdownLabel={recognitionCountdownLabel}
                            recognitionIsOvertime={recognitionIsOvertime}
                            queuedCountries={queuedCountries.map((country) => country.countryName)}
                            presentCountries={presentCountries.map((country) => country.countryName)}
                            quorumLabel={String(quorumRequired)}
                            connected={connected}
                            statusMessage={error ?? (effectiveCanModerate && chairActionsBlockedByQuorum ? "Chair actions are unavailable until debate quorum is restored." : connectionStatusMessage)}
                            statusTone={error ? "error" : effectiveCanModerate && chairActionsBlockedByQuorum ? "info" : connected ? "success" : "info"}
                            moderateDisabled={!connected || pendingAction === "moderate" || chairActionsBlockedByQuorum}
                            canModerate={effectiveCanModerate}
                            showRecognizeNext={showRecognizeNext}
                            showNudgeSpeaker={showNudgeSpeaker}
                            showStopSpeaker={showStopSpeaker}
                            showSkipWaiting={showSkipWaiting}
                            onRequestToSpeak={() => (
                                currentCountryId
                                    ? void submitQueueRequest()
                                    : sendQueueEvent({ type: "queue.request" })
                            )}
                            onRecognizeNext={() => (
                                chairModerationEnabled
                                    ? void submitChairAction("recognize")
                                    : sendQueueEvent({ type: "queue.recognize" })
                            )}
                            onNudgeSpeaker={() => (
                                chairModerationEnabled
                                    ? void submitChairAction("nudge", recognizedSpeaker?.countryId)
                                    : sendQueueEvent({ type: "queue.nudge", countryId: recognizedSpeaker?.countryId })
                            )}
                            onStopSpeaker={() => (
                                chairModerationEnabled
                                    ? void submitChairAction("stop", recognizedSpeaker?.countryId)
                                    : sendQueueEvent({ type: "queue.stop", countryId: recognizedSpeaker?.countryId })
                            )}
                            onSkipSpeaker={() => (
                                chairModerationEnabled
                                    ? void submitChairAction("skip")
                                    : sendQueueEvent({ type: "queue.skip" })
                            )}
                        />
                    ) : (
                        <section className="rounded-3xl border border-sky-700/40 bg-sky-950/20 p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-sky-100">Informal Caucus</h2>
                                    <p className="mt-1 text-sm text-sky-100/80">
                                        The chair must open formal debate before the speakers list, motions, and points become available.
                                    </p>
                                </div>
                                <span className="rounded-full border border-sky-700/50 bg-sky-950/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-100">
                                    Speakers list closed
                                </span>
                            </div>
                        </section>
                    )}
                    <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl border border-stone-700 bg-stone-900 p-5 xl:h-[calc(100vh-8.5rem)]">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-stone-100">Debate Chat</h2>
                                <p className="mt-1 text-sm text-stone-400">Live chamber record and written interventions in one thread.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${isFollowingLive ? "border-emerald-700/50 bg-emerald-950/30 text-emerald-200" : "border-stone-700 bg-stone-950/60 text-stone-400"}`}>
                                    {isFollowingLive ? "Following live" : "Scrolled up"}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowSystemEntries((current) => !current)}
                                    className="rounded-full border border-stone-700 bg-stone-950/60 px-3 py-1 text-[11px] font-medium text-stone-300 hover:border-stone-500 hover:text-stone-100"
                                >
                                    {showSystemEntries ? "Hide actions" : "Show actions"}
                                </button>
                                {!isFollowingLive && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            scrollRecordToBottom("smooth");
                                            setUnseenRecordCount(0);
                                            setIsFollowingLive(true);
                                        }}
                                        className="rounded-full border border-amber-700/50 bg-amber-950/30 px-3 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-950/45"
                                    >
                                        Jump to present
                                    </button>
                                )}
                                <div className="text-xs text-stone-500">{visibleRecordItems.length} entries</div>
                            </div>
                        </div>

                        <div ref={recordScrollRef} className="record-scroll mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 scroll-pb-40">
                            {groupedRecordItems.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-stone-700 bg-stone-950/50 p-6 text-sm text-stone-400">
                                    No interventions have been recorded yet.
                                </div>
                            )}
                            {groupedRecordItems.map((item) => (
                            item.type === "system" ? (
                                <details
                                    key={item.id}
                                    id={`record-${item.id}`}
                                    className="group px-1 py-0.5 text-stone-500"
                                >
                                    <summary
                                        title={item.entry.details.join("\n")}
                                        className="flex cursor-pointer list-none items-center gap-3 text-[11px] font-thin tracking-[0.04em] text-stone-500 marker:content-none"
                                    >
                                        <span className="h-px flex-1 bg-stone-800" />
                                        <span className="whitespace-nowrap">{item.entry.label}</span>
                                        <span className="h-px flex-1 bg-stone-800" />
                                    </summary>
                                        <div className="mt-2 rounded-xl border border-stone-800 bg-stone-950/70 px-3 py-2 text-[11px] tracking-[0.02em] text-stone-400">
                                            <div className="mt-1 space-y-1">
                                                {item.entry.details.map((detail, index) => (
                                                    <div key={`${item.id}-detail-${index}`}>{detail}</div>
                                                ))}
                                            </div>
                                        </div>
                                    </details>
                            ) : item.type === "system-group" ? (
                                <details
                                    key={item.id}
                                    id={`record-${item.id}`}
                                    className="group px-1 py-0.5 text-stone-500"
                                >
                                    <summary className="flex cursor-pointer list-none items-center gap-3 text-[11px] font-thin tracking-[0.04em] text-stone-500 marker:content-none">
                                        <span className="h-px flex-1 bg-stone-800" />
                                        <span className="whitespace-nowrap">
                                            {item.entries.length} {item.entries.length === 1 ? "action" : "actions"} recorded
                                        </span>
                                        <span className="text-[10px] text-stone-600">
                                            {new Date(item.entries[item.entries.length - 1]?.createdAt ?? item.createdAt).toLocaleTimeString()}
                                        </span>
                                        <span className="h-px flex-1 bg-stone-800" />
                                    </summary>
                                    <div className="mt-2 rounded-xl border border-stone-800 bg-stone-950/70 px-3 py-2">
                                        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-stone-500">
                                            Procedure updates
                                        </div>
                                        <div className="space-y-2">
                                        {item.entries.map((entry) => (
                                            <details key={entry.id} className="group px-1 py-0.5 text-stone-500">
                                                <summary
                                                    title={entry.details.join("\n")}
                                                    className="flex cursor-pointer list-none items-center gap-3 text-[11px] font-thin tracking-[0.04em] text-stone-500 marker:content-none"
                                                >
                                                    <span className="h-px flex-1 bg-stone-800" />
                                                    <span className="whitespace-nowrap">{entry.label}</span>
                                                    <span className="text-[10px] text-stone-600">{new Date(entry.createdAt).toLocaleTimeString()}</span>
                                                    <span className="h-px flex-1 bg-stone-800" />
                                                </summary>
                                                <div className="mt-2 rounded-xl border border-stone-800 bg-stone-950/70 px-3 py-2 text-[11px] tracking-[0.02em] text-stone-400">
                                                    <div className="space-y-1">
                                                        {entry.details.map((detail, index) => (
                                                            <div key={`${entry.id}-detail-${index}`}>{detail}</div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </details>
                                        ))}
                                        </div>
                                    </div>
                                </details>
                            ) : item.type === "motion" ? (
                                item.motion.status === "PROPOSED" || item.motion.status === "VOTING" ? (
                                <article id={`record-${item.id}`} key={item.id} className="scroll-mt-32 select-text rounded-2xl border border-amber-700/40 bg-[linear-gradient(180deg,rgba(68,64,60,0.42),rgba(28,25,23,0.72))] p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80">Motion on the Floor</div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-semibold text-stone-100">{item.motion.title}</span>
                                                <span className="rounded-full border border-amber-700/50 bg-amber-950/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-amber-100">
                                                    {item.motion.statusLabel}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-xs text-stone-500">
                                                Proposed by {item.motion.proposerName ?? "Unknown delegation"} at {new Date(item.motion.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                        {item.motion.secondedAt && (
                                            <div className="text-right text-xs text-stone-400">
                                                <div>Seconded by {item.motion.seconderName ?? "Unknown delegation"}</div>
                                                <div>{new Date(item.motion.secondedAt).toLocaleTimeString()}</div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-3 select-text rounded-2xl border border-amber-700/20 bg-stone-950/55 px-4 py-3 text-sm leading-relaxed text-stone-200">
                                        {item.motion.formalWording}
                                    </div>

                                    {item.motion.resolutionNote && (
                                        <div className="mt-3 rounded-2xl border border-stone-800 bg-stone-950/55 px-4 py-3 text-sm text-stone-300">
                                            {item.motion.resolutionNote}
                                        </div>
                                    )}

                                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                        {item.motion.status === "PROPOSED" && (
                                            <button
                                                type="button"
                                                onClick={() => void updateMotion(item.motion.id, "second", {})}
                                                disabled={!currentCountryId || currentCountryId === item.motion.proposerId || effectiveCanModerate || activeMotionId === item.motion.id}
                                                className="rounded-full border border-amber-700/50 bg-amber-950/30 px-3 py-1.5 text-amber-100 hover:bg-amber-950/45 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                Second
                                            </button>
                                        )}
                                        {chairModerationEnabled && (item.motion.status === "PROPOSED" || item.motion.status === "VOTING") && (
                                            <button
                                                type="button"
                                                onClick={() => void denyMotion(item.motion.id)}
                                                disabled={activeMotionId === item.motion.id || chairActionsBlockedByQuorum}
                                                className="rounded-full border border-rose-700/50 bg-rose-950/30 px-3 py-1.5 text-rose-100 hover:bg-rose-950/45 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                Deny
                                            </button>
                                        )}
                                        {item.motion.status === "PROPOSED" && item.motion.expiresAt && (
                                            <span className="rounded-full border border-stone-700 bg-stone-950/55 px-3 py-1.5 text-stone-300">
                                                Lapses automatically at {new Date(item.motion.expiresAt).toLocaleTimeString()} if not seconded
                                            </span>
                                        )}
                                        {item.motion.status === "VOTING" && item.motion.autoPassAt && (
                                            <span className="rounded-full border border-stone-700 bg-stone-950/55 px-3 py-1.5 text-stone-300">
                                                Passes automatically at {new Date(item.motion.autoPassAt).toLocaleTimeString()} unless denied by chair
                                            </span>
                                        )}
                                    </div>
                                </article>
                                ) : (
                                <div
                                    key={item.id}
                                    id={`record-${item.id}`}
                                    className="group select-text px-1 py-0.5 text-stone-500"
                                >
                                    <div className="flex items-center gap-3 text-[11px] font-thin tracking-[0.04em] text-stone-500">
                                        <span className="h-px flex-1 bg-stone-800" />
                                        <span className="select-text whitespace-nowrap">{getResolvedMotionSummary(item.motion)}</span>
                                        <span className="text-[10px] text-stone-600">{new Date(item.motion.closedAt ?? item.motion.createdAt).toLocaleTimeString()}</span>
                                        <span className="h-px flex-1 bg-stone-800" />
                                    </div>
                                </div>
                                )
                            ) : (
                                <article id={`record-${item.id}`} key={item.id} className="scroll-mt-32 rounded-2xl border border-stone-800 bg-stone-950/50 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="relative h-10 w-14 overflow-hidden rounded-md border border-stone-700 bg-stone-900">
                                            <FlagImage
                                                src={`/flags/${(item.posts[0].authorCountry?.code ?? "unknown").toLowerCase()}.svg`}
                                                alt={item.posts[0].authorCountry?.name ?? "Unknown flag"}
                                                sizes="56px"
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                                <span className="font-semibold text-stone-100">{item.posts[0].authorCountry?.name ?? "Unknown country"}</span>
                                                {item.posts[0].authorUser?.name && <span className="text-stone-400">by {item.posts[0].authorUser.name}</span>}
                                                <span className="text-xs text-stone-500">{new Date(item.posts[0].createdAt).toLocaleString()}</span>
                                            </div>
                                            <div className="mt-2 space-y-2">
                                                {item.posts.map((post, index) => (
                                                    <div
                                                        key={post.id}
                                                        className={index === 0 ? "" : "border-t border-stone-800/80 pt-2"}
                                                    >
                                                        {index > 0 && (
                                                            <div className="mb-1 text-[11px] text-stone-500">{new Date(post.createdAt).toLocaleTimeString()}</div>
                                                        )}
                                                        <div>
                                                            {renderPostBody(post)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </article>
                                )
                            ))}
                        </div>

                        {unseenRecordCount > 0 && (
                            <div className="mt-3 flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        scrollRecordToBottom("smooth");
                                        setUnseenRecordCount(0);
                                        setIsFollowingLive(true);
                                    }}
                                    className="rounded-full border border-amber-700/50 bg-amber-950/30 px-4 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-950/45"
                                >
                                    Jump to present
                                    {" "}
                                    <span className="text-amber-200/80">({unseenRecordCount} new)</span>
                                </button>
                            </div>
                        )}

                        <div className="sticky bottom-0 mt-5 border-t border-stone-800 bg-[linear-gradient(180deg,rgba(28,25,23,0.88),rgba(28,25,23,0.98))] pt-4 backdrop-blur">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="text-xs text-stone-500">
                                {submitDisabledReason ?? (!isFormalDebate ? "Informal caucus is open. The speakers list, motions, and points are hidden until the chair opens debate." : requestToSpeakReason ?? "Cmd/Ctrl + Enter submits your statement.")}
                            </div>
                            <div className="flex flex-wrap items-start justify-end gap-3">
                            {isCurrentCountryRecognized && recognitionCountdownLabel && (
                                <div className={`rounded-2xl border px-4 py-3 text-right ${recognitionIsOvertime ? "border-rose-500/70 bg-rose-950/35" : "border-amber-500/60 bg-amber-950/30"}`}>
                                    <div className="text-xs uppercase tracking-[0.18em] text-amber-200/80">Your Time</div>
                                    <TimeDisplay recognitionCountdownLabel={recognitionCountdownLabel} recognitionIsOvertime={recognitionIsOvertime} />
                                </div>
                            )}
                        </div>
                        </div>
                        {currentCountryNotice?.action === "NUDGE_SPEAKER" && (
                            <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                                "border-amber-500/60 bg-amber-950/30 text-amber-100"
                            }`}>
                                The chair has instructed your delegation to conclude remarks.
                            </div>
                        )}
                        <textarea
                            value={body}
                            onChange={(event) => setBody(event.target.value)}
                            onKeyDown={(event) => {
                                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                                    event.preventDefault();
                                    void submitPost();
                                }
                            }}
                            rows={8}
                            disabled={speakerInputLocked || isSubmitting}
                            className="mt-4 w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-stone-100"
                            placeholder={speakerInputLocked
                                ? "The chair has removed your delegation from the floor. Writing reopens shortly."
                                : "State your position, proposed edits, or procedural point."}
                        />
                        <button
                            type="button"
                            onClick={submitPost}
                            disabled={Boolean(submitDisabledReason) || isSubmitting}
                            className="mt-4 rounded-full border border-stone-200 bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? "Submitting..." : "Submit statement"}
                        </button>
                        {isFormalDebate && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => (
                                        currentCountryId
                                            ? void submitQueueRequest()
                                            : sendQueueEvent({ type: "queue.request" })
                                    )}
                                    disabled={requestToSpeakDisabled}
                                    className="mt-4 ml-3 rounded-full border border-stone-600 bg-stone-800 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-stone-500 hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Request to speak
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsMotionModalOpen(true)}
                                    className="mt-4 ml-3 rounded-full border border-stone-600 bg-stone-800 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-stone-500 hover:bg-stone-700"
                                >
                                    Raise motion
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsPointModalOpen(true)}
                                    className="mt-4 ml-3 rounded-full border border-stone-600 bg-stone-800 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-stone-500 hover:bg-stone-700"
                                >
                                    Raise point
                                </button>
                            </>
                        )}
                        </div>
                    </section>
                </div>
            </section>

            {isFormalDebate && isMotionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 px-4 py-8 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-3xl border border-stone-700 bg-stone-900 p-5 shadow-2xl">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-stone-100">Raise Motion</h2>
                                <p className="mt-1 text-sm text-stone-400">Select a motion template and review its generated wording.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsMotionModalOpen(false)}
                                className="rounded-full border border-stone-700 bg-stone-950/60 px-3 py-1 text-sm text-stone-300 hover:border-stone-500 hover:text-stone-100"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-5 rounded-2xl border border-stone-800 bg-stone-950/55 p-4">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Propose Motion</div>
                            <select
                                value={selectedMotionType}
                                onChange={(event) => setSelectedMotionType(event.target.value as (typeof PROPOSABLE_MOTIONS)[number]["type"])}
                                className="mt-3 w-full rounded-2xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
                            >
                                {PROPOSABLE_MOTIONS.map((motion) => (
                                    <option key={motion.type} value={motion.type}>
                                        {motion.title}
                                    </option>
                                ))}
                            </select>
                            <textarea
                                value={motionRationale}
                                onChange={(event) => setMotionRationale(event.target.value)}
                                rows={3}
                                className="mt-3 w-full rounded-2xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
                                placeholder={selectedMotion.notePlaceholder}
                            />
                            {selectedMotion.needsPost && (
                                <select
                                    value={motionTargetPost}
                                    onChange={(event) => setMotionTargetPost(event.target.value)}
                                    className="mt-3 w-full rounded-2xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
                                >
                                    <option value="">Select statement</option>
                                    {initialPosts.map((post) => (
                                        <option key={post.id} value={post.id}>
                                            {(post.authorCountry?.name ?? "Unknown delegation")} - {new Date(post.createdAt).toLocaleTimeString()}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {selectedMotion.needsCountry && (
                                <select
                                    value={motionTargetCountry}
                                    onChange={(event) => setMotionTargetCountry(event.target.value)}
                                    className="mt-3 w-full rounded-2xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
                                >
                                    <option value="">Select delegation</option>
                                    {availableCountries.map((country) => (
                                        <option key={country.id} value={country.id}>
                                            {country.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <div className="mt-3 rounded-2xl border border-stone-800 bg-stone-950/40 px-3 py-3 text-sm text-stone-300">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Generated Wording</div>
                                <div className="mt-2 leading-relaxed">
                                    The delegation moves {selectedMotion.title.toLowerCase()}.
                                    {motionRationale.trim() ? ` Note: ${motionRationale.trim()}` : ""}
                                    {selectedMotion.needsPost && selectedTargetPost ? ` Target statement by ${selectedTargetPost.authorCountry?.name ?? "Unknown delegation"} at ${new Date(selectedTargetPost.createdAt).toLocaleTimeString()}.` : ""}
                                    {selectedMotion.needsCountry && selectedTargetCountry ? ` Target delegation: ${selectedTargetCountry.name}.` : ""}
                                </div>
                            </div>
                            {motionError && (
                                <div className="mt-3 rounded-2xl border border-rose-700/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-100">
                                    {motionError}
                                </div>
                            )}
                            <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => void submitMotion()}
                                    disabled={motionSubmitDisabled}
                                    className="rounded-full border border-stone-200 bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSubmittingMotion ? "Submitting..." : "Raise motion"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsMotionModalOpen(false)}
                                    className="rounded-full border border-stone-600 bg-stone-800 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-stone-500 hover:bg-stone-700"
                                >
                                    Cancel
                                </button>
                            </div>
                            <div className="mt-3 text-xs text-stone-500">
                                {!motionSupported
                                    ? "This motion type is not wired yet."
                                    : motionNeedsPostSelection
                                        ? "Select the statement affected by this motion."
                                        : motionNeedsCountrySelection
                                            ? "Select the delegation affected by this motion."
                                            : "Supported motions can now be raised into the committee feed."}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isFormalDebate && isPointModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 px-4 py-8 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-3xl border border-stone-700 bg-stone-900 p-5 shadow-2xl">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-stone-100">Raise Point</h2>
                                <p className="mt-1 text-sm text-stone-400">Select a point type and review the draft wording.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPointModalOpen(false)}
                                className="rounded-full border border-stone-700 bg-stone-950/60 px-3 py-1 text-sm text-stone-300 hover:border-stone-500 hover:text-stone-100"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-5 rounded-2xl border border-stone-800 bg-stone-950/55 p-4">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Propose Point</div>
                            <select
                                value={selectedPointType}
                                onChange={(event) => setSelectedPointType(event.target.value as (typeof PROPOSABLE_POINTS)[number]["type"])}
                                className="mt-3 w-full rounded-2xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
                            >
                                {PROPOSABLE_POINTS.map((point) => (
                                    <option key={point.type} value={point.type}>
                                        {point.title}
                                    </option>
                                ))}
                            </select>
                            <textarea
                                value={pointNote}
                                onChange={(event) => setPointNote(event.target.value)}
                                rows={3}
                                className="mt-3 w-full rounded-2xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
                                placeholder={selectedPoint.notePlaceholder}
                            />
                            <div className="mt-3 rounded-2xl border border-stone-800 bg-stone-950/40 px-3 py-3 text-sm text-stone-300">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Generated Wording</div>
                                <div className="mt-2 leading-relaxed">
                                    The delegation raises a {selectedPoint.title.toLowerCase()}.
                                    {pointNote.trim() ? ` Note: ${pointNote.trim()}` : ""}
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    disabled
                                    className="rounded-full border border-stone-200 bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-950 transition disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Raise point
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsPointModalOpen(false)}
                                    className="rounded-full border border-stone-600 bg-stone-800 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-stone-500 hover:bg-stone-700"
                                >
                                    Cancel
                                </button>
                            </div>
                            <div className="mt-3 text-xs text-stone-500">
                                Point submission is temporarily disabled while the point flow is being wired.
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

                    <div className="mt-5 grid gap-3 lg:grid-cols-3">
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

                .record-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(245, 158, 11, 0.35) rgba(28, 25, 23, 0.4);
                }

                .record-scroll::-webkit-scrollbar {
                    width: 10px;
                }

                .record-scroll::-webkit-scrollbar-track {
                    border-radius: 9999px;
                    background: rgba(28, 25, 23, 0.5);
                }

                .record-scroll::-webkit-scrollbar-thumb {
                    border: 2px solid rgba(28, 25, 23, 0.75);
                    border-radius: 9999px;
                    background: linear-gradient(180deg, rgba(245, 158, 11, 0.55), rgba(217, 119, 6, 0.38));
                }

                .record-scroll::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(180deg, rgba(251, 191, 36, 0.7), rgba(245, 158, 11, 0.52));
                }
            `}</style>
        </div>
    );
}

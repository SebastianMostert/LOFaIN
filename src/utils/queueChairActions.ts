import type { DiscussionParticipant, DiscussionRoomState, DiscussionSystemEntry } from "@/utils/discussionRealtime";
import type { ChairAssignment } from "@/utils/chair";
import { getPartyKitRoomHttpUrl } from "@/utils/partykit";

type QueueChairAction = "REQUEST_FLOOR" | "RECOGNIZE_SPEAKER" | "SKIP_SPEAKER" | "NUDGE_SPEAKER" | "STOP_SPEAKER";

type QueueTarget = {
    participant: DiscussionParticipant;
    source: "recognized" | "queued";
} | null;

type ChairActionLogLike = {
    id: string;
    type: string;
    note: string | null;
    createdAt: Date | string;
    metadata?: unknown;
    actorCountryName?: string | null;
};

function readMetadata(metadata: unknown) {
    return metadata && typeof metadata === "object" ? metadata as Record<string, unknown> : {};
}

export async function loadDiscussionRoomState(threadId: string): Promise<DiscussionRoomState> {
    const response = await fetch(getPartyKitRoomHttpUrl(threadId, "/state"), { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Failed to load room state (${response.status})`);
    }

    const state = await response.json() as Partial<DiscussionRoomState>;

    return {
        presentCountries: state.presentCountries ?? [],
        queuedCountries: state.queuedCountries ?? [],
        recognizedSpeaker: state.recognizedSpeaker ?? null,
        recognizedAt: state.recognizedAt ?? null,
    };
}

export function resolveQueueChairTarget(
    action: QueueChairAction,
    state: DiscussionRoomState,
    countryId?: string,
): QueueTarget {
    if (action === "REQUEST_FLOOR") {
        const participant = countryId
            ? state.presentCountries.find((entry) => entry.countryId === countryId)
            : null;

        return participant ? { participant, source: "queued" } : null;
    }

    if (action === "NUDGE_SPEAKER" || action === "STOP_SPEAKER") {
        if (!state.recognizedSpeaker) return null;
        if (countryId && state.recognizedSpeaker.countryId !== countryId) return null;

        return { participant: state.recognizedSpeaker, source: "recognized" };
    }

    if (action === "RECOGNIZE_SPEAKER") {
        const participant = countryId
            ? state.queuedCountries.find((entry) => entry.countryId === countryId)
            : state.queuedCountries[0];

        return participant ? { participant, source: "queued" } : null;
    }

    if (countryId) {
        if (state.recognizedSpeaker?.countryId === countryId) {
            return { participant: state.recognizedSpeaker, source: "recognized" };
        }

        const queued = state.queuedCountries.find((entry) => entry.countryId === countryId);
        return queued ? { participant: queued, source: "queued" } : null;
    }

    if (state.recognizedSpeaker) {
        return { participant: state.recognizedSpeaker, source: "recognized" };
    }

    return state.queuedCountries[0] ? { participant: state.queuedCountries[0], source: "queued" } : null;
}

export function buildQueueChairActionNote(
    action: QueueChairAction,
    _chairCountryName: string,
    target: QueueTarget,
) {
    const targetName = target?.participant.countryName ?? "Delegation";

    switch (action) {
        case "REQUEST_FLOOR":
            return `${targetName} added to queue.`;
        case "RECOGNIZE_SPEAKER":
            return `${targetName} recognized.`;
        case "SKIP_SPEAKER":
            return `${targetName} skipped.`;
        case "NUDGE_SPEAKER":
            return `${targetName} asked to conclude.`;
        case "STOP_SPEAKER":
            return `${targetName} removed from floor.`;
    }
}

export function buildQueueChairActionMetadata(
    action: QueueChairAction,
    chairAssignment: ChairAssignment,
    target: QueueTarget,
) {
    return {
        chairAction: action,
        procedural: true,
        targetCountryId: target?.participant.countryId ?? null,
        targetCountryName: target?.participant.countryName ?? null,
        targetSource: target?.source ?? null,
        chairCountryId: chairAssignment.effectiveChair.id,
        chairCountryName: chairAssignment.effectiveChair.name,
        substituteReason: chairAssignment.substituteReason ?? null,
    };
}

export function toDiscussionSystemEntry(log: ChairActionLogLike): DiscussionSystemEntry | null {
    const metadata = readMetadata(log.metadata);
    const action = typeof metadata.chairAction === "string" ? metadata.chairAction : log.type;
    const actor = "Chair";
    const detailActor = log.actorCountryName ?? (typeof metadata.chairCountryName === "string" ? metadata.chairCountryName : "Chair");
    const target = typeof metadata.targetCountryName === "string" ? metadata.targetCountryName : null;
    const targetSource = typeof metadata.targetSource === "string" ? metadata.targetSource : null;
    const substituteReason = typeof metadata.substituteReason === "string" ? metadata.substituteReason : null;
    const note = log.note?.trim();

    let body = note ?? null;

    if (!body) {
        switch (action) {
            case "REQUEST_FLOOR":
                body = target ? `${target} added to queue.` : "Delegation added to queue.";
                break;
            case "RECOGNIZE_SPEAKER":
                body = target ? `${target} recognized.` : "Delegation recognized.";
                break;
            case "SKIP_SPEAKER":
                body = target ? `${target} skipped.` : "Delegation skipped.";
                break;
            case "NUDGE_SPEAKER":
                body = target ? `${target} asked to conclude.` : "Speaker asked to conclude.";
                break;
            case "STOP_SPEAKER":
                body = target ? `${target} removed from floor.` : "Speaker removed from floor.";
                break;
            case "LOCK_THREAD":
                body = `${actor} locked the discussion.`;
                break;
            case "UNLOCK_THREAD":
                body = `${actor} reopened the discussion.`;
                break;
            case "OPEN_DEBATE":
                body = `${actor} opened formal debate.`;
                break;
            case "CLOSE_DEBATE":
                body = `${actor} returned the chamber to informal caucus.`;
                break;
            case "PIN_THREAD":
                body = `${actor} pinned the discussion.`;
                break;
            case "UNPIN_THREAD":
                body = `${actor} unpinned the discussion.`;
                break;
            case "ARCHIVE_THREAD":
                body = `${actor} archived the discussion.`;
                break;
            case "RESTORE_POST":
                body = `${actor} restored a deleted intervention.`;
                break;
            default:
                body = null;
                break;
        }
    }

    if (!body) return null;

    const details = [
        `Action: ${action.replaceAll("_", " ")}`,
        action === "REQUEST_FLOOR" ? null : `Chair: ${detailActor}`,
        target ? `Target: ${target}` : null,
        targetSource ? `Queue position: ${targetSource === "recognized" ? "recognized speaker" : "waiting queue"}` : null,
        note && note !== body ? `Note: ${note}` : null,
        substituteReason ? `Presiding note: ${substituteReason}` : null,
        `Time: ${typeof log.createdAt === "string" ? log.createdAt : log.createdAt.toISOString()}`,
    ].filter((value): value is string => Boolean(value));

    const label = body.replace(/\.$/, "");

    return {
        id: log.id,
        label,
        body,
        details,
        createdAt: typeof log.createdAt === "string" ? log.createdAt : log.createdAt.toISOString(),
    };
}

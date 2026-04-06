const textEncoder = new TextEncoder();

export type DiscussionParticipant = {
    countryId: string;
    countryName: string;
    countryCode: string | null;
};

export type DiscussionRealtimeAuth = DiscussionParticipant & {
    threadId: string;
    userId: string | null;
    userName: string | null;
    canModerate: boolean;
    exp: number;
};

export type DiscussionPostPayload = {
    id: string;
    body: string;
    parentPostId: string | null;
    isEdited: boolean;
    isDeleted: boolean;
    deletedAt: string | null;
    editedAt: string | null;
    createdAt: string;
    updatedAt: string;
    authorUser: {
        id: string;
        name: string | null;
        image: string | null;
    } | null;
    authorCountry: {
        id: string;
        name: string;
        slug: string;
        code: string | null;
        colorHex: string | null;
    } | null;
};

export type DiscussionRoomState = {
    presentCountries: DiscussionParticipant[];
    queuedCountries: DiscussionParticipant[];
    recognizedSpeaker: DiscussionParticipant | null;
    recognizedAt: string | null;
};

export type DiscussionChairNotice = {
    action: "NUDGE_SPEAKER" | "STOP_SPEAKER";
    target: DiscussionParticipant;
    issuedAt: string;
};

export type DiscussionSystemEntry = {
    id: string;
    label: string;
    body: string;
    details: string[];
    createdAt: string;
};

export type DiscussionThreadStatePayload = {
    debatePhase: "INFORMAL_CAUCUS" | "FORMAL_DEBATE";
    isLocked: boolean;
    isPinned: boolean;
    isArchived: boolean;
};

export type DiscussionMotionPayload = {
    id: string;
    type: "LOCK_THREAD" | "UNLOCK_THREAD" | "PIN_THREAD" | "UNPIN_THREAD" | "ARCHIVE_THREAD" | "REMOVE_POST" | "RESTORE_POST" | "ISSUE_SANCTION" | "LIFT_SANCTION";
    status: "DRAFT" | "PROPOSED" | "VOTING" | "PASSED" | "FAILED" | "WITHDRAWN" | "EXECUTED";
    statusLabel: string;
    title: string;
    rationale: string | null;
    formalWording: string;
    resolutionNote: string | null;
    createdAt: string;
    submittedAt: string | null;
    openedAt: string | null;
    closedAt: string | null;
    resolvedAt: string | null;
    targetThreadId: string | null;
    targetPostId: string | null;
    targetCountryId: string | null;
    proposerId: string | null;
    proposerName: string | null;
    seconderId: string | null;
    seconderName: string | null;
    secondedAt: string | null;
    expiresAt: string | null;
    autoPassAt: string | null;
    deniedByChairId: string | null;
    deniedReason: string | null;
    chatMessageId: string;
    votes: {
        countryId: string;
        choice: "APPROVE" | "REJECT" | "ABSTAIN";
    }[];
};

export type DiscussionServerEvent =
    | ({ type: "snapshot"; } & DiscussionRoomState)
    | ({ type: "state"; } & DiscussionRoomState)
    | { type: "thread.updated"; thread: DiscussionThreadStatePayload }
    | { type: "chair.notice"; notice: DiscussionChairNotice }
    | { type: "chair.log"; entry: DiscussionSystemEntry }
    | { type: "motion.created"; motion: DiscussionMotionPayload }
    | { type: "motion.updated"; motion: DiscussionMotionPayload }
    | { type: "post.created"; post: DiscussionPostPayload }
    | { type: "post.updated"; post: DiscussionPostPayload }
    | { type: "post.deleted"; postId: string }
    | { type: "error"; message: string };

export type DiscussionClientEvent =
    | { type: "queue.request" }
    | { type: "queue.recognize"; countryId?: string; devOverrideModeration?: boolean }
    | { type: "queue.skip"; countryId?: string; devOverrideModeration?: boolean }
    | { type: "queue.nudge"; countryId?: string; devOverrideModeration?: boolean }
    | { type: "queue.stop"; countryId?: string; devOverrideModeration?: boolean };

function getRealtimeSecret() {
    return process.env.DISCUSSION_REALTIME_SECRET ?? process.env.PARTYKIT_SHARED_SECRET ?? "discussion-dev-secret";
}

function toBase64Url(bytes: Uint8Array) {
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string) {
    const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index++) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
}

async function importSigningKey() {
    return crypto.subtle.importKey(
        "raw",
        textEncoder.encode(getRealtimeSecret()),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"],
    );
}

export async function signDiscussionRealtimeAuth(payload: DiscussionRealtimeAuth) {
    const encodedPayload = toBase64Url(textEncoder.encode(JSON.stringify(payload)));
    const key = await importSigningKey();
    const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(encodedPayload));

    return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyDiscussionRealtimeAuth(token: string | null | undefined) {
    if (!token) return null;

    const [encodedPayload, encodedSignature] = token.split(".");
    if (!encodedPayload || !encodedSignature) return null;

    const key = await importSigningKey();
    const valid = await crypto.subtle.verify(
        "HMAC",
        key,
        fromBase64Url(encodedSignature),
        textEncoder.encode(encodedPayload),
    );

    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload))) as DiscussionRealtimeAuth;
    if (payload.exp <= Date.now()) return null;

    return payload;
}

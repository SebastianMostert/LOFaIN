import type {
    DiscussionMotionPayload,
    DiscussionParticipant,
    DiscussionPostPayload,
    DiscussionSystemEntry,
    DiscussionThreadStatePayload,
} from "@/utils/discussionRealtime";

export type LiveDiscussionSessionProps = {
    threadId: string;
    authToken: string;
    currentCountryId: string | null;
    quorumRequired: number;
    presidingStateName: string;
    presidingNote: string | null;
    proposal: {
        title: string;
        rationale: string | null;
        op: "ADD" | "EDIT" | "REMOVE";
        targetArticleHeading: string | null;
        proposedHeading: string | null;
        proposedBody: string | null;
        currentBody: string | null;
    };
    initialPosts: DiscussionPostPayload[];
    availableCountries: {
        id: string;
        name: string;
    }[];
    initialSystemEntries: DiscussionSystemEntry[];
    initialPresentCountries: DiscussionParticipant[];
    initialQueuedCountries: DiscussionParticipant[];
    initialRecognizedSpeaker: DiscussionParticipant | null;
    initialRecognizedAt: string | null;
    initialThreadState: DiscussionThreadStatePayload;
    initialMotions: DiscussionMotionPayload[];
    canModerate: boolean;
};

export type MotionItem = DiscussionMotionPayload;

export type RecordPostItem = {
    type: "post";
    createdAt: string;
    id: string;
    post: DiscussionPostPayload;
};

export type RecordSystemItem = {
    type: "system";
    createdAt: string;
    id: string;
    entry: DiscussionSystemEntry;
};

export type RecordMotionItem = {
    type: "motion";
    createdAt: string;
    id: string;
    motion: MotionItem;
};

export type RecordItem = RecordPostItem | RecordSystemItem | RecordMotionItem;

export type GroupedRecordItem =
    | RecordSystemItem
    | RecordMotionItem
    | {
        type: "system-group";
        id: string;
        createdAt: string;
        entries: DiscussionSystemEntry[];
    }
    | {
        type: "post-group";
        id: string;
        createdAt: string;
        posts: DiscussionPostPayload[];
    };

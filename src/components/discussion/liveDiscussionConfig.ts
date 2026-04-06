import type { DiscussionMotionPayload } from "@/utils/discussionRealtime";

type MotionItem = DiscussionMotionPayload;

export const PROPOSABLE_MOTIONS = [
    {
        type: "LOCK_THREAD" as MotionItem["type"],
        title: "Motion to Suspend the Meeting",
        notePlaceholder: "Optional note, e.g. duration or purpose of suspension",
        needsPost: false,
        needsCountry: false,
    },
    {
        type: "UNLOCK_THREAD" as MotionItem["type"],
        title: "Motion to Resume the Meeting",
        notePlaceholder: "Optional note, e.g. reason for resumption",
        needsPost: false,
        needsCountry: false,
    },
    {
        type: "PIN_THREAD" as MotionItem["type"],
        title: "Motion to Prioritize This Debate",
        notePlaceholder: "Optional note, e.g. urgency or scheduling reason",
        needsPost: false,
        needsCountry: false,
    },
    {
        type: "UNPIN_THREAD" as MotionItem["type"],
        title: "Motion to Remove Debate Priority",
        notePlaceholder: "Optional note, e.g. scheduling reason",
        needsPost: false,
        needsCountry: false,
    },
    {
        type: "ARCHIVE_THREAD" as MotionItem["type"],
        title: "Motion to Adjourn Debate",
        notePlaceholder: "Optional note, e.g. adjournment reason",
        needsPost: false,
        needsCountry: false,
    },
    {
        type: "REMOVE_POST" as MotionItem["type"],
        title: "Motion to Strike a Statement from the Record",
        notePlaceholder: "Explain why the statement should be struck",
        needsPost: true,
        needsCountry: false,
    },
    {
        type: "RESTORE_POST" as MotionItem["type"],
        title: "Motion to Restore a Statement to the Record",
        notePlaceholder: "Explain why the statement should be restored",
        needsPost: true,
        needsCountry: false,
    },
    {
        type: "ISSUE_SANCTION" as MotionItem["type"],
        title: "Motion to Sanction a Delegation",
        notePlaceholder: "Explain the grounds for sanction",
        needsPost: false,
        needsCountry: true,
    },
    {
        type: "LIFT_SANCTION" as MotionItem["type"],
        title: "Motion to Lift Sanctions on a Delegation",
        notePlaceholder: "Explain why the sanction should be lifted",
        needsPost: false,
        needsCountry: true,
    },
] as const;

export const SUBMITTABLE_MOTION_TYPES: MotionItem["type"][] = [
    "LOCK_THREAD",
    "UNLOCK_THREAD",
    "PIN_THREAD",
    "UNPIN_THREAD",
    "ARCHIVE_THREAD",
    "REMOVE_POST",
    "RESTORE_POST",
];

export const PROPOSABLE_POINTS = [
    {
        type: "PERSONAL_PRIVILEGE",
        title: "Point of Personal Privilege",
        notePlaceholder: "Describe the personal privilege issue",
    },
    {
        type: "ORDER",
        title: "Point of Order",
        notePlaceholder: "Describe the procedural concern",
    },
    {
        type: "PARLIAMENTARY_INQUIRY",
        title: "Point of Parliamentary Inquiry",
        notePlaceholder: "State the parliamentary question",
    },
] as const;

export const DEV_OVERRIDE_STORAGE_KEY = "discussion-dev-overrides";
export const STOP_SPEAKER_LOCK_MS = 5_000;
export const DISCUSSION_DRAFT_STORAGE_KEY = "discussion-draft";

import { prisma } from "@/prisma";
import { membershipWhereAt } from "@/utils/country";

const CHAIR_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_ROTATION_START_AT = "2026-03-16T00:00:00.000Z";
export const CHAIR_ROTATION_ORDER = ["france", "italy", "poland", "ussr", "japan", "mexico"] as const;

type RotationCountry = {
    id: string;
    name: string;
    slug: string;
    code: string | null;
    flagImagePath: string | null;
    flagAspectRatio: string | null;
    hasVeto: boolean;
    isActive: boolean;
};

export type RotationCountrySummary = RotationCountry;

function getChairTermMs(country: Pick<RotationCountry, "hasVeto">) {
    return country.hasVeto ? CHAIR_WEEK_MS : CHAIR_WEEK_MS * 2;
}

export type ChairAssignment = {
    rotationStartedAt: Date;
    termStartedAt: Date;
    termEndsAt: Date;
    termIndex: number;
    baseChair: RotationCountry;
    effectiveChair: RotationCountry;
    substituteReason: string | null;
    amendment: {
        id: string;
        slug: string;
        title: string;
        proposerCountryId: string | null;
    } | null;
};

function getRotationAnchor() {
    const raw = process.env.CHAIR_ROTATION_START_AT ?? DEFAULT_ROTATION_START_AT;
    const anchor = new Date(raw);
    if (Number.isNaN(anchor.getTime())) {
        return new Date(DEFAULT_ROTATION_START_AT);
    }

    return anchor;
}

function resolveRotationPosition(now: Date, anchor: Date, rotation: RotationCountry[]) {
    const cycleLengthMs = rotation.reduce((total, country) => total + getChairTermMs(country), 0);
    if (cycleLengthMs <= 0) {
        throw new Error("Chair rotation cycle length must be positive");
    }

    const elapsed = now.getTime() - anchor.getTime();
    const elapsedInCycle = ((elapsed % cycleLengthMs) + cycleLengthMs) % cycleLengthMs;
    const completedCycles = Math.floor((elapsed - elapsedInCycle) / cycleLengthMs);
    const cycleStartedAt = new Date(anchor.getTime() + completedCycles * cycleLengthMs);

    let running = 0;
    for (let index = 0; index < rotation.length; index++) {
        const country = rotation[index];
        const termMs = getChairTermMs(country);
        if (elapsedInCycle < running + termMs) {
            const termStartedAt = new Date(cycleStartedAt.getTime() + running);
            const termEndsAt = new Date(termStartedAt.getTime() + termMs);
            return {
                termIndex: index,
                termStartedAt,
                termEndsAt,
            };
        }

        running += termMs;
    }

    const fallbackIndex = rotation.length - 1;
    const fallbackCountry = rotation[fallbackIndex];
    const fallbackTermMs = getChairTermMs(fallbackCountry);
    const fallbackStart = new Date(cycleStartedAt.getTime() + cycleLengthMs - fallbackTermMs);
    return {
        termIndex: fallbackIndex,
        termStartedAt: fallbackStart,
        termEndsAt: new Date(fallbackStart.getTime() + fallbackTermMs),
    };
}

async function getRotationCountries(at: Date) {
    const countries = await prisma.country.findMany({
        where: {
            slug: { in: [...CHAIR_ROTATION_ORDER] },
            ...membershipWhereAt(at),
        },
        select: {
            id: true,
            name: true,
            slug: true,
            code: true,
            flagImagePath: true,
            flagAspectRatio: true,
            hasVeto: true,
            isActive: true,
        },
    });

    const bySlug = new Map(countries.map((country) => [country.slug, country]));
    return CHAIR_ROTATION_ORDER
        .map((slug) => bySlug.get(slug))
        .filter((country): country is RotationCountry => Boolean(country));
}

function getThreadAmendmentCandidates(slug: string) {
    const candidates = new Set<string>();

    candidates.add(slug);

    if (slug.endsWith("-discussion")) {
        candidates.add(slug.slice(0, -"-discussion".length));
    }

    if (slug.startsWith("amendment-") && slug.endsWith("-discussion")) {
        candidates.add(slug.slice("amendment-".length, -"-discussion".length));
    }

    return [...candidates].filter(Boolean);
}

async function getAmendmentFromThreadId(threadId: string) {
    const thread = await prisma.discussionThread.findUnique({
        where: { id: threadId },
        select: { id: true, slug: true },
    });

    if (!thread) {
        return null;
    }

    const candidates = getThreadAmendmentCandidates(thread.slug);
    if (candidates.length === 0) {
        return null;
    }

    return prisma.amendment.findFirst({
        where: { slug: { in: candidates } },
        select: {
            id: true,
            slug: true,
            title: true,
            proposerCountryId: true,
        },
    });
}

export async function getCurrentChairAssignment(at = new Date()): Promise<ChairAssignment> {
    const rotation = await getRotationCountries(at);
    if (rotation.length === 0) {
        throw new Error("No active countries are available in the chair rotation");
    }

    const rotationStartedAt = getRotationAnchor();
    const { termIndex, termStartedAt, termEndsAt } = resolveRotationPosition(at, rotationStartedAt, rotation);
    const baseChair = rotation[termIndex];

    return {
        rotationStartedAt,
        termStartedAt,
        termEndsAt,
        termIndex,
        baseChair,
        effectiveChair: baseChair,
        substituteReason: null,
        amendment: null,
    };
}

export function getRotationSchedule(
    rotation: RotationCountrySummary[],
    rotationStartedAt: Date,
    cycles = 1,
) {
    const schedule: Array<{
        country: RotationCountrySummary;
        startsAt: Date;
        endsAt: Date;
        cycle: number;
    }> = [];

    let cursor = new Date(rotationStartedAt);
    for (let cycle = 0; cycle < cycles; cycle++) {
        for (const country of rotation) {
            const startsAt = new Date(cursor);
            const endsAt = new Date(startsAt.getTime() + getChairTermMs(country));
            schedule.push({ country, startsAt, endsAt, cycle });
            cursor = endsAt;
        }
    }

    return schedule;
}

export async function getChairAssignmentForAmendment(
    amendmentSlug: string,
    at = new Date(),
): Promise<ChairAssignment> {
    const [assignment, amendment, rotation] = await Promise.all([
        getCurrentChairAssignment(at),
        prisma.amendment.findUnique({
            where: { slug: amendmentSlug },
            select: {
                id: true,
                slug: true,
                title: true,
                proposerCountryId: true,
            },
        }),
        getRotationCountries(at),
    ]);

    if (!amendment) {
        throw new Error(`Amendment not found for chair assignment: ${amendmentSlug}`);
    }

    if (rotation.length <= 1 || amendment.proposerCountryId !== assignment.baseChair.id) {
        return {
            ...assignment,
            amendment,
        };
    }

    const baseIndex = rotation.findIndex((country) => country.id === assignment.baseChair.id);
    const replacement =
        rotation.find((country, index) => index > baseIndex && country.id !== amendment.proposerCountryId) ??
        rotation.find((country) => country.id !== amendment.proposerCountryId) ??
        assignment.baseChair;

    return {
        ...assignment,
        effectiveChair: replacement,
        substituteReason: `${assignment.baseChair.name} proposed this amendment, so the chair passes temporarily to ${replacement.name}.`,
        amendment,
    };
}

export async function getChairAssignmentForThread(threadId: string, at = new Date()) {
    const amendment = await getAmendmentFromThreadId(threadId);
    if (!amendment) {
        return getCurrentChairAssignment(at);
    }

    return getChairAssignmentForAmendment(amendment.slug, at);
}

export async function getChairAssignmentForMotion(motionId: string, at = new Date()) {
    const motion = await prisma.modMotion.findUnique({
        where: { id: motionId },
        select: { id: true, targetThreadId: true },
    });

    if (!motion) {
        throw new Error(`Motion not found for chair assignment: ${motionId}`);
    }

    if (!motion.targetThreadId) {
        return getCurrentChairAssignment(at);
    }

    return getChairAssignmentForThread(motion.targetThreadId, at);
}

export async function isCountryAuthorizedAsChairForThread(countryId: string, threadId: string, at = new Date()) {
    const assignment = await getChairAssignmentForThread(threadId, at);
    return assignment.effectiveChair.id === countryId;
}

export async function isCountryAuthorizedAsChairForMotion(countryId: string, motionId: string, at = new Date()) {
    const assignment = await getChairAssignmentForMotion(motionId, at);
    return assignment.effectiveChair.id === countryId;
}

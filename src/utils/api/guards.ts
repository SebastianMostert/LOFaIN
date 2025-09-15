import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/prisma";

export class ApiError extends Error {
    public readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

export interface CountryAuthContext {
    id: string;
    name: string;
    slug: string;
    hasVeto: boolean;
    isActive: boolean;
}

export interface QuorumInfo {
    totalActiveCountries: number;
    required: number;
}

export interface AuthContext {
    session: Session;
    userId?: string;
    country: CountryAuthContext;
    quorum: QuorumInfo;
}

const MINIMUM_COUNTRIES_FOR_QUORUM = 3;

async function fetchQuorumInfo(): Promise<QuorumInfo> {
    const totalActiveCountries = await prisma.country.count({ where: { isActive: true } });
    const required = Math.max(MINIMUM_COUNTRIES_FOR_QUORUM, Math.ceil(totalActiveCountries * 0.5));

    if (totalActiveCountries < required) {
        throw new ApiError(
            409,
            `Quorum not met: ${totalActiveCountries} of ${required} active countries available`,
        );
    }

    return { totalActiveCountries, required };
}

async function ensureCountryNotSanctioned(countryId: string) {
    const now = new Date();
    const sanction = await prisma.sanction.findFirst({
        where: {
            targetCountryId: countryId,
            isActive: true,
            rescindedAt: null,
            AND: [
                {
                    OR: [
                        { effectiveAt: null },
                        { effectiveAt: { lte: now } },
                    ],
                },
                {
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: now } },
                    ],
                },
            ],
        },
        select: { id: true, title: true, type: true },
    });

    if (sanction) {
        throw new ApiError(403, `Country under active sanction: ${sanction.title}`);
    }
}

async function fetchCountry(countryId: string): Promise<CountryAuthContext> {
    const country = await prisma.country.findUnique({
        where: { id: countryId },
        select: {
            id: true,
            name: true,
            slug: true,
            hasVeto: true,
            isActive: true,
        },
    });

    if (!country) {
        throw new ApiError(403, "Assigned country not found");
    }

    if (!country.isActive) {
        throw new ApiError(403, "Country is inactive");
    }

    return country;
}

export async function requireAuthContext(options?: { requireChair?: boolean }): Promise<AuthContext> {
    const session = await auth();
    if (!session) {
        throw new ApiError(401, "Unauthorized");
    }

    const countryId = session.user?.countryId ?? undefined;
    if (!countryId) {
        throw new ApiError(403, "No country assigned");
    }

    const country = await fetchCountry(countryId);
    await ensureCountryNotSanctioned(country.id);
    const quorum = await fetchQuorumInfo();

    if (options?.requireChair) {
        const isChair = country.hasVeto || country.slug === "chair";
        if (!isChair) {
            throw new ApiError(403, "Chair privileges required");
        }
    }

    return {
        session,
        userId: session.user?.id ?? undefined,
        country,
        quorum,
    };
}

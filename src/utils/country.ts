import { prisma } from "@/prisma";

export function membershipWhereAt(date: Date) {
    return {
        AND: [
            {
                OR: [
                    { joinedAt: null },
                    { joinedAt: { lte: date } },
                ],
            },
            {
                OR: [
                    { leftAt: null },
                    { leftAt: { gt: date } },
                ],
            },
        ],
    };
}

export async function getEligibleVotingCountries(at: Date) {
    return prisma.country.findMany({
        where: membershipWhereAt(at),
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            slug: true,
            code: true,
            flagImagePath: true,
            flagAspectRatio: true,
            hasVeto: true,
            isActive: true,
            joinedAt: true,
            leftAt: true,
        },
    });
}

export async function countEligibleVotingCountries(at: Date) {
    return prisma.country.count({ where: membershipWhereAt(at) });
}

export async function countryHasVotingPowerAt(countryId: string, at: Date) {
    const country = await prisma.country.findFirst({
        where: {
            id: countryId,
            ...membershipWhereAt(at),
        },
        select: { id: true },
    });

    return Boolean(country);
}

export async function getCountry(slugOrCode: string) {
    const code = slugOrCode.toUpperCase();
    const slug = slugOrCode.toLowerCase();

    // Try by code, then by slug
    const byCode = await prisma.country.findFirst({
        where: { code },
        select: {
            id: true, name: true, slug: true, code: true, colorHex: true, flagImagePath: true, flagAspectRatio: true, summary: true, capital: true, governmentType: true, officeholders: true, headOfState: true, foreignMinister: true, hasVeto: true, isActive: true, createdAt: true, joinedAt: true, leftAt: true,
            users: { select: { id: true, name: true, image: true }, orderBy: { createdAt: "asc" }, take: 50 },
        },
    });
    if (byCode) return byCode;

    const bySlug = await prisma.country.findUnique({
        where: { slug },
        select: {
            id: true, name: true, slug: true, code: true, colorHex: true, flagImagePath: true, flagAspectRatio: true, summary: true, capital: true, governmentType: true, officeholders: true, headOfState: true, foreignMinister: true, hasVeto: true, isActive: true, createdAt: true, joinedAt: true, leftAt: true,
            users: { select: { id: true, name: true, image: true }, orderBy: { createdAt: "asc" }, take: 50 },
        },
    });
    return bySlug;
}

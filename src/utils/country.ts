import { prisma } from "@/prisma";

/**
 * Validate and normalize a country slug or code.
 *
 * Returns the matched value if it conforms to the whitelist regex or `null`
 * otherwise. The regex limits input to 1–32 alphanumeric characters and
 * hyphens to prevent accidental wide queries or injection attempts.
 */
export function normalizeSlugOrCode(value: string): string | null {
    const match = value.match(/^[a-z0-9-]{1,32}$/i);
    return match ? match[0] : null;
}

export async function getCountry(slugOrCode: string) {
    const normalized = normalizeSlugOrCode(slugOrCode);
    if (!normalized) return null;

    const code = normalized.toUpperCase();
    const slug = normalized.toLowerCase();

    // Try by code, then by slug
    const byCode = await prisma.country.findFirst({
        where: { code },
        select: {
            id: true, name: true, slug: true, code: true, colorHex: true,
            users: { select: { id: true, name: true, image: true }, take: 50 },
        },
    });
    if (byCode) return byCode;

    const bySlug = await prisma.country.findUnique({
        where: { slug },
        select: {
            id: true, name: true, slug: true, code: true, colorHex: true,
            users: { select: { id: true, name: true, image: true }, take: 50 },
        },
    });
    return bySlug;
}
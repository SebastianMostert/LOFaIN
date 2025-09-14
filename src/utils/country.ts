import { prisma } from "@/prisma";

export async function getCountry(slugOrCode: string) {
    const code = slugOrCode.toUpperCase();
    const slug = slugOrCode.toLowerCase();

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
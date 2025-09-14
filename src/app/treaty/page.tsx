import { prisma } from "@/prisma";
import { notFound } from "next/navigation";
import TreatyClient from "./TreatyClient";

export const dynamic = "force-static";
export const revalidate = 3600;

export default async function TreatyPage() {
    const treaty = await prisma.treaty.findUnique({
        where: { slug: "league-treaty-1900" },
        include: { articles: { orderBy: { order: "asc" } } },
    });
    if (!treaty) notFound();
    return <TreatyClient treaty={treaty} />;
}

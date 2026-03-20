import { notFound } from "next/navigation";
import { prisma } from "@/prisma";

export async function getLeagueTreaty() {
  const treaty = await prisma.treaty.findUnique({
    where: { slug: "league-treaty-1900" },
    include: { articles: { orderBy: { order: "asc" } } },
  });

  if (!treaty) notFound();
  return treaty;
}

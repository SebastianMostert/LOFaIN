import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { rateLimit } from "@/utils/rateLimit";

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const treaty = await prisma.treaty.findUnique({
    where: { slug: "league-treaty-1900" },
    select: {
      title: true,
      slug: true,
      preamble: true,
      articles: {
        orderBy: { order: "asc" },
        select: { order: true, heading: true, body: true }
      }
    }
  });

  if (!treaty) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(treaty);
}

import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { rateLimit } from "@/utils/rateLimit";

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const amendments = await prisma.amendment.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      slug: true,
      title: true,
      status: true,
      result: true,
      opensAt: true,
      closesAt: true,
    },
  });

  return NextResponse.json({ amendments });
}

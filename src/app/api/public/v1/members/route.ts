import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { rateLimit } from "@/utils/rateLimit";

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const members = await prisma.country.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      name: true,
      slug: true,
      code: true,
      colorHex: true,
    },
  });

  return NextResponse.json({ members });
}

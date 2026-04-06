import { NextResponse } from "next/server";
import z from "zod";

import { auth } from "@/auth";
import { prisma } from "@/prisma";

const countryProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  colorHex: z.string().trim().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use a valid hex color").nullable(),
  summary: z.string().trim().max(1200).nullable(),
  capital: z.string().trim().max(120).nullable(),
  governmentType: z.string().trim().max(160).nullable(),
  headOfState: z.string().trim().max(160).nullable(),
  foreignMinister: z.string().trim().max(160).nullable(),
});

function normalizeOptional(value: string | null) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.countryId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = countryProfileSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const existingByName = await prisma.country.findFirst({
    where: {
      name: data.name,
      id: { not: session.user.countryId },
    },
    select: { id: true },
  });

  if (existingByName) {
    return NextResponse.json({ error: "That country name is already in use." }, { status: 409 });
  }

  const updated = await prisma.country.update({
    where: { id: session.user.countryId },
    data: {
      name: data.name,
      colorHex: normalizeOptional(data.colorHex),
      summary: normalizeOptional(data.summary),
      capital: normalizeOptional(data.capital),
      governmentType: normalizeOptional(data.governmentType),
      headOfState: normalizeOptional(data.headOfState),
      foreignMinister: normalizeOptional(data.foreignMinister),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      colorHex: true,
      summary: true,
      capital: true,
      governmentType: true,
      headOfState: true,
      foreignMinister: true,
    },
  });

  return NextResponse.json({ country: updated });
}

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import z from "zod";

import { auth } from "@/auth";
import { prisma } from "@/prisma";
import { normalizeFlagAspectRatio } from "@/utils/flags";
import { normalizeOfficeholders } from "@/utils/officeholders";

const countryProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  colorHex: z.string().trim().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use a valid hex color").nullable(),
  summary: z.string().trim().max(1200).nullable(),
  capital: z.string().trim().max(120).nullable(),
  governmentType: z.string().trim().max(160).nullable(),
  officeholders: z.string().trim().nullable(),
  flagAspectRatio: z.string().trim().nullable(),
  removeFlag: z.boolean(),
});

const MAX_FLAG_BYTES = 2 * 1024 * 1024;
const FLAG_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "flags");

const ALLOWED_FLAG_TYPES = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"],
]);
const HEAD_OF_STATE_POSITION = "Head of state";

function normalizeOptional(value: string | null) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readOptionalFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? normalizeOptional(value) : null;
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.countryId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const parsed = countryProfileSchema.safeParse({
    name: formData.get("name"),
    colorHex: readOptionalFormValue(formData, "colorHex"),
    summary: readOptionalFormValue(formData, "summary"),
    capital: readOptionalFormValue(formData, "capital"),
    governmentType: readOptionalFormValue(formData, "governmentType"),
    officeholders: readOptionalFormValue(formData, "officeholders"),
    flagAspectRatio: readOptionalFormValue(formData, "flagAspectRatio"),
    removeFlag: formData.get("removeFlag") === "true",
  });
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const officeholders = (() => {
    if (!data.officeholders) {
      return [];
    }

    try {
      return normalizeOfficeholders(JSON.parse(data.officeholders));
    } catch {
      return null;
    }
  })();

  if (officeholders === null) {
    return NextResponse.json({ error: "Use a valid officeholder list." }, { status: 400 });
  }
  if (!officeholders.some((entry) => entry.position.toLowerCase() === HEAD_OF_STATE_POSITION.toLowerCase() && entry.name)) {
    return NextResponse.json({ error: "Every country must have a Head of state." }, { status: 400 });
  }

  const uploadedFlag = formData.get("flagFile");
  const hasUploadedFlag = uploadedFlag instanceof File && uploadedFlag.size > 0;
  const normalizedAspectRatio = normalizeFlagAspectRatio(data.flagAspectRatio);

  if ((hasUploadedFlag || data.removeFlag) && !normalizedAspectRatio && hasUploadedFlag) {
    return NextResponse.json({ error: "Provide a valid flag aspect ratio such as 3 / 2." }, { status: 400 });
  }

  if (hasUploadedFlag) {
    if (uploadedFlag.size > MAX_FLAG_BYTES) {
      return NextResponse.json({ error: "Flag uploads must be 2 MB or smaller." }, { status: 400 });
    }

    if (!ALLOWED_FLAG_TYPES.has(uploadedFlag.type)) {
      return NextResponse.json({ error: "Use a PNG, JPG, WEBP, or SVG image for the flag upload." }, { status: 400 });
    }
  }

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

  const existingCountry = await prisma.country.findUnique({
    where: { id: session.user.countryId },
    select: {
      id: true,
      flagImagePath: true,
      flagAspectRatio: true,
    },
  });

  if (!existingCountry) {
    return NextResponse.json({ error: "Country not found." }, { status: 404 });
  }

  let nextFlagImagePath = existingCountry.flagImagePath ?? null;
  let nextFlagAspectRatio = data.removeFlag
    ? null
    : normalizedAspectRatio ?? existingCountry.flagAspectRatio ?? null;

  if (hasUploadedFlag) {
    const extension = ALLOWED_FLAG_TYPES.get(uploadedFlag.type)!;
    await mkdir(FLAG_UPLOAD_DIR, { recursive: true });

    const fileName = `${existingCountry.id}-${Date.now()}.${extension}`;
    const diskPath = path.join(FLAG_UPLOAD_DIR, fileName);
    const publicPath = `/uploads/flags/${fileName}`;
    const buffer = Buffer.from(await uploadedFlag.arrayBuffer());

    await writeFile(diskPath, buffer);
    nextFlagImagePath = publicPath;
    nextFlagAspectRatio = normalizedAspectRatio;
  }

  const oldFlagPath = existingCountry.flagImagePath;
  const shouldDeletePreviousFlag =
    oldFlagPath &&
    oldFlagPath.startsWith("/uploads/flags/") &&
    (data.removeFlag || (hasUploadedFlag && oldFlagPath !== nextFlagImagePath));

  const updated = await prisma.country.update({
    where: { id: session.user.countryId },
    data: {
      name: data.name,
      colorHex: normalizeOptional(data.colorHex),
      summary: normalizeOptional(data.summary),
      capital: normalizeOptional(data.capital),
      governmentType: normalizeOptional(data.governmentType),
      officeholders,
      flagImagePath: data.removeFlag ? null : nextFlagImagePath,
      flagAspectRatio: data.removeFlag ? null : nextFlagAspectRatio,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      colorHex: true,
      flagImagePath: true,
      flagAspectRatio: true,
      summary: true,
      capital: true,
      governmentType: true,
      officeholders: true,
      headOfState: true,
      foreignMinister: true,
    },
  });

  if (shouldDeletePreviousFlag) {
    const previousDiskPath = path.join(process.cwd(), "public", oldFlagPath.replace(/^\//, "").replaceAll("/", path.sep));
    await rm(previousDiskPath, { force: true }).catch(() => undefined);
  }

  return NextResponse.json({ country: updated });
}

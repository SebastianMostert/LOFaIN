import { NextResponse } from "next/server";
import { closeExpiredAmendments } from "@/utils/amendments";

export async function GET() {
    await closeExpiredAmendments();
    return NextResponse.json({ ok: true });
}

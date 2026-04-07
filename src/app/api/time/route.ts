import { NextResponse } from "next/server";
import { serializeLeagueTimeSnapshot } from "@/utils/time/shared";
import { getLeagueTimeSnapshot } from "@/utils/time/server";

export async function GET() {
  const snapshot = await getLeagueTimeSnapshot();
  return NextResponse.json({ time: serializeLeagueTimeSnapshot(snapshot) });
}

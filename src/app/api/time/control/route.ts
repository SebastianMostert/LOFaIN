import { NextResponse } from "next/server";
import z from "zod";
import { auth } from "@/auth";
import { isAdminSession } from "@/utils/admin";
import { serializeLeagueTimeSnapshot } from "@/utils/time/shared";
import {
  getLeagueTimeSnapshot,
  pauseLeagueTime,
  resetLeagueTimeToOriginalStart,
  resumeLeagueTime,
  setLeagueOriginalMapping,
  setLeagueSimulatedTime,
} from "@/utils/time/server";

const isoDateSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Use a valid ISO date string.",
});

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("reset_to_original_start") }),
  z.object({
    action: z.literal("set_current_simulated_time"),
    simulatedAt: isoDateSchema,
  }),
  z.object({
    action: z.literal("set_original_mapping"),
    realStartAt: isoDateSchema,
    simulatedStartAt: isoDateSchema,
  }),
]);

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return unauthorized();
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const body = parsed.data;

  if (body.action === "pause") {
    await pauseLeagueTime();
  } else if (body.action === "resume") {
    await resumeLeagueTime();
  } else if (body.action === "reset_to_original_start") {
    await resetLeagueTimeToOriginalStart();
  } else if (body.action === "set_current_simulated_time") {
    await setLeagueSimulatedTime(new Date(body.simulatedAt));
  } else if (body.action === "set_original_mapping") {
    await setLeagueOriginalMapping({
      realStartAt: new Date(body.realStartAt),
      simulatedStartAt: new Date(body.simulatedStartAt),
    });
  }

  const snapshot = await getLeagueTimeSnapshot();
  return NextResponse.json({ time: serializeLeagueTimeSnapshot(snapshot) });
}

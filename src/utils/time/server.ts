import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_REAL_START_AT, DEFAULT_SIMULATED_START_AT } from "@/utils/time/constants";
import { computeCurrentSimulatedNow, startOfUtcDay } from "@/utils/time/shared";
import type {
  LeagueTimeControlRecord,
  LeagueTimeSnapshot,
  PersistedLeagueTimeControlRecord,
} from "@/utils/time/types";

const LEAGUE_TIME_CONTROL_PATH = path.join(process.cwd(), "data", "league-time-control.json");

function getDefaultRecord(): LeagueTimeControlRecord {
  const now = new Date();

  return {
    id: "main",
    originalRealStartAt: DEFAULT_REAL_START_AT,
    originalSimulatedAt: DEFAULT_SIMULATED_START_AT,
    currentRealAnchorAt: DEFAULT_REAL_START_AT,
    currentRealReferenceAt: DEFAULT_REAL_START_AT,
    currentSimulatedAt: DEFAULT_SIMULATED_START_AT,
    isPaused: false,
    createdAt: now,
    updatedAt: now,
  };
}

function serializeRecord(record: LeagueTimeControlRecord): PersistedLeagueTimeControlRecord {
  return {
    id: record.id,
    originalRealStartAt: record.originalRealStartAt.toISOString(),
    originalSimulatedAt: record.originalSimulatedAt.toISOString(),
    currentRealAnchorAt: record.currentRealAnchorAt.toISOString(),
    currentRealReferenceAt: record.currentRealReferenceAt.toISOString(),
    currentSimulatedAt: record.currentSimulatedAt.toISOString(),
    isPaused: record.isPaused,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function deserializeRecord(record: PersistedLeagueTimeControlRecord): LeagueTimeControlRecord {
  return {
    id: record.id,
    originalRealStartAt: new Date(record.originalRealStartAt),
    originalSimulatedAt: new Date(record.originalSimulatedAt),
    currentRealAnchorAt: new Date(record.currentRealAnchorAt),
    currentRealReferenceAt: record.currentRealReferenceAt
      ? new Date(record.currentRealReferenceAt)
      : new Date(record.currentRealAnchorAt),
    currentSimulatedAt: new Date(record.currentSimulatedAt),
    isPaused: record.isPaused,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}

async function writeTimeControl(record: LeagueTimeControlRecord) {
  await mkdir(path.dirname(LEAGUE_TIME_CONTROL_PATH), { recursive: true });
  await writeFile(LEAGUE_TIME_CONTROL_PATH, JSON.stringify(serializeRecord(record), null, 2), "utf8");
}

export async function getOrCreateLeagueTimeControl() {
  try {
    const raw = await readFile(LEAGUE_TIME_CONTROL_PATH, "utf8");
    return deserializeRecord(JSON.parse(raw) as PersistedLeagueTimeControlRecord);
  } catch {
    const record = getDefaultRecord();
    await writeTimeControl(record);
    return record;
  }
}

export async function getLeagueTimeSnapshot(): Promise<LeagueTimeSnapshot> {
  const control = await getOrCreateLeagueTimeControl();

  return {
    id: control.id,
    originalRealStartAt: control.originalRealStartAt,
    originalSimulatedAt: control.originalSimulatedAt,
    currentRealAnchorAt: control.currentRealAnchorAt,
    currentRealReferenceAt: control.currentRealReferenceAt,
    currentSimulatedAt: control.currentSimulatedAt,
    isPaused: control.isPaused,
    currentSimulatedNow: computeCurrentSimulatedNow(control),
  };
}

export async function getCurrentSimulatedNow() {
  const snapshot = await getLeagueTimeSnapshot();
  return snapshot.currentSimulatedNow;
}

export async function pauseLeagueTime() {
  const control = await getOrCreateLeagueTimeControl();
  const currentSimulatedNow = computeCurrentSimulatedNow(control);
  const now = new Date();
  const nextRecord: LeagueTimeControlRecord = {
    ...control,
    isPaused: true,
    currentSimulatedAt: currentSimulatedNow,
    currentRealAnchorAt: startOfUtcDay(now),
    currentRealReferenceAt: now,
    updatedAt: now,
  };

  await writeTimeControl(nextRecord);
  return nextRecord;
}

export async function resumeLeagueTime() {
  const control = await getOrCreateLeagueTimeControl();
  const now = new Date();
  const nextRecord: LeagueTimeControlRecord = {
    ...control,
    isPaused: false,
    currentSimulatedAt: startOfUtcDay(control.currentSimulatedAt),
    currentRealAnchorAt: startOfUtcDay(now),
    currentRealReferenceAt: now,
    updatedAt: now,
  };

  await writeTimeControl(nextRecord);
  return nextRecord;
}

export async function setLeagueSimulatedTime(nextSimulatedAt: Date) {
  const control = await getOrCreateLeagueTimeControl();
  const now = new Date();
  const nextRecord: LeagueTimeControlRecord = {
    ...control,
    currentSimulatedAt: startOfUtcDay(nextSimulatedAt),
    currentRealAnchorAt: startOfUtcDay(now),
    currentRealReferenceAt: now,
    updatedAt: now,
  };

  await writeTimeControl(nextRecord);
  return nextRecord;
}

export async function setLeagueOriginalMapping(input: {
  realStartAt: Date;
  simulatedStartAt: Date;
}) {
  const control = await getOrCreateLeagueTimeControl();
  const nextRecord: LeagueTimeControlRecord = {
    ...control,
    originalRealStartAt: startOfUtcDay(input.realStartAt),
    originalSimulatedAt: startOfUtcDay(input.simulatedStartAt),
    updatedAt: new Date(),
  };

  await writeTimeControl(nextRecord);
  return nextRecord;
}

export async function resetLeagueTimeToOriginalStart() {
  const control = await getOrCreateLeagueTimeControl();
  const now = new Date();
  const nextRecord: LeagueTimeControlRecord = {
    ...control,
    currentRealAnchorAt: startOfUtcDay(now),
    currentRealReferenceAt: now,
    currentSimulatedAt: startOfUtcDay(control.originalSimulatedAt),
    updatedAt: now,
  };

  await writeTimeControl(nextRecord);
  return nextRecord;
}

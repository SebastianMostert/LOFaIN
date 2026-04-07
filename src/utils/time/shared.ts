import { REAL_MS_PER_NRP_DAY } from "@/utils/time/constants";
import type {
  LeagueTimeControlRecord,
  LeagueTimeSnapshot,
  SerializedLeagueTimeSnapshot,
} from "@/utils/time/types";

export function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

export function addUtcDays(date: Date, days: number) {
  const next = startOfUtcDay(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function copyUtcTimeParts(targetDate: Date, sourceDate: Date) {
  const next = new Date(targetDate);
  next.setUTCHours(
    sourceDate.getUTCHours(),
    sourceDate.getUTCMinutes(),
    sourceDate.getUTCSeconds(),
    sourceDate.getUTCMilliseconds(),
  );
  return next;
}

export function computeCurrentSimulatedNow(
  control: Pick<LeagueTimeControlRecord, "currentRealReferenceAt" | "currentSimulatedAt" | "isPaused">,
) {
  if (control.isPaused) {
    return new Date(control.currentSimulatedAt);
  }

  const now = new Date();
  const elapsedMs = now.getTime() - control.currentRealReferenceAt.getTime();
  const elapsedNrpDays = Math.max(0, Math.floor(elapsedMs / REAL_MS_PER_NRP_DAY));
  const nextDate = addUtcDays(control.currentSimulatedAt, elapsedNrpDays);
  return copyUtcTimeParts(nextDate, now);
}

export function computeSimulatedDateForRealDate(
  realDate: Date,
  control: Pick<LeagueTimeControlRecord, "currentRealAnchorAt" | "currentSimulatedAt">,
) {
  const realAnchor = startOfUtcDay(control.currentRealAnchorAt);
  const simulatedAnchor = startOfUtcDay(control.currentSimulatedAt);
  const realTargetDay = startOfUtcDay(realDate);
  const elapsedRealDays = Math.round((realTargetDay.getTime() - realAnchor.getTime()) / (24 * 60 * 60 * 1000));
  const nextDate = new Date(simulatedAnchor);
  nextDate.setUTCFullYear(nextDate.getUTCFullYear() + elapsedRealDays);
  return copyUtcTimeParts(nextDate, realDate);
}

export function computeDisplayedSimulatedDate(
  snapshot: Pick<SerializedLeagueTimeSnapshot, "isPaused" | "currentRealAnchorAt" | "currentRealReferenceAt" | "currentSimulatedAt">,
) {
  if (snapshot.isPaused) {
    return snapshot.currentSimulatedAt;
  }

  const preciseReferenceAt = snapshot.currentRealReferenceAt || snapshot.currentRealAnchorAt;
  const elapsedMs = Date.now() - new Date(preciseReferenceAt).getTime();
  const elapsedNrpDays = Math.max(0, Math.floor(elapsedMs / REAL_MS_PER_NRP_DAY));
  const next = new Date(snapshot.currentSimulatedAt);
  next.setUTCDate(next.getUTCDate() + elapsedNrpDays);
  next.setUTCHours(0, 0, 0, 0);
  return next.toISOString();
}

export function combineDateWithCurrentUtc(dateValue: string) {
  const date = new Date(dateValue);
  const now = new Date();
  date.setUTCHours(
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds(),
  );
  return date.toISOString();
}

export function getMsUntilNextNrpDay(
  snapshot: Pick<SerializedLeagueTimeSnapshot, "isPaused" | "currentRealAnchorAt" | "currentRealReferenceAt">,
) {
  if (snapshot.isPaused) {
    return null;
  }

  const preciseReferenceAt = snapshot.currentRealReferenceAt || snapshot.currentRealAnchorAt;
  const elapsedMs = Date.now() - new Date(preciseReferenceAt).getTime();
  const elapsedIntoCurrentNrpDay = ((elapsedMs % REAL_MS_PER_NRP_DAY) + REAL_MS_PER_NRP_DAY) % REAL_MS_PER_NRP_DAY;
  const remaining = REAL_MS_PER_NRP_DAY - elapsedIntoCurrentNrpDay;
  return Math.max(250, Math.ceil(remaining));
}

export function serializeLeagueTimeSnapshot(snapshot: LeagueTimeSnapshot): SerializedLeagueTimeSnapshot {
  return {
    id: snapshot.id,
    originalRealStartAt: snapshot.originalRealStartAt.toISOString(),
    originalSimulatedAt: snapshot.originalSimulatedAt.toISOString(),
    currentRealAnchorAt: snapshot.currentRealAnchorAt.toISOString(),
    currentRealReferenceAt: snapshot.currentRealReferenceAt.toISOString(),
    currentSimulatedAt: snapshot.currentSimulatedAt.toISOString(),
    isPaused: snapshot.isPaused,
    currentSimulatedNow: snapshot.currentSimulatedNow.toISOString(),
  };
}

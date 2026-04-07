import type { Session } from "@/auth";

export const ADMIN_USER_IDS = new Set(["68c6d809c8a9c90815475237"]);

export function isAdminSession(session: Session | null) {
  const userId = session?.user.id ?? null;
  return userId ? ADMIN_USER_IDS.has(userId) : false;
}

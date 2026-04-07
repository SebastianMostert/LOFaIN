import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth, getSignInPath } from "@/auth";
import { epunda } from "@/app/fonts";
import TimeAdminControls from "@/components/admin/TimeAdminControls";
import { isAdminSession } from "@/utils/admin";
import { serializeLeagueTimeSnapshot } from "@/utils/time/shared";
import { getLeagueTimeSnapshot } from "@/utils/time/server";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const metadata: Metadata = {
  title: "Time Admin - League",
  description: "Administrative controls for the League time system.",
  alternates: { canonical: `${baseUrl}/admin/time` },
};

export default async function TimeAdminPage() {
  const session = await auth();

  if (!session) {
    redirect(getSignInPath("/admin/time"));
  }

  if (!isAdminSession(session)) {
    notFound();
  }

  const time = await getLeagueTimeSnapshot();
  const serializedTime = serializeLeagueTimeSnapshot(time);

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 text-stone-100">
      <div className="overflow-hidden rounded-[2rem] border border-stone-800 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.16),transparent_28%),linear-gradient(180deg,rgba(28,25,23,0.96),rgba(12,10,9,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
        <div className="h-1.5 w-full bg-cyan-700" />
        <div className="p-6 sm:p-8">
          <div className="text-xs uppercase tracking-[0.32em] text-stone-500">Admin</div>
          <h1 className={`${epunda.className} mt-2 text-4xl text-stone-50`}>Time System</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300">
            Administrative panel for time settings and system controls.
          </p>

          <div className="mt-4">
            <Link
              href="/api/docs"
              className="inline-flex rounded-full border border-stone-700 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-stone-500"
            >
              API docs
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-stone-800/80 bg-stone-950/55 p-4">
              <div className="text-[11px] uppercase tracking-[0.28em] text-stone-500">Signed in as</div>
              <div className="mt-2 text-sm font-medium text-stone-100">
                {session.user.discord?.username ?? session.user.name ?? "Unknown user"}
              </div>
            </div>
          </div>

          <TimeAdminControls
            initialTime={serializedTime}
          />
        </div>
      </div>
    </section>
  );
}

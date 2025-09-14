// app/amendments/page.tsx
import Link from "next/link";
import { prisma } from "@/prisma";
import { epunda } from "@/app/fonts";
import { closeExpiredAmendments } from "@/utils/amendments";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AmendmentsPage() {
    const session = await auth();
    if (!session) redirect("/api/auth/signin?callbackUrl=/amendments");

    await closeExpiredAmendments();
    const items = await prisma.amendment.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            result: true,
            opensAt: true,
            closesAt: true,
            votes: { select: { choice: true } },
        },
    });

    return (
        <main className="mx-auto max-w-6xl px-4 py-10 text-stone-100">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={`${epunda.className} text-3xl font-bold`}>Amendments</h1>
                    <div className="mt-2 h-px w-24 bg-stone-700" />
                </div>

                <Link
                    href="/amendments/new"
                    className="rounded bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-100"
                >
                    Propose Amendment
                </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
                {items.map((a) => {
                    const counts = { AYE: 0, NAY: 0, ABSTAIN: 0, ABSENT: 0 } as Record<string, number>;
                    a.votes.forEach((v) => counts[v.choice]++);
                    const total = counts.AYE + counts.NAY + counts.ABSTAIN + counts.ABSENT || 1;
                    const ayePct = Math.round((counts.AYE / total) * 100);

                    return (
                        <Link
                            key={a.id}
                            href={`/amendments/${a.slug}`}
                            className="rounded-lg border border-stone-700 bg-stone-900 p-5 hover:bg-stone-800"
                        >
                            <div className="text-xs uppercase tracking-wide text-stone-400">{a.status === "OPEN" ? a.status : (a.result ?? a.status)}</div>
                            <h2 className={`${epunda.className} mt-1 text-xl font-semibold`}>{a.title}</h2>
                            {(a.opensAt || a.closesAt) && (
                                <div className="mt-1 text-sm text-stone-400">
                                    {a.opensAt && <>Opens: {new Date(a.opensAt).toLocaleString()} · </>}
                                    {a.closesAt && <>Closes: {new Date(a.closesAt).toLocaleString()}</>}
                                </div>
                            )}
                            <div className="mt-4">
                                <div className="flex justify-between text-xs text-stone-400">
                                    <span>Aye</span>
                                    <span>{counts.AYE}</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-stone-800">
                                    <div
                                        className="h-2 rounded-full bg-emerald-500"
                                        style={{ width: `${ayePct}%` }}
                                    />
                                </div>
                                <div className="mt-1 text-xs text-stone-400">
                                    Nay: {counts.NAY} · Abstain: {counts.ABSTAIN + counts.ABSENT}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </main>
    );
}

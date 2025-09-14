// app/amendments/page.tsx
import Link from "next/link";
import { prisma } from "@/prisma";
import { epunda } from "@/app/fonts";
import { closeExpiredAmendments } from "@/utils/amendments";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AmendmentCard from "@/components/Amendment/AmendmentCard";

export const dynamic = "force-dynamic";

type Choice = "AYE" | "NAY" | "ABSTAIN" | "ABSENT";

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
            status: true,          // "OPEN" | "CLOSED"
            result: true,          // "PASSED" | "FAILED" | null
            eligibleCount: true,   // 👈 used for ABSENT + threshold
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
                    className="rounded-md border border-stone-300/20 bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-white hover:shadow"
                >
                    Propose Amendment
                </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
                {items.map((a) => {
                    const counts = { AYE: 0, NAY: 0, ABSTAIN: 0 } as Record<Exclude<Choice, "ABSENT">, number>;
                    a.votes.forEach((v) => {
                        if (v.choice === "AYE") counts.AYE++;
                        else if (v.choice === "NAY") counts.NAY++;
                        else counts.ABSTAIN++;
                    });

                    const eligible = a.eligibleCount ?? a.votes.length; // fallback if not set

                    return (
                        <AmendmentCard key={a.id} amendment={a} counts={counts} eligible={eligible} />
                    );
                })}
            </div>
        </main>
    );
}
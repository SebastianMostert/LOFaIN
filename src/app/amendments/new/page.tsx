// app/amendments/new/page.tsx
import { prisma } from "@/prisma";
import { epunda } from "@/app/fonts";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import NewAmendmentComposer from "@/components/NewAmendmentComposer";
import { createAmendmentAction } from "@/utils/api/amendments";

export default async function NewAmendmentPage() {
  const session = await auth();
  if (!session) redirect("/api/auth/signin?callbackUrl=/amendments/new");

  const treaty = await prisma.treaty.findUnique({
    where: { slug: "league-treaty-1900" },
    include: {
      articles: {
        orderBy: { order: "asc" },
        select: { id: true, order: true, heading: true, body: true },
      },
    },
  });

  const articles = treaty?.articles ?? [];

  return (
    <main className="mx-auto max-w-[110rem] px-6 py-10 text-stone-100">
      <h1 className={`${epunda.className} text-2xl font-bold`}>Propose an Amendment</h1>
      <p className="mt-2 text-stone-400">
        Any member may propose an amendment. Voting opens immediately, closes after 24 hours, and requires a two-thirds majority.
      </p>

      <NewAmendmentComposer
        articles={articles}
        onSubmit={createAmendmentAction}
      />
    </main>
  );
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { epunda } from "@/app/fonts";
// import { auth } from "@/auth";
import { prisma } from "@/prisma";
import { CouncilSessionUI } from "@/components/CouncilSession";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const [amendment, discussionThread] = await Promise.all([
    prisma.amendment.findUnique({
      where: { slug },
      select: { title: true },
    }),
    prisma.discussionThread.findFirst({
      where: { slug: { in: [slug, `${slug}-discussion`] } },
      select: { title: true },
    }),
  ]);

  const threadTitle = discussionThread?.title ?? amendment?.title ?? slug;
  const description = "Live session tools for League discussions.";
  const url = `${baseUrl}/amendments/${slug}/discussion`;

  return {
    title: `Session • ${threadTitle}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `Session • ${threadTitle}`,
      description,
      url,
    },
  };
}

export default async function AmendmentDiscussionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // const session = await auth();
  // const currentCountryId = session?.user?.countryId ?? null;

  const [amendment, discussionThread, countries] = await Promise.all([
    prisma.amendment.findUnique({
      where: { slug },
      select: { id: true, title: true },
    }),
    prisma.discussionThread.findFirst({
      where: { slug: { in: [slug, `${slug}-discussion`] } },
      select: { id: true, slug: true, title: true },
    }),
    prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ]);

  if (!amendment) {
    notFound();
  }

  const threadId = discussionThread?.id ?? amendment.id;
  const threadTitle = discussionThread?.title ?? amendment.title;
  const threadSlug = discussionThread?.slug ?? `${slug}-discussion`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-stone-100">
      <header className="mb-6">
        <h1 className={`${epunda.className} text-3xl font-extrabold`}>Council Session</h1>
        <p className="mt-2 text-sm text-stone-300">
          Amendment: <span className="font-medium text-stone-100">{amendment.title}</span>
        </p>
        <p className="mt-1 text-sm text-stone-400">
          Discussion thread: <span className="font-medium text-stone-200">{threadTitle}</span>
        </p>
        <p className="mt-1 text-xs text-stone-500">
          Session key: <span className="font-mono text-stone-300">{threadId}</span>
        </p>
        {discussionThread == null && (
          <p className="mt-2 text-xs text-amber-300">
            No dedicated discussion thread found; using amendment context for the live session.
          </p>
        )}
      </header>

      <CouncilSessionUI motionsSuspended connected presentCountries={[]} queuedCountries={[]} recognizedName={null} quorum={countries.length} statusMessage={"R"} statusTone="error" />

      <footer className="mt-8 text-xs text-stone-500">
        <p>
          Viewing live tools for <span className="font-semibold text-stone-300">{threadSlug}</span>.
        </p>
      </footer>
    </main>
  );
}

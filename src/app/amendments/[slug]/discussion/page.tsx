import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { epunda } from "@/app/fonts";
import { auth, getSignInPath } from "@/auth";
import { prisma } from "@/prisma";
import LiveDiscussionSession from "@/components/discussion/LiveDiscussionSession";
import { getChairAssignmentForAmendment } from "@/utils/chair";
import { signDiscussionRealtimeAuth } from "@/utils/discussionRealtime";

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
      select: { title: true, status: true },
    }),
    prisma.discussionThread.findFirst({
      where: { slug: { in: [`amendment-${slug}-discussion`, slug, `${slug}-discussion`] } },
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
  const session = await auth();
  if (!session) redirect(getSignInPath(`/amendments/${slug}/discussion`));

  const [amendment, existingDiscussionThread, countries] = await Promise.all([
    prisma.amendment.findUnique({
      where: { slug },
      select: { id: true, title: true, status: true },
    }),
    prisma.discussionThread.findFirst({
      where: { slug: { in: [`amendment-${slug}-discussion`, slug, `${slug}-discussion`] } },
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

  if (amendment.status === "CLOSED" && existingDiscussionThread == null) {
    notFound();
  }

  const discussionThread = existingDiscussionThread ?? await prisma.discussionThread.upsert({
    where: { slug: `amendment-${slug}-discussion` },
    update: {},
    create: {
      slug: `amendment-${slug}-discussion`,
      title: `Discussion: ${amendment.title}`,
      summary: `Discussion thread for amendment ${slug}`,
      createdByCountryId: session.user.countryId ?? null,
      createdByUserId: session.user.id ?? null,
    },
    select: { id: true, slug: true, title: true },
  });

  const posts = await prisma.discussionPost.findMany({
    where: { threadId: discussionThread.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      parentPostId: true,
      isEdited: true,
      isDeleted: true,
      deletedAt: true,
      editedAt: true,
      createdAt: true,
      updatedAt: true,
      authorUser: { select: { id: true, name: true, image: true } },
      authorCountry: { select: { id: true, name: true, slug: true, code: true, colorHex: true } },
    },
  });

  const threadId = discussionThread.id;
  const chairAssignment = await getChairAssignmentForAmendment(slug);
  const quorumRequired = Math.max(3, Math.ceil(countries.length * 0.5));
  const presidingNote = chairAssignment.effectiveChair.id !== chairAssignment.baseChair.id
    ? `Chair passed temporarily from ${chairAssignment.baseChair.name} to ${chairAssignment.effectiveChair.name} because the scheduled chair's state proposed this amendment.`
    : null;
  const authToken = await signDiscussionRealtimeAuth({
    threadId: discussionThread.id,
    countryId: session.user.countryId ?? "",
    countryName: session.user.country?.name ?? "Unknown country",
    countryCode: session.user.country?.code ?? null,
    userId: session.user.id ?? null,
    userName: session.user.name ?? null,
    canModerate: chairAssignment.effectiveChair.id === session.user.countryId,
    exp: Date.now() + 1000 * 60 * 60 * 6,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-stone-100">
      <header className="mb-8 rounded-[2rem] border border-stone-800 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.15),_transparent_35%),linear-gradient(180deg,_rgba(28,25,23,0.96),_rgba(12,10,9,0.96))] p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-amber-200/80">Council Debate</p>
        <h1 className={`${epunda.className} mt-3 text-3xl font-extrabold`}>{amendment.title}</h1>
        <div className="mt-5 flex flex-wrap gap-3 text-sm text-stone-300">
          <div className="rounded-full border border-stone-700 bg-stone-950/60 px-4 py-2">
            Presiding state: <span className="font-semibold text-stone-100">{chairAssignment.effectiveChair.name}</span>
          </div>
          <div className="rounded-full border border-stone-700 bg-stone-950/60 px-4 py-2">
            Debate quorum: <span className="font-semibold text-stone-100">{quorumRequired} delegations</span>
          </div>
        </div>
        {presidingNote && (
          <p className="mt-4 max-w-3xl rounded-2xl border border-sky-700/60 bg-sky-950/30 px-4 py-3 text-sm text-sky-100">
            {presidingNote}
          </p>
        )}
      </header>

      <LiveDiscussionSession
        threadId={threadId}
        authToken={authToken}
        currentCountryId={session.user.countryId ?? null}
        quorumRequired={quorumRequired}
        initialPosts={posts.map((post) => ({
          ...post,
          deletedAt: post.deletedAt ? post.deletedAt.toISOString() : null,
          editedAt: post.editedAt ? post.editedAt.toISOString() : null,
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
        }))}
        initialPresentCountries={[]}
        initialQueuedCountries={[]}
        initialRecognizedSpeaker={null}
        canModerate={chairAssignment.effectiveChair.id === session.user.countryId}
      />
    </main>
  );
}

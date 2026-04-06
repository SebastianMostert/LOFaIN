import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth, getSignInPath } from "@/auth";
import { prisma } from "@/prisma";
import LiveDiscussionSession from "@/components/discussion/LiveDiscussionSession";
import { getChairAssignmentForAmendment } from "@/utils/chair";
import { discussionPostPayloadSelect, toDiscussionPostPayloads } from "@/utils/discussionPostPayload";
import type { DiscussionSystemEntry } from "@/utils/discussionRealtime";
import { signDiscussionRealtimeAuth } from "@/utils/discussionRealtime";
import { finalizeDueMotionsForThread } from "@/utils/motionLifecycle";
import { motionPayloadSelect, toDiscussionMotionPayload } from "@/utils/motionPayload";
import { loadDiscussionRoomState, toDiscussionSystemEntry } from "@/utils/queueChairActions";
import { formatArticleHeading, stripArticlePrefix } from "@/utils/articleHeadings";

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
      select: {
        id: true,
        title: true,
        status: true,
        rationale: true,
        op: true,
        newHeading: true,
        newBody: true,
        newOrder: true,
        targetArticleId: true,
      },
    }),
    prisma.discussionThread.findFirst({
      where: { slug: { in: [`amendment-${slug}-discussion`, slug, `${slug}-discussion`] } },
      select: { id: true, slug: true, title: true, debatePhase: true, isLocked: true, isPinned: true, isArchived: true },
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
    select: { id: true, slug: true, title: true, debatePhase: true, isLocked: true, isPinned: true, isArchived: true },
  });

  const threadId = discussionThread.id;
  const chairAssignment = await getChairAssignmentForAmendment(slug);
  await finalizeDueMotionsForThread(threadId);
  const targetArticle = amendment.targetArticleId
    ? await prisma.article.findUnique({
      where: { id: amendment.targetArticleId },
      select: { id: true, order: true, heading: true, body: true },
    })
    : null;
  const [posts, chairLogs, roomState, motions, liveThreadState] = await Promise.all([
    prisma.discussionPost.findMany({
      where: { threadId: discussionThread.id },
      orderBy: { createdAt: "asc" },
      select: discussionPostPayloadSelect,
    }),
    prisma.chairActionLog.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        type: true,
        note: true,
        createdAt: true,
        metadata: true,
        actorCountry: { select: { name: true } },
      },
    }),
    loadDiscussionRoomState(threadId).catch(() => ({
      presentCountries: [],
      queuedCountries: [],
      recognizedSpeaker: null,
      recognizedAt: null,
    })),
    prisma.modMotion.findMany({
      where: { targetThreadId: threadId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: motionPayloadSelect,
    }),
    prisma.discussionThread.findUnique({
      where: { id: threadId },
      select: { debatePhase: true, isLocked: true, isPinned: true, isArchived: true },
    }),
  ]);
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
    <main className="mx-auto max-w-[1680px] px-6 py-8 text-stone-100 2xl:max-w-[1820px]">
      <LiveDiscussionSession
        threadId={threadId}
        authToken={authToken}
        currentCountryId={session.user.countryId ?? null}
        quorumRequired={quorumRequired}
        presidingStateName={chairAssignment.effectiveChair.name}
        presidingNote={presidingNote}
        proposal={{
          title: amendment.title,
          rationale: amendment.rationale ?? null,
          op: amendment.op,
          targetArticleHeading: targetArticle
            ? formatArticleHeading(targetArticle.order, targetArticle.heading)
            : null,
          proposedHeading: amendment.newHeading
            ? (
              targetArticle
                ? formatArticleHeading(targetArticle.order, amendment.newHeading)
                : amendment.newOrder
                  ? formatArticleHeading(amendment.newOrder, amendment.newHeading)
                  : stripArticlePrefix(amendment.newHeading)
            )
            : null,
          proposedBody: amendment.newBody ?? null,
          currentBody: targetArticle?.body ?? null,
        }}
        initialPosts={await toDiscussionPostPayloads(posts)}
        availableCountries={countries.map((country) => ({
          id: country.id,
          name: country.name,
        }))}
        initialSystemEntries={chairLogs
          .map((log) => toDiscussionSystemEntry({
            ...log,
            actorCountryName: log.actorCountry?.name ?? null,
          }))
          .filter((entry): entry is DiscussionSystemEntry => entry !== null)}
        initialPresentCountries={roomState.presentCountries}
        initialQueuedCountries={roomState.queuedCountries}
        initialRecognizedSpeaker={roomState.recognizedSpeaker}
        initialRecognizedAt={roomState.recognizedAt}
        initialThreadState={{
          debatePhase: liveThreadState?.debatePhase ?? discussionThread.debatePhase,
          isLocked: liveThreadState?.isLocked ?? discussionThread.isLocked,
          isPinned: liveThreadState?.isPinned ?? discussionThread.isPinned,
          isArchived: liveThreadState?.isArchived ?? discussionThread.isArchived,
        }}
        initialMotions={motions.map((motion) => toDiscussionMotionPayload(motion))}
        canModerate={chairAssignment.effectiveChair.id === session.user.countryId}
      />
    </main>
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/prisma";
import { stripArticlePrefix } from "@/utils/articleHeadings";
import seedTreaty from "../../../prisma/treaty.json";

type TreatyArticle = {
  id: string;
  order: number;
  heading: string;
  body: string;
};

type TreatySnapshot = {
  id: string;
  label: string;
  date: Date | null;
  summary: string;
  sourceAmendmentSlug: string | null;
  sourceAmendmentTitle: string | null;
  articles: TreatyArticle[];
  preamble: string | null;
};

function getFoundingTreaty() {
  return {
    adoptedAt: seedTreaty.adoptedAt,
    preamble: seedTreaty.preamble ?? null,
    articles: seedTreaty.articles
      .filter((article) => article.order <= 11)
      .map((article) => {
        if (article.order === 2) {
          return {
            ...article,
            body:
              "1. In case of attack by, or imminent threat of attack by, a foreign Power on one or more of the Parties, or in case of danger to their independence, territorial integrity, or political sovereignty in any form, the other Parties will, upon the formal request of the Party or Parties so attacked or imperilled, render assistance immediately.\n2. The above help will comprise but not be limited to the deployment of military and naval troops, the supply of weapons and ammunitions and the exchange of intelligence that is required in the defence of the Party that is under threat.\n3. The extent, scope, and length of this support will be determined through mutual consent between the Parties with regard to the gravity of the threat, the geographical situation, and the abilities of each Party at the time.\n4. The Parties also undertake to consult immediately in case of any event which, in the judgment of one or more Parties, may result in armed conflict between a or multiple Members of the League and another or multiple other states, with the object of affording mutual assistance and preventing armed conflict before it shall have had time to develop.",
          };
        }

        if (article.order === 4) {
          return {
            ...article,
            body:
              "1. The Parties will exchange officers, engineers, and instructors to share knowledge and training methods.\n2. They will assist each other in acquiring and supplying arms, ammunition, and other military equipment on agreed terms.\n3. The French Republic will make available to the USSR and Italy its most effective military systems and industrial processes.\n4. The USSR and Italy will supply France with raw materials and resources necessary for mutual military and industrial benefit.",
          };
        }

        if (article.order === 6) {
          return {
            ...article,
            heading: "Colonial Consultation",
            body:
              "1. The Parties will inform and consult one another before taking possession of any territory or establishing a protectorate.\n2. They will recognise and respect each other's agreed spheres of influence.\n3. The Parties will work to avoid rivalry or conflict over colonial or territorial matters.",
          };
        }

        if (article.order === 11) {
          return {
            ...article,
            body:
              "1. Any Party can suggest amendments or additions to this Treaty by sending the suggestion in writing to all other Parties.\n2. The proposed amendment or addition shall be discussed in a formal conference, comprised of all Parties convened for that purpose within no more than six months of the proposal being submitted.\n3. Adoption of an amendment or addition will need to be approved by at least two-thirds of all Parties, including the unanimous consent of all three founding Parties of the League.\n4. Any such amendment or addition so adopted shall come into force within no more than 30 days upon ratification.\n5. The original texts of all amendments or additions adopted shall be deposited together with the original Treaty and shall have equal legal force.",
          };
        }

        return article;
      }),
  };
}

function cloneArticles(articles: TreatyArticle[]) {
  return articles.map((article) => ({ ...article }));
}

function upsertArticleOrder(articles: TreatyArticle[]) {
  articles.forEach((article, index) => {
    article.order = index + 1;
  });
}

function applyAmendment(
  articles: TreatyArticle[],
  amendment: {
    slug: string;
    op: "ADD" | "EDIT" | "REMOVE";
    targetArticleId: string | null;
    newHeading: string | null;
    newBody: string | null;
    newOrder: number | null;
    currentTargetOrder: number | null;
  },
) {
  const next = cloneArticles(articles);
  const byIdIndex = amendment.targetArticleId ? next.findIndex((article) => article.id === amendment.targetArticleId) : -1;
  const byOrderIndex =
    byIdIndex >= 0 || amendment.currentTargetOrder == null
      ? -1
      : next.findIndex((article) => article.order === amendment.currentTargetOrder);
  const targetIndex = byIdIndex >= 0 ? byIdIndex : byOrderIndex;

  if (amendment.op === "ADD") {
    if (!amendment.newHeading || !amendment.newBody) return next;
    const insertAt = amendment.newOrder ? Math.max(0, Math.min(next.length, amendment.newOrder - 1)) : next.length;
    next.splice(insertAt, 0, {
      id: amendment.targetArticleId ?? `amendment:${amendment.slug}`,
      order: insertAt + 1,
      heading: amendment.newHeading,
      
      body: amendment.newBody,
    });
    upsertArticleOrder(next);
    return next;
  }

  if (targetIndex < 0) return next;

  if (amendment.op === "EDIT") {
    next[targetIndex] = {
      ...next[targetIndex],
      heading: amendment.newHeading ? stripArticlePrefix(amendment.newHeading) : next[targetIndex].heading,
      body: amendment.newBody ?? next[targetIndex].body,
    };
    return next;
  }

  if (amendment.op === "REMOVE") {
    next.splice(targetIndex, 1);
    upsertArticleOrder(next);
  }

  return next;
}

export async function getLeagueTreaty() {
  const slug = "league-treaty-1900";
  const [treaty, currentArticles] = await Promise.all([
    prisma.treaty.findUnique({
      where: { slug },
      select: {
        title: true,
        adoptedAt: true,
      },
    }),
    prisma.article.findMany({
      where: { treaty: { slug } },
      select: {
        id: true,
        order: true,
      },
    }),
  ]);

  if (!treaty) notFound();

  const currentOrderByArticleId = new Map(currentArticles.map((article) => [article.id, article.order]));

  const passedAmendments = await prisma.amendment.findMany({
    where: {
      treaty: { slug },
      status: "CLOSED",
      result: "PASSED",
    },
    select: {
      slug: true,
      title: true,
      op: true,
      targetArticleId: true,
      newHeading: true,
      newBody: true,
      newOrder: true,
      createdAt: true,
      closesAt: true,
    },
    orderBy: [{ closesAt: "asc" }, { createdAt: "asc" }],
  });

  const foundingTreaty = getFoundingTreaty();

  let workingArticles: TreatyArticle[] = foundingTreaty.articles.map((article) => ({
    id: `seed:${article.order}`,
    order: article.order,
    heading: stripArticlePrefix(article.heading),
    body: article.body,
  }));

  const snapshots: TreatySnapshot[] = [
    {
      id: "founding",
      label: "Founding text",
      date: treaty.adoptedAt ?? new Date(foundingTreaty.adoptedAt),
      summary: "Treaty as adopted at Versailles.",
      sourceAmendmentSlug: null,
      sourceAmendmentTitle: null,
      preamble: foundingTreaty.preamble,
      articles: cloneArticles(workingArticles),
    },
  ];

  passedAmendments.forEach((amendment, index) => {
    workingArticles = applyAmendment(workingArticles, {
      slug: amendment.slug,
      op: amendment.op,
      targetArticleId: amendment.targetArticleId,
      newHeading: amendment.newHeading ? stripArticlePrefix(amendment.newHeading) : null,
      newBody: amendment.newBody,
      newOrder: amendment.newOrder,
      currentTargetOrder: amendment.targetArticleId ? currentOrderByArticleId.get(amendment.targetArticleId) ?? null : null,
    });

    snapshots.push({
      id: amendment.slug,
      label: `Revision ${index + 1}`,
      date: amendment.closesAt ?? amendment.createdAt,
      summary: amendment.title,
      sourceAmendmentSlug: amendment.slug,
      sourceAmendmentTitle: amendment.title,
      preamble: foundingTreaty.preamble,
      articles: cloneArticles(workingArticles),
    });
  });

  return {
    title: treaty.title,
    adoptedAt: treaty.adoptedAt,
    snapshots,
  };
}

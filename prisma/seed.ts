import { prisma } from "@/prisma";
import fs from "fs";
import path from "path";

type VoteChoice = "AYE" | "NAY" | "ABSTAIN" | "ABSENT";

const countrySeeds = [
  {
    name: "French Third Republic",
    slug: "france",
    code: "fr",
    colorHex: "#3f5d45",
    isActive: true,
    hasVeto: true,
  },
  {
    name: "Kingdom of Italy",
    slug: "italy",
    code: "it",
    colorHex: "#4f7055",
    isActive: true,
    hasVeto: true,
  },
  {
    name: "Kingdom of Poland",
    slug: "poland",
    code: "pl",
    colorHex: "#6a3d3d",
    isActive: true,
    hasVeto: false,
  },
  {
    name: "Union of Soviet Socialist Republics",
    slug: "ussr",
    code: "su",
    colorHex: "#6e2e2e",
    isActive: true,
    hasVeto: true,
  },
  {
    name: "Empire of Japan",
    slug: "japan",
    code: "jp",
    colorHex: "#7c3f3f",
    isActive: true,
    hasVeto: false,
  },
  {
    name: "United Mexican States",
    slug: "mexico",
    code: "mx",
    colorHex: "#556b4d",
    isActive: false,
    hasVeto: false,
  },
];

const discordMappings = [
  { discordId: "829854210866675784", slug: "fr" },
  { discordId: "775696234392453171", slug: "it" },
  { discordId: "499614540162400257", slug: "pl" },
  { discordId: "875417608948703313", slug: "su" },
  { discordId: "1074127426289938513", slug: "jp" },
];

const atNoonUtc = (date: string) => new Date(`${date}T12:00:00.000Z`);

async function main() {
  const countries = await Promise.all(
    countrySeeds.map((country) =>
      prisma.country.upsert({
        where: { slug: country.slug },
        update: {
          name: country.name,
          code: country.code,
          colorHex: country.colorHex,
          isActive: country.isActive,
          hasVeto: country.hasVeto,
        },
        create: country,
      }),
    ),
  );

  const countriesBySlug = new Map(countries.map((country) => [country.slug, country]));

  for (const mapping of discordMappings) {
    const country = countriesBySlug.get(mapping.slug);
    if (!country) continue;

    await prisma.countryMapping.upsert({
      where: { discordId: mapping.discordId },
      update: { countryId: country.id },
      create: { discordId: mapping.discordId, countryId: country.id },
    });
  }

  console.log(`Seeded ${countries.length} countries and Discord mappings.`);

  const filePath = path.join(__dirname, "treaty.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
    title: string;
    slug: string;
    adopted: boolean;
    adoptedAt?: string;
    preamble?: string;
    articles: { order: number; heading: string; body: string }[];
  };

  const treaty = await prisma.treaty.upsert({
    where: { slug: data.slug },
    update: {
      title: data.title,
      adopted: data.adopted,
      adoptedAt: data.adoptedAt ? new Date(data.adoptedAt) : null,
      preamble: data.preamble ?? null,
    },
    create: {
      title: data.title,
      slug: data.slug,
      adopted: data.adopted,
      adoptedAt: data.adoptedAt ? new Date(data.adoptedAt) : null,
      preamble: data.preamble ?? null,
    },
  });

  await prisma.amendment.deleteMany({ where: { treatyId: treaty.id } });
  await prisma.article.deleteMany({ where: { treatyId: treaty.id } });

  const articlesByOrder = new Map<number, { id: string; order: number; heading: string; body: string }>();
  for (const article of data.articles) {
    const created = await prisma.article.create({
      data: {
        treatyId: treaty.id,
        order: article.order,
        heading: article.heading,
        body: article.body,
      },
    });
    articlesByOrder.set(article.order, created);
  }

  console.log(`Seeded treaty "${treaty.title}" with ${data.articles.length} articles.`);

  const article2 = articlesByOrder.get(2)!;
  const article4 = articlesByOrder.get(4)!;
  const article6 = articlesByOrder.get(6)!;
  const article11 = articlesByOrder.get(11)!;
  const article12 = articlesByOrder.get(12)!;
  const article13 = articlesByOrder.get(13)!;
  const article14 = articlesByOrder.get(14)!;

  const proposerCountryId = countriesBySlug.get("ussr")!.id;
  const preMexicoExitEligible = 6;
  const postMexicoExitEligible = 5;

  const createHistoricalAmendment = async ({
    slug,
    title,
    rationale,
    op,
    date,
    targetArticleId = null,
    newHeading = null,
    newBody = null,
    newOrder = null,
    result,
    failureReason = null,
    eligibleCount,
    votes,
  }: {
    slug: string;
    title: string;
    rationale: string | null;
    op: "ADD" | "EDIT" | "REMOVE";
    date: string;
    targetArticleId?: string | null;
    newHeading?: string | null;
    newBody?: string | null;
    newOrder?: number | null;
    result: "PASSED" | "FAILED";
    failureReason?: string | null;
    eligibleCount: number;
    votes: Array<{ slug: string; choice: VoteChoice }>;
  }) => {
    const closesAt = atNoonUtc(date);

    await prisma.amendment.create({
      data: {
        treatyId: treaty.id,
        targetArticleId,
        op,
        slug,
        title,
        rationale,
        newHeading,
        newBody,
        newOrder,
        status: "CLOSED",
        result,
        opensAt: closesAt,
        closesAt,
        eligibleCount,
        quorum: 0,
        failureReason,
        proposerCountryId,
        votes: {
          create: votes.map((vote) => ({
            countryId: countriesBySlug.get(vote.slug)!.id,
            choice: vote.choice,
            createdAt: closesAt,
          })),
        },
      },
    });
  };

  const allSixAye = ["france", "italy", "poland", "ussr", "japan", "mexico"].map((slug) => ({
    slug,
    choice: "AYE" as const,
  }));

  await createHistoricalAmendment({
    slug: "amendment-001-1878",
    title: "First Amendment Proposal to the Treaty of the League of Free and Independent Nations",
    rationale: "To extend mutual defence obligations to economic aggression alongside military threats",
    op: "EDIT",
    date: "1878-11-29",
    targetArticleId: article2.id,
    newHeading: article2.heading,
    newBody: article2.body,
    result: "PASSED",
    eligibleCount: preMexicoExitEligible,
    votes: allSixAye,
  });

  await createHistoricalAmendment({
    slug: "amendment-002-1878",
    title: "Second Amendment Proposal to the Treaty of the League of Free and Independent Nations",
    rationale:
      "To improve the League's collective military preparedness and ensure that all Parties can operate effectively together in the event of conflict.",
    op: "EDIT",
    date: "1878-12-06",
    targetArticleId: article4.id,
    newHeading: article4.heading,
    newBody: article4.body,
    result: "PASSED",
    eligibleCount: preMexicoExitEligible,
    votes: allSixAye,
  });

  await createHistoricalAmendment({
    slug: "amendment-003-1878",
    title: "Third Amendment Proposal to the Treaty of the League of Free and Independent Nations",
    rationale:
      "To clarify the provisions already outlined in Article XI of the treaty and to ensure that the founding Parties retain decisive authority over League action.",
    op: "EDIT",
    date: "1878-12-06",
    targetArticleId: article11.id,
    newHeading: article11.heading,
    newBody: article11.body,
    result: "PASSED",
    eligibleCount: preMexicoExitEligible,
    votes: allSixAye,
  });

  await createHistoricalAmendment({
    slug: "amendment-001-1879",
    title: "Fourth Amendment Proposal to the Treaty of the League of Free and Independent Nations",
    rationale:
      "To broaden the scope of Article VI beyond colonial acquisitions and ensure territorial expansion remains subject to League oversight.",
    op: "EDIT",
    date: "1879-07-10",
    targetArticleId: article6.id,
    newHeading: article6.heading,
    newBody: article6.body,
    result: "PASSED",
    eligibleCount: preMexicoExitEligible,
    votes: allSixAye,
  });

  await createHistoricalAmendment({
    slug: "amendment-001-1884",
    title: "Fifth Amendment Proposal to the Treaty of the League of Free and Independent Nations",
    rationale: null,
    op: "ADD",
    date: "1884-12-06",
    newHeading: article12.heading,
    newBody: article12.body,
    newOrder: 12,
    result: "PASSED",
    eligibleCount: preMexicoExitEligible,
    votes: [
      { slug: "france", choice: "AYE" },
      { slug: "italy", choice: "AYE" },
      { slug: "poland", choice: "AYE" },
      { slug: "ussr", choice: "AYE" },
      { slug: "japan", choice: "ABSENT" },
      { slug: "mexico", choice: "ABSENT" },
    ],
  });

  await createHistoricalAmendment({
    slug: "amendment-001-1891",
    title: "Sixth Amendment Proposal to the Treaty of the League of Free and Independent Nations",
    rationale:
      "The current Treaty does not establish intermediate disciplinary measures. The current wording leaves the League without adequate means to respond to violations short of the most extreme measures. This amendment aims to provide the League with an adequate and detailed system of enforcement, ensuring that breaches can be corrected quickly and fairly.",
    op: "ADD",
    date: "1891-07-10",
    newHeading: article13.heading,
    newBody:
      "1. Any Party which has been accused, by one or more other Parties, to have violated the obligations of this Treaty shall be subject to investigation by a special Commission of the League, composed of one representative from each other Party. The Commission shall submit its findings within three months.\n2. Upon confirmation of a breach, the League may, by a two-thirds vote of all Parties, impose one or more of the following measures:\n(a) Formal Reprimand: An official censure recorded in the archives of the League;\n(b) Public Disclosure: Publication of the violation and its circumstances in a report circulated to all Parties and, if agreed, made public beyond the League;\n(c) Suspension of Benefits: Temporary suspension of economic, industrial, or military cooperation under Articles IV, V, and XII;\n(d) Restriction of Participation: Loss of voting rights in League commissions, councils, or conferences for a period not exceeding twelve months;\n(e) Financial Penalty: Payment of compensation to the injured Party or to a common League fund;\n(f) Trade Limitations: Imposition of restrictions on preferential trade or tariffs otherwise granted under League agreements;\n(g) Suspension of Military Assistance: Withholding of arms, munitions, instructors, or other forms of defence cooperation until compliance is restored;\n(h) Suspension of League Offices: temporary removal of the offending Party's representatives from chairmanships or commissions;\n(i) Quotas or Restrictions: Imposition of limits on the Party's access to shared resources or projects of the League;\n(j) Expulsion: In the case of grave and repeated violations, as already provided under Article VIII, Clause 2.\n3. A Party under sanction shall remain bound by all other obligations of this Treaty during the period of disciplinary measures, unless expressly released from them by unanimous agreement of the other Parties.\n4. Rights and privileges suspended under this Article shall be restored immediately upon the completion of the sanction period or upon the decision of the League.",
    newOrder: 13,
    result: "PASSED",
    eligibleCount: preMexicoExitEligible,
    votes: [
      { slug: "france", choice: "ABSENT" },
      { slug: "italy", choice: "AYE" },
      { slug: "poland", choice: "AYE" },
      { slug: "ussr", choice: "AYE" },
      { slug: "japan", choice: "AYE" },
      { slug: "mexico", choice: "ABSENT" },
    ],
  });

  await createHistoricalAmendment({
    slug: "amendment-001-1903",
    title: "Seventh Amendment Proposal to the Treaty of the League of Free and Independent Nations",
    rationale:
      "This amendment aims to position the League not only upon material foundations, mutual defence and economic cooperation, but also upon the moral foundations of justice, dignity, and humanity.",
    op: "ADD",
    date: "1903-03-14",
    newHeading: article14.heading,
    newBody:
      "1. The High Contracting Parties affirm that the independence, sovereignty, and equality of all nations, whether great or small, are principles to be respected, and that no Party shall pursue conquest, annexation, or subjugation except by the free and lawful will of their peoples.\n2. The High Contracting Parties jointly condemn slavery, the trade in human beings, and all practices that treat persons as property. They pledge, each within their power, to oppose such practices wherever encountered and to support efforts aimed at their gradual and universal abolition.\n3. No Party shall, in the conduct of war or in the administration of occupied territory, commit acts of deliberate cruelty, extermination, or devastation against civilian populations. The deliberate destruction of towns, villages, harvests, or means of subsistence, not justified by direct military necessity, shall be considered contrary to this Treaty.\n4. The High Contracting Parties undertake to uphold the principle that all peoples, within the territories under their authority, shall be allowed the pursuit of livelihood, the practice of religion, and the preservation of language and culture, subject only to such limitations as are required for public order and the common welfare.\n5. Any violation of this Article, once established by the procedures of Article XIII, shall be deemed a breach of the fundamental spirit of the League, and may result in the measures provided therein.\n6. The High Contracting Parties affirm that doctrines or policies which seek the systematic persecution, exclusion, or extermination of peoples by reason of their race, faith, language, or class are incompatible with the spirit of this Treaty. No Party shall permit such doctrines to govern its laws or conduct, and their adoption shall be deemed a breach of this Treaty.",
    newOrder: 14,
    result: "FAILED",
    failureReason: "Threshold not met: 3 of 4 required",
    eligibleCount: postMexicoExitEligible,
    votes: [
      { slug: "france", choice: "AYE" },
      { slug: "italy", choice: "ABSTAIN" },
      { slug: "poland", choice: "ABSTAIN" },
      { slug: "ussr", choice: "AYE" },
      { slug: "japan", choice: "AYE" },
    ],
  });

  await createHistoricalAmendment({
    slug: "amendment-002-1903",
    title: "Seventh Amendment Proposal to the Treaty of the League of Free and Independent Nations",
    rationale:
      "This amendment aims to position the League not only upon material foundations, mutual defence and economic cooperation, but also upon the moral foundations of justice, dignity, and humanity.",
    op: "ADD",
    date: "1903-03-14",
    newHeading: article14.heading,
    newBody: article14.body,
    newOrder: 14,
    result: "PASSED",
    eligibleCount: postMexicoExitEligible,
    votes: [
      { slug: "france", choice: "AYE" },
      { slug: "italy", choice: "ABSTAIN" },
      { slug: "poland", choice: "AYE" },
      { slug: "ussr", choice: "AYE" },
      { slug: "japan", choice: "AYE" },
    ],
  });

  console.log("Seeded historical amendment ledger.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

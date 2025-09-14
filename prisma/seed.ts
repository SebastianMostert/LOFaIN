// prisma/seed.ts
import { prisma } from "@/prisma";
import fs from "fs";
import path from "path";

async function main() {
  // Countries
  const fra = await prisma.country.upsert({
    where: { slug: "france" },
    update: {},
    create: {
      name: "French Third Republic",
      slug: "france",
      code: "FRA",
      colorHex: "#3f5d45", // muted olive/greenish
    },
  });

  const ita = await prisma.country.upsert({
    where: { slug: "italy" },
    update: {},
    create: {
      name: "Kingdom of Italy",
      slug: "italy",
      code: "ITA",
      colorHex: "#4f7055", // muted green
    },
  });

  const pol = await prisma.country.upsert({
    where: { slug: "poland" },
    update: {},
    create: {
      name: "Kingdom of Poland",
      slug: "poland",
      code: "POL",
      colorHex: "#6a3d3d", // muted reddish
    },
  });

  const ussr = await prisma.country.upsert({
    where: { slug: "ussr" },
    update: {},
    create: {
      name: "Union of Soviet Socialist Republics",
      slug: "ussr",
      code: "USSR",
      colorHex: "#6e2e2e", // deep burgundy
    },
  });

  const jpn = await prisma.country.upsert({
    where: { slug: "japan" },
    update: {},
    create: {
      name: "Empire of Japan",
      slug: "japan",
      code: "JPN",
      colorHex: "#7c3f3f", // muted red
    },
  });

  // Discord → Country mappings
  await prisma.countryMapping.upsert({
    where: { discordId: "829854210866675784" },
    update: { countryId: fra.id },
    create: { discordId: "829854210866675784", countryId: fra.id },
  });

  await prisma.countryMapping.upsert({
    where: { discordId: "775696234392453171" },
    update: { countryId: ita.id },
    create: { discordId: "775696234392453171", countryId: ita.id },
  });

  await prisma.countryMapping.upsert({
    where: { discordId: "499614540162400257" },
    update: { countryId: pol.id },
    create: { discordId: "499614540162400257", countryId: pol.id },
  });

  await prisma.countryMapping.upsert({
    where: { discordId: "875417608948703313" },
    update: { countryId: ussr.id },
    create: { discordId: "875417608948703313", countryId: ussr.id },
  });

  await prisma.countryMapping.upsert({
    where: { discordId: "1074127426289938513" },
    update: { countryId: jpn.id },
    create: { discordId: "1074127426289938513", countryId: jpn.id },
  });

  console.log("Seeded 5 countries and Discord mappings ✅");


  const filePath = path.join(__dirname, "treaty.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // Upsert treaty
  const treaty = await prisma.treaty.upsert({
    where: { slug: data.slug },
    update: {},
    create: {
      title: data.title,
      slug: data.slug,
      adopted: data.adopted,
      adoptedAt: data.adoptedAt ? new Date(data.adoptedAt) : null,
      preamble: data.preamble ?? null,
    },
  });

  // Clear old articles (idempotent reset)
  await prisma.article.deleteMany({ where: { treatyId: treaty.id } });

  // Insert articles in order
  for (const a of data.articles) {
    await prisma.article.create({
      data: {
        treatyId: treaty.id,
        order: a.order,
        heading: a.heading,
        body: a.body,
      },
    });
  }

  console.log(`✅ Seeded treaty "${treaty.title}" with ${data.articles.length} articles.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

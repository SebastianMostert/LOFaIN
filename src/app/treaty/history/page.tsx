import type { Metadata } from "next";
import TreatyClient from "../TreatyClient";
import { getLeagueTreaty } from "../data";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const metadata: Metadata = {
  title: "Treaty History - League",
  description: "Browse historical versions of the League treaty.",
  keywords: ["treaty", "history", "league", "amendments"],
  alternates: { canonical: `${baseUrl}/treaty/history` },
  openGraph: {
    title: "Treaty History - League",
    description: "Browse historical versions of the League treaty.",
    url: `${baseUrl}/treaty/history`,
    images: [{ url: `${baseUrl}/logo.png`, alt: "League logo" }],
  },
};

export default async function TreatyHistoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const treaty = await getLeagueTreaty();
  const params = (await searchParams) ?? {};
  const requestedVersion = typeof params.version === "string" ? params.version : undefined;

  return (
    <TreatyClient
      treaty={treaty}
      initialSnapshotId={requestedVersion}
      showHistoryChooser
    />
  );
}

import type { Metadata } from "next";
import TimeApiDocs from "@/components/api/TimeApiDocs";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const metadata: Metadata = {
  title: "API Docs - League",
  description: "Public API reference for League endpoints.",
  alternates: { canonical: `${baseUrl}/api/docs` },
};

export default function TimeApiDocsPage() {
  return (
    <>
      <style>{`
        .site-header {
          display: none;
        }
        .site-footer {
          display: none;
        }
      `}</style>
      <section className="h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(8,58,87,0.2),transparent_22%),linear-gradient(180deg,#07111d_0%,#0b1726_45%,#102338_100%)] px-0 py-0">
        <div className="h-full w-full">
          <TimeApiDocs />
        </div>
      </section>
    </>
  );
}

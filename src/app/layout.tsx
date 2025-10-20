

// ------------------------------------------------------------
// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "../components/Header";

// Use a serif font for an early-1900s feel
import { epunda } from "@/app/fonts"; // <-- local font helper
import Footer from "../components/Footer";
import { getPublicBaseUrl } from "@/utils/baseUrl";

const baseUrl = getPublicBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "League Treaty Portal",
    template: "%s • League Treaty Portal",
  },
  description:
    "The Treaty of the League of Free and Independent Nations, established in 1900 as a collective defense pact.",
  keywords: [
    "League",
    "treaty",
    "vote",
    "defense pact",
    "roleplay",
    "parliament",
  ],
  openGraph: {
    title: "League Treaty Portal",
    description:
      "The Treaty of the League of Free and Independent Nations, established in 1900 as a collective defense pact.",
    url: baseUrl,
    siteName: "League Treaty Portal",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "League Treaty Portal",
    description:
      "The Treaty of the League of Free and Independent Nations, established in 1900 as a collective defense pact.",
  },
  icons: {
    icon: "/favico.svg",
    shortcut: "/favico.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${epunda.className} min-h-dvh bg-stone-950 text-stone-100 antialiased`}> 
        <div className="relative flex min-h-dvh flex-col">
          {/* Top Nav */}
          <Header />

          {/* Main */}
          <main className="flex-1">{children}</main>

          {/* Footer */}
          <Footer />
        </div>
      </body>
    </html>
  );
}



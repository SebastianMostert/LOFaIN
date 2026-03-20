import type { NextConfig } from "next";

// Some Node runtimes expose a malformed global localStorage in server mode.
// Next dev code checks only for existence, so remove the broken shim early.
if (
  typeof window === "undefined" &&
  "localStorage" in globalThis &&
  typeof (globalThis as { localStorage?: { getItem?: unknown } }).localStorage?.getItem !== "function"
) {
  try {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  } catch {
    (globalThis as { localStorage?: undefined }).localStorage = undefined;
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

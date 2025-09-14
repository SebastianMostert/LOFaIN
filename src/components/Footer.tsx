import React from "react";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="border-t border-stone-700 py-8 bg-stone-950">
      <div className="mx-auto max-w-6xl px-4 text-sm text-stone-400">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>© 1900 League Treaty Portal • Rendered in Next.js &amp; TypeScript</p>
          <div className="flex items-center gap-4">
            <Link href="/about" className="hover:text-stone-200">
              About
            </Link>
            <Link href="/faq" className="hover:text-stone-200">
              FAQ
            </Link>
            <Link
              href="https://github.com/nrp-vote-website#public-api"
              className="hover:text-stone-200"
            >
              API
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


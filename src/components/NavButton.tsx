"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavButton({ href, label }: { href: string; label: string; }) {
    const pathname = usePathname();
    const active = pathname === href;

    return (
        <Link
            href={href}
            className="rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-transform active:translate-y-0.5"
            style={{
                background: active
                    ? "linear-gradient(180deg, #0f5f8c 0%, #0b4b70 100%)"
                    : "linear-gradient(180deg, #0d5a86 0%, #0a4566 100%)",
                boxShadow: "0 3px 6px rgba(0,0,0,0.45)",
            }}
        >
            {label}
        </Link>
    );
};

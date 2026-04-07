"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavButton({ href, label }: { href: string; label: string; }) {
    const pathname = usePathname();
    const active = pathname === href;

    return (
        <Link
            href={href}
            className="inline-flex rounded-[0.6rem] bg-[#083a57] p-[2.5px] shadow-[0_8px_18px_rgba(0,0,0,0.22)] transition hover:scale-[1.02] active:translate-y-0.5 sm:p-[5px]"
        >
            <span
                className={`inline-flex h-[28px] items-center justify-center rounded-[0.42rem] px-3 text-[11px] font-semibold uppercase tracking-[0.16em] transition sm:h-[34px] sm:px-4 sm:text-sm sm:tracking-[0.2em] lg:h-[42px] ${
                    active
                        ? "bg-[#1a5a7c] text-[#e7f3f8]"
                        : "bg-[#0f4766] text-[#d7ebf4] hover:bg-[#14506f]"
                }`}
            >
                {label}
            </span>
        </Link>
    );
};

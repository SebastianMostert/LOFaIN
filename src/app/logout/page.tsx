"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/auth-client";
import { epunda } from "@/app/fonts";

export default function LogoutPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await authClient.signOut();
        if (!cancelled) {
          router.replace("/");
          router.refresh();
        }
      } catch {
        if (!cancelled) {
          setError("Unable to log out right now. Please try again.");
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <section className="mx-auto flex min-h-[50vh] max-w-3xl items-center justify-center px-4 py-16 text-stone-100">
      <div className="w-full max-w-xl rounded-[2rem] border border-stone-800 bg-[linear-gradient(180deg,rgba(28,25,23,0.96),rgba(12,10,9,0.98))] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
        <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Session</div>
        <h1 className={`${epunda.className} mt-3 text-3xl text-stone-50`}>
          {error ? "Logout Failed" : "Logging You Out"}
        </h1>
        <p className="mt-4 text-sm leading-7 text-stone-300">
          {error ?? "Please wait while your League session is closed."}
        </p>
      </div>
    </section>
  );
}

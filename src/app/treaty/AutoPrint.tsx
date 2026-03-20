"use client";

import { useEffect } from "react";

export default function AutoPrint({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    const run = async () => {
      if ("fonts" in document) {
        await document.fonts.ready;
      }
      window.print();
    };

    void run();
  }, [enabled]);

  return null;
}

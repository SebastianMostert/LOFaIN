import { existsSync } from "node:fs";
import { chromium } from "playwright-core";

export const runtime = "nodejs";

function getBrowserExecutablePath() {
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

export async function GET(request: Request) {
  const executablePath = getBrowserExecutablePath();
  if (!executablePath) {
    return new Response("No Chromium-based browser was found for PDF generation.", { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const browser = await chromium.launch({
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1400, height: 2000 });
    await page.emulateMedia({ media: "screen" });
    await page.goto(`${origin}/treaty/pdf?download=1`, {
      waitUntil: "networkidle",
    });
    await page.addStyleTag({
      content: `
        nextjs-portal,
        [data-next-badge-root],
        [data-next-mark],
        [data-nextjs-dialog-overlay],
        [data-nextjs-toast],
        [data-nextjs-dev-tools-button],
        [data-nextjs-dev-tools],
        #__next-build-watcher {
          display: none !important;
          visibility: hidden !important;
        }
      `,
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const pdf = await page.pdf({
      width: "210mm",
      height: "297mm",
      scale: 1,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="league-treaty.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await browser.close();
  }
}

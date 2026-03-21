"use client";

import { formatArticleHeading, stripArticlePrefix } from "@/utils/articleHeadings";

type Article = { id: string; order: number; heading: string; body: string };

type LineKind = "eq" | "add" | "del";
type DiffLine = {
  kind: LineKind;
  leftNo: number | null;
  rightNo: number | null;
  text: string;
};

export default function DiffPreview({
  op,
  targetArticle,
  newOrder,
  newHeading,
  newBody,
}: {
  op: "ADD" | "EDIT" | "REMOVE";
  targetArticle: Article | null;
  newOrder?: number | null;
  newHeading: string;
  newBody: string;
}) {
  const beforeText = op === "ADD" ? "" : (targetArticle?.body ?? "");
  const afterText = op === "REMOVE" ? "" : newBody;
  const beforeHeading = op === "EDIT" && targetArticle ? formatArticleHeading(targetArticle.order, targetArticle.heading) : "-";
  const afterHeading =
    op === "ADD"
      ? newOrder
        ? formatArticleHeading(newOrder, newHeading)
        : stripArticlePrefix(newHeading) || <span className="text-stone-500">No new heading</span>
      : op === "EDIT" && targetArticle
        ? formatArticleHeading(targetArticle.order, newHeading || targetArticle.heading)
        : stripArticlePrefix(newHeading) || <span className="text-stone-500">No new heading</span>;

  const before = splitLines(beforeText);
  const after = splitLines(afterText);
  const lines = diffUnified(before, after);

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-700 bg-stone-900">
      {(op === "ADD" || op === "EDIT") && (
        <div className="grid gap-px border-b border-stone-800 bg-stone-800 text-xs sm:grid-cols-2">
          <div className="px-4 py-2 uppercase tracking-wide text-stone-400">Heading (before)</div>
          <div className="px-4 py-2 uppercase tracking-wide text-stone-400">Heading (after)</div>
          <div className="truncate bg-stone-900 px-4 py-2 text-stone-300 sm:border-r sm:border-stone-800">
            {beforeHeading}
          </div>
          <div className="truncate bg-stone-900 px-4 py-2 text-stone-100">
            {afterHeading}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[520px] sm:min-w-[640px]">
          <div className="grid grid-cols-[56px_56px_1fr] border-b border-stone-800 bg-stone-950/60 text-xs text-stone-400">
            <div className="px-3 py-2">Before</div>
            <div className="border-l border-stone-800 px-3 py-2">After</div>
            <div className="border-l border-stone-800 px-3 py-2">Content</div>
          </div>

          <div className="font-mono text-sm">
            {lines.length ? (
              lines.map((line, index) => <UnifiedRow key={index} line={line} />)
            ) : (
              <div className="px-4 py-6 text-stone-500">
                {op === "ADD" && "(new article)"}
                {op === "REMOVE" && "(article would be removed)"}
                {op === "EDIT" && "(no changes yet)"}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function splitLines(value: string) {
  return (value ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""));
}

function computeLCS(a: string[], b: string[]): Array<[number, number]> {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const path: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      path.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }

  return path;
}

function diffUnified(a: string[], b: string[]): DiffLine[] {
  const lcs = computeLCS(a, b);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let leftNo = 1;
  let rightNo = 1;

  for (const [ai, bj] of lcs) {
    while (i < ai && j < bj) {
      out.push({ kind: "del", leftNo: leftNo++, rightNo: null, text: a[i++] });
      out.push({ kind: "add", leftNo: null, rightNo: rightNo++, text: b[j++] });
    }
    while (i < ai) out.push({ kind: "del", leftNo: leftNo++, rightNo: null, text: a[i++] });
    while (j < bj) out.push({ kind: "add", leftNo: null, rightNo: rightNo++, text: b[j++] });

    if (ai < a.length && bj < b.length) {
      out.push({ kind: "eq", leftNo: leftNo++, rightNo: rightNo++, text: a[ai] });
      i = ai + 1;
      j = bj + 1;
    }
  }

  while (i < a.length && j < b.length) {
    out.push({ kind: "del", leftNo: leftNo++, rightNo: null, text: a[i++] });
    out.push({ kind: "add", leftNo: null, rightNo: rightNo++, text: b[j++] });
  }
  while (i < a.length) out.push({ kind: "del", leftNo: leftNo++, rightNo: null, text: a[i++] });
  while (j < b.length) out.push({ kind: "add", leftNo: null, rightNo: rightNo++, text: b[j++] });

  const normalized: DiffLine[] = [];
  for (let index = 0; index < out.length; index++) {
    const current = out[index];
    const next = out[index + 1];
    if (current && next && current.kind === "del" && next.kind === "add" && current.text === next.text) {
      normalized.push({
        kind: "eq",
        leftNo: current.leftNo,
        rightNo: next.rightNo,
        text: current.text,
      });
      index++;
    } else {
      normalized.push(current);
    }
  }
  return normalized;
}

function UnifiedRow({ line }: { line: DiffLine }) {
  const bg =
    line.kind === "add" ? "bg-emerald-900/25" : line.kind === "del" ? "bg-rose-900/25" : "bg-transparent";

  return (
    <div className={`grid grid-cols-[56px_56px_1fr] border-b border-stone-800 ${bg}`}>
      <GutterCell>{line.leftNo ?? ""}</GutterCell>
      <GutterCell divider>{line.rightNo ?? ""}</GutterCell>
      <CodeCell kind={line.kind} text={line.text} />
    </div>
  );
}

function GutterCell({
  children,
  divider = false,
}: {
  children: React.ReactNode;
  divider?: boolean;
}) {
  return <div className={`px-3 py-1.5 text-xs text-stone-400 ${divider ? "border-l border-stone-800" : ""}`}>{children}</div>;
}

function CodeCell({ kind, text }: { kind: LineKind; text: string }) {
  const sign = kind === "add" ? "+ " : kind === "del" ? "- " : "  ";
  return (
    <div className="flex items-start px-3 py-1.5">
      <pre className="whitespace-pre-wrap break-words text-stone-100">
        {sign}
        {text || " "}
      </pre>
    </div>
  );
}

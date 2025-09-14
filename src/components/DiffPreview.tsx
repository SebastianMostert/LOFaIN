// components/DiffPreview.tsx
"use client";

type Article = { id: string; order: number; heading: string; body: string };

type LineKind = "eq" | "add" | "del";
type DiffLine = {
    kind: LineKind;
    leftNo: number | null;   // BEFORE line number
    rightNo: number | null;  // AFTER line number
    text: string;
};

export default function DiffPreview({
    op,
    targetArticle,
    newHeading,
    newBody,
}: {
    op: "ADD" | "EDIT" | "REMOVE";
    targetArticle: Article | null;
    newHeading: string;
    newBody: string;
}) {
    const beforeText = op === "ADD" ? "" : (targetArticle?.body ?? "");
    const afterText = op === "REMOVE" ? "" : newBody;

    const before = splitLines(beforeText);
    const after = splitLines(afterText);
    const lines = diffUnified(before, after);

    return (
        <section className="overflow-hidden rounded-lg border border-stone-700 bg-stone-900">
            {/* Optional headings line (like metadata) */}
            {(op === "ADD" || op === "EDIT") && (
                <div className="grid grid-cols-2 border-b border-stone-800 text-xs">
                    <div className="px-4 py-2 text-stone-400 uppercase tracking-wide">Heading (before)</div>
                    <div className="px-4 py-2 text-stone-400 uppercase tracking-wide">Heading (after)</div>
                    <div className="truncate px-4 py-2 text-stone-300 border-r border-stone-800">
                        {op === "EDIT" ? (targetArticle?.heading ?? "—") : "—"}
                    </div>
                    <div className="truncate px-4 py-2 text-stone-100">
                        {newHeading || <span className="text-stone-500">No new heading</span>}
                    </div>
                </div>
            )}

            {/* Unified diff header */}
            <div className="grid grid-cols-[56px_56px_1fr] border-b border-stone-800 bg-stone-950/60 text-xs text-stone-400">
                <div className="px-3 py-2">Before</div>
                <div className="border-l border-stone-800 px-3 py-2">After</div>
                <div className="border-l border-stone-800 px-3 py-2">Content</div>
            </div>

            {/* Diff rows */}
            <div className="font-mono text-sm">
                {lines.length ? (
                    lines.map((l, i) => <UnifiedRow key={i} line={l} />)
                ) : (
                    <div className="px-4 py-6 text-stone-500">
                        {op === "ADD" && "(new article)"}
                        {op === "REMOVE" && "(article would be removed)"}
                        {op === "EDIT" && "(no changes yet)"}
                    </div>
                )}
            </div>
        </section>
    );
}

/* ---------------- helpers: diff + rendering ---------------- */

function splitLines(s: string) {
    return (s ?? "")
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((l) => l.replace(/\s+$/, "")); // trim right
}

// Longest Common Subsequence for line arrays → indices of equal lines
function computeLCS(a: string[], b: string[]): Array<[number, number]> {
    const n = a.length, m = b.length;
    const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
    }
    const path: Array<[number, number]> = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
        if (a[i] === b[j]) {
            path.push([i, j]);
            i++; j++;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) {
            i++;
        } else {
            j++;
        }
    }
    return path;
}

/** Build GitHub-like unified diff rows from before/after line arrays. */
function diffUnified(a: string[], b: string[]): DiffLine[] {
    const lcs = computeLCS(a, b);

    const out: DiffLine[] = [];
    let i = 0, j = 0, leftNo = 1, rightNo = 1;

    for (const [ai, bj] of lcs) {
        // everything before the next match is add/del
        while (i < ai && j < bj) {
            out.push({ kind: "del", leftNo: leftNo++, rightNo: null, text: a[i++] });
            out.push({ kind: "add", leftNo: null, rightNo: rightNo++, text: b[j++] });
        }
        while (i < ai) out.push({ kind: "del", leftNo: leftNo++, rightNo: null, text: a[i++] });
        while (j < bj) out.push({ kind: "add", leftNo: null, rightNo: rightNo++, text: b[j++] });

        // common line
        if (ai < a.length && bj < b.length) {
            out.push({ kind: "eq", leftNo: leftNo++, rightNo: rightNo++, text: a[ai] });
            i = ai + 1;
            j = bj + 1;
        }
    }
    // tail
    while (i < a.length && j < b.length) {
        out.push({ kind: "del", leftNo: leftNo++, rightNo: null, text: a[i++] });
        out.push({ kind: "add", leftNo: null, rightNo: rightNo++, text: b[j++] });
    }
    while (i < a.length) out.push({ kind: "del", leftNo: leftNo++, rightNo: null, text: a[i++] });
    while (j < b.length) out.push({ kind: "add", leftNo: null, rightNo: rightNo++, text: b[j++] });

    // Tiny normalization: collapse del+add with identical text into eq
    const normalized: DiffLine[] = [];
    for (let k = 0; k < out.length; k++) {
        const cur = out[k];
        const nxt = out[k + 1];
        if (cur && nxt && cur.kind === "del" && nxt.kind === "add" && cur.text === nxt.text) {
            normalized.push({
                kind: "eq",
                leftNo: cur.leftNo,
                rightNo: nxt.rightNo,
                text: cur.text,
            });
            k++;
        } else {
            normalized.push(cur);
        }
    }
    return normalized;
}

function UnifiedRow({ line }: { line: DiffLine }) {
    const base = "grid grid-cols-[56px_56px_1fr] border-b border-stone-800";
    const bg =
        line.kind === "add"
            ? "bg-emerald-900/25"
            : line.kind === "del"
                ? "bg-rose-900/25"
                : "bg-transparent";

    return (
        <div className={`${base} ${bg}`}>
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
    return (
        <div
            className={`px-3 py-1.5 text-xs text-stone-400 ${divider ? "border-l border-stone-800" : ""
                }`}
        >
            {children}
        </div>
    );
}

function CodeCell({ kind, text }: { kind: LineKind; text: string }) {
    const sign =
        kind === "add" ? "+ " : kind === "del" ? "- " : "  ";
    return (
        <div className="flex items-start px-3 py-1.5">
            <pre className="whitespace-pre-wrap break-words text-stone-100">
                {sign}
                {text || " "}
            </pre>
        </div>
    );
}

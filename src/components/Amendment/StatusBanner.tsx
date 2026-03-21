export default function StatusBanner({
    status,
    result,
    opensAt,
    closesAt,
    failureReason,
}: {
    status: "DRAFT" | "OPEN" | "CLOSED" | string;
    result: "PASSED" | "FAILED" | null | string;
    opensAt: Date | null;
    closesAt: Date | null;
    failureReason: string | null;
}) {
    if (status === "DRAFT") {
        return (
            <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-amber-700/60 bg-amber-900/30 px-3 py-1 text-center text-xs leading-relaxed text-amber-100 sm:rounded-full">
                <span aria-hidden>*</span>
                <span>Debate in progress</span>
                {opensAt == null && <span className="text-amber-200/80">Vote not opened yet</span>}
            </span>
        );
    }

    if (status === "OPEN") {
        return (
            <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-blue-700/60 bg-blue-900/40 px-3 py-1 text-center text-xs leading-relaxed text-blue-200 sm:rounded-full">
                <span aria-hidden>•</span>
                <span>Voting open</span>
                {closesAt && <span className="text-blue-300/80">• Closes {new Date(closesAt).toLocaleString()}</span>}
            </span>
        );
    }

    const passed = result === "PASSED";
    const base = "inline-flex max-w-full rounded-md px-3 py-1.5 text-sm font-semibold";

    return passed ? (
        <div className={`${base} flex-wrap items-center gap-2 border border-emerald-700 bg-emerald-900/40 text-emerald-200`}>
            <span>Passed</span>
            {closesAt && <span className="text-emerald-300/80">• {new Date(closesAt).toLocaleString()}</span>}
        </div>
    ) : (
        <div className={`${base} flex-col items-start border border-rose-700 bg-rose-900/40 text-rose-200`}>
            <div>Failed{closesAt ? ` • ${new Date(closesAt).toLocaleString()}` : ""}</div>
            {failureReason && <div className="mt-1 text-xs text-rose-300">{failureReason}</div>}
        </div>
    );
}

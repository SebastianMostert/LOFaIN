export default function StatusBanner({
    status,
    result,
    closesAt,
    failureReason,
}: {
    status: "OPEN" | "CLOSED" | string;
    result: "PASSED" | "FAILED" | null | string;
    closesAt: Date | null;
    failureReason: string | null;
}) {
    if (status === "OPEN") {
        return (
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-700/60 bg-blue-900/40 px-3 py-1 text-xs text-blue-200">
                <span className="i" aria-hidden>●</span> Voting open
                {closesAt && <span className="text-blue-300/80">• Closes {new Date(closesAt).toLocaleString()}</span>}
            </span>
        );
    }

    const passed = result === "PASSED";
    const base =
        "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold";
    return passed ? (
        <div className={`${base} border border-emerald-700 bg-emerald-900/40 text-emerald-200`}>
            ✓ Passed{closesAt ? ` • ${new Date(closesAt).toLocaleString()}` : ""}
        </div>
    ) : (
        <div className={`${base} flex-col items-start border border-rose-700 bg-rose-900/40 text-rose-200`}>
            <div>✗ Failed{closesAt ? ` • ${new Date(closesAt).toLocaleString()}` : ""}</div>
            {failureReason && <div className="mt-1 text-xs text-rose-300">{failureReason}</div>}
        </div>
    );
}

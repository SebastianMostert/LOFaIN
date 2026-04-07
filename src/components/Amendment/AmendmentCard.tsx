import Link from "next/link";
import { AmendmentResult, AmendmentStatus } from "@prisma/client";
import { epunda } from "@/app/fonts";
import MiniVoteMeter from "./MiniVoteMeter";
import { clampPct, pct } from "@/utils/voteStats";
import { formatDateTime, formatDeadlineFromReference } from "@/utils/formatting";

type Choice = "AYE" | "NAY" | "ABSTAIN" | "ABSENT";

type ExtendedAmendment = {
  result: AmendmentResult | null;
  id: string;
  slug: string;
  title: string;
  status: AmendmentStatus;
  opensAt: Date | null;
  closesAt: Date | null;
  eligibleCount: number | null;
  votes: {
    choice: Choice;
  }[];
};

export default function AmendmentCard({
  amendment,
  counts,
  eligible,
  highlight,
  simulatedNow,
}: {
  amendment: ExtendedAmendment;
  counts: Record<Exclude<Choice, "ABSENT">, number>;
  eligible: number;
  highlight?: (s: string) => React.ReactNode;
  simulatedNow: Date | string;
}) {
  const isDraft = amendment.status === "DRAFT";
  const totalVotes = counts.AYE + counts.NAY + counts.ABSTAIN;
  const absent = Math.max(0, eligible - totalVotes);

  const ayePct = pct(counts.AYE, eligible);
  const nayPct = pct(counts.NAY, eligible);
  const neutralPct = pct(counts.ABSTAIN + absent, eligible);

  const thresholdCount = Math.ceil((2 / 3) * eligible);
  const thresholdPct = clampPct((2 / 3) * 100);
  const deadlineText = amendment.closesAt ? formatDeadlineFromReference(amendment.closesAt, simulatedNow) : null;

  return (
    <Link
      href={`/amendments/${amendment.slug}`}
      className="group rounded-2xl border border-stone-700/80 bg-stone-900 p-5 shadow-sm transition hover:border-stone-500 hover:bg-stone-900/95 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <StatusBadge status={amendment.status} result={amendment.result} />
        <div className="text-right text-xs leading-5 text-stone-300">
          {deadlineText && <div className="font-semibold text-amber-200">{deadlineText}</div>}
          {isDraft && <div className="font-semibold text-amber-200">Debate underway</div>}
          {amendment.opensAt && <div>Opened: {formatDateTime(amendment.opensAt)}</div>}
          {amendment.closesAt && <div>Closes: {formatDateTime(amendment.closesAt)}</div>}
        </div>
      </div>

      <h2 className={`${epunda.className} mt-3 text-xl font-semibold text-stone-100`}>
        {highlight ? highlight(amendment.title) : amendment.title}
      </h2>

      <div className="mt-4">
        {isDraft ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Debate phase. Voting will appear here once the proposer opens the floor.
          </div>
        ) : (
          <>
            <MiniVoteMeter
              ayePct={ayePct}
              neutralPct={neutralPct}
              nayPct={nayPct}
              thresholdPct={thresholdPct}
              closed={amendment.status !== "OPEN"}
              result={amendment.result}
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-300">
              <span>
                Aye {counts.AYE} | Nay {counts.NAY} | Abstain {counts.ABSTAIN} | Absent {absent}
              </span>
              <span>
                {thresholdCount} / {eligible} needed
              </span>
            </div>
          </>
        )}
      </div>
    </Link>
  );
}

function StatusBadge({
  status,
  result,
}: {
  status: string;
  result: string | null;
}) {
  if (status === "OPEN") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-700/60 bg-blue-900/40 px-2.5 py-1 text-[11px] font-medium text-blue-200">
        <span aria-hidden>*</span> Voting open
      </span>
    );
  }
  if (status === "DRAFT") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-700/60 bg-amber-900/30 px-2.5 py-1 text-[11px] font-medium text-amber-100">
        Debate
      </span>
    );
  }
  if (result === "PASSED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/70 bg-emerald-900/40 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
        Passed
      </span>
    );
  }
  if (result === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-700/70 bg-rose-900/40 px-2.5 py-1 text-[11px] font-medium text-rose-200">
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-stone-600/70 bg-stone-800/60 px-2.5 py-1 text-[11px] font-medium text-stone-200">
      Archived
    </span>
  );
}

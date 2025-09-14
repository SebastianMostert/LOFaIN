import Link from "next/link";
import { epunda } from "@/app/fonts";

export const metadata = { title: "FAQ • League" };

export default function FAQPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-stone-100">
      <header className="mb-8">
        <h1 className={`${epunda.className} text-3xl font-extrabold`}>Frequently Asked Questions</h1>
      </header>
      <div className="space-y-8 text-stone-300">
        <section>
          <h2 className={`${epunda.className} text-xl font-semibold text-stone-100`}>Membership</h2>
          <p className="mt-2">
            Any sovereign state may apply for membership by submitting a formal request to the League Council.
            Current members are listed on the{" "}
            <Link href="/members" className="text-emerald-400 underline">members page</Link>.
            Membership confers voting rights and responsibilities within the League.
          </p>
        </section>
        <section>
          <h2 className={`${epunda.className} text-xl font-semibold text-stone-100`}>Voting</h2>
          <p className="mt-2">
            Delegates cast votes on treaty articles and proposed amendments through this portal. Decisions require a
            two-thirds majority to pass, meaning at least two-thirds of participating members must approve a measure for
            it to be adopted.
          </p>
        </section>
        <section>
          <h2 className={`${epunda.className} text-xl font-semibold text-stone-100`}>Amendments</h2>
          <p className="mt-2">
            Any member state may propose an amendment to the treaty. Proposals are circulated for review and become
            effective only after every member state ratifies the change. Browse current proposals on the{" "}
            <Link href="/amendments" className="text-emerald-400 underline">amendments page</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}


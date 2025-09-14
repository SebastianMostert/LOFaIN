// app/treaty/page.tsx — Canonical Treaty (Epunda Sans) with sticky TOC
import { epunda } from "@/app/fonts";

const P = ({ children }: { children: React.ReactNode }) => (
    <p className="mt-3 leading-relaxed text-stone-300">{children}</p>
);

const Article = ({
    id,
    title,
    children,
}: {
    id: string;
    title: string;
    children: React.ReactNode;
}) => (
    <section id={id} className="scroll-mt-28">
        <h3 className={`${epunda.className} mt-8 text-lg font-semibold text-stone-100`}>{title}</h3>
        <div className="mt-2 space-y-2 text-stone-300">{children}</div>
    </section>
);

const TOC = () => (
    <aside className="order-2 lg:order-1 lg:sticky lg:top-20 lg:self-start">
        <nav
            aria-label="Table of Contents"
            className="rounded-lg border border-stone-700 bg-stone-900 p-4"
        >
            <div
                className={`${epunda.className} mb-2 text-sm font-semibold uppercase tracking-wide text-stone-200`}
            >
                Contents
            </div>
            <ul className="space-y-1 text-sm">
                {[
                    ["preamble", "Preamble"],
                    ["art-i", "Article I. Formation of the League"],
                    ["art-ii", "Article II. Mutual Defence"],
                    ["art-iii", "Article III. No Separate Peace"],
                    ["art-iv", "Article IV. Military & Technical Cooperation"],
                    ["art-v", "Article V. Economic & Industrial Development"],
                    ["art-vi", "Article VI. Territorial Expansion & Consultation"],
                    ["art-vii", "Article VII. Admission of New Members"],
                    ["art-viii", "Article VIII. Withdrawal & Expulsion"],
                    ["art-ix", "Article IX. Ratification"],
                    ["art-x", "Article X. Language & Depository"],
                    ["art-xi", "Article XI. Amendments"],
                    ["art-xii", "Article XII. Fair Trade & League Rates"],
                    ["art-xiii", "Article XIII. Disciplinary Measures"],
                    ["art-xiv", "Article XIV. Human Dignity & Rights of Peoples"],
                    ["sign", "Signatories"],
                ].map(([id, label]) => (
                    <li key={id}>
                        <a
                            href={`#${id}`}
                            className="block rounded px-2 py-1 text-stone-300 hover:bg-stone-800 hover:text-stone-50"
                        >
                            {label}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    </aside>
);

export default function TreatyPage() {
    return (
        <main className="bg-stone-950 text-stone-100">
            <section className="mx-auto max-w-6xl px-4 py-10">
                {/* Page header */}
                <header className="mb-8">
                    <h1 className={`${epunda.className} text-3xl sm:text-4xl font-extrabold`}>
                        Treaty of the League of Free and Independent Nations
                    </h1>
                    <div className="mt-2 h-px w-28 bg-gradient-to-r from-stone-700 to-stone-400" />
                    <p className="mt-3 text-stone-400">Done at Versailles, the Fifth day of June 1872.</p>
                </header>

                {/* Responsive layout: single column on mobile; two columns from lg up */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <TOC />

                    {/* Treaty body (first on mobile; right column on lg+) */}
                    <article className="order-1 lg:order-2">
                        {/* Preamble */}
                        <section id="preamble" className="scroll-mt-28">
                            <h2 className={`${epunda.className} text-xl font-semibold text-stone-100 mb-2`}>
                                Preamble
                            </h2>
                            <P>
                                The High Contracting Parties, or more simply known as the Parties, comprised of the French
                                Republic, the Union of Soviet Socialist Republics, and the Kingdom of Italy,
                            </P>
                            <P>WISHING to strengthen and formalise the bonds of friendship and cooperation between their States,</P>
                            <P>DETERMINED to defend their sovereignty, independence, and territorial integrity against any threat,</P>
                            <P>
                                RECOGNISING the value of close economic, industrial, and military cooperation for the benefit of
                                their peoples, and
                            </P>
                            <P>
                                AGREEING to coordinate their policies and ambitions beyond Europe, in particular on the continent
                                of Africa,
                            </P>
                        </section>

                        <Article id="art-i" title="Article I. Formation of the League">
                            <P>
                                The High Contracting Parties hereby establish a common League under the name “League of Free and
                                Independent Nations” hereafter referred to simply as “the League”. The purposes of the League are
                                mutual defence, the promotion of economic and industrial cooperation, and the coordination of
                                colonial policy where interests coincide.
                            </P>
                        </Article>

                        <Article id="art-ii" title="Article II. Mutual Defence">
                            <P>
                                1. In case of attack by, or imminent threat of attack by, a foreign Power on one or more of the
                                Parties, or in case of danger to their independence, territorial integrity, or political
                                sovereignty in any form, the other Parties will, upon the formal request of the Party or Parties
                                so attacked or imperilled, render assistance immediately.
                            </P>
                            <P>
                                2. The above help will comprise but not be limited to the deployment of military and naval troops,
                                the supply of weapons and ammunitions and the exchange of intelligence that is required in the
                                defence of the Party that is under threat.
                            </P>
                            <P>
                                3. The extent, scope, and length of this support will be determined through mutual consent between
                                the Parties with regard to the gravity of the threat, the geographical situation, and the
                                abilities of each Party at the time.
                            </P>
                            <P>
                                4. The Parties also undertake to consult immediately in case of any event which, in the judgment
                                of one or more Parties, may result in armed conflict between a or multiple Members of the League
                                and another or multiple other states, with the object of affording mutual assistance and
                                preventing armed conflict before it shall have had time to develop.
                            </P>
                            <P>
                                5. If a Party is subjected to economic sanctions, blockades, or other hostile economic measures,
                                the other Parties shall, upon request, provide coordinated assistance. This may include supplying
                                essential goods, creating alternative trade routes, and undertaking diplomatic measures. The scope
                                of which shall be agreed upon by all Parties.
                            </P>
                        </Article>

                        <Article id="art-iii" title="Article III. No Separate Peace">
                            <P>
                                None of the Parties shall make peace, a truce, or any other agreement with an enemy engaged
                                against the League without the consent of all Parties.
                            </P>
                        </Article>

                        <Article id="art-iv" title="Article IV. Military and Technical Cooperation">
                            <P>1. The Parties will exchange officers, engineers, and instructors to share knowledge and training methods.</P>
                            <P>2. They will assist each other in acquiring and supplying arms, ammunition, and other military equipment on agreed terms.</P>
                            <P>3. The French Republic will make available to the USSR and Italy its most effective military systems and industrial processes.</P>
                            <P>4. The USSR and Italy will supply France with raw materials and resources necessary for mutual military and industrial benefit.</P>
                            <P>
                                5. The Parties shall organise and conduct joint military and naval exercises no less than once every three
                                years, such exercises to be hosted in rotation among the Parties. The purpose of these exercises shall be
                                to enhance cooperation, improve overall readiness, and strengthen the capacity for combined command and
                                coordinated operations.
                            </P>
                        </Article>

                        <Article id="art-v" title="Article V. Economic and Industrial Development">
                            <P>1. Promote advanced machinery in agriculture and industry.</P>
                            <P>2. Encourage improvements in tools, cultivation, and manufacturing processes.</P>
                            <P>3. Remove restrictions on trade between territories where possible.</P>
                            <P>
                                4. In severe shortages of essential resources, other Parties shall attempt to cover such shortages
                                equitably without undermining their own interests.
                            </P>
                        </Article>

                        <Article id="art-vi" title="Article VI. Territorial Expansion and Consultation">
                            <P>1. Inform and consult before acquiring or assuming sovereignty over any territory.</P>
                            <P>2. Recognise and respect agreed spheres of influence.</P>
                            <P>3. Avoid rivalry over territorial, political, or strategic interests.</P>
                            <P>4. Actions require approval of at least two-thirds of all Parties.</P>
                        </Article>

                        <Article id="art-vii" title="Article VII. Admission of New Members">
                            <P>1. Any sovereign State may apply by formal request to all current Parties.</P>
                            <P>2. Admission requires unanimous written consent of all existing Parties.</P>
                            <P>3. The new State accepts all obligations and enjoys all rights under this Treaty.</P>
                        </Article>

                        <Article id="art-viii" title="Article VIII. Withdrawal and Expulsion">
                            <P>1. Withdrawal by written notice at least twelve months in advance.</P>
                            <P>2. Expulsion by unanimous consent of the others for breaches of fundamental principles.</P>
                            <P>3. Expulsion effective three months after notice unless otherwise agreed.</P>
                            <P>4. Withdrawing Party remains bound during the notice period.</P>
                        </Article>

                        <Article id="art-ix" title="Article IX. Ratification">
                            <P>1. Ratified pursuant to each Party’s constitutional processes.</P>
                            <P>2. Instruments of ratification exchanged in Paris within three months of signing.</P>
                        </Article>

                        <Article id="art-x" title="Article X. Language and Depository">
                            <P>1. Drawn up in French, Russian, and Italian; all texts equally authentic.</P>
                            <P>2. Additional translations may be prepared; no legal effect unless certified by all Parties.</P>
                            <P>3. Original deposited with the Government of the French Republic; certified copies to each Party.</P>
                        </Article>

                        <Article id="art-xi" title="Article XI. Amendments to the Treaty">
                            <P>1. Any Party may propose amendments by written submission to all others.</P>
                            <P>2. Conference within six months to discuss proposals.</P>
                            <P>3. Adoption requires at least two-thirds approval of all Parties.</P>
                            <P>4. Amendments enter into force within 30 days upon ratification.</P>
                            <P>5. Original texts deposited with the original Treaty.</P>
                            <P>6. Founding Parties (France, USSR, Italy) hold a permanent veto; no measure passes if opposed by any founding Party.</P>
                        </Article>

                        <Article id="art-xii" title="Article XII. On Fair Trade and League Rates">
                            <P>1. Cap 10% profit on essentials: coal, steel, oil, grain and basic foodstuffs.</P>
                            <P>2. Prefer intra-League supply of essentials.</P>
                            <P>3. Commission on Trade & Industry: oversight, annual reports, dispute mediation.</P>
                            <P>4. In famine/blockade/crisis, Commission may by 2/3 order temporary redistribution by need and ability to supply.</P>
                            <P>5. No arbitrage of essentials; violations sanctionable by the Commission.</P>
                        </Article>

                        <Article id="art-xiii" title="Article XIII. On Disciplinary Measures">
                            <P>1. Investigations by special Commission (one representative from each other Party), findings within three months.</P>
                            <P>2. By 2/3 vote: reprimand, disclosure, suspension of benefits, restricted participation, penalties, trade limits, suspension of assistance/offices, quotas/restrictions, or expulsion.</P>
                            <P>3. Sanctioned Party remains bound by other obligations unless unanimously released.</P>
                            <P>4. Rights suspended restored upon completion or League decision.</P>
                        </Article>

                        <Article id="art-xiv" title="Article XIV. On Human Dignity and the Rights of Peoples">
                            <P>1. Respect independence, sovereignty, equality; no conquest for domination or subjugation. Territorial changes via defensive peace or peoples’ will, per Treaty procedures.</P>
                            <P>2. Condemn slavery and trade in persons; oppose and support abolition efforts.</P>
                            <P>3. No deliberate cruelty/devastation against civilians beyond military necessity.</P>
                            <P>4. Peoples may pursue livelihood, religion, language and culture, subject to public order and common welfare.</P>
                            <P>5. Violations (per Art. XIII) breach the fundamental spirit and invite measures therein.</P>
                            <P>6. Doctrines of persecution/extermination by race, faith, language, or class are incompatible; their adoption is a breach.</P>
                        </Article>

                        {/* Signatories */}
                        <section id="sign" className="mt-10">
                            <h3 className={`${epunda.className} text-lg font-semibold text-stone-100`}>Signatories</h3>
                            <P>In witness whereof, the undersigned Plenipotentiaries have signed this Treaty and affixed their seals.</P>
                            <P>Done at Versailles, the Fifth day of June 1872.</P>
                            <ul className="mt-2 list-disc space-y-1 pl-6 text-stone-300">
                                <li>
                                    <strong>For the French Third Republic:</strong> Pierre Marchand, Deputy of Paris, Plenipotentiary of
                                    the French Third Republic
                                </li>
                                <li>
                                    <strong>For the Union of Soviet Socialist Republics:</strong> Georgy A. Plekhanov, People’s Commissar
                                    for Foreign Affairs, Plenipotentiary of the USSR
                                </li>
                                <li>
                                    <strong>For the Kingdom of Italy:</strong> Agostino Depretis, Prime Minister of the Kingdom of Italy,
                                    Plenipotentiary of the Kingdom of Italy
                                </li>
                            </ul>
                        </section>
                    </article>
                </div>
            </section>
        </main>
    );
}

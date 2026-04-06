"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  initialCountry: {
    name: string;
    slug: string;
    code: string | null;
    colorHex: string | null;
    summary: string | null;
    capital: string | null;
    governmentType: string | null;
    headOfState: string | null;
    foreignMinister: string | null;
  };
};

type FormState = Props["initialCountry"];

export default function CountryProfileEditor({ initialCountry }: Props) {
  const [form, setForm] = useState<FormState>(initialCountry);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/members/me/country", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        colorHex: form.colorHex,
        summary: form.summary,
        capital: form.capital,
        governmentType: form.governmentType,
        headOfState: form.headOfState,
        foreignMinister: form.foreignMinister,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Unable to save country profile.");
      setIsSaving(false);
      return;
    }

    setForm(payload.country);
    setSuccess("Profile updated.");
    setIsSaving(false);
  }

  const accent = form.colorHex ?? "#49423a";

  return (
    <form
      onSubmit={onSubmit}
      className="overflow-hidden rounded-[1.75rem] border border-amber-700/20 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.1),_transparent_34%),linear-gradient(180deg,rgba(28,25,23,0.9),rgba(12,10,9,0.96))]"
    >
      <div className="border-b border-stone-800/80 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-amber-200/70">Profile Management</div>
            <h3 className="mt-2 text-xl font-semibold text-stone-50">Country profile editor</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">
              Update the public-facing profile for your delegation. Identity fields are fixed and managed separately.
            </p>
          </div>
          <Link
            href={`/members/${form.slug}`}
            className="inline-flex rounded-full border border-amber-600/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20"
          >
            View public page
          </Link>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_300px]">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-800 bg-stone-950/55 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Public slug</div>
              <div className="mt-2 text-sm font-medium text-stone-100">{form.slug}</div>
            </div>
            <div className="rounded-2xl border border-stone-800 bg-stone-950/55 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Country code</div>
              <div className="mt-2 text-sm font-medium text-stone-100">{form.code ?? "N/A"}</div>
            </div>
            <div className="rounded-2xl border border-stone-800 bg-stone-950/55 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Accent preview</div>
              <div className="mt-2 h-6 rounded-full border border-stone-700/80" style={{ background: accent }} />
            </div>
          </div>

          <div className="rounded-2xl border border-stone-800 bg-stone-950/55 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Editing scope</div>
            <div className="mt-3 text-sm leading-6 text-stone-300">
              You can update the country name, summary, capital, government, and officeholders here.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <div className="text-sm font-medium text-stone-300">Country name</div>
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2.5 text-sm text-stone-100"
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-stone-300">Accent color</div>
              <input
                value={form.colorHex ?? ""}
                onChange={(event) => updateField("colorHex", event.target.value || null)}
                placeholder="#49423a"
                className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2.5 text-sm text-stone-100"
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-stone-300">Capital</div>
              <input
                value={form.capital ?? ""}
                onChange={(event) => updateField("capital", event.target.value || null)}
                className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2.5 text-sm text-stone-100"
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-stone-300">Government type</div>
              <input
                value={form.governmentType ?? ""}
                onChange={(event) => updateField("governmentType", event.target.value || null)}
                className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2.5 text-sm text-stone-100"
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-stone-300">Head of state</div>
              <input
                value={form.headOfState ?? ""}
                onChange={(event) => updateField("headOfState", event.target.value || null)}
                className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2.5 text-sm text-stone-100"
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-stone-300">Foreign minister</div>
              <input
                value={form.foreignMinister ?? ""}
                onChange={(event) => updateField("foreignMinister", event.target.value || null)}
                className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2.5 text-sm text-stone-100"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <div className="text-sm font-medium text-stone-300">Summary</div>
            <textarea
              value={form.summary ?? ""}
              onChange={(event) => updateField("summary", event.target.value || null)}
              rows={7}
              className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-3 text-sm leading-6 text-stone-100"
            />
          </label>

          {error && <div className="mt-4 rounded-xl border border-rose-700/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-100">{error}</div>}
          {success && <div className="mt-4 rounded-xl border border-emerald-700/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100">{success}</div>}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full border border-stone-200 bg-stone-100 px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save profile"}
            </button>
            <div className="text-xs text-stone-500">Changes appear on your country&apos;s public profile.</div>
          </div>
        </div>

        <aside className="rounded-[1.5rem] border border-stone-800 bg-stone-950/55 p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Public Preview</div>
          <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-stone-800 bg-stone-900/80">
            <div className="h-2 w-full" style={{ background: accent }} />
            <div className="p-4">
              <div className="text-lg font-semibold text-stone-50">{form.name || "Unnamed country"}</div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-stone-700 px-2.5 py-1 text-stone-300">Code {form.code ?? "N/A"}</span>
                {form.capital && <span className="rounded-full border border-stone-700 px-2.5 py-1 text-stone-300">Capital {form.capital}</span>}
              </div>
              {form.summary && <p className="mt-4 text-sm leading-6 text-stone-300">{form.summary}</p>}
              <dl className="mt-4 space-y-3 text-sm">
                {form.governmentType && (
                  <div>
                    <dt className="text-stone-500">Government</dt>
                    <dd className="text-stone-200">{form.governmentType}</dd>
                  </div>
                )}
                {form.headOfState && (
                  <div>
                    <dt className="text-stone-500">Head of state</dt>
                    <dd className="text-stone-200">{form.headOfState}</dd>
                  </div>
                )}
                {form.foreignMinister && (
                  <div>
                    <dt className="text-stone-500">Foreign minister</dt>
                    <dd className="text-stone-200">{form.foreignMinister}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}

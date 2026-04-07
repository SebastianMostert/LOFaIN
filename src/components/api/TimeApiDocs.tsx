"use client";

import { useMemo, useState } from "react";

type ExampleMode = "fetch" | "postman" | "curl";

type EndpointExample = {
  id: string;
  group: string;
  label: string;
  method: "GET" | "PATCH";
  path: string;
  summary: string;
  description: string;
  requestNotes: string;
  responseSummary: string;
  responseBody: string;
};

const exampleModes: { id: ExampleMode; label: string }[] = [
  { id: "fetch", label: "Fetch" },
  { id: "postman", label: "Postman" },
  { id: "curl", label: "cURL" },
];

const endpointExamples: EndpointExample[] = [
  {
    id: "get-state",
    group: "Time",
    label: "Get Current Time State",
    method: "GET",
    path: "/api/time",
    summary: "Returns the current NRP time snapshot.",
    description:
      "Use this endpoint to read the current simulated date, mirrored UTC clock, and baseline mapping values that power the League time system.",
    requestNotes: "No request body or query parameters are required for this public endpoint.",
    responseSummary:
      "The response returns the current simulated state, including the original baseline, the current NRP date anchor, pause state, and the live mirrored UTC time.",
    responseBody: `{
  "time": {
    "id": "main",
    "originalRealStartAt": "2026-04-07T00:00:00.000Z",
    "originalSimulatedAt": "1917-01-01T00:00:00.000Z",
    "currentRealAnchorAt": "2026-04-07T00:00:00.000Z",
    "currentRealReferenceAt": "2026-04-07T14:18:13.960Z",
    "currentSimulatedAt": "1917-03-10T00:00:00.000Z",
    "isPaused": false,
    "currentSimulatedNow": "1917-03-10T14:18:13.960Z"
  }
}`,
  },
  {
    id: "get-members",
    group: "Members",
    label: "Get All Members",
    method: "GET",
    path: "/api/members",
    summary: "Returns all League member countries.",
    description:
      "Use this endpoint to fetch the public member directory, including active and former countries with their display metadata and profile fields.",
    requestNotes: "No request body or query parameters are required for this public endpoint.",
    responseSummary:
      "The response returns all member countries ordered alphabetically, including display fields such as flag data, summary fields, government details, and membership status.",
    responseBody: `{
  "members": [
    {
      "name": "France",
      "slug": "france",
      "code": "FRA",
      "colorHex": "#1f4fa3",
      "flagImagePath": null,
      "flagAspectRatio": "3 / 2",
      "summary": "A founding member of the League.",
      "capital": "Paris",
      "governmentType": "Republic",
      "headOfState": "President",
      "foreignMinister": "Foreign Minister",
      "hasVeto": true,
      "isActive": true,
      "joinedAt": "1900-01-01T00:00:00.000Z",
      "leftAt": null
    }
  ]
}`,
  },
];

function buildExample(mode: ExampleMode, endpoint: EndpointExample) {
  if (mode === "curl") {
    return `curl ${endpoint.path}`;
  }

  if (mode === "postman") {
    return `${endpoint.method} ${endpoint.path}

Headers
  Accept: application/json`;
  }

  return `fetch("${endpoint.path}", {
  method: "GET"
});`;
}

function CodePanel({ title, children }: { title: string; children: string }) {
  return (
    <div className="overflow-hidden rounded-[1.2rem] border border-[#23415c] bg-[#071120] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="border-b border-[#17314a] bg-[#0d1a2c] px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/55">
        {title}
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-7 text-cyan-50">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function MethodPill({ method }: { method: EndpointExample["method"] }) {
  return (
    <span
      className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
        method === "GET" ? "bg-emerald-500 text-white" : "bg-amber-500 text-slate-950"
      }`}
    >
      {method}
    </span>
  );
}

export default function TimeApiDocs() {
  const [mode, setMode] = useState<ExampleMode>("fetch");
  const [selectedEndpointId, setSelectedEndpointId] = useState(endpointExamples[0]?.id ?? "");
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");

  const selectedEndpoint =
    endpointExamples.find((endpoint) => endpoint.id === selectedEndpointId) ?? endpointExamples[0];

  const renderedExample = useMemo(() => buildExample(mode, selectedEndpoint), [mode, selectedEndpoint]);

  async function copyExample() {
    try {
      await navigator.clipboard.writeText(renderedExample);
      setCopyState("success");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1600);
    }
  }

  return (
    <div className="h-full overflow-hidden bg-[#d8e7f3] text-slate-900 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#17314a] bg-[#04101d] px-4 py-3 text-white sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="text-xl font-semibold text-stone-50">League API Reference</div>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-3 md:w-auto">
          <div className="min-w-[16rem] flex-1 rounded-md border border-[#32506d] bg-[#20324a] px-3 py-2 text-sm text-cyan-50 md:w-[26rem] md:flex-none">
            {selectedEndpoint.path}
          </div>
          <div className="rounded-md border border-[#32506d] bg-[#081421] px-3 py-2 text-sm font-medium text-stone-100">
            GET
          </div>
        </div>
      </div>

      <div className="grid h-[calc(100%-61px)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-[#bfd0df] bg-[#d5e2ee] lg:border-b-0 lg:border-r">
          <div className="p-5">
            <div className="text-2xl font-semibold text-[#16344f]">League API</div>
            <div className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#597a97]">Overview</div>
            <div className="mt-4 space-y-2 text-sm text-[#26455f]">
              <div className="rounded-md border border-[#c3d4e1] bg-[#edf4fa] px-3 py-2 shadow-sm">Public endpoints</div>
            </div>
          </div>

          <div className="border-t border-[#bfd0df] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#597a97]">Endpoints</div>
            <div className="mt-4 space-y-2">
              {endpointExamples.map((endpoint) => {
                const isActive = endpoint.id === selectedEndpoint.id;
                return (
                  <button
                    key={endpoint.id}
                    type="button"
                    onClick={() => setSelectedEndpointId(endpoint.id)}
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-3 text-left transition ${
                      isActive
                        ? "border-[#89bfdc] bg-[#c1dcef] text-[#081421] shadow-[inset_0_0_0_1px_rgba(8,58,87,0.12)]"
                        : "border-[#c3d4e1] bg-[#edf4fa] text-[#26455f] hover:bg-white"
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="truncate text-sm font-medium">{endpoint.label}</div>
                      <div className="truncate text-xs text-[#597a97]">{endpoint.group}</div>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-600">
                      {endpoint.method}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[#bfd0df] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#597a97]">Schemas</div>
            <div className="mt-4 rounded-md border border-[#c3d4e1] bg-[#edf4fa] px-3 py-3 text-sm text-[#26455f] shadow-sm">
              <div className="font-medium text-[#081421]">TimeSnapshot</div>
              <div className="mt-1 text-xs leading-6 text-[#597a97]">
                Contains the current live NRP state, the date anchors, and the mirrored UTC timestamp.
              </div>
            </div>
          </div>
        </aside>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_430px]">
          <main className="bg-[#f8fbfe] px-7 py-8 sm:px-10">
            <div className="flex flex-wrap items-center gap-3">
              <MethodPill method={selectedEndpoint.method} />
              <div className="rounded-md bg-[#e5eef7] px-3 py-2 font-mono text-sm text-[#21415f]">
                {selectedEndpoint.path}
              </div>
            </div>

            <h2 className="mt-6 text-4xl font-semibold tracking-[-0.03em] text-[#081421]">
              {selectedEndpoint.label}
            </h2>
            <p className="mt-4 text-lg text-[#1c3b56]">{selectedEndpoint.summary}</p>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[#315270]">{selectedEndpoint.description}</p>

            <section className="mt-12">
              <div className="text-3xl font-semibold tracking-[-0.03em] text-[#081421]">Request</div>
              <div className="mt-6 rounded-[1.4rem] border border-[#c3d4e1] bg-[#edf4fa] p-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#597a97]">Method</div>
                    <div className="mt-2 text-base font-medium text-[#081421]">{selectedEndpoint.method}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#597a97]">Path</div>
                    <div className="mt-2 font-mono text-sm text-[#081421]">{selectedEndpoint.path}</div>
                  </div>
                </div>
                <div className="mt-6 border-t border-[#c3d4e1] pt-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#597a97]">Notes</div>
                  <div className="mt-2 text-sm leading-7 text-[#315270]">{selectedEndpoint.requestNotes}</div>
                </div>
              </div>
            </section>

            <section className="mt-12">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-3xl font-semibold tracking-[-0.03em] text-[#081421]">Responses</div>
                <span className="rounded-lg bg-emerald-500 px-3 py-1 text-sm font-semibold text-white">200</span>
              </div>
              <div className="mt-6 rounded-[1.4rem] border border-[#c3d4e1] bg-[#edf4fa] p-5">
                <div className="text-base font-medium text-[#081421]">Current time snapshot</div>
                <div className="mt-2 text-sm leading-7 text-[#315270]">{selectedEndpoint.responseSummary}</div>
              </div>
            </section>
          </main>

          <aside className="border-t border-[#bfd0df] bg-[#d5e2ee] px-5 py-6 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-l lg:border-t-0">
            <div className="rounded-[1rem] border border-[#1d3a53] bg-[#20324a] text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
              <div className="border-b border-[#2b4763] bg-[#dfe8f3] px-4 py-3 text-[#081421]">
                <div className="text-sm font-medium">Request Sample Preview</div>
              </div>

              <div className="p-4">
                <CodePanel title={`${mode === "curl" ? "Shell / cURL" : mode === "postman" ? "Postman" : "Fetch"} Sample`}>
                  {renderedExample}
                </CodePanel>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[1rem] border border-[#c3d4e1] bg-[#edf4fa] shadow-sm">
              <div className="flex items-center justify-between gap-3 bg-[#e4edf6] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-[#081421]">Request Sample:</div>
                  <div className="relative">
                    <select
                      value={mode}
                      onChange={(event) => setMode(event.target.value as ExampleMode)}
                      className="appearance-none rounded-md border border-[#b8cadc] bg-white px-3 py-1.5 pr-8 text-sm font-medium text-[#16344f] outline-none transition hover:border-[#89bfdc]"
                      aria-label="Select request sample client"
                    >
                      {exampleModes.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label === "curl" ? option.label : option.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#597a97]">
                      <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
                        <path d="M5.5 7.5 10 12l4.5-4.5" />
                      </svg>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void copyExample()}
                  className={`inline-flex min-w-[88px] items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                    copyState === "success"
                      ? "border-emerald-400 bg-emerald-500 text-white"
                      : copyState === "error"
                        ? "border-rose-300 bg-rose-50 text-rose-700"
                        : "border-[#b8cadc] bg-white text-[#315270] hover:border-[#89bfdc] hover:text-[#081421]"
                  }`}
                  aria-label="Copy request sample"
                  title="Copy request sample"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-[1.7]" aria-hidden="true">
                    <rect x="7" y="4" width="9" height="11" rx="1.5" />
                    <path d="M4.5 12V6.5C4.5 5.67 5.17 5 6 5h5" />
                  </svg>
                  <span>
                    {copyState === "success" ? "Copied" : copyState === "error" ? "Failed" : "Copy"}
                  </span>
                </button>
              </div>
              <div className="p-4">
                <CodePanel title={`${mode === "curl" ? "Shell / cURL" : mode === "postman" ? "Postman" : "Fetch"} Sample`}>
                  {renderedExample}
                </CodePanel>
              </div>
            </div>

            <details className="mt-5 overflow-hidden rounded-[1rem] border border-[#c3d4e1] bg-[#edf4fa] shadow-sm">
              <summary className="cursor-pointer list-none bg-[#e4edf6] px-4 py-3 text-sm font-semibold text-[#081421]">
                Response Example
              </summary>
              <div className="border-t border-[#c3d4e1] p-4">
                <CodePanel title="JSON 200 Response">{selectedEndpoint.responseBody}</CodePanel>
              </div>
            </details>
          </aside>
        </div>
      </div>
    </div>
  );
}

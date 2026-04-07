"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RgbColorPicker } from "react-colorful";

import FlagImage from "@/components/FlagImage";
import {
  DEFAULT_FLAG_ASPECT_RATIO,
  getCountryFlagSrc,
} from "@/utils/flags";
import { getCountryOfficeholders, type Officeholder } from "@/utils/officeholders";

type Props = {
  initialCountry: {
    name: string;
    slug: string;
    code: string | null;
    colorHex: string | null;
    flagImagePath: string | null;
    flagAspectRatio: string | null;
    summary: string | null;
    capital: string | null;
    governmentType: string | null;
    officeholders: unknown;
    headOfState: string | null;
    foreignMinister: string | null;
    delegates: Array<{
      id: string;
      name: string | null;
    }>;
  };
};

type FormState = Props["initialCountry"];
type AccentInputMode = "rgb" | "hex" | "hsl";

const COMMON_FLAG_RATIOS = [
  { label: "1:1", width: 1, height: 1 },
  { label: "5:4", width: 5, height: 4 },
  { label: "4:3", width: 4, height: 3 },
  { label: "3:2", width: 3, height: 2 },
  { label: "8:5", width: 8, height: 5 },
  { label: "5:3", width: 5, height: 3 },
  { label: "16:9", width: 16, height: 9 },
  { label: "2:1", width: 2, height: 1 },
] as const;

const GOVERNMENT_TYPE_OPTIONS = [
  "Republic",
  "Federal republic",
  "Parliamentary republic",
  "Presidential republic",
  "Constitutional monarchy",
  "Absolute monarchy",
  "Federal monarchy",
  "Parliamentary democracy",
  "Representative democracy",
  "Single-party state",
  "Socialist state",
  "Military junta",
  "Transitional government",
  "Provisional government",
  "Theocracy",
  "Confederation",
  "Federation",
  "Protectorate",
] as const;
const OTHER_GOVERNMENT_TYPE = "__other__";
const HEAD_OF_STATE_POSITION = "Head of state";

const APPROXIMATION_TOLERANCE = 0.025;
const DEFAULT_ACCENT = "#49423a";

function clampColorChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbToHex(red: number, green: number, blue: number) {
  const toHex = (value: number) => clampColorChannel(value).toString(16).padStart(2, "0");
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function normalizeHexColor(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toLowerCase() : null;
}

function hexToRgb(value: string) {
  const normalized = normalizeHexColor(value) ?? DEFAULT_ACCENT;
  const hex = normalized.slice(1);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function rgbToHsl(red: number, green: number, blue: number) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
  }

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return {
    h: Math.round(((hue * 60) + 360) % 360),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

function hslToRgb(hue: number, saturation: number, lightness: number) {
  const h = ((hue % 360) + 360) % 360;
  const s = Math.max(0, Math.min(100, saturation)) / 100;
  const l = Math.max(0, Math.min(100, lightness)) / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const segment = h / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const match = l - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment >= 0 && segment < 1) {
    red = chroma;
    green = secondary;
  } else if (segment < 2) {
    red = secondary;
    green = chroma;
  } else if (segment < 3) {
    green = chroma;
    blue = secondary;
  } else if (segment < 4) {
    green = secondary;
    blue = chroma;
  } else if (segment < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  return {
    r: clampColorChannel((red + match) * 255),
    g: clampColorChannel((green + match) * 255),
    b: clampColorChannel((blue + match) * 255),
  };
}

function getSuggestedAccentFromImage(src: string) {
  return new Promise<string | null>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          resolve(null);
          return;
        }

        const targetWidth = 48;
        const scale = targetWidth / Math.max(1, image.naturalWidth);
        canvas.width = targetWidth;
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        const buckets = new Map<string, { score: number; red: number; green: number; blue: number }>();

        for (let index = 0; index < data.length; index += 4) {
          const alpha = data[index + 3] / 255;
          if (alpha < 0.9) {
            continue;
          }

          const red = data[index];
          const green = data[index + 1];
          const blue = data[index + 2];
          const max = Math.max(red, green, blue);
          const min = Math.min(red, green, blue);
          const saturation = max === 0 ? 0 : (max - min) / max;
          const brightness = max / 255;
          const chromaScore = saturation * 1.25 + brightness * 0.35;

          if (chromaScore < 0.2) {
            continue;
          }

          const bucketRed = Math.round(red / 16) * 16;
          const bucketGreen = Math.round(green / 16) * 16;
          const bucketBlue = Math.round(blue / 16) * 16;
          const key = `${bucketRed},${bucketGreen},${bucketBlue}`;
          const existing = buckets.get(key);

          if (existing) {
            existing.score += chromaScore;
          } else {
            buckets.set(key, {
              score: chromaScore,
              red: bucketRed,
              green: bucketGreen,
              blue: bucketBlue,
            });
          }
        }

        const bestBucket = [...buckets.values()].sort((left, right) => right.score - left.score)[0];
        if (!bestBucket) {
          resolve(null);
          return;
        }

        const mixedRed = bestBucket.red * 0.88 + 255 * 0.12;
        const mixedGreen = bestBucket.green * 0.88 + 255 * 0.12;
        const mixedBlue = bestBucket.blue * 0.88 + 255 * 0.12;
        resolve(rgbToHex(mixedRed, mixedGreen, mixedBlue));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function getGovernmentTypeSelection(value: string | null) {
  if (!value) {
    return "";
  }

  return GOVERNMENT_TYPE_OPTIONS.includes(value as (typeof GOVERNMENT_TYPE_OPTIONS)[number])
    ? value
    : OTHER_GOVERNMENT_TYPE;
}

function getCustomGovernmentType(value: string | null) {
  if (!value) {
    return "";
  }

  return GOVERNMENT_TYPE_OPTIONS.includes(value as (typeof GOVERNMENT_TYPE_OPTIONS)[number]) ? "" : value;
}

export default function CountryProfileEditor({ initialCountry }: Props) {
  const modalPreviewSize = 220;
  const flagInputRef = useRef<HTMLInputElement | null>(null);
  const currentColorHexRef = useRef<string | null>(normalizeHexColor(initialCountry.colorHex));
  const lastAutoAccentRef = useRef<string | null>(normalizeHexColor(initialCountry.colorHex));
  const [savedCountry, setSavedCountry] = useState<FormState>(initialCountry);
  const [form, setForm] = useState<FormState>(initialCountry);
  const [flagFile, setFlagFile] = useState<File | null>(null);
  const [flagPreviewUrl, setFlagPreviewUrl] = useState<string | null>(null);
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [pendingFlagFile, setPendingFlagFile] = useState<File | null>(null);
  const [pendingFlagPreviewUrl, setPendingFlagPreviewUrl] = useState<string | null>(null);
  const [pendingFlagRatioWidthInput, setPendingFlagRatioWidthInput] = useState("");
  const [pendingFlagRatioHeightInput, setPendingFlagRatioHeightInput] = useState("");
  const [pendingFlagNaturalSize, setPendingFlagNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [isPendingRatioEditing, setIsPendingRatioEditing] = useState(false);
  const [isAccentModalOpen, setIsAccentModalOpen] = useState(false);
  const [accentInputMode, setAccentInputMode] = useState<AccentInputMode>("rgb");
  const [governmentTypeSelection, setGovernmentTypeSelection] = useState(() =>
    getGovernmentTypeSelection(initialCountry.governmentType)
  );
  const [customGovernmentType, setCustomGovernmentType] = useState(() =>
    getCustomGovernmentType(initialCountry.governmentType)
  );
  const [officeholders, setOfficeholders] = useState<Officeholder[]>(() =>
    getCountryOfficeholders(initialCountry)
  );
  const [suggestedAccent, setSuggestedAccent] = useState<string | null>(null);
  const [lastAutoAccent, setLastAutoAccent] = useState<string | null>(normalizeHexColor(initialCountry.colorHex));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateOfficeholder(index: number, key: keyof Officeholder, value: string) {
    setOfficeholders((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [key]: value } : entry
      )
    );
  }

  function addOfficeholder() {
    setOfficeholders((current) => [...current, { position: "", name: "" }]);
  }

  function removeOfficeholder(index: number) {
    setOfficeholders((current) => current.filter((_, entryIndex) => entryIndex !== index));
  }

  const flagAspectRatio = form.flagAspectRatio?.trim() || DEFAULT_FLAG_ASPECT_RATIO;
  const flagSrc = flagPreviewUrl ?? getCountryFlagSrc(form);
  const normalizedAccent = normalizeHexColor(form.colorHex) ?? DEFAULT_ACCENT;
  const delegateOptions = initialCountry.delegates
    .map((delegate) => delegate.name?.trim() ?? "")
    .filter((name, index, list) => name.length > 0 && list.indexOf(name) === index);
  const oldestDelegateName = delegateOptions[0] ?? "";

  useEffect(() => {
    return () => {
      if (flagPreviewUrl) {
        URL.revokeObjectURL(flagPreviewUrl);
      }
      if (pendingFlagPreviewUrl) {
        URL.revokeObjectURL(pendingFlagPreviewUrl);
      }
    };
  }, [flagPreviewUrl, pendingFlagPreviewUrl]);

  useEffect(() => {
    if (!isFlagModalOpen && !isAccentModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAccentModalOpen, isFlagModalOpen]);

  useEffect(() => {
    currentColorHexRef.current = normalizeHexColor(form.colorHex);
  }, [form.colorHex]);

  useEffect(() => {
    lastAutoAccentRef.current = normalizeHexColor(lastAutoAccent);
  }, [lastAutoAccent]);

  useEffect(() => {
    let cancelled = false;

    getSuggestedAccentFromImage(flagSrc).then((color) => {
      if (cancelled) {
        return;
      }

      setSuggestedAccent(color);
      const normalizedCurrent = currentColorHexRef.current;
      const normalizedAuto = lastAutoAccentRef.current;

      if (!color) {
        return;
      }

      if (!normalizedCurrent || (normalizedAuto && normalizedCurrent === normalizedAuto)) {
        updateField("colorHex", color);
        setLastAutoAccent(color);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [flagSrc]);

  useEffect(() => {
    setOfficeholders((current) => {
      const headIndex = current.findIndex(
        (entry) => entry.position.trim().toLowerCase() === HEAD_OF_STATE_POSITION.toLowerCase()
      );

      if (headIndex === -1) {
        if (!oldestDelegateName) {
          return current;
        }

        return [{ position: HEAD_OF_STATE_POSITION, name: oldestDelegateName }, ...current];
      }

      const next = [...current];
      const head = next[headIndex];
      const normalizedHead = {
        position: HEAD_OF_STATE_POSITION,
        name: head.name.trim().length > 0 ? head.name : oldestDelegateName,
      };

      if (
        normalizedHead.position === head.position &&
        normalizedHead.name === head.name
      ) {
        return current;
      }

      next[headIndex] = normalizedHead;
      return next;
    });
  }, [oldestDelegateName]);

  function toStoredAspectRatio(input: string) {
    const normalized = input.trim().replace(/\s+/g, "");
    const match = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(normalized);
    if (!match) return null;
    return `${match[1]} / ${match[2]}`;
  }

  function getPendingRatioInput() {
    return `${pendingFlagRatioWidthInput}:${pendingFlagRatioHeightInput}`;
  }

  function setPendingRatioInputValue(input: string) {
    const parsed = parseRatioInput(input);
    if (!parsed) {
      setPendingFlagRatioWidthInput("");
      setPendingFlagRatioHeightInput("");
      return;
    }

    setPendingFlagRatioWidthInput(String(parsed.width));
    setPendingFlagRatioHeightInput(String(parsed.height));
  }

  function getAutoRatioInput(width: number, height: number) {
    const safeWidth = Math.max(1, Math.round(width));
    const safeHeight = Math.max(1, Math.round(height));

    function gcd(a: number, b: number): number {
      let left = a;
      let right = b;
      while (right !== 0) {
        const next = left % right;
        left = right;
        right = next;
      }
      return left;
    }

    const divisor = gcd(safeWidth, safeHeight);
    const exactLabel = `${safeWidth / divisor}:${safeHeight / divisor}`;
    const exactRatio = safeWidth / safeHeight;

    let closest: { label: string; error: number } | null = null;
    for (const candidate of COMMON_FLAG_RATIOS) {
      const candidateRatio = candidate.width / candidate.height;
      const error = Math.abs(candidateRatio - exactRatio) / exactRatio;
      if (!closest || error < closest.error) {
        closest = { label: candidate.label, error };
      }
    }

    if (closest && closest.error <= APPROXIMATION_TOLERANCE) {
      return closest.label;
    }

    return exactLabel;
  }

  function parseRatioInput(input: string) {
    const normalized = input.trim().replace(/\s+/g, "");
    const match = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(normalized);
    if (!match) return null;

    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }

    return { width, height, ratio: width / height };
  }

  function resetPendingFlagSelection() {
    setPendingFlagFile(null);
    if (pendingFlagPreviewUrl) {
      URL.revokeObjectURL(pendingFlagPreviewUrl);
    }
    setPendingFlagPreviewUrl(null);
    setPendingFlagRatioWidthInput("");
    setPendingFlagRatioHeightInput("");
    setPendingFlagNaturalSize(null);
    setIsPendingRatioEditing(false);
  }

  function closeFlagModal() {
    setIsFlagModalOpen(false);
    resetPendingFlagSelection();
  }

  function openFlagModal(file: File) {
    if (pendingFlagPreviewUrl) {
      URL.revokeObjectURL(pendingFlagPreviewUrl);
    }

    setPendingFlagFile(file);
    setPendingFlagPreviewUrl(URL.createObjectURL(file));
    setPendingFlagRatioWidthInput("");
    setPendingFlagRatioHeightInput("");
    setIsPendingRatioEditing(false);
    setIsFlagModalOpen(true);
  }

  function confirmFlagSelection() {
    if (!pendingFlagFile) {
      setError("Choose a flag file first.");
      return;
    }

    const storedAspectRatio = toStoredAspectRatio(getPendingRatioInput());
    if (!storedAspectRatio) {
      setError("Use an aspect ratio in X:X format, for example 3:2.");
      return;
    }

    setError(null);
    setFlagFile(pendingFlagFile);
    if (flagPreviewUrl) {
      URL.revokeObjectURL(flagPreviewUrl);
    }
    setFlagPreviewUrl(pendingFlagPreviewUrl);
    updateField("flagAspectRatio", storedAspectRatio);
    closeFlagModal();
  }

  function openAccentModal() {
    setIsAccentModalOpen(true);
  }

  function closeAccentModal() {
    setIsAccentModalOpen(false);
  }

  function updateAccentFromRgb(channel: "r" | "g" | "b", value: string) {
    const current = hexToRgb(normalizedAccent);
    const parsed = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
    const next = Number.isFinite(parsed) ? Math.max(0, Math.min(255, parsed)) : 0;
    current[channel] = next;
    updateField("colorHex", rgbToHex(current.r, current.g, current.b));
    setLastAutoAccent(null);
  }

  function updateAccentFromHex(value: string) {
    const normalized = value.replace(/[^0-9a-fA-F#]/g, "");
    const withHash = normalized.startsWith("#") ? normalized : `#${normalized}`;
    if (/^#[0-9a-fA-F]{6}$/.test(withHash)) {
      updateField("colorHex", withHash.toLowerCase());
      setLastAutoAccent(null);
    }
  }

  function updateAccentFromHsl(channel: "h" | "s" | "l", value: string) {
    const currentRgb = hexToRgb(normalizedAccent);
    const currentHsl = rgbToHsl(currentRgb.r, currentRgb.g, currentRgb.b);
    const parsed = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
    const next = Number.isFinite(parsed) ? parsed : 0;
    const boundedValue =
      channel === "h" ? Math.max(0, Math.min(360, next)) : Math.max(0, Math.min(100, next));
    currentHsl[channel] = boundedValue;
    const nextRgb = hslToRgb(currentHsl.h, currentHsl.s, currentHsl.l);
    updateField("colorHex", rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
    setLastAutoAccent(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const headOfState = normalizedOfficeholders.find(
      (entry) => entry.position.toLowerCase() === HEAD_OF_STATE_POSITION.toLowerCase()
    );
    if (!headOfState?.name) {
      setError("Every country must have a Head of state.");
      setIsSaving(false);
      return;
    }

    const formPayload = new FormData();
    formPayload.set("name", form.name);
    formPayload.set("colorHex", form.colorHex ?? "");
    formPayload.set("summary", form.summary ?? "");
    formPayload.set("capital", form.capital ?? "");
    formPayload.set("governmentType", resolvedGovernmentType ?? "");
    formPayload.set("officeholders", JSON.stringify(normalizedOfficeholders));
    formPayload.set("flagAspectRatio", form.flagAspectRatio ?? "");
    formPayload.set("removeFlag", "false");
    if (flagFile) {
      formPayload.set("flagFile", flagFile);
    }

    const response = await fetch("/api/members/me/country", {
      method: "PATCH",
      body: formPayload,
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Unable to save country profile.");
      setIsSaving(false);
      return;
    }

    setForm(payload.country);
    setSavedCountry(payload.country);
    setGovernmentTypeSelection(getGovernmentTypeSelection(payload.country.governmentType));
    setCustomGovernmentType(getCustomGovernmentType(payload.country.governmentType));
    setOfficeholders(getCountryOfficeholders(payload.country));
    setFlagFile(null);
    if (flagPreviewUrl) {
      URL.revokeObjectURL(flagPreviewUrl);
      setFlagPreviewUrl(null);
    }
    setSuccess("Profile updated.");
    setIsSaving(false);
  }

  const parsedPendingRatio = parseRatioInput(getPendingRatioInput());
  const accentRgb = hexToRgb(normalizedAccent);
  const accentHsl = rgbToHsl(accentRgb.r, accentRgb.g, accentRgb.b);
  const accentModeLabel = accentInputMode.toUpperCase();
  const resolvedGovernmentType =
    governmentTypeSelection === OTHER_GOVERNMENT_TYPE ? customGovernmentType.trim() : governmentTypeSelection || null;
  const normalizedOfficeholders = officeholders
    .map((entry) => ({
      position: entry.position.trim(),
      name: entry.name.trim(),
    }))
    .filter((entry) => entry.position.length > 0 && entry.name.length > 0);
  const hasUnsavedChanges =
    form.name !== savedCountry.name ||
    form.slug !== savedCountry.slug ||
    form.code !== savedCountry.code ||
    form.colorHex !== savedCountry.colorHex ||
    form.flagAspectRatio !== savedCountry.flagAspectRatio ||
    form.summary !== savedCountry.summary ||
    form.capital !== savedCountry.capital ||
    resolvedGovernmentType !== savedCountry.governmentType ||
    JSON.stringify(normalizedOfficeholders) !== JSON.stringify(getCountryOfficeholders(savedCountry)) ||
    flagFile !== null;
  const pendingRatioHint = (() => {
    if (!pendingFlagNaturalSize) {
      return null;
    }

    const exactRatio = pendingFlagNaturalSize.width / pendingFlagNaturalSize.height;
    const exactLabel = `${pendingFlagNaturalSize.width}:${pendingFlagNaturalSize.height}`;
    const selectedRatio = parsedPendingRatio?.ratio ?? null;

    if (!selectedRatio) {
      return {
        original: exactLabel,
        errorText: null,
      };
    }

    const errorPercent = Math.abs(selectedRatio - exactRatio) / exactRatio * 100;
    return {
      original: exactLabel,
      errorText: errorPercent < 0.01 ? null : `${errorPercent.toFixed(errorPercent < 0.1 ? 2 : 1)}% error`,
    };
  })();
  const pendingOutlineStyle = (() => {
    if (!parsedPendingRatio || !pendingFlagNaturalSize) {
      return null;
    }

    const imageRatio = pendingFlagNaturalSize.width / pendingFlagNaturalSize.height;
    const renderedWidth = imageRatio >= 1 ? modalPreviewSize : modalPreviewSize * imageRatio;
    const renderedHeight = imageRatio >= 1 ? modalPreviewSize / imageRatio : modalPreviewSize;
    const renderedLeft = (modalPreviewSize - renderedWidth) / 2;
    const renderedTop = (modalPreviewSize - renderedHeight) / 2;
    const availableWidth = Math.max(1, renderedWidth);
    const availableHeight = Math.max(1, renderedHeight);

    if (parsedPendingRatio.ratio >= availableWidth / availableHeight) {
      const width = availableWidth;
      const height = width / parsedPendingRatio.ratio;
      return {
        left: renderedLeft,
        top: renderedTop + (availableHeight - height) / 2,
        width,
        height,
      };
    }

    const height = availableHeight;
    const width = height * parsedPendingRatio.ratio;
    return {
      left: renderedLeft + (availableWidth - width) / 2,
      top: renderedTop,
      width,
      height,
    };
  })();

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

      </div>

      <div className="p-6">
          <input
            ref={flagInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              if (!file) {
                return;
              }

              setError(null);
              openFlagModal(file);
              event.currentTarget.value = "";
            }}
            className="hidden"
          />

          <div className="mb-5 grid gap-4 rounded-[1.25rem] border border-stone-800 bg-stone-950/45 p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <button
              type="button"
              onClick={() => flagInputRef.current?.click()}
              className="group relative block w-full max-w-[220px] overflow-hidden rounded-[1rem] border border-stone-700 bg-stone-950 text-left transition hover:border-amber-500/50"
              style={{ aspectRatio: flagAspectRatio }}
            >
              <FlagImage
                src={flagSrc}
                alt={`${form.name || "Country"} flag`}
                sizes="220px"
                className="object-cover"
              />
              <span className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-stone-950/80 text-stone-100 transition group-hover:border-amber-400/60 group-hover:text-amber-100">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.8]">
                  <path d="M4 20l4.5-1 9-9a1.5 1.5 0 0 0 0-2.1l-1.4-1.4a1.5 1.5 0 0 0-2.1 0l-9 9L4 20Z" />
                  <path d="M13 7l4 4" />
                </svg>
              </span>
            </button>

            <div className="rounded-[1rem] border border-stone-800/90 bg-[linear-gradient(180deg,rgba(41,37,36,0.76),rgba(12,10,9,0.96))] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-stone-200">Accent colour</div>
                  <div className="mt-1 text-xs text-stone-500">Used across your public profile surfaces.</div>
                </div>
                <button
                  type="button"
                  onClick={openAccentModal}
                  className="group relative h-20 w-20 rounded-[1.35rem] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_30px_rgba(0,0,0,0.25)] transition hover:scale-[1.04] hover:border-white/25"
                  style={{ background: normalizedAccent }}
                  aria-label="Choose accent colour"
                  title="Choose accent colour"
                >
                  <span className="absolute inset-0 rounded-[1.35rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.22),transparent_45%,rgba(0,0,0,0.18))]" />
                  <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-stone-950/65 text-stone-100 transition group-hover:border-white/35">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 fill-none stroke-current stroke-[1.8]">
                      <path d="M4 20l4.5-1 9-9a1.5 1.5 0 0 0 0-2.1l-1.4-1.4a1.5 1.5 0 0 0-2.1 0l-9 9L4 20Z" />
                      <path d="M13 7l4 4" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <div className="text-sm font-medium text-stone-300">Public slug</div>
              <input
                value={form.slug}
                readOnly
                className="mt-2 w-full rounded-xl border border-stone-800 bg-stone-950/80 px-3 py-2.5 text-sm text-stone-400"
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-stone-300">Country code</div>
              <input
                value={form.code ?? "N/A"}
                readOnly
                className="mt-2 w-full rounded-xl border border-stone-800 bg-stone-950/80 px-3 py-2.5 text-sm text-stone-400"
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-stone-300">Country name</div>
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
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
              <select
                value={governmentTypeSelection}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setGovernmentTypeSelection(nextValue);
                  if (nextValue !== OTHER_GOVERNMENT_TYPE) {
                    setCustomGovernmentType("");
                  }
                }}
                className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2.5 text-sm text-stone-100"
              >
                <option value="">Select government type</option>
                {GOVERNMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value={OTHER_GOVERNMENT_TYPE}>Other</option>
              </select>
            </label>

            {governmentTypeSelection === OTHER_GOVERNMENT_TYPE && (
              <label className="block">
                <div className="text-sm font-medium text-stone-300">Other government type</div>
                <input
                  value={customGovernmentType}
                  onChange={(event) => setCustomGovernmentType(event.target.value)}
                  placeholder="Specify government type"
                  className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2.5 text-sm text-stone-100"
                />
              </label>
            )}

            {governmentTypeSelection !== OTHER_GOVERNMENT_TYPE && (
              <div className="hidden sm:block" aria-hidden="true" />
            )}

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-stone-300">Positions</div>
                <button
                  type="button"
                  onClick={addOfficeholder}
                  className="rounded-full border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs font-medium text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
                >
                  Add position
                </button>
              </div>

              <div className="mt-2 space-y-3">
                {officeholders.length === 0 && (
                  <div className="rounded-xl border border-dashed border-stone-700 bg-stone-950/50 px-4 py-3 text-sm text-stone-400">
                    No positions added yet.
                  </div>
                )}

                {officeholders.map((entry, index) => (
                  <div key={index} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <input
                      value={entry.position}
                      onChange={(event) => updateOfficeholder(index, "position", event.target.value)}
                      placeholder="Position"
                      readOnly={entry.position.trim().toLowerCase() === HEAD_OF_STATE_POSITION.toLowerCase()}
                      className={`rounded-xl border px-3 py-2.5 text-sm ${
                        entry.position.trim().toLowerCase() === HEAD_OF_STATE_POSITION.toLowerCase()
                          ? "border-stone-800 bg-stone-950/80 text-stone-300"
                          : "border-stone-700 bg-stone-900 text-stone-100"
                      }`}
                    />
                    <select
                      value={entry.name}
                      onChange={(event) => updateOfficeholder(index, "name", event.target.value)}
                      className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2.5 text-sm text-stone-100"
                    >
                      <option value="">Select delegate</option>
                      {delegateOptions.map((delegateName) => (
                        <option key={delegateName} value={delegateName}>
                          {delegateName}
                        </option>
                      ))}
                      {entry.name.trim().length > 0 && !delegateOptions.includes(entry.name.trim()) && (
                        <option value={entry.name}>{entry.name}</option>
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeOfficeholder(index)}
                      disabled={entry.position.trim().toLowerCase() === HEAD_OF_STATE_POSITION.toLowerCase()}
                      className="rounded-full border border-stone-700 bg-stone-900 px-3 py-2.5 text-sm text-stone-300 transition hover:border-rose-500/50 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
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

          {hasUnsavedChanges && (
            <div className="mt-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-100">
              You have unsaved changes.
            </div>
          )}
          {error && <div className="mt-4 rounded-xl border border-rose-700/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-100">{error}</div>}
          {success && <div className="mt-4 rounded-xl border border-emerald-700/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100">{success}</div>}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {hasUnsavedChanges && (
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-full border border-stone-200 bg-stone-100 px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save profile"}
              </button>
            )}
            <div className="text-xs text-stone-500">
              {hasUnsavedChanges
                ? "Changes are local until you save."
                : "No unsaved changes."}
            </div>
          </div>
      </div>

      {isFlagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[1.75rem] border border-stone-700 bg-stone-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-amber-200/70">Flag Setup</div>
                <h4 className="mt-2 text-xl font-semibold text-stone-50">Set flag aspect ratio</h4>
              </div>
              <button
                type="button"
                onClick={closeFlagModal}
                className="rounded-full border border-stone-700 bg-stone-950/60 px-3 py-1 text-sm text-stone-300 transition hover:border-stone-500 hover:text-stone-100"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div
                className="relative overflow-hidden rounded-xl border border-stone-700 bg-stone-950"
                style={{ width: modalPreviewSize, height: modalPreviewSize }}
              >
                {pendingFlagPreviewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pendingFlagPreviewUrl}
                    alt="Pending flag preview"
                    onLoad={(event) => {
                      const width = event.currentTarget.naturalWidth;
                      const height = event.currentTarget.naturalHeight;
                      setPendingFlagNaturalSize({ width, height });
                      setPendingRatioInputValue(getAutoRatioInput(width, height));
                      setIsPendingRatioEditing(false);
                    }}
                    className="h-full w-full object-contain"
                  />
                )}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.32)_100%)]" />
                {pendingOutlineStyle && (
                  <div
                    className="pointer-events-none absolute border-2 border-white shadow-[0_0_0_9999px_rgba(255,255,255,0.06)]"
                    style={{
                      left: pendingOutlineStyle.left,
                      top: pendingOutlineStyle.top,
                      width: pendingOutlineStyle.width,
                      height: pendingOutlineStyle.height,
                    }}
                  />
                )}
              </div>

              <div>
                <label className="block">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-stone-300">Aspect ratio</div>
                  </div>
                  <div
                    className={`mt-2 inline-flex items-center rounded-lg border ${
                      isPendingRatioEditing
                        ? "border-stone-700 bg-stone-950"
                        : "border-stone-800 bg-stone-950/70"
                    }`}
                  >
                    <input
                      inputMode="decimal"
                      value={pendingFlagRatioWidthInput}
                      onChange={(event) => setPendingFlagRatioWidthInput(event.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="3"
                      readOnly={!isPendingRatioEditing}
                      className={`w-14 bg-transparent px-2 py-1.5 text-center text-sm outline-none ${
                        isPendingRatioEditing ? "text-stone-100" : "text-stone-400"
                      }`}
                    />
                    <span className={`text-xs ${isPendingRatioEditing ? "text-stone-300" : "text-stone-500"}`}>:</span>
                    <input
                      inputMode="decimal"
                      value={pendingFlagRatioHeightInput}
                      onChange={(event) => setPendingFlagRatioHeightInput(event.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="2"
                      readOnly={!isPendingRatioEditing}
                      className={`w-14 bg-transparent px-2 py-1.5 text-center text-sm outline-none ${
                        isPendingRatioEditing ? "text-stone-100" : "text-stone-400"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (isPendingRatioEditing && pendingFlagNaturalSize) {
                          setPendingRatioInputValue(getAutoRatioInput(pendingFlagNaturalSize.width, pendingFlagNaturalSize.height));
                        }
                        setIsPendingRatioEditing((current) => !current);
                      }}
                      className="mr-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-stone-700 bg-stone-950/60 text-stone-300 transition hover:border-stone-500 hover:text-stone-100"
                      aria-label={isPendingRatioEditing ? "Switch back to automatic aspect ratio" : "Edit aspect ratio manually"}
                      title={isPendingRatioEditing ? "Use automatic ratio" : "Edit ratio manually"}
                    >
                      {isPendingRatioEditing ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.8]">
                          <path d="M3 12a9 9 0 1 0 3-6.7" />
                          <path d="M3 4v5h5" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.8]">
                          <path d="M4 20l4.5-1 9-9a1.5 1.5 0 0 0 0-2.1l-1.4-1.4a1.5 1.5 0 0 0-2.1 0l-9 9L4 20Z" />
                          <path d="M13 7l4 4" />
                        </svg>
                      )}
                    </button>
                  </div>
                </label>
                <div className="mt-2 text-xs text-stone-500">
                  {isPendingRatioEditing
                    ? "Use whole numbers or decimals separated by a colon. Examples: 3:2, 4:3, 1:1."
                    : "Auto-detected ratio locked. Click the edit icon to override it."}
                </div>
                {pendingRatioHint && (
                  <div className="mt-2 text-xs text-stone-500">
                    Original ratio: {pendingRatioHint.original}
                    {pendingRatioHint.errorText ? `, ${pendingRatioHint.errorText}.` : "."}
                  </div>
                )}
                <div className="mt-2 text-xs text-stone-500">
                  The full uploaded image is shown on the left. The white outline marks the ratio frame that will be used.
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={confirmFlagSelection}
                className="rounded-full border border-stone-200 bg-stone-100 px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-white"
              >
                Use this flag
              </button>
              <button
                type="button"
                onClick={closeFlagModal}
                className="rounded-full border border-stone-700 bg-stone-800 px-5 py-2.5 text-sm font-semibold text-stone-100 transition hover:border-stone-500 hover:bg-stone-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isAccentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] border border-stone-700 bg-stone-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-amber-200/70">Accent Colour</div>
                <h4 className="mt-2 text-xl font-semibold text-stone-50">Choose profile accent</h4>
              </div>
              <button
                type="button"
                onClick={closeAccentModal}
                className="rounded-full border border-stone-700 bg-stone-950/60 px-3 py-1 text-sm text-stone-300 transition hover:border-stone-500 hover:text-stone-100"
              >
                Close
              </button>
            </div>

            <div className="mt-3 rounded-[1.25rem] border border-stone-800 bg-[linear-gradient(180deg,rgba(41,37,36,0.72),rgba(12,10,9,0.96))] p-4">
              <div className="rounded-[1.25rem] border border-stone-700/80 bg-stone-950/80 p-3">
                <div className="accent-picker-shell">
                  <RgbColorPicker
                    color={accentRgb}
                    onChange={(color) => {
                      updateField("colorHex", rgbToHex(color.r, color.g, color.b));
                      setLastAutoAccent(null);
                    }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div
                    className="h-10 w-10 rounded-full border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                    style={{ background: normalizedAccent }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAccentInputMode((current) =>
                        current === "rgb" ? "hex" : current === "hex" ? "hsl" : "rgb"
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-900/90 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-stone-300 transition hover:border-stone-500 hover:text-stone-100"
                  >
                    {accentModeLabel}
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.8]">
                      <path d="M7 10l5 5 5-5" />
                    </svg>
                  </button>
                </div>
                <div className={`mt-3 grid gap-2 ${accentInputMode === "hex" ? "grid-cols-1" : "grid-cols-3"}`}>
                  {accentInputMode === "rgb" &&
                    ([
                      ["R", "r"],
                      ["G", "g"],
                      ["B", "b"],
                    ] as const).map(([label, channel]) => (
                      <label key={label} className="rounded-xl border border-stone-700 bg-stone-900/90 px-2 py-2">
                        <input
                          inputMode="numeric"
                          value={accentRgb[channel]}
                          onChange={(event) => updateAccentFromRgb(channel, event.target.value)}
                          className="w-full bg-transparent text-center text-lg font-medium text-stone-100 outline-none"
                        />
                        <div className="mt-1 text-center text-[11px] uppercase tracking-[0.18em] text-stone-500">{label}</div>
                      </label>
                    ))}
                  {accentInputMode === "hex" && (
                    <label className="rounded-xl border border-stone-700 bg-stone-900/90 px-3 py-3">
                      <input
                        value={normalizedAccent}
                        onChange={(event) => updateAccentFromHex(event.target.value)}
                        className="w-full bg-transparent text-center text-lg font-medium uppercase tracking-[0.08em] text-stone-100 outline-none"
                      />
                      <div className="mt-1 text-center text-[11px] uppercase tracking-[0.18em] text-stone-500">Hex</div>
                    </label>
                  )}
                  {accentInputMode === "hsl" &&
                    ([
                      ["H", "h"],
                      ["S", "s"],
                      ["L", "l"],
                    ] as const).map(([label, channel]) => (
                      <label key={label} className="rounded-xl border border-stone-700 bg-stone-900/90 px-2 py-2">
                        <input
                          inputMode="numeric"
                          value={accentHsl[channel]}
                          onChange={(event) => updateAccentFromHsl(channel, event.target.value)}
                          className="w-full bg-transparent text-center text-lg font-medium text-stone-100 outline-none"
                        />
                        <div className="mt-1 text-center text-[11px] uppercase tracking-[0.18em] text-stone-500">{label}</div>
                      </label>
                    ))}
                </div>
              </div>

              {suggestedAccent && normalizeHexColor(suggestedAccent) !== normalizeHexColor(form.colorHex) && (
                <button
                  type="button"
                  onClick={() => {
                    updateField("colorHex", suggestedAccent);
                    setLastAutoAccent(suggestedAccent);
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 transition hover:border-amber-400/40 hover:bg-amber-500/15"
                >
                  <span
                    className="h-4 w-4 rounded-full border border-white/20"
                    style={{ background: suggestedAccent }}
                  />
                  Use flag suggestion
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .accent-picker-shell .react-colorful {
          width: 100%;
        }

        .accent-picker-shell .react-colorful__saturation {
          position: relative;
          height: 220px;
          border-bottom: none;
          border-radius: 18px 18px 0 0;
          overflow: hidden;
        }

        .accent-picker-shell .react-colorful__hue {
          height: 18px;
          margin-top: 12px;
          border-radius: 999px;
        }

        .accent-picker-shell .react-colorful__interactive {
          inset: 0;
        }

        .accent-picker-shell .react-colorful__pointer {
          width: 18px;
          height: 18px;
          border: 3px solid white;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
        }

        .accent-picker-shell .react-colorful__pointer-fill {
          box-shadow: none;
        }
      `}</style>
    </form>
  );
}

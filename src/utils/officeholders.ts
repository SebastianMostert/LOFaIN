export type Officeholder = {
  position: string;
  name: string;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeOfficeholders(input: unknown): Officeholder[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const position = normalizeText((entry as { position?: unknown }).position);
      const name = normalizeText((entry as { name?: unknown }).name);
      if (!position || !name) {
        return null;
      }

      return { position, name };
    })
    .filter((entry): entry is Officeholder => entry !== null);
}

export function getCountryOfficeholders(country: {
  officeholders?: unknown;
  headOfState?: string | null;
  foreignMinister?: string | null;
}) {
  const normalized = normalizeOfficeholders(country.officeholders);
  if (normalized.length > 0) {
    return normalized;
  }

  const legacy: Officeholder[] = [];
  const headOfState = normalizeText(country.headOfState);
  const foreignMinister = normalizeText(country.foreignMinister);

  if (headOfState) {
    legacy.push({ position: "Head of state", name: headOfState });
  }
  if (foreignMinister) {
    legacy.push({ position: "Foreign minister", name: foreignMinister });
  }

  return legacy;
}

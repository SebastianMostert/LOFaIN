const FLAG_ASPECT_RATIO_PATTERN = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/;

type CountryFlagLike = {
  code?: string | null;
  flagImagePath?: string | null;
  flagAspectRatio?: string | null;
};

export const DEFAULT_FLAG_ASPECT_RATIO = "3 / 2";

export function getDefaultFlagSrc(code?: string | null) {
  return `/flags/${(code ?? "unknown").toLowerCase()}.svg`;
}

export function getCountryFlagSrc(country: CountryFlagLike) {
  const customPath = country.flagImagePath?.trim();
  if (customPath) {
    return customPath.startsWith("/") ? customPath : `/${customPath}`;
  }

  return getDefaultFlagSrc(country.code);
}

export function normalizeFlagAspectRatio(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const match = FLAG_ASPECT_RATIO_PATTERN.exec(trimmed);
  if (!match) return null;

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return `${width} / ${height}`;
}

export function getCountryFlagAspectRatio(country: CountryFlagLike) {
  return normalizeFlagAspectRatio(country.flagAspectRatio) ?? DEFAULT_FLAG_ASPECT_RATIO;
}

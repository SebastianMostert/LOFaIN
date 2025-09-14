export const clampPct = (n: number) => Math.max(0, Math.min(100, n));
export const pct = (n: number, d: number) => (d ? clampPct(Math.round((n / d) * 100)) : 0);
export const pctFloat = (n: number, d: number) => (d ? clampPct((n / d) * 100) : 0);
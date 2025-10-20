const DEFAULT_BASE_URL = "http://localhost:3000";

function trimTrailingSlash(url: string): string {
    return url.replace(/\/+$/, "");
}

function trimSlashes(value: string): string {
    return value.replace(/^\/+|\/+$/g, "");
}

function readTenantSlug(): string | null {
    const raw =
        process.env.NEXT_PUBLIC_TENANT_SLUG ??
        process.env.NEXT_PUBLIC_TENANT ??
        process.env.TENANT_SLUG ??
        process.env.TENANT ??
        "";

    const normalized = trimSlashes(raw.trim());
    return normalized.length > 0 ? normalized : null;
}

function applyTenantToBase(rawBaseUrl: string, tenant: string | null): string {
    let candidate = rawBaseUrl.trim();
    if (!candidate) {
        candidate = DEFAULT_BASE_URL;
    }

    try {
        const parsed = new URL(candidate);
        const tenantSlug = tenant;
        let pathname = trimTrailingSlash(parsed.pathname);

        if (tenantSlug) {
            const tenantLower = tenantSlug.toLowerCase();
            const lowerHost = parsed.hostname.toLowerCase();
            const tenantPrefix = `${tenantLower}.`;
            if (lowerHost.startsWith(tenantPrefix)) {
                parsed.hostname = parsed.hostname.slice(tenantSlug.length + 1);
            }

            const tenantPath = `/${tenantSlug}`;
            const pathnameLower = pathname.toLowerCase();
            if (pathnameLower === tenantPath.toLowerCase()) {
                pathname = "";
            } else if (pathnameLower.endsWith(tenantPath.toLowerCase())) {
                pathname = pathname.slice(0, -tenantPath.length);
            }
        }

        const origin = `${parsed.protocol}//${parsed.host}`;
        candidate = pathname && pathname !== "/" ? `${origin}${pathname}` : origin;
    } catch {
        candidate = trimTrailingSlash(candidate);
    }

    candidate = trimTrailingSlash(candidate);
    if (!candidate) {
        candidate = DEFAULT_BASE_URL;
    }

    if (tenant) {
        const tenantPath = `/${tenant}`;
        if (candidate.toLowerCase().endsWith(tenantPath.toLowerCase())) {
            return candidate;
        }
        return `${candidate}${tenantPath}`;
    }

    return candidate;
}

export function getPublicBaseUrl(): string {
    const tenant = readTenantSlug();
    const base =
        process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
        process.env.NEXTAUTH_URL?.trim() ||
        DEFAULT_BASE_URL;

    return applyTenantToBase(base, tenant);
}

export function getServerBaseUrl(): string {
    const tenant = readTenantSlug();
    const base =
        process.env.NEXTAUTH_URL?.trim() ||
        process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
        DEFAULT_BASE_URL;

    return applyTenantToBase(base, tenant);
}

export function buildTenantUrl(path: string): string {
    const base = getPublicBaseUrl();
    if (!path) {
        return base;
    }
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getTenantSlug(): string | null {
    return readTenantSlug();
}

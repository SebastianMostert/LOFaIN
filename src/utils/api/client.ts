"use server";

import { cookies } from "next/headers";

export async function getBaseUrl() {
    // Prefer Better Auth base URL, then legacy auth/public base, then dev default
    return (
        process.env.BETTER_AUTH_URL ||
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        "http://localhost:3000"
    );
}

export async function apiPost<T>(
    path: string,
    body: unknown,
    opts?: { revalidate?: RequestCache }
): Promise<T> {
    const res = await fetch(`${await getBaseUrl()}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            // forward auth cookies so `auth()` in the API route can see the session
            cookie: cookies().toString(),
        },
        cache: opts?.revalidate ?? "no-store",
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        let msg = `Request failed (${res.status})`;
        try {
            const j = await res.json();
            if (j?.error) msg = j.error;
        } catch {
            /* ignore */
        }
        throw new Error(msg);
    }

    // If route returns no JSON body, this will throw—so only call when you expect JSON
    return (await res.json()) as T;
}

const DEFAULT_PARTYKIT_HOST = "localhost:1999";

export function getPartyKitHost() {
    return process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? process.env.PARTYKIT_HOST ?? DEFAULT_PARTYKIT_HOST;
}

export function getPartyKitPartyName() {
    return process.env.NEXT_PUBLIC_PARTYKIT_PARTY ?? process.env.PARTYKIT_PARTY ?? "main";
}

export function getPartyKitHttpOrigin() {
    const explicit = process.env.PARTYKIT_SERVER_URL;
    if (explicit) return explicit.replace(/\/$/, "");

    const host = getPartyKitHost();
    const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
    return `${isLocal ? "http" : "https"}://${host}`;
}

export function getPartyKitRoomHttpUrl(roomId: string, path = "") {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${getPartyKitHttpOrigin()}/parties/${getPartyKitPartyName()}/${encodeURIComponent(roomId)}${path ? cleanPath : ""}`;
}

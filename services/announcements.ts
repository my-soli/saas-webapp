import { getCsrfToken } from "@/lib/api/auth";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
const BASE = `${PROXY_BASE}/api/proxy/api/v1/announcements/`;

export interface Announcement {
    id: number;
    title: string;
    body: string;
    created_by: number | null;
    created_by_name: string;
    created_at: string;
}

export interface AnnouncementPayload {
    title: string;
    body: string;
}

async function headers() {
    const csrf = await getCsrfToken();
    return { "Content-Type": "application/json", "X-CSRFToken": csrf };
}

async function throwIfBad(res: Response) {
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        const first = Object.values(body)[0];
        const msg = Array.isArray(first) ? (first[0] as string) : (typeof first === 'string' ? first : "Request failed");
        throw new Error(msg);
    }
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
    const res = await fetch(BASE, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    const data = await res.json() as { results?: Announcement[] } | Announcement[];
    return Array.isArray(data) ? data : (data.results ?? []);
}

export async function fetchAnnouncement(id: number): Promise<Announcement> {
    const res = await fetch(`${BASE}${id}/`, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    return res.json() as Promise<Announcement>;
}

export async function createAnnouncement(payload: AnnouncementPayload): Promise<Announcement> {
    const res = await fetch(BASE, {
        method: "POST",
        headers: await headers(),
        credentials: "include",
        body: JSON.stringify(payload),
    });
    await throwIfBad(res);
    return res.json() as Promise<Announcement>;
}

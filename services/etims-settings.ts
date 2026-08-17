import { getCsrfToken } from "@/lib/api/auth";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
const BASE = `${PROXY_BASE}/api/proxy/api/v1/etims-settings/`;

export interface EtimsSettings {
    is_enabled: boolean;
    environment: string;
    device_type: string;
    kra_pin: string;
    branch_id: string;
    device_serial_number: string;
    api_base_url: string;
    api_key: string;
    api_secret: string;
    last_connection_check_at: string | null;
    last_connection_status: string;
    notes: string;
    updated_at: string;
}

export type EtimsSettingsPayload = Partial<Omit<EtimsSettings, 'last_connection_check_at' | 'last_connection_status' | 'updated_at'>>;

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

export async function fetchEtimsSettings(): Promise<EtimsSettings> {
    const res = await fetch(BASE, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    return res.json() as Promise<EtimsSettings>;
}

export async function updateEtimsSettings(payload: EtimsSettingsPayload): Promise<EtimsSettings> {
    const res = await fetch(BASE, {
        method: "PATCH",
        headers: await headers(),
        credentials: "include",
        body: JSON.stringify(payload),
    });
    await throwIfBad(res);
    return res.json() as Promise<EtimsSettings>;
}

export async function testEtimsConnection(): Promise<{ success: boolean; status: string; message: string }> {
    const res = await fetch(`${BASE}test-connection/`, {
        method: "POST",
        headers: await headers(),
        credentials: "include",
    });
    await throwIfBad(res);
    return res.json();
}

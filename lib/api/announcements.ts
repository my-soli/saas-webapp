const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

export interface WhatsNewItem {
    id: number;
    title: string;
    body: string;
    created_by_name: string;
    created_at: string;
    is_feature_update: boolean;
    is_read: boolean;
}

class AnnouncementsApiError extends Error {
    constructor(message: string, public statusCode?: number) {
        super(message);
        this.name = 'AnnouncementsApiError';
    }
}

function getCsrfToken(): string | null {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const trimmed = cookie.trim();
        if (trimmed.startsWith(name + '=')) {
            return decodeURIComponent(trimmed.substring(name.length + 1));
        }
    }
    return null;
}

export async function fetchWhatsNew(): Promise<WhatsNewItem[]> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/announcements/whats-new/`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
        throw new AnnouncementsApiError('Failed to load What\'s New items', response.status);
    }
    return response.json() as Promise<WhatsNewItem[]>;
}

export async function markAnnouncementRead(id: number): Promise<void> {
    const csrfToken = getCsrfToken();
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/announcements/${id}/mark-read/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
    });
    if (!response.ok) {
        throw new AnnouncementsApiError('Failed to mark announcement as read', response.status);
    }
}

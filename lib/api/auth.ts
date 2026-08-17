import type { LoginCredentials, RegisterData, ChangePasswordData, User } from '@/types/auth';

export type LoginResult =
    | { success: true; user: User; must_setup_2fa?: boolean }
    | { requires_2fa: true; totp_token: string };

export interface TotpStatus {
    enabled: boolean;
    confirmed_at: string | null;
}

export interface TotpSetupData {
    secret: string;
    provisioning_uri: string;
    qr_url: string;
}

interface ApiError {
    error?: string;
    detail?: string;
    message?: string;
    [key: string]: unknown;
}

class AuthApiError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public errors?: Record<string, string[]>
    ) {
        super(message);
        this.name = 'AuthApiError';
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as ApiError;
        const message = errorData.error || errorData.detail || errorData.message || 'Unable to process request. Please try again.';

        throw new AuthApiError(message, response.status);
    }

    return response.json() as Promise<T>;
}

// Session-based authentication — routes through Next.js proxy so cookies are set on same domain
const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

export async function getCsrfToken(): Promise<string> {
    const response = await fetch(`${PROXY_BASE}/api/auth/csrf`, {
        method: 'GET',
        credentials: 'include',
    });

    const data = await handleResponse<{ csrfToken: string }>(response);
    return data.csrfToken;
}

export async function loginUserSession(credentials: LoginCredentials): Promise<LoginResult> {
    const response = await fetch(`${PROXY_BASE}/api/auth/session/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials),
    });

    return handleResponse(response);
}

export async function verifyTotpSession(totp_token: string, code: string): Promise<{ success: true; user: User }> {
    const response = await fetch(`${PROXY_BASE}/api/auth/session/totp-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ totp_token, code }),
    });

    return handleResponse(response);
}

export async function verifyTotpJwt(totp_token: string, code: string): Promise<{ access: string; refresh: string }> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/auth/token/totp-verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totp_token, code }),
    });

    return handleResponse(response);
}

export async function getTotpStatus(): Promise<TotpStatus> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/auth/totp/status/`, {
        method: 'GET',
        credentials: 'include',
    });

    return handleResponse(response);
}

export async function getTotpSetupData(): Promise<TotpSetupData> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/auth/totp/setup/`, {
        method: 'GET',
        credentials: 'include',
    });

    return handleResponse(response);
}

export async function confirmTotp(code: string): Promise<{ detail: string }> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/auth/totp/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
    });

    return handleResponse(response);
}

export async function disableTotp(password: string, code: string): Promise<{ detail: string }> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/auth/totp/disable/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, code }),
    });

    return handleResponse(response);
}

export async function logoutUserSession(): Promise<{ success: boolean }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    try {
        const response = await fetch(`${PROXY_BASE}/api/auth/session/logout`, {
            method: 'POST',
            credentials: 'include',
            signal: controller.signal,
        });
        return handleResponse(response);
    } catch {
        // Timeout or network error — treat as success so redirect still fires
        return { success: true };
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function checkSession(): Promise<{ authenticated: boolean; user?: User }> {
    const response = await fetch(`${PROXY_BASE}/api/auth/session/check`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        return { authenticated: false };
    }

    return handleResponse(response);
}

export async function getCurrentUser(): Promise<User> {
    const response = await fetch(`${PROXY_BASE}/api/auth/session/check`, {
        method: 'GET',
        credentials: 'include',
    });

    const data = await handleResponse<{ authenticated: boolean; user?: User }>(response);

    if (!data.authenticated || !data.user) {
        throw new AuthApiError('Not authenticated', 401);
    }

    return data.user;
}

export async function changePassword(data: ChangePasswordData): Promise<{ detail: string }> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/auth/change-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    return handleResponse(response);
}

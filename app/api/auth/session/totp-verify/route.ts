import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Mirrors app/api/auth/session/login/route.ts's pattern exactly — this route
// was missing entirely (the frontend called it, but no handler existed here),
// which meant every 2FA code entered at login 404'd regardless of whether it
// was correct. That's why 2FA login verification was disabled for a while.
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as Record<string, unknown>;

        const csrfRes = await fetch(`${API_BASE_URL}/api/auth/csrf/`, {
            cache: 'no-store',
            redirect: 'manual',
            headers: { 'Accept': 'application/json' },
        });

        if (!csrfRes.ok) {
            return NextResponse.json({ detail: 'Unable to process request. Please try again.' }, { status: 502 });
        }

        const csrfData = await csrfRes.json() as { csrfToken: string };
        const csrfToken = csrfData.csrfToken;

        const csrfSetCookie = csrfRes.headers.get('set-cookie') || '';
        const csrfCookieMatch = csrfSetCookie.match(/csrftoken=([^;]+)/);
        const csrfCookieValue = csrfCookieMatch ? csrfCookieMatch[1] : '';

        const verifyRes = await fetch(`${API_BASE_URL}/api/auth/session/totp-verify/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRFToken': csrfToken,
                'Cookie': `csrftoken=${csrfCookieValue}`,
                'Referer': API_BASE_URL,
                'Origin': API_BASE_URL,
            },
            body: JSON.stringify(body),
            redirect: 'manual',
        });

        const rawText = await verifyRes.text();
        let verifyData: Record<string, unknown> = {};
        try {
            verifyData = JSON.parse(rawText) as Record<string, unknown>;
        } catch {
            verifyData = {};
        }

        if (!verifyRes.ok) {
            const errorMsg = (verifyData as Record<string, string>).detail
                || (verifyData as Record<string, string>).error
                || 'Invalid authenticator code.';
            return NextResponse.json(
                { detail: errorMsg },
                { status: verifyRes.status === 403 ? 401 : verifyRes.status }
            );
        }

        // Same as login/route.ts: extract sessionid from Django's Set-Cookie
        // header and set it explicitly via NextResponse.cookies.set() — Next.js
        // 15+ strips raw Set-Cookie headers set via headers.set().
        const sessionSetCookie = verifyRes.headers.get('set-cookie') || '';
        const sessionMatch = sessionSetCookie.match(/sessionid=([^;]+)/);

        const proxyResponse = NextResponse.json(verifyData);

        if (sessionMatch) {
            proxyResponse.cookies.set('sessionid', sessionMatch[1], {
                httpOnly: true,
                sameSite: IS_PRODUCTION ? 'none' : 'lax',
                secure: IS_PRODUCTION,
                path: '/',
                maxAge: 60 * 60 * 24 * 7,
            });
        }

        return proxyResponse;
    } catch {
        return NextResponse.json({ detail: 'Unable to process request. Please try again.' }, { status: 500 });
    }
}

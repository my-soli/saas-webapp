import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
    const sessionid = request.cookies.get('sessionid')?.value;

    const csrfResponse = await fetch(`${API_BASE_URL}/api/auth/csrf/`, { cache: 'no-store' });
    const { csrfToken } = await csrfResponse.json() as { csrfToken: string };
    const csrfSetCookie = csrfResponse.headers.get('set-cookie') || '';
    const csrfCookieMatch = csrfSetCookie.match(/csrftoken=([^;]+)/);
    const csrfCookieValue = csrfCookieMatch ? csrfCookieMatch[1] : '';

    let djangoSetCookie = '';
    if (sessionid) {
        const logoutRes = await fetch(`${API_BASE_URL}/api/auth/session/logout/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
                'Cookie': `sessionid=${sessionid}; csrftoken=${csrfCookieValue}`,
            },
        });
        djangoSetCookie = logoutRes.headers.get('set-cookie') || '';
    }

    const proxyResponse = NextResponse.json({ success: true });
    if (djangoSetCookie) {
        proxyResponse.headers.set('Set-Cookie', djangoSetCookie);
    } else {
        const domain = process.env.SESSION_COOKIE_DOMAIN || '';
        const domainAttr = domain ? `; Domain=${domain}` : '';
        proxyResponse.headers.set('Set-Cookie', `sessionid=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None${domainAttr}`);
    }
    return proxyResponse;
}

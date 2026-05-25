import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export async function POST(request: NextRequest) {
    const sessionid = request.cookies.get('sessionid')?.value;
    const csrftoken = request.cookies.get('csrftoken')?.value;

    // Use cookies.set() with maxAge=0 — Next.js 15+ strips raw Set-Cookie headers
    const proxyResponse = NextResponse.json({ success: true });
    proxyResponse.cookies.set('sessionid', '', {
        httpOnly: true,
        sameSite: IS_PRODUCTION ? 'none' : 'lax',
        secure: IS_PRODUCTION,
        path: '/',
        maxAge: 0,
    });

    // Best-effort: notify Django in background (fire-and-forget, no await)
    if (sessionid && csrftoken) {
        fetch(`${API_BASE_URL}/api/auth/session/logout/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken,
                'Cookie': `sessionid=${sessionid}; csrftoken=${csrftoken}`,
            },
        }).catch(() => { /* ignore — cookie is already cleared */ });
    }

    return proxyResponse;
}

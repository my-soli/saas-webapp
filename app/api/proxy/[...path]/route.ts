import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const DJANGO_API = process.env.DJANGO_API_URL || 'http://localhost:8000';

async function fetchCsrfToken(sessionId: string | undefined, tenantHost: string): Promise<{ token: string; cookieValue: string }> {
    try {
        const csrfRes = await fetch(`${DJANGO_API}/api/auth/csrf/`, {
            cache: 'no-store',
            redirect: 'manual',
            headers: {
                'Accept': 'application/json',
                'X-Tenant-Host': tenantHost,
                ...(sessionId ? { Cookie: `sessionid=${sessionId}` } : {}),
            },
        });

        // 3xx means Django is redirecting (e.g. HTTP→HTTPS); skip CSRF fetch
        if (!csrfRes.ok || csrfRes.status >= 300) {
            return { token: '', cookieValue: '' };
        }

        const data = await csrfRes.json() as { csrfToken: string };
        const setCookie = csrfRes.headers.get('set-cookie') || '';
        const match = setCookie.match(/csrftoken=([^;]+)/);

        return { token: data.csrfToken, cookieValue: match ? match[1] : '' };
    } catch {
        // Django unreachable or redirect loop — continue without CSRF token
        return { token: '', cookieValue: '' };
    }
}

async function handler(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
    try {
        const { path } = await params;
        // path.join('/') already excludes any trailing empty segment Next.js strips.
        // Always append a trailing slash so Django's APPEND_SLASH works correctly.
        const targetPath = path.join('/');
        const targetUrl = `${DJANGO_API}/${targetPath}/${request.nextUrl.search}`;
        const tenantHost = request.headers.get('host') ?? '';

        const cookieStore = await cookies();
        const sessionId = cookieStore.get('sessionid')?.value;

        // Also forward the raw Cookie header for any other cookies (e.g. csrftoken already set)
        const rawCookie = request.headers.get('cookie') || '';

        const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);

        let csrfToken = '';
        let csrfCookieValue = '';

        if (isMutation) {
            ({ token: csrfToken, cookieValue: csrfCookieValue } = await fetchCsrfToken(sessionId, tenantHost));
        }

        // Build cookie header: start from the browser's cookies, patch in fresh csrftoken if we got one.
        // Strip ALL csrftoken entries first — browsers can send duplicate csrftoken cookies from
        // different domain scopes (e.g. printduka.co.ke vs .printduka.co.ke). Python's SimpleCookie
        // keeps the last duplicate, so a stale second cookie would cause a CSRF mismatch → 403.
        let cookieHeader = rawCookie;
        if (csrfCookieValue) {
            cookieHeader = cookieHeader
                .split(';')
                .map(c => c.trim())
                .filter(c => !c.startsWith('csrftoken='))
                .join('; ');
            cookieHeader = cookieHeader
                ? `${cookieHeader}; csrftoken=${csrfCookieValue}`
                : `csrftoken=${csrfCookieValue}`;
        }

        const forwardHeaders: Record<string, string> = {
            'Accept': request.headers.get('accept') || 'application/json',
            'X-Tenant-Host': tenantHost,
        };

        const contentType = request.headers.get('content-type');
        if (contentType) forwardHeaders['Content-Type'] = contentType;
        if (cookieHeader) forwardHeaders['Cookie'] = cookieHeader;
        if (csrfToken) {
            forwardHeaders['X-CSRFToken'] = csrfToken;
            forwardHeaders['Referer'] = DJANGO_API;
            forwardHeaders['Origin'] = DJANGO_API;
        }

        let body: BodyInit | null | undefined;

        if (isMutation) {
            // Buffer the full body so Node.js fetch sends Content-Length (not chunked TE).
            // Chunked TE causes Django's MultiPartParser to see an empty request.data/FILES
            // because the raw chunk markers interfere with multipart boundary parsing.
            body = await request.arrayBuffer();
        }

        const fetchOptions: RequestInit = {
            method: request.method,
            headers: forwardHeaders,
            body: body as BodyInit | undefined,
            redirect: 'manual',
        };

        const djangoResponse = await fetch(targetUrl, fetchOptions);

        // If Django returned a redirect (e.g. SECURE_SSL_REDIRECT), surface it as 502 with a clear message
        if (djangoResponse.status >= 300 && djangoResponse.status < 400) {
            const location = djangoResponse.headers.get('location') || '';
            console.error(`[proxy] Django returned ${djangoResponse.status} → ${location}. Check SECURE_SSL_REDIRECT env var.`);
            return NextResponse.json(
                { detail: `Backend redirect (${djangoResponse.status}). Ensure SECURE_SSL_REDIRECT=False on the Django server.` },
                { status: 502 }
            );
        }

        if (djangoResponse.status === 204 || djangoResponse.status === 205) {
            return new NextResponse(null, { status: djangoResponse.status });
        }

        const responseBody = await djangoResponse.arrayBuffer();
        const responseContentType = djangoResponse.headers.get('content-type') || 'application/json';

        const res = new NextResponse(responseBody, {
            status: djangoResponse.status,
            headers: { 'Content-Type': responseContentType },
        });

        // Forward Set-Cookie headers from Django (e.g. sessionid after login)
        const setCookieHeader = djangoResponse.headers.get('set-cookie');
        if (setCookieHeader) {
            res.headers.set('Set-Cookie', setCookieHeader);
        }

        return res;
    } catch (err) {
        console.error('[proxy] Unhandled error:', err);
        return NextResponse.json(
            { detail: 'Proxy error: could not reach backend. Is the Django server running?' },
            { status: 502 }
        );
    }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;

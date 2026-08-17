import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { PortalRole } from '@/types/auth';

const API_BASE_URL = process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const INTERNAL_BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000';

const ROLE_DASHBOARD: Record<PortalRole, string> = {
    client: '/portal',
    admin: '/admin/dashboard',
    account_manager: '/account-manager',
    production_team: '/production-team/dashboard',
    business_admin: '/business/dashboard',
    vendor: '/vendors',
};

const ROUTE_ALLOWED_ROLES: Array<{ prefix: string; roles: PortalRole[] }> = [
    { prefix: '/portal', roles: ['client', 'business_admin'] },
    { prefix: '/business', roles: ['business_admin'] },
    { prefix: '/admin', roles: ['admin'] },
    { prefix: '/production-team', roles: ['production_team'] },
    { prefix: '/production', roles: ['production_team'] },
    { prefix: '/account-manager', roles: ['account_manager'] },
    { prefix: '/vendors', roles: ['vendor'] },
];

// Maps each portal role to its staff group name (as returned by the backend)
const ROLE_TO_GROUP: Record<PortalRole, string> = {
    admin: 'Admin',
    account_manager: 'Account Manager',
    production_team: 'Production Team',
    business_admin: 'Business Admin',
    client: 'Client',
    vendor: 'Vendor',
};

interface SessionData {
    authenticated: boolean;
    user?: {
        portal_role: PortalRole | null;
        groups?: string[];
        is_superuser?: boolean;
    };
}

async function fetchSessionData(sessionId: string, tenantHost: string): Promise<SessionData | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/session/check/`, {
            method: 'GET',
            headers: { Cookie: `sessionid=${sessionId}`, 'X-Tenant-Host': tenantHost },
            cache: 'no-store',
        });
        if (!response.ok) return null;
        return await response.json() as SessionData;
    } catch {
        return null;
    }
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const tenantHost = request.headers.get('host') ?? '';

    const matchedRoute = ROUTE_ALLOWED_ROLES.find((r) => pathname.startsWith(r.prefix));
    const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');

    if (matchedRoute) {
        const sessionCookie = request.cookies.get('sessionid');
        if (!sessionCookie) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        const session = await fetchSessionData(sessionCookie.value, tenantHost);
        if (!session?.authenticated) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        const role = session.user?.portal_role;
        const userGroups = session.user?.groups ?? [];
        const isSuperuser = session.user?.is_superuser ?? false;

        // Allow access if the user's portal_role matches, they are a superuser,
        // or they belong to a group that maps to one of the route's allowed roles.
        const hasAccess =
            isSuperuser ||
            (role && matchedRoute.roles.includes(role)) ||
            matchedRoute.roles.some((r) => userGroups.includes(ROLE_TO_GROUP[r]));

        if (!hasAccess) {
            const correctDashboard = role ? ROLE_DASHBOARD[role] : '/login';
            return NextResponse.redirect(new URL(correctDashboard, request.url));
        }

        return NextResponse.next();
    }

    if (isAuthRoute) {
        const sessionCookie = request.cookies.get('sessionid');
        if (sessionCookie) {
            const session = await fetchSessionData(sessionCookie.value, tenantHost);
            if (session?.authenticated && session.user?.portal_role) {
                const destination = ROLE_DASHBOARD[session.user.portal_role];
                return NextResponse.redirect(new URL(destination, request.url));
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/portal/:path*',
        '/portal',
        '/business/:path*',
        '/business',
        '/admin/:path*',
        '/admin',
        '/production-team/:path*',
        '/production-team',
        '/production/:path*',
        '/production',
        '/account-manager/:path*',
        '/account-manager',
        '/vendors/:path*',
        '/vendors',
        '/login',
        '/register',
    ],
};

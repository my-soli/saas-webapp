'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import LoginForm from '@/components/auth/login-form';
import type { User, PortalRole, StaffGroup } from '@/types/auth';

const ROLE_DASHBOARD: Record<PortalRole, string> = {
    client: '/portal',
    admin: '/admin/dashboard',
    account_manager: '/account-manager',
    production_team: '/production/dashboard',
    business_admin: '/business/dashboard',
    vendor: '/vendors',
};

const PORTALS_BY_GROUP: Partial<Record<StaffGroup, string>> = {
    "Admin":           "/admin/dashboard",
    "Account Manager": "/account-manager",
    "Production Team": "/production-team/dashboard",
    "Business Admin":  "/business/dashboard",
};

export default function LoginPage() {
    const router = useRouter();

    const handleLoginSuccess = (user: User, mustSetup2fa?: boolean) => {
        // Admin/Account Manager accounts must have 2FA configured — send them
        // straight to the security tab instead of their normal dashboard
        // until that's done. Their own settings page is reachable either way
        // (it's not a hard route block), but this makes sure they can't miss it.
        if (mustSetup2fa) {
            const setupHref = user.portal_role === 'account_manager' ? '/account-manager/settings' : '/admin/settings';
            router.push(`${setupHref}?tab=security&require2fa=1`);
            return;
        }

        // Honour the user's last active portal (saved by PortalSwitcher) if they still have access.
        const saved = localStorage.getItem("active-portal") as StaffGroup | null;
        const savedHref = saved ? PORTALS_BY_GROUP[saved] : null;
        const hasAccess = savedHref && (user.is_superuser || user.groups?.includes(saved!));
        if (hasAccess) {
            router.push(savedHref!);
            return;
        }
        const destination = user.portal_role ? ROLE_DASHBOARD[user.portal_role] : '/';
        router.push(destination);
    };

    const handleLoginError = (error: Error) => {
        // handle
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-blue via-brand-blue/90 to-brand-blue/80 px-4 py-12">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <Image
                            src="/logo/pd.png"
                            alt="PrintDuka"
                            width={240}
                            height={80}
                            className="h-24 w-auto"
                            priority
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Welcome Back
                    </h1>
                    <p className="text-white/80">
                        Sign in to access your dashboard
                    </p>
                </div>

                <LoginForm
                    onSuccess={handleLoginSuccess}
                    onError={handleLoginError}
                />

                <div className="mt-8 text-center space-y-2">
                    <p className="text-sm text-white/70">
                        Don&apos;t have an account?{" "}
                        <a href="/register" className="text-white font-medium hover:underline">
                            Create one
                        </a>
                    </p>
                </div>

                <div className="mt-8 text-center">
                    <a
                        href="/"
                        className="text-sm text-white/90 hover:text-white transition-colors inline-flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to home
                    </a>
                </div>
            </div>
        </div>
    );
}

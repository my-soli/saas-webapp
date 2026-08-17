'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createContext, useContext, useState } from 'react';
import { createQueryClient } from '@/lib/query-client';
import { Toaster } from '@/components/ui/sonner';

interface ProvidersProps {
    children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    const [queryClient] = useState(() => createQueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
            <Toaster richColors closeButton />
        </QueryClientProvider>
    );
}

// ── Tenant branding ──────────────────────────────────────────────────────────
// Server-fetched once in the root layout, passed down here so client
// components (e.g. the admin sidebar logo) can read it without their own fetch.
export interface Branding {
    name: string;
    logo_url: string | null;
    color_primary: string;
    color_secondary: string;
}

const BrandingContext = createContext<Branding | null>(null);

export function BrandingProvider({ branding, children }: { branding: Branding | null; children: React.ReactNode }) {
    return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export function useBranding(): Branding | null {
    return useContext(BrandingContext);
}

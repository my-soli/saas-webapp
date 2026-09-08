import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import StoreNavbar from "@/features/store/components/StoreNavbar";
import { QuoteCartProvider } from "@/features/store/quote-cart-context";

export default function StoreLayout({ children }: { children: ReactNode }) {
    return (
        <QuoteCartProvider>
            <div className="min-h-screen bg-gray-50 font-sans">
                {/* Announcement bar */}
                <div className="bg-brand-blue text-white text-center py-2 px-4 text-xs font-medium tracking-wide">
                    🎉&nbsp; Free delivery on orders over KES 10,000 within Nairobi &nbsp;
                    <Link href="#" className="underline underline-offset-2 hover:text-brand-yellow transition-colors">
                        Learn more
                    </Link>
                </div>

                {/* Shared navbar — wrapped in Suspense because StoreNavbar uses useSearchParams */}
                <Suspense fallback={<div className="h-16 bg-white border-b border-gray-100" />}>
                    <StoreNavbar />
                </Suspense>

                {children}
            </div>
        </QuoteCartProvider>
    );
}

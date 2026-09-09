"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import ProductionSidebar from "./production-sidebar";
import AIChatPanel from "@/components/admin/AIChatPanel";
import NotificationBell from "@/components/admin/NotificationBell";
import WhatsNewWidget from "@/components/shared/WhatsNewWidget";
import UniversalSearch from "@/components/shared/UniversalSearch";

interface ProductionLayoutProps {
    children: ReactNode;
}

export default function ProductionLayout({ children }: ProductionLayoutProps) {
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <div className="flex min-h-screen">
            <ProductionSidebar isDrawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

            {drawerOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                    onClick={() => setDrawerOpen(false)}
                />
            )}

            <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
                <header className="lg:hidden sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-brand-blue text-white">
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        aria-label="Open menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-semibold">Print Duka Production</span>
                </header>

                {/* pb-36 keeps page content clear of the fixed Ask AI button
                    (bottom-6) and search pill (bottom-24) floating bottom-right. */}
                <main className="flex-1 bg-gray-50 pb-36">
                    {children}
                </main>
            </div>
            <AIChatPanel />
            <UniversalSearch portal="production-team" />
            <NotificationBell />
            <WhatsNewWidget />
        </div>
    );
}

"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { Menu } from "lucide-react";
import BusinessSidebar from "./business-sidebar";

export default function BusinessLayout({ children }: { children: ReactNode }): ReactElement {
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50">
            <BusinessSidebar isDrawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

            {/* Mobile header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-20 h-14 bg-brand-blue flex items-center px-4 gap-3">
                <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded hover:bg-white/10 transition-colors text-white">
                    <Menu className="w-5 h-5" />
                </button>
                <span className="text-white font-semibold text-sm">Business Portal</span>
            </div>

            {/* Overlay */}
            {drawerOpen && (
                <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setDrawerOpen(false)} />
            )}

            <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
                {children}
            </main>
        </div>
    );
}

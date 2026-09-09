"use client";

import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import AdminSidebar from "./admin-sidebar";
import AIChatPanel from "./AIChatPanel";
import NotificationBell from "./NotificationBell";
import WhatsNewWidget from "@/components/shared/WhatsNewWidget";
import ProductionLayout from "@/components/production/production-layout";
import UniversalSearch from "@/components/shared/UniversalSearch";
import { checkSession } from "@/lib/api/auth";
import { Menu } from "lucide-react";

interface AdminLayoutProps {
    children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const pathname = usePathname();
    const { data: session } = useQuery({
        queryKey: ["staff-session"],
        queryFn: checkSession,
        staleTime: 300_000,
        retry: false,
    });

    const isProductionTeamUser =
        session?.user?.portal_role === "production_team" ||
        (pathname.startsWith("/production-team") &&
            session?.user?.groups?.includes("Production Team"));

    if (isProductionTeamUser) {
        return <ProductionLayout>{children}</ProductionLayout>;
    }

    return (
        <div className="flex min-h-screen">
            <AdminSidebar onClose={() => setDrawerOpen(false)} isDrawerOpen={drawerOpen} />

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
                    <span className="text-sm font-semibold">Print Duka - Admin</span>
                </header>

                {/* pb-44 keeps page content (e.g. table pagination controls) clear of
                    the fixed Ask AI button (bottom-6) and search pill (bottom-24) that
                    float over the bottom-right corner of every admin page. */}
                <main className="flex-1 bg-gray-50 pb-44">
                    {children}
                </main>
            </div>
            <AIChatPanel />
            <UniversalSearch portal="admin" />
            <NotificationBell />
            <WhatsNewWidget />
        </div>
    );
}

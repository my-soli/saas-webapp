"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import AccountManagerSidebar from "./account-manager-sidebar";
import AIChatPanel from "@/components/admin/AIChatPanel";
import UniversalSearch from "@/components/shared/UniversalSearch";
import WhatsNewWidget from "@/components/shared/WhatsNewWidget";
import { Menu } from "lucide-react";
import { toast } from "sonner";
import { fetchNotifications } from "@/lib/api/notifications";

interface AccountManagerLayoutProps {
    children: ReactNode;
}

export default function AccountManagerLayout({ children }: AccountManagerLayoutProps) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const seenIdsRef = useRef<Set<number>>(new Set());
    const initialLoadRef = useRef(true);

    useEffect(() => {
        const saved = localStorage.getItem("am-sidebar-collapsed");
        if (saved === "true") setCollapsed(true);
    }, []);

    // Notification popup polling
    useEffect(() => {
        const poll = async () => {
            try {
                const data = await fetchNotifications({ unreadOnly: true });
                const notifications = data.results ?? [];

                if (initialLoadRef.current) {
                    // Seed seen IDs on first load — don't toast existing unread
                    for (const n of notifications) seenIdsRef.current.add(n.id);
                    initialLoadRef.current = false;
                    return;
                }

                for (const n of notifications) {
                    if (!seenIdsRef.current.has(n.id)) {
                        seenIdsRef.current.add(n.id);
                        const link = n.link;
                        toast(n.title, {
                            description: n.message,
                            duration: 6000,
                            action: link
                                ? { label: "View", onClick: () => { window.location.href = link; } }
                                : undefined,
                        });
                    }
                }
            } catch {
                // silently ignore poll errors
            }
        };

        poll();
        const id = setInterval(poll, 30_000);
        return () => clearInterval(id);
    }, []);

    const handleToggle = () => {
        const next = !collapsed;
        setCollapsed(next);
        localStorage.setItem("am-sidebar-collapsed", String(next));
    };

    return (
        <div className="flex min-h-screen">
            <AccountManagerSidebar
                onClose={() => setDrawerOpen(false)}
                isDrawerOpen={drawerOpen}
                collapsed={collapsed}
                onToggle={handleToggle}
            />

            {drawerOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                    onClick={() => setDrawerOpen(false)}
                />
            )}

            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${collapsed ? "lg:ml-16" : "lg:ml-64"}`}>
                <header className="lg:hidden sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-brand-blue text-white">
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        aria-label="Open menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-semibold">Print Duka - Account Manager</span>
                </header>

                {/* pb-36 keeps page content clear of the fixed Ask AI button
                    (bottom-6) and search pill (bottom-24) floating bottom-right. */}
                <main className="flex-1 bg-gray-50 pb-36">
                    {children}
                </main>
            </div>
            <AIChatPanel />
            <UniversalSearch portal="account-manager" />
            <WhatsNewWidget />
        </div>
    );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { type LucideIcon, X, Loader2, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import {
    LayoutDashboard,
    UserPlus,
    Users,
    FileText,
    BarChart3,
    Briefcase,
    Bell,
    ShoppingCart,
    Settings,
    SparklesIcon,
} from "lucide-react";
import { logoutUserSession } from "@/lib/api/auth";
import PortalSwitcher from "@/components/shared/PortalSwitcher";
import { fetchNotifications } from "@/lib/api/notifications";

interface MenuItem {
    label: string;
    href: string;
    icon: LucideIcon;
}

interface MenuSection {
    title?: string;
    items: MenuItem[];
}

const menuSections: MenuSection[] = [
    {
        items: [
            { label: "Dashboard", href: "/account-manager", icon: LayoutDashboard },
        ],
    },
    {
        title: "ACCOUNT MANAGER",
        items: [
            { label: "Lead Intake", href: "/account-manager/leads", icon: UserPlus },
            { label: "Client List", href: "/account-manager/clients", icon: Users },
            { label: "Quotes", href: "/account-manager/quotes", icon: FileText },
            { label: "Cart", href: "/account-manager/cart", icon: ShoppingCart },
            { label: "Analytics", href: "/account-manager/analytics", icon: BarChart3 },
            { label: "AI Insights", href: "/account-manager/ai-insights", icon: SparklesIcon },
            { label: "Jobs", href: "/account-manager/jobs", icon: Briefcase },
            { label: "Notifications", href: "/account-manager/notifications", icon: Bell },
            { label: "Settings", href: "/account-manager/settings", icon: Settings },
        ],
    },
];

interface AccountManagerSidebarProps {
    isDrawerOpen: boolean;
    onClose: () => void;
    collapsed: boolean;
    onToggle: () => void;
}

export default function AccountManagerSidebar({ isDrawerOpen, onClose, collapsed, onToggle }: AccountManagerSidebarProps): ReactElement {
    const pathname = usePathname();
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    const { data: unreadData } = useQuery({
        queryKey: ["unread-notifications-count"],
        queryFn: () => fetchNotifications({ unreadOnly: true }),
        refetchInterval: 30_000,
        staleTime: 0,
    });
    const unreadCount = unreadData?.count ?? 0;

    const isActiveLink = (href: string): boolean => {
        if (href === "/account-manager") return pathname === href;
        return pathname.startsWith(href);
    };

    async function handleLogout(): Promise<void> {
        setLoggingOut(true);
        try {
            await logoutUserSession();
        } catch {
            // ignore — still redirect
        }
        window.location.href = "/login";
    }

    return (
        <aside
            className={`
                fixed left-0 top-0 z-50 h-screen bg-brand-blue text-white
                flex flex-col overflow-y-auto
                transition-all duration-200 ease-in-out
                ${collapsed ? "w-16" : "w-[85vw] lg:w-64"}
                ${isDrawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            `}
        >
            <div className={`py-3 border-b border-white/10 flex items-center ${collapsed ? "justify-center px-2 gap-0" : "justify-between px-4"}`}>
                {!collapsed && (
                    <Image
                        src="/logo/pd.png"
                        alt="PrintDuka"
                        width={50}
                        height={16}
                        className="w-20 h-auto"
                        priority
                    />
                )}
                {collapsed && (
                    <span className="text-xs font-bold text-white/80">PD</span>
                )}
                <div className="flex items-center gap-1">
                    <button
                        onClick={onClose}
                        className="lg:hidden p-1.5 rounded hover:bg-white/10 transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onToggle}
                        className="hidden lg:flex p-1.5 rounded hover:bg-white/10 transition-colors"
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <nav className="py-4 flex-1">
                {menuSections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="mb-6">
                        {section.title && !collapsed && (
                            <h2 className="px-4 text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                                {section.title}
                            </h2>
                        )}
                        <ul>
                            {section.items.map((item) => {
                                const isActive = isActiveLink(item.href);
                                const Icon = item.icon;
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            onClick={onClose}
                                            title={collapsed ? item.label : undefined}
                                            className={`flex items-center gap-3 py-2.5 text-sm transition-colors ${
                                                collapsed ? "justify-center px-2" : "px-4"
                                            } ${isActive
                                                ? "bg-brand-yellow text-brand-blue font-semibold"
                                                : "text-white hover:bg-white/10"
                                            }`}
                                        >
                                            <Icon className="w-5 h-5 flex-shrink-0" />
                                            {!collapsed && (
                                                <>
                                                    <span className="flex-1">{item.label}</span>
                                                    {item.href === "/account-manager/notifications" && unreadCount > 0 && (
                                                        <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                                                            {unreadCount > 99 ? "99+" : unreadCount}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            <div className="border-t border-white/10 pt-2">
                {!collapsed && <PortalSwitcher current="Account Manager" />}
                <div className={`pb-4 ${collapsed ? "px-2" : "px-4"}`}>
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        title={collapsed ? (loggingOut ? "Logging out…" : "Logout") : undefined}
                        className={`flex items-center gap-3 w-full py-2.5 text-sm text-white hover:bg-white/10 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                            collapsed ? "justify-center px-2" : "px-4"
                        }`}
                    >
                        {loggingOut ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <LogOut className="w-5 h-5" />
                        )}
                        {!collapsed && <span>{loggingOut ? "Logging out…" : "Logout"}</span>}
                    </button>
                </div>
            </div>
        </aside>
    );
}

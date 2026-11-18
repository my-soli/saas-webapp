"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";
import {
    type LucideIcon,
    LayoutDashboard,
    BookOpen,
    FileText,
    Package,
    Layers,
    Building2,
    Settings,
    BarChart3,
    Bell,
    LogOut,
    Loader2,
    X,
    Zap,
    PackageCheck,
    Scale,
    ClipboardCheck,
    SparklesIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { logoutUserSession } from "@/lib/api/auth";
import { fetchNotifications } from "@/lib/api/notifications";
import PortalSwitcher from "@/components/shared/PortalSwitcher";

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
            { label: "Dashboard", href: "/production-team/dashboard", icon: LayoutDashboard },
        ],
    },
    {
        title: "MY WORK",
        items: [
            { label: "My Quotes", href: "/production-team/my-quotes", icon: FileText },
        ],
    },
    {
        title: "PRODUCTION",
        items: [
            { label: "Product Catalog", href: "/production-team/products", icon: Package },
            { label: "Catalog Setup", href: "/production-team/catalog-setup", icon: Layers },
            { label: "Vendors", href: "/production-team/vendors", icon: Building2 },
        ],
    },
    {
        title: "ORCHESTRATION",
        items: [
            { label: "Control Tower", href: "/production-team/orchestration", icon: Zap },
            { label: "Dispatch", href: "/production-team/dispatch", icon: PackageCheck },
            { label: "Reconciliation", href: "/production-team/reconciliation", icon: Scale },
            // Archived (meeting, 17 Nov 2026): QC templates are hidden from the menu along with
            // the QC Checkpoints tab. The page still exists; uncomment to bring it back.
            // { label: "QC Templates", href: "/production-team/qc-templates", icon: ClipboardCheck },
        ],
    },
    {
        title: "INSIGHTS",
        items: [
            { label: "Analytics", href: "/production-team/analytics", icon: BarChart3 },
            { label: "AI Insights", href: "/production-team/ai-insights", icon: SparklesIcon },
            { label: "Notifications", href: "/production-team/notifications", icon: Bell },
            { label: "Settings", href: "/production-team/settings", icon: Settings },
        ],
    },
];

interface ProductionSidebarProps {
    isDrawerOpen: boolean;
    onClose: () => void;
}

export default function ProductionSidebar({ isDrawerOpen, onClose }: ProductionSidebarProps): ReactElement {
    const pathname = usePathname();
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    const { data: unreadData } = useQuery({
        queryKey: ["pt-unread-notifications-count"],
        queryFn: () => fetchNotifications({ unreadOnly: true }),
        refetchInterval: 30_000,
        staleTime: 0,
    });
    const unreadCount = unreadData?.count ?? 0;

    const isActiveLink = (href: string): boolean => {
        if (pathname === href) return true;
        if (href === "/production-team/dashboard") return false;
        if (pathname.startsWith(href)) return true;
        // /production-team/X pages redirect to /staff/production/X — match both
        const staffAlias = href.replace("/production-team/", "/staff/production/");
        if (staffAlias !== href && (pathname === staffAlias || pathname.startsWith(staffAlias + "/"))) return true;
        return false;
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
                fixed left-0 top-0 z-50 h-screen w-[85vw] lg:w-64 bg-brand-blue text-white
                flex flex-col overflow-y-auto
                transition-transform duration-200 ease-in-out
                ${isDrawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            `}
        >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <Image
                    src="/logo/pd.png"
                    alt="PrintDuka"
                    width={50}
                    height={16}
                    className="w-20 h-auto"
                    priority
                />
                <button
                    onClick={onClose}
                    className="lg:hidden p-1.5 rounded hover:bg-white/10 transition-colors"
                    aria-label="Close menu"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <nav className="py-4 flex-1">
                {menuSections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="mb-6">
                        {section.title && (
                            <h2 className="px-4 text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                                {section.title}
                            </h2>
                        )}
                        <ul>
                            {section.items.map((item) => {
                                const isActive = isActiveLink(item.href);
                                const Icon = item.icon;
                                const showBadge =
                                    (item.href === "/production-team/notifications" && unreadCount > 0) ||
                                    (item.href === "/production-team/orchestration" && false); /* orchestration alerts wired later */
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            onClick={onClose}
                                            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isActive
                                                    ? "bg-brand-yellow text-brand-blue font-semibold"
                                                    : "text-white hover:bg-white/10"
                                                }`}
                                        >
                                            <Icon className="w-5 h-5 shrink-0" />
                                            <span className="flex-1">{item.label}</span>
                                            {showBadge && (
                                                <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                                                    {unreadCount > 99 ? "99+" : unreadCount}
                                                </span>
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
                <PortalSwitcher current="Production Team" />
                <div className="px-4 pb-4">
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-white/10 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loggingOut ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <LogOut className="w-5 h-5" />
                        )}
                        <span>{loggingOut ? "Logging out…" : "Logout"}</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";
import { type LucideIcon, X, Loader2, LogOut } from "lucide-react";
import {
    LayoutDashboard,
    Users,
    FileText,
    Briefcase,
    UserPlus,
    Settings,
    CreditCard,
    BarChart3,
    Package,
    Building2,
    Truck,
    ClipboardList,
    Layers,
    UserCircle,
    ShieldCheck,
    AlertTriangle,
} from "lucide-react";
import { logoutUserSession } from "@/lib/api/auth";

interface MenuItem {
    label: string;
    href: string;
    icon: LucideIcon;
    exact?: boolean;
}

interface MenuSection {
    title?: string;
    items: MenuItem[];
}

const menuSections: MenuSection[] = [
    {
        items: [
            { label: "Dashboard", href: "/business/dashboard", icon: LayoutDashboard, exact: true },
        ],
    },
    {
        title: "CLIENTS & SALES",
        items: [
            { label: "Clients",  href: "/business/clients",  icon: UserCircle },
            { label: "Leads",    href: "/business/leads",    icon: Users },
            { label: "Quotes",   href: "/business/quotes",   icon: FileText },
            { label: "Jobs",     href: "/business/jobs",     icon: Briefcase },
            { label: "Payments", href: "/business/payments", icon: CreditCard },
        ],
    },
    {
        title: "OPERATIONS",
        items: [
            { label: "Products",      href: "/business/products",              icon: Package },
            { label: "Catalog Setup", href: "/business/products/catalog-setup", icon: Layers },
            { label: "LPOs",          href: "/business/lpos",                  icon: ClipboardList },
            { label: "Vendors",       href: "/business/vendors",               icon: Building2 },
            { label: "Deliveries",    href: "/business/deliveries",            icon: Truck },
            { label: "Analytics",     href: "/business/analytics",             icon: BarChart3 },
        ],
    },
    {
        title: "TEAM",
        items: [
            { label: "Invite Team", href: "/business/team", icon: UserPlus },
        ],
    },
    {
        title: "ADMINISTRATION",
        items: [
            { label: "Users",       href: "/business/users",      icon: Users },
            { label: "Audit Logs",  href: "/business/audit-logs", icon: ShieldCheck },
            { label: "Alerts",      href: "/business/alerts",     icon: AlertTriangle },
            { label: "Settings",    href: "/business/settings",   icon: Settings },
        ],
    },
    {
        title: "ACCOUNT",
        items: [
            { label: "Subscription & Billing", href: "/portal/subscription", icon: CreditCard, exact: true },
        ],
    },
];

interface BusinessSidebarProps {
    isDrawerOpen: boolean;
    onClose: () => void;
}

export default function BusinessSidebar({ isDrawerOpen, onClose }: BusinessSidebarProps): ReactElement {
    const pathname = usePathname();
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    function isActive(item: MenuItem): boolean {
        return item.exact ? pathname === item.href : pathname.startsWith(item.href);
    }

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
                <Image src="/logo/pd.png" alt="PrintDuka" width={50} height={16} className="w-20 h-auto" priority />
                <button onClick={onClose} className="lg:hidden p-1.5 rounded hover:bg-white/10 transition-colors" aria-label="Close menu">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <nav className="py-4 flex-1">
                {menuSections.map((section, idx) => (
                    <div key={idx} className="mb-6">
                        {section.title && (
                            <h2 className="px-4 text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                                {section.title}
                            </h2>
                        )}
                        <ul>
                            {section.items.map((item) => {
                                const active = isActive(item);
                                const Icon = item.icon;
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            onClick={onClose}
                                            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                                active ? "bg-brand-yellow text-brand-blue font-semibold" : "text-white hover:bg-white/10"
                                            }`}
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span>{item.label}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            <div className="px-4 py-4 border-t border-white/10">
                <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-white/10 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                    <span>{loggingOut ? "Logging out…" : "Logout"}</span>
                </button>
            </div>
        </aside>
    );
}

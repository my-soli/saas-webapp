"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, type ReactElement } from "react";
import { type LucideIcon, X, Loader2, LogOut } from "lucide-react";
import {
    LayoutDashboard,
    Users,
    FileText,
    Package,
    Building2,
    Settings,
    BarChart3,
    CreditCard,
    UserCircle,
    ShieldCheck,
    AlertTriangle,
    Layers,
    BadgeDollarSign,
    Zap,
    PackageCheck,
    Scale,
    ClipboardCheck,
    Activity,
    Bike,
    Bell,
    Mail,
    Download,
    Cog,
    Receipt,
    Percent,
    Wallet,
    Banknote,
    Globe,
    Megaphone,
    Inbox,
} from "lucide-react";
import { logoutUserSession } from "@/lib/api/auth";
import PortalSwitcher from "@/components/shared/PortalSwitcher";
import { useBranding } from "@/components/providers";

interface MenuItem {
    label: string;
    href: string;
    icon: LucideIcon;
}

interface MenuSection {
    title?: string;
    items: MenuItem[];
}

const SCROLL_KEY = "admin-sidebar-scroll";

const menuSections: MenuSection[] = [
    {
        items: [
            { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        ],
    },
    {
        title: "CLIENTS & SALES",
        items: [
            { label: "Clients", href: "/admin/clients", icon: UserCircle },
            { label: "Leads", href: "/admin/leads", icon: Users },
            { label: "Quotes", href: "/admin/quotes", icon: FileText },
            { label: "Quote Requests", href: "/admin/quote-requests", icon: Inbox },
        ],
    },
    {
        title: "ORCHESTRATION",
        items: [
            { label: "Jobs", href: "/admin/jobs", icon: Layers },
            { label: "Control Tower", href: "/admin/orchestration", icon: Zap },
            { label: "Dispatch", href: "/admin/dispatch", icon: PackageCheck },
            { label: "Riders", href: "/admin/riders", icon: Bike },
            { label: "Reconciliation", href: "/admin/reconciliation", icon: Scale },
            // Archived (meeting, 17 Nov 2026): QC templates are hidden from the menu along with
            // the QC Checkpoints tab. The page still exists; uncomment to bring it back.
            // { label: "QC Templates", href: "/admin/qc-templates", icon: ClipboardCheck },
            { label: "Production Planning", href: "/admin/production-planning", icon: Cog },
        ],
    },
    {
        title: "FINANCIAL",
        items: [
            { label: "Invoices", href: "/admin/financial", icon: Receipt },
            { label: "Payments", href: "/admin/payments", icon: CreditCard },
            { label: "eTIMS Settings", href: "/admin/financial/etims-settings", icon: Settings },
            { label: "Tax Settings", href: "/admin/financial/tax-settings", icon: Percent },
            { label: "Expenses", href: "/admin/financial/expenses", icon: Wallet },
            { label: "Vendor Payments", href: "/admin/financial/vendor-payments", icon: Banknote },
            { label: "Customer Statements", href: "/admin/financial/statements", icon: FileText },
        ],
    },
    {
        title: "OPERATIONS",
        items: [
            { label: "Products", href: "/admin/products", icon: Package },
            { label: "Catalog Setup", href: "/admin/products/catalog-setup", icon: Layers },
            { label: "Vendors", href: "/admin/vendors", icon: Building2 },
            { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
        ],
    },
    {
        title: "ADMINISTRATION",
        items: [
            { label: "Users", href: "/admin/users", icon: Users },
            { label: "Tenants", href: "/admin/tenants", icon: Globe },
            { label: "Subscription Plans", href: "/admin/subscription-plans", icon: BadgeDollarSign },
            { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
            { label: "Activities", href: "/admin/activities", icon: Activity },
            { label: "Notifications", href: "/admin/notifications", icon: Bell },
            { label: "Email Log", href: "/admin/email-log", icon: Mail },
            { label: "Reports", href: "/admin/reports", icon: Download },
            { label: "Audit Logs", href: "/admin/audit-logs", icon: ShieldCheck },
            { label: "Alerts", href: "/admin/alerts", icon: AlertTriangle },
            { label: "Settings", href: "/admin/settings", icon: Settings },
        ],
    },
];

interface AdminSidebarProps {
    isDrawerOpen: boolean;
    onClose: () => void;
}

export default function AdminSidebar({ isDrawerOpen, onClose }: AdminSidebarProps): ReactElement {
    const pathname = usePathname();
    const [loggingOut, setLoggingOut] = useState(false);
    const sidebarRef = useRef<HTMLElement>(null);
    const branding = useBranding();

    useEffect(() => {
        const el = sidebarRef.current;
        if (!el) return;
        const saved = sessionStorage.getItem(SCROLL_KEY);
        if (saved) el.scrollTop = parseInt(saved, 10);
    }, []);

    const handleScroll = (): void => {
        if (sidebarRef.current) {
            sessionStorage.setItem(SCROLL_KEY, String(sidebarRef.current.scrollTop));
        }
    };

    const isActiveLink = (href: string): boolean => {
        if (pathname === href) return true;
        if (href === "/admin/dashboard") return false;
        if (pathname.startsWith(href)) return true;
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
            ref={sidebarRef}
            onScroll={handleScroll}
            className={`
                fixed left-0 top-0 z-50 h-screen w-[85vw] lg:w-64 bg-brand-blue text-white
                flex flex-col overflow-y-auto
                transition-transform duration-200 ease-in-out
                ${isDrawerOpen
                    ? "translate-x-0"
                    : "-translate-x-full lg:translate-x-0"
                }
            `}
        >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <Image
                    src={branding?.logo_url || "/logo/pd.png"}
                    alt={branding?.name || "PrintDuka"}
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

            <div className="border-t border-white/10 pt-2">
                <PortalSwitcher current="Admin" />
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

import type { ReactElement } from "react";
import Link from "next/link";
import {
    BriefcaseBusinessIcon,
    ClipboardCheckIcon,
    FileTextIcon,
    HandCoinsIcon,
} from "lucide-react";
import type { DashboardAnalytics, DashboardOverview } from "@/types/dashboard";

interface DashboardKpiGridProps {
    overview: DashboardOverview;
    analytics: DashboardAnalytics;
    /** When set (e.g. "/admin"), each card links to the page behind it. */
    basePath?: string;
}

export default function DashboardKpiGrid({ overview, analytics, basePath }: DashboardKpiGridProps): ReactElement {
    const totalRevenue = Number(analytics.dashboard_stats.total_revenue || 0);
    const revenueTrend = Number(analytics.dashboard_stats.revenue_trend || 0);

    const cards = [
        {
            label: "Monthly Revenue",
            path: "/financial",
            value: `KES ${totalRevenue.toLocaleString("en-US", {
                maximumFractionDigits: 0,
            })}`,
            trend: `+KES ${revenueTrend.toLocaleString("en-US", {
                maximumFractionDigits: 0,
            })} this month`,
            icon: HandCoinsIcon,
            accent: "text-brand-blue",
            bgAccent: "bg-brand-blue/10",
        },
        {
            label: "Jobs In Progress",
            path: "/jobs",
            value: overview.jobs.in_progress.toLocaleString("en-US"),
            trend: `${overview.jobs.pending} pending approval`,
            icon: BriefcaseBusinessIcon,
            accent: "text-brand-orange",
            bgAccent: "bg-brand-orange/10",
        },
        {
            label: "Pending Orders",
            path: "/lpos",
            value: overview.lpos.pending.toLocaleString("en-US"),
            trend: `${overview.lpos.approved} approved`,
            icon: ClipboardCheckIcon,
            accent: "text-brand-red",
            bgAccent: "bg-brand-red/10",
        },
        {
            label: "Active Quotes",
            path: "/quotes",
            value: overview.quotes.total.toLocaleString("en-US"),
            trend: `${overview.quotes.approved} approved · ${overview.quotes.lost} lost`,
            icon: FileTextIcon,
            accent: "text-brand-yellow",
            bgAccent: "bg-brand-yellow/10",
        },
    ] as const;

    return (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {cards.map((card): ReactElement => {
                const Icon = card.icon;
                const body = (
                    <article
                        className={`h-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all ${
                            basePath ? "hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-md" : "hover:shadow-md"
                        }`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    {card.label}
                                </p>
                                <p className="mt-3 text-3xl font-bold text-gray-900">{card.value}</p>
                                <p className="mt-2 text-xs font-medium text-gray-600">{card.trend}</p>
                            </div>
                            <div className={`rounded-lg ${card.bgAccent} p-3`}>
                                <Icon className={`h-6 w-6 ${card.accent}`} />
                            </div>
                        </div>
                    </article>
                );
                return basePath ? (
                    <Link key={card.label} href={`${basePath}${card.path}`} className="block">
                        {body}
                    </Link>
                ) : (
                    <div key={card.label}>{body}</div>
                );
            })}
        </section>
    );
}

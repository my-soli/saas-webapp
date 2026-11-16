"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import Link from "next/link";
import {
    AlertTriangleIcon,
    ArrowRightIcon,
    BriefcaseBusinessIcon,
    CheckCircle2Icon,
    ClockIcon,
    FileTextIcon,
    ReceiptIcon,
    FileQuestionIcon,
    PackageCheckIcon,
    WalletIcon,
    TruckIcon,
    UserXIcon,
} from "lucide-react";
import type { ActionCenterItem, ActionCenterSection } from "@/types/dashboard";

interface ActionCenterProps {
    sections: ActionCenterSection[];
    /** Route prefix for the current portal, e.g. "/admin". */
    basePath?: string;
}

const SECTION_ICONS: Record<string, typeof FileTextIcon> = {
    approved_no_job: FileTextIcon,
    awaiting_client: ClockIcon,
    awaiting_costing: ClockIcon,
    unassigned_jobs: UserXIcon,
    overdue_jobs: AlertTriangleIcon,
    jobs_without_quote: FileQuestionIcon,
    finished_not_dispatched: PackageCheckIcon,
    finished_not_invoiced: WalletIcon,
    unconfirmed_dispatches: TruckIcon,
    overdue_invoices: ReceiptIcon,
};

/** Where "View all" goes for each section. */
function viewAllHref(section: ActionCenterSection, basePath: string): string {
    switch (section.key) {
        case "approved_no_job":
            return `${basePath}/quotes?status=Approved`;
        case "awaiting_client":
            return `${basePath}/quotes?status=Sent%20to%20Customer`;
        case "awaiting_costing":
            return `${basePath}/quotes?status=Sent%20to%20PT`;
        case "unassigned_jobs":
        case "overdue_jobs":
        case "jobs_without_quote":
            return `${basePath}/jobs`;
        case "finished_not_dispatched":
            return `${basePath}/dispatch`;
        case "finished_not_invoiced":
            return `${basePath}/financial`;
        case "unconfirmed_dispatches":
            return `${basePath}/dispatch`;
        case "overdue_invoices":
            return `${basePath}/financial`;
        default:
            return basePath;
    }
}

function itemHref(section: ActionCenterSection, item: ActionCenterItem, basePath: string): string {
    switch (section.kind) {
        case "quote":
            return `${basePath}/quotes?open=${item.id}`;
        case "job":
            return `${basePath}/jobs/${item.id}`;
        case "dispatch":
            return `${basePath}/dispatch`;
        case "invoice":
            return `${basePath}/financial/${item.id}`;
        default:
            return basePath;
    }
}

function formatKES(value: number): string {
    return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

function ageLabel(section: ActionCenterSection, days: number | null): string | null {
    if (days === null) return null;
    if (section.key === "overdue_jobs" || section.key === "overdue_invoices") {
        return days === 0 ? "due today" : `${days}d overdue`;
    }
    return days === 0 ? "today" : `${days}d`;
}

export default function ActionCenter({ sections, basePath = "/admin" }: ActionCenterProps): ReactElement {
    const firstOpen = sections.find((s) => s.count > 0)?.key ?? null;
    const [activeKey, setActiveKey] = useState<string | null>(firstOpen);
    const active = sections.find((s) => s.key === activeKey) ?? null;
    const totalOpen = sections.reduce((sum, s) => sum + s.count, 0);

    return (
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
                <div>
                    <h2 className="text-base font-semibold text-gray-900">Needs attention</h2>
                    <p className="text-xs text-gray-500">
                        {totalOpen === 0 ? "Nothing waiting on anyone right now." : `${totalOpen} item${totalOpen === 1 ? "" : "s"} waiting across quotes, jobs, dispatch and invoices`}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5">
                {sections.map((section): ReactElement => {
                    const Icon = SECTION_ICONS[section.key] ?? BriefcaseBusinessIcon;
                    const isActive = section.key === activeKey;
                    const clear = section.count === 0;
                    const tone = clear
                        ? "border-gray-200 bg-gray-50 text-gray-400"
                        : section.severity === "high"
                            ? "border-brand-red/25 bg-brand-red/5 text-brand-red"
                            : "border-brand-orange/25 bg-brand-orange/5 text-brand-orange";
                    return (
                        <button
                            key={section.key}
                            type="button"
                            onClick={(): void => setActiveKey(isActive ? null : section.key)}
                            disabled={clear}
                            aria-pressed={isActive}
                            className={`group flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all ${tone} ${
                                isActive ? "ring-2 ring-brand-blue ring-offset-1" : ""
                            } ${clear ? "cursor-default" : "hover:-translate-y-0.5 hover:shadow-md"}`}
                        >
                            <div className="flex w-full items-center justify-between">
                                <Icon className="h-4 w-4" />
                                {clear && <CheckCircle2Icon className="h-4 w-4 text-brand-green" />}
                            </div>
                            <span className={`text-2xl font-bold ${clear ? "text-gray-300" : "text-gray-900"}`}>{section.count}</span>
                            <span className={`text-xs font-medium leading-snug ${clear ? "text-gray-400" : "text-gray-700"}`}>{section.label}</span>
                        </button>
                    );
                })}
            </div>

            {active && active.count > 0 && (
                <div className="border-t border-gray-100">
                    <div className="flex items-center justify-between px-5 py-3">
                        <h3 className="text-sm font-semibold text-gray-900">{active.label}</h3>
                        <Link
                            href={viewAllHref(active, basePath)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline"
                        >
                            View all {active.count}
                            <ArrowRightIcon className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    <ul className="divide-y divide-gray-100">
                        {active.items.map((item): ReactElement => {
                            const age = ageLabel(active, item.age_days);
                            return (
                                <li key={`${active.key}-${item.id}`}>
                                    <Link
                                        href={itemHref(active, item, basePath)}
                                        className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-gray-50"
                                    >
                                        <span className="w-28 shrink-0 text-xs font-semibold text-gray-900">{item.ref || "—"}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm text-gray-900">{item.title}</span>
                                            {item.subtitle && <span className="block truncate text-xs text-gray-500">{item.subtitle}</span>}
                                        </span>
                                        {item.owner !== undefined && (
                                            <span className="hidden text-xs text-gray-500 md:block">{item.owner ?? "Unassigned"}</span>
                                        )}
                                        {typeof item.amount === "number" && item.amount > 0 && (
                                            <span className="hidden text-xs font-semibold text-gray-700 sm:block">{formatKES(item.amount)}</span>
                                        )}
                                        {age && (
                                            <span
                                                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                    active.severity === "high" ? "bg-brand-red/10 text-brand-red" : "bg-brand-orange/10 text-brand-orange"
                                                }`}
                                            >
                                                {age}
                                            </span>
                                        )}
                                        <ArrowRightIcon className="h-4 w-4 shrink-0 text-gray-300" />
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </section>
    );
}

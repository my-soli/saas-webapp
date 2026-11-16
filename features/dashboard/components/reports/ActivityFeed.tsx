"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
    BriefcaseBusinessIcon,
    CheckCircle2Icon,
    CircleDollarSignIcon,
    FileTextIcon,
    MessageSquareIcon,
    TruckIcon,
} from "lucide-react";
import { fetchActivityFeed } from "@/services/dashboard";
import { Card } from "./shared";

const ICONS: Record<string, { icon: typeof FileTextIcon; color: string }> = {
    quote: { icon: FileTextIcon, color: "bg-brand-purple/10 text-brand-purple" },
    order: { icon: FileTextIcon, color: "bg-brand-blue/10 text-brand-blue" },
    job: { icon: BriefcaseBusinessIcon, color: "bg-brand-orange/10 text-brand-orange" },
    dispatch: { icon: TruckIcon, color: "bg-brand-blue/10 text-brand-blue" },
    delivery: { icon: CheckCircle2Icon, color: "bg-brand-green/10 text-brand-green" },
    payment: { icon: CircleDollarSignIcon, color: "bg-brand-green/10 text-brand-green" },
};

function ago(iso: string): string {
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const h = Math.round(mins / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

/** Live feed of what's happening across the business; refreshes every 30s. */
export default function ActivityFeed(): ReactElement {
    const { data, isLoading, dataUpdatedAt } = useQuery({
        queryKey: ["dashboard", "activity-feed"],
        queryFn: fetchActivityFeed,
        refetchInterval: 30_000,
    });
    const items = data?.results ?? [];

    return (
        <Card
            title="Live activity"
            subtitle={
                <span className="inline-flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green" />
                    </span>
                    Updates every 30 seconds{dataUpdatedAt ? ` · last ${new Date(dataUpdatedAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}` : ""}
                </span>
            }
            exportName="activity"
            exportRows={(): Record<string, string>[] => items.map((e) => ({ When: e.at, Type: e.type, Event: e.title, Detail: e.detail, By: e.by ?? "" }))}
        >
            {isLoading ? (
                <div className="space-y-3">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />)}</div>
            ) : items.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">No activity yet.</p>
            ) : (
                <ol className="max-h-[520px] space-y-1 overflow-y-auto pr-1">
                    {items.map((e, i) => {
                        const meta = ICONS[e.type] ?? { icon: MessageSquareIcon, color: "bg-gray-100 text-gray-500" };
                        const Icon = meta.icon;
                        const body = (
                            <div className="flex gap-3 rounded-lg p-2 hover:bg-gray-50">
                                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.color}`}>
                                    <Icon className="h-4 w-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900">{e.title}</p>
                                    <p className="truncate text-xs text-gray-500">
                                        {[e.detail, e.by ? `by ${e.by}` : null].filter(Boolean).join(" · ")}
                                    </p>
                                </div>
                                <span className="shrink-0 text-[11px] text-gray-400">{ago(e.at)}</span>
                            </div>
                        );
                        return <li key={`${e.at}-${i}`}>{e.link ? <Link href={e.link}>{body}</Link> : body}</li>;
                    })}
                </ol>
            )}
        </Card>
    );
}

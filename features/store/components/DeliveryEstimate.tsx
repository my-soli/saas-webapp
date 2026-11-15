"use client";

import type { ReactElement } from "react";
import { TruckIcon, ZapIcon } from "lucide-react";
import type { CatalogProduct } from "@/services/store";

/** Add working days (Mon–Sat; Sundays skipped) to today. */
function addWorkingDays(days: number): Date {
    const d = new Date();
    let added = 0;
    while (added < days) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0) added += 1;
    }
    return d;
}

const fmtDay = (d: Date): string =>
    d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });

/** "Ready by" estimates from the configured production turnaround times. */
export default function DeliveryEstimate({ product }: { product: CatalogProduct }): ReactElement | null {
    const t = product.turnaround_days;
    if (!t) return null;
    const rows = [
        { label: "Standard", days: t.standard, icon: TruckIcon, highlight: false },
        { label: "Rush", days: t.rush, icon: ZapIcon, highlight: true },
    ].filter((r) => r.days > 0);
    if (rows.length === 0) return null;

    return (
        <div className="space-y-1.5 text-sm">
            {rows.map(({ label, days, icon: Icon, highlight }) => (
                <p key={label} className="flex items-center gap-2 text-gray-700">
                    <Icon className={`h-4 w-4 ${highlight ? "text-brand-orange" : "text-gray-400"}`} />
                    <span className="font-semibold">{fmtDay(addWorkingDays(days))}</span>
                    <span className="text-gray-500">
                        {label} · {days} working day{days === 1 ? "" : "s"}
                    </span>
                </p>
            ))}
            <p className="text-[11px] text-gray-400">
                Estimated ready date after artwork approval. Express options available on request.
            </p>
        </div>
    );
}

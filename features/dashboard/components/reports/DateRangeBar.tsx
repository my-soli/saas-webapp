"use client";

import type { ReactElement } from "react";
import { CalendarRangeIcon, PrinterIcon } from "lucide-react";

export interface DateRange {
    start: string;
    end: string;
    preset: string;
}

function iso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export function presetRange(preset: string): DateRange {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    switch (preset) {
        case "this_month":
            return { preset, start: iso(new Date(y, m, 1)), end: iso(today) };
        case "last_month":
            return { preset, start: iso(new Date(y, m - 1, 1)), end: iso(new Date(y, m, 0)) };
        case "last_3":
            return { preset, start: iso(new Date(y, m - 2, 1)), end: iso(today) };
        case "last_6":
            return { preset, start: iso(new Date(y, m - 5, 1)), end: iso(today) };
        case "this_quarter": {
            const q = Math.floor(m / 3) * 3;
            return { preset, start: iso(new Date(y, q, 1)), end: iso(today) };
        }
        case "this_year":
            return { preset, start: iso(new Date(y, 0, 1)), end: iso(today) };
        case "last_year":
            return { preset, start: iso(new Date(y - 1, 0, 1)), end: iso(new Date(y - 1, 11, 31)) };
        case "last_12":
        default:
            return { preset: "last_12", start: iso(new Date(y, m - 11, 1)), end: iso(today) };
    }
}

const PRESETS: { value: string; label: string }[] = [
    { value: "this_month", label: "This month" },
    { value: "last_month", label: "Last month" },
    { value: "last_3", label: "Last 3 months" },
    { value: "this_quarter", label: "This quarter" },
    { value: "last_6", label: "Last 6 months" },
    { value: "last_12", label: "Last 12 months" },
    { value: "this_year", label: "This year" },
    { value: "last_year", label: "Last year" },
    { value: "custom", label: "Custom…" },
];

interface Props {
    value: DateRange;
    onChange: (range: DateRange) => void;
    isFetching?: boolean;
}

/** One date range for every report below it, plus Export PDF. */
export default function DateRangeBar({ value, onChange, isFetching }: Props): ReactElement {
    return (
        <div
            data-print-hide
            className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-y border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8"
        >
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <CalendarRangeIcon className="h-4 w-4 text-brand-blue" />
                Reports for
            </div>
            <select
                value={value.preset}
                onChange={(e): void => {
                    const p = e.target.value;
                    onChange(p === "custom" ? { ...value, preset: "custom" } : presetRange(p));
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                aria-label="Date range"
            >
                {PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                ))}
            </select>
            <div className="flex items-center gap-2 text-sm">
                <input
                    type="date"
                    value={value.start}
                    max={value.end}
                    onChange={(e): void => { if (e.target.value) onChange({ ...value, start: e.target.value, preset: "custom" }); }}
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    aria-label="From"
                />
                <span className="text-gray-400">to</span>
                <input
                    type="date"
                    value={value.end}
                    min={value.start}
                    onChange={(e): void => { if (e.target.value) onChange({ ...value, end: e.target.value, preset: "custom" }); }}
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    aria-label="To"
                />
            </div>
            {isFetching && <span className="text-xs text-gray-400">Updating…</span>}
            <button
                type="button"
                onClick={(): void => window.print()}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-brand-blue hover:text-brand-blue"
                title="Save the dashboard as a PDF (choose 'Save as PDF' in the print dialog)"
            >
                <PrinterIcon className="h-4 w-4" />
                Export PDF
            </button>
        </div>
    );
}

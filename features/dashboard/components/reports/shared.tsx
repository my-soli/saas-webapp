import type { ReactElement, ReactNode } from "react";

export const BRAND = {
    blue: "#093756",
    green: "#009444",
    yellow: "#F6B619",
    orange: "#F15A29",
    red: "#ED1C24",
    purple: "#662D91",
    gray: "#9CA3AF",
    teal: "#0D9488",
};

export function formatKES(value: number, compact = false): string {
    if (compact) {
        const abs = Math.abs(value);
        if (abs >= 1_000_000) return `KES ${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
        if (abs >= 1_000) return `KES ${(value / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}k`;
    }
    return `KES ${Math.round(value).toLocaleString("en-KE")}`;
}

export function compactNumber(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
    return `${value}`;
}

/** "2026-05" → "May '26" */
export function monthLabel(key: string, long = false): string {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, (m || 1) - 1, 1);
    return long
        ? d.toLocaleDateString("en-KE", { month: "long", year: "numeric" })
        : `${d.toLocaleDateString("en-KE", { month: "short" })} '${String(y).slice(2)}`;
}

interface SegmentedProps<T extends string | number> {
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
    ariaLabel: string;
}

export function Segmented<T extends string | number>({ value, options, onChange, ariaLabel }: SegmentedProps<T>): ReactElement {
    return (
        <div role="tablist" aria-label={ariaLabel} className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {options.map((o) => (
                <button
                    key={String(o.value)}
                    type="button"
                    role="tab"
                    aria-selected={o.value === value}
                    onClick={(): void => onChange(o.value)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                        o.value === value ? "bg-white text-brand-blue shadow-sm" : "text-gray-500 hover:text-gray-800"
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "up" | "down" | "neutral" }): ReactElement {
    const toneClass = tone === "up" ? "text-brand-green" : tone === "down" ? "text-brand-red" : "text-gray-500";
    return (
        <div className="min-w-0 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
            <p className="mt-0.5 truncate text-lg font-bold text-gray-900">{value}</p>
            {hint !== undefined && <p className={`truncate text-xs font-medium ${toneClass}`}>{hint}</p>}
        </div>
    );
}

export function Card({ title, subtitle, actions, children }: { title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }): ReactElement {
    return (
        <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
                <div className="min-w-0">
                    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
            <div className="flex-1 p-5">{children}</div>
        </article>
    );
}

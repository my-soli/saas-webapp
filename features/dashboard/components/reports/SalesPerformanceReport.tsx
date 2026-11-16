"use client";

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import Link from "next/link";
import {
    Area,
    Bar,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type { DashboardReports, ReportMonth } from "@/types/dashboard";
import { BRAND, Card, Segmented, Stat, compactNumber, formatKES, monthLabel } from "./shared";

type Metric = "money" | "orders" | "quotes";
type ChartKind = "area" | "bar" | "table";
type Breakdown = "clients" | "products";

interface Props {
    reports: DashboardReports;
    months: number;
    onMonthsChange: (months: number) => void;
    isFetching?: boolean;
    basePath?: string;
}

const SERIES: Record<Metric, { key: keyof ReportMonth; label: string; color: string; money: boolean; axis?: "right" }[]> = {
    money: [
        { key: "revenue", label: "Revenue (LPOs)", color: BRAND.blue, money: true },
        { key: "invoiced", label: "Invoiced", color: BRAND.yellow, money: true },
        { key: "collected", label: "Collected", color: BRAND.green, money: true },
    ],
    orders: [
        { key: "orders", label: "Orders (LPOs)", color: BRAND.blue, money: false },
        { key: "jobs_created", label: "Jobs created", color: BRAND.orange, money: false },
        { key: "jobs_completed", label: "Jobs completed", color: BRAND.green, money: false },
    ],
    quotes: [
        { key: "quotes_created", label: "Quotes created", color: BRAND.gray, money: false },
        { key: "quotes_approved", label: "Approved", color: BRAND.green, money: false },
        { key: "quotes_lost", label: "Lost", color: BRAND.red, money: false },
    ],
};

function pctChange(curr: number, prev: number): number | null {
    if (!prev) return null;
    return ((curr - prev) / prev) * 100;
}

export default function SalesPerformanceReport({ reports, months, onMonthsChange, isFetching, basePath = "/admin" }: Props): ReactElement {
    const [metric, setMetric] = useState<Metric>("money");
    const [kind, setKind] = useState<ChartKind>("area");
    const [breakdown, setBreakdown] = useState<Breakdown>("clients");
    const [selected, setSelected] = useState<string | null>(null);

    const data = reports.monthly;
    const series = SERIES[metric];
    const isMoney = metric === "money";

    const summary = useMemo(() => {
        const total = data.reduce((s, m) => s + m.revenue, 0);
        const invoiced = data.reduce((s, m) => s + m.invoiced, 0);
        const collected = data.reduce((s, m) => s + m.collected, 0);
        const orders = data.reduce((s, m) => s + m.orders, 0);
        const best = data.reduce<ReportMonth | null>((b, m) => (!b || m.revenue > b.revenue ? m : b), null);
        const last = data[data.length - 1];
        const prev = data[data.length - 2];
        return {
            total,
            invoiced,
            collected,
            orders,
            avg: data.length ? total / data.length : 0,
            best,
            mom: last && prev ? pctChange(last.revenue, prev.revenue) : null,
            collectionRate: invoiced ? (collected / invoiced) * 100 : null,
        };
    }, [data]);

    const focus = data.find((m) => m.month === selected) ?? data[data.length - 1];
    const focusIdx = focus ? data.indexOf(focus) : -1;
    const focusPrev = focusIdx > 0 ? data[focusIdx - 1] : undefined;

    const handleChartClick = (state: unknown): void => {
        const label = (state as { activeLabel?: string } | null)?.activeLabel;
        if (label) setSelected(label === selected ? null : label);
    };

    const yFormat = (v: number): string => (isMoney ? compactNumber(v) : String(v));

    const breakdownRows = breakdown === "clients"
        ? reports.top_clients.map((c) => ({ key: `c-${c.id}`, name: c.name, value: c.revenue, sub: `${c.orders} order${c.orders === 1 ? "" : "s"}`, href: undefined as string | undefined }))
        : reports.top_products.map((p) => ({ key: `p-${p.name}`, name: p.name, value: p.revenue, sub: `${compactNumber(p.quantity)} units · ${p.quotes} quote${p.quotes === 1 ? "" : "s"}`, href: undefined as string | undefined }));
    const breakdownMax = Math.max(1, ...breakdownRows.map((r) => r.value));

    return (
        <Card
            title="Sales Performance"
            subtitle={`${monthLabel(data[0]?.month ?? "", true)} – ${monthLabel(data[data.length - 1]?.month ?? "", true)} · click a month for its breakdown`}
            actions={
                <>
                    <Segmented
                        ariaLabel="Measure"
                        value={metric}
                        onChange={setMetric}
                        options={[
                            { value: "money", label: "Revenue" },
                            { value: "orders", label: "Orders & jobs" },
                            { value: "quotes", label: "Quotes" },
                        ]}
                    />
                    <Segmented
                        ariaLabel="Chart type"
                        value={kind}
                        onChange={setKind}
                        options={[
                            { value: "area", label: "Trend" },
                            { value: "bar", label: "Bars" },
                            { value: "table", label: "Table" },
                        ]}
                    />
                    <Segmented
                        ariaLabel="Range"
                        value={months}
                        onChange={(v): void => { setSelected(null); onMonthsChange(v); }}
                        options={[
                            { value: 3, label: "3M" },
                            { value: 6, label: "6M" },
                            { value: 12, label: "12M" },
                            { value: 24, label: "24M" },
                        ]}
                    />
                </>
            }
        >
            <div className={`transition-opacity ${isFetching ? "opacity-60" : ""}`}>
                {/* Period summary */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <Stat label="Revenue" value={formatKES(summary.total, true)} hint={`${summary.orders} orders`} />
                    <Stat label="Avg / month" value={formatKES(summary.avg, true)} />
                    <Stat
                        label="This month vs last"
                        value={summary.mom === null ? "—" : `${summary.mom >= 0 ? "+" : ""}${summary.mom.toFixed(0)}%`}
                        tone={summary.mom === null ? "neutral" : summary.mom >= 0 ? "up" : "down"}
                        hint={summary.mom === null ? "no prior data" : summary.mom >= 0 ? "growing" : "down"}
                    />
                    <Stat label="Best month" value={summary.best ? monthLabel(summary.best.month) : "—"} hint={summary.best ? formatKES(summary.best.revenue, true) : undefined} />
                    <Stat label="Invoiced" value={formatKES(summary.invoiced, true)} />
                    <Stat
                        label="Collected"
                        value={formatKES(summary.collected, true)}
                        hint={summary.collectionRate === null ? undefined : `${summary.collectionRate.toFixed(0)}% of invoiced`}
                        tone={summary.collectionRate !== null && summary.collectionRate < 70 ? "down" : "neutral"}
                    />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 2xl:grid-cols-4 xl:grid-cols-3">
                    {/* Main chart / table */}
                    <div className="xl:col-span-2 2xl:col-span-3">
                        {kind === "table" ? (
                            <div className="max-h-[360px] overflow-auto rounded-xl border border-gray-100">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Month</th>
                                            <th className="px-3 py-2 text-right">Revenue</th>
                                            <th className="px-3 py-2 text-right">Orders</th>
                                            <th className="px-3 py-2 text-right">Invoiced</th>
                                            <th className="px-3 py-2 text-right">Collected</th>
                                            <th className="px-3 py-2 text-right">Quotes</th>
                                            <th className="px-3 py-2 text-right">Approved</th>
                                            <th className="px-3 py-2 text-right">Jobs done</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...data].reverse().map((m) => (
                                            <tr
                                                key={m.month}
                                                onClick={(): void => setSelected(m.month)}
                                                className={`cursor-pointer border-t border-gray-100 hover:bg-gray-50 ${m.month === focus?.month ? "bg-brand-blue/5" : ""}`}
                                            >
                                                <td className="px-3 py-2 font-medium text-gray-900">{monthLabel(m.month, true)}</td>
                                                <td className="px-3 py-2 text-right font-semibold">{formatKES(m.revenue)}</td>
                                                <td className="px-3 py-2 text-right">{m.orders}</td>
                                                <td className="px-3 py-2 text-right">{formatKES(m.invoiced)}</td>
                                                <td className="px-3 py-2 text-right">{formatKES(m.collected)}</td>
                                                <td className="px-3 py-2 text-right">{m.quotes_created}</td>
                                                <td className="px-3 py-2 text-right">{m.quotes_approved}</td>
                                                <td className="px-3 py-2 text-right">{m.jobs_completed}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="h-[360px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} onClick={handleChartClick} style={{ cursor: "pointer" }}>
                                        <defs>
                                            {series.map((s) => (
                                                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={s.color} stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                                                </linearGradient>
                                            ))}
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F3" />
                                        <XAxis dataKey="month" tickFormatter={(v: string): string => monthLabel(v)} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
                                        <YAxis tickFormatter={yFormat} axisLine={false} tickLine={false} width={48} tick={{ fontSize: 12, fill: "#6B7280" }} allowDecimals={false} />
                                        <Tooltip
                                            cursor={{ fill: "rgba(9,55,86,0.05)" }}
                                            labelFormatter={(v): string => monthLabel(String(v), true)}
                                            formatter={(v, name): [string, string] => {
                                                const s = series.find((x) => x.label === name);
                                                const n = Number(v);
                                                return [s?.money ? formatKES(n) : n.toLocaleString("en-KE"), String(name)];
                                            }}
                                            contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                                        {series.map((s, i) =>
                                            kind === "bar" ? (
                                                <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[6, 6, 0, 0]} maxBarSize={28} />
                                            ) : i === 0 ? (
                                                <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.5} fill={`url(#grad-${s.key})`} activeDot={{ r: 6 }} />
                                            ) : (
                                                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                                            ),
                                        )}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Month breakdown */}
                    <aside className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                        {focus ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-gray-900">{monthLabel(focus.month, true)}</p>
                                    {selected && (
                                        <button type="button" onClick={(): void => setSelected(null)} className="text-xs font-medium text-gray-500 hover:text-gray-800">
                                            Latest
                                        </button>
                                    )}
                                </div>
                                <p className="mt-2 text-2xl font-bold text-brand-blue">{formatKES(focus.revenue)}</p>
                                {focusPrev && (() => {
                                    const c = pctChange(focus.revenue, focusPrev.revenue);
                                    return c === null ? null : (
                                        <p className={`text-xs font-semibold ${c >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                                            {c >= 0 ? "▲" : "▼"} {Math.abs(c).toFixed(0)}% vs {monthLabel(focusPrev.month)}
                                        </p>
                                    );
                                })()}
                                <dl className="mt-4 space-y-2 text-sm">
                                    {[
                                        ["Orders (LPOs)", focus.orders.toLocaleString()],
                                        ["Invoiced", formatKES(focus.invoiced)],
                                        ["Collected", formatKES(focus.collected)],
                                        ["Quotes created", `${focus.quotes_created} · ${formatKES(focus.quote_value, true)}`],
                                        ["Quotes approved", `${focus.quotes_approved} · ${formatKES(focus.approved_value, true)}`],
                                        ["Quotes lost", String(focus.quotes_lost)],
                                        ["Jobs created", String(focus.jobs_created)],
                                        ["Jobs completed", String(focus.jobs_completed)],
                                    ].map(([k, v]) => (
                                        <div key={k} className="flex items-center justify-between gap-2">
                                            <dt className="text-gray-500">{k}</dt>
                                            <dd className="font-semibold text-gray-900">{v}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </>
                        ) : (
                            <p className="text-sm text-gray-500">No data for this period.</p>
                        )}
                    </aside>
                </div>

                {/* Who and what drove it */}
                <div className="mt-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">Top {breakdown === "clients" ? "clients by revenue" : "products by approved value"}</h3>
                        <Segmented
                            ariaLabel="Breakdown"
                            value={breakdown}
                            onChange={setBreakdown}
                            options={[
                                { value: "clients", label: "Clients" },
                                { value: "products", label: "Products" },
                            ]}
                        />
                    </div>
                    {breakdownRows.length === 0 ? (
                        <p className="py-6 text-center text-sm text-gray-500">Nothing in this period yet.</p>
                    ) : (
                        <ul className="grid grid-cols-1 gap-x-8 gap-y-2.5 lg:grid-cols-2">
                            {breakdownRows.map((r, i) => {
                                const inner = (
                                    <>
                                        <div className="flex items-baseline justify-between gap-3 text-sm">
                                            <span className="min-w-0 truncate font-medium text-gray-900">
                                                <span className="mr-2 text-xs text-gray-400">{i + 1}</span>
                                                {r.name}
                                            </span>
                                            <span className="shrink-0 font-semibold text-gray-900">{formatKES(r.value, true)}</span>
                                        </div>
                                        <div className="mt-1 flex items-center gap-2">
                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                                                <div className="h-full rounded-full bg-brand-blue" style={{ width: `${(r.value / breakdownMax) * 100}%` }} />
                                            </div>
                                            <span className="shrink-0 text-[11px] text-gray-500">{r.sub}</span>
                                        </div>
                                    </>
                                );
                                return (
                                    <li key={r.key}>
                                        {r.href ? (
                                            <Link href={r.href} className="block rounded-lg p-1.5 hover:bg-gray-50">{inner}</Link>
                                        ) : (
                                            <div className="p-1.5">{inner}</div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </Card>
    );
}

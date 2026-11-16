"use client";

import { useState } from "react";
import type { ReactElement, ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { setRevenueTarget } from "@/services/dashboard";
import type { DashboardInsights, RevenueTarget } from "@/types/dashboard";
import { BRAND, Card, Segmented, Stat, formatKES } from "./shared";

const pct = (v: number | null | undefined): string => (v === null || v === undefined ? "—" : `${v}%`);
const fmtDate = (v: string | null): string =>
    v ? new Date(v).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "—";

function Empty({ children }: { children: ReactNode }): ReactElement {
    return <p className="py-8 text-center text-sm text-gray-500">{children}</p>;
}

function Table({ head, children }: { head: string[]; children: ReactNode }): ReactElement {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wide text-gray-500">
                        {head.map((h, i) => (
                            <th key={h} className={`py-2 pr-3 font-semibold ${i > 0 ? "text-right" : ""}`}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">{children}</tbody>
            </table>
        </div>
    );
}

// 3 ── Today / this week ──────────────────────────────────────────────────────
export function TodayStrip({ today, basePath = "/admin" }: { today: DashboardInsights["today"]; basePath?: string }): ReactElement {
    type Key = "due_today" | "due_tomorrow" | "due_this_week" | "dispatches_today" | "quotes_expiring";
    const tiles: { key: Key; label: string; tone: string }[] = [
        { key: "due_today", label: "Jobs due today", tone: "text-brand-red" },
        { key: "due_tomorrow", label: "Due tomorrow", tone: "text-brand-orange" },
        { key: "due_this_week", label: "Due later this week", tone: "text-brand-blue" },
        { key: "dispatches_today", label: "Dispatches today", tone: "text-brand-purple" },
        { key: "quotes_expiring", label: "Quotes expiring in 7 days", tone: "text-brand-yellow" },
    ];
    const [active, setActive] = useState<Key>("due_today");
    const section = today[active];

    return (
        <Card title="Today & this week" subtitle="What's happening now. Click a tile for the list.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {tiles.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={(): void => setActive(t.key)}
                        className={`rounded-xl border p-3 text-left transition-all hover:shadow-md ${active === t.key ? "border-brand-blue ring-2 ring-brand-blue/20" : "border-gray-200"}`}
                    >
                        <span className={`block text-2xl font-bold ${today[t.key].count ? t.tone : "text-gray-300"}`}>{today[t.key].count}</span>
                        <span className="text-xs font-medium text-gray-600">{t.label}</span>
                    </button>
                ))}
            </div>
            <ul className="mt-4 divide-y divide-gray-100">
                {section.items.length === 0 && <Empty>Nothing here.</Empty>}
                {active === "dispatches_today"
                    ? today.dispatches_today.items.map((d) => (
                        <li key={d.id}>
                            <Link href={`${basePath}/dispatch`} className="flex items-center gap-3 py-2 text-sm hover:bg-gray-50">
                                <span className="w-28 shrink-0 font-semibold">{d.ref}</span>
                                <span className="min-w-0 flex-1 truncate">{d.client}</span>
                                <span className="hidden truncate text-xs text-gray-500 md:block">{d.location}</span>
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{d.status}</span>
                            </Link>
                        </li>
                    ))
                    : active === "quotes_expiring"
                        ? today.quotes_expiring.items.map((q) => (
                            <li key={q.id}>
                                <Link href={`${basePath}/quotes?open=${q.id}`} className="flex items-center gap-3 py-2 text-sm hover:bg-gray-50">
                                    <span className="w-28 shrink-0 font-semibold">{q.ref}</span>
                                    <span className="min-w-0 flex-1 truncate">{q.client}</span>
                                    <span className="text-xs font-semibold">{formatKES(q.value, true)}</span>
                                    <span className="rounded-full bg-brand-yellow/20 px-2 py-0.5 text-xs">expires {fmtDate(q.valid_until)}</span>
                                </Link>
                            </li>
                        ))
                        : today[active as "due_today" | "due_tomorrow" | "due_this_week"].items.map((j) => (
                            <li key={j.id}>
                                <Link href={`${basePath}/jobs/${j.id}`} className="flex items-center gap-3 py-2 text-sm hover:bg-gray-50">
                                    <span className="w-28 shrink-0 font-semibold">{j.ref}</span>
                                    <span className="min-w-0 flex-1 truncate">{j.client} · {j.name}</span>
                                    <span className="hidden text-xs text-gray-500 md:block">{j.owner ?? "Unassigned"}</span>
                                    <span className="text-xs text-gray-500">{fmtDate(j.due)}</span>
                                </Link>
                            </li>
                        ))}
            </ul>
        </Card>
    );
}

// 9 ── Monthly target ─────────────────────────────────────────────────────────
export function TargetCard({ target, canEdit }: { target: RevenueTarget; canEdit: boolean }): ReactElement {
    const queryClient = useQueryClient();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(target.target ? String(Math.round(target.target)) : "");
    const save = useMutation({
        mutationFn: (v: number) => setRevenueTarget(v),
        onSuccess: (): void => {
            toast.success("Monthly target saved.");
            setEditing(false);
            queryClient.invalidateQueries({ queryKey: ["dashboard", "insights"] });
        },
        onError: (e: Error): void => { toast.error(e.message); },
    });
    const progress = Math.min(target.progress ?? 0, 100);
    const expectedPct = (target.days_elapsed / target.days_in_month) * 100;
    const vsLastYear = target.last_year_to_date ? ((target.actual - target.last_year_to_date) / target.last_year_to_date) * 100 : null;
    const monthName = new Date(`${target.month}-01`).toLocaleDateString("en-KE", { month: "long", year: "numeric" });

    return (
        <Card
            title="Monthly target"
            subtitle={`${monthName} · day ${target.days_elapsed} of ${target.days_in_month}`}
            actions={canEdit && !editing ? (
                <button type="button" onClick={(): void => setEditing(true)} className="text-xs font-semibold text-brand-blue hover:underline">
                    {target.target ? "Edit target" : "Set target"}
                </button>
            ) : undefined}
        >
            {editing && (
                <form
                    className="mb-4 flex items-center gap-2"
                    onSubmit={(e): void => { e.preventDefault(); const v = Number(draft); if (v > 0) save.mutate(v); }}
                >
                    <span className="text-sm text-gray-500">KES</span>
                    <input
                        type="number"
                        min={0}
                        value={draft}
                        onChange={(e): void => setDraft(e.target.value)}
                        className="w-40 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                        autoFocus
                    />
                    <button type="submit" disabled={save.isPending} className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save</button>
                    <button type="button" onClick={(): void => setEditing(false)} className="text-xs text-gray-500">Cancel</button>
                </form>
            )}
            <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold text-gray-900">{formatKES(target.actual, true)}</span>
                <span className="text-sm text-gray-500">{target.target ? `of ${formatKES(target.target, true)}` : "no target set"}</span>
            </div>
            <div className="relative mt-3 h-4 overflow-hidden rounded-full bg-gray-100">
                <div
                    className={`h-full rounded-full transition-all ${progress >= expectedPct ? "bg-brand-green" : "bg-brand-orange"}`}
                    style={{ width: `${progress}%` }}
                />
                {target.target && <div className="absolute top-0 h-full w-0.5 bg-gray-700" style={{ left: `${expectedPct}%` }} title="Where we should be today" />}
            </div>
            <p className="mt-1 text-xs text-gray-500">
                {target.target
                    ? `${pct(target.progress)} reached · the line marks where we should be today`
                    : canEdit ? "Set a target to track progress." : "An admin can set a monthly target."}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
                <Stat label="Projected" value={formatKES(target.projected, true)} hint="at current pace" tone={target.target ? (target.projected >= target.target ? "up" : "down") : "neutral"} />
                <Stat label="Same time last year" value={formatKES(target.last_year_to_date, true)} hint={vsLastYear === null ? "no data" : `${vsLastYear >= 0 ? "+" : ""}${vsLastYear.toFixed(0)}% vs now`} tone={vsLastYear === null ? "neutral" : vsLastYear >= 0 ? "up" : "down"} />
                <Stat label="Last year, full month" value={formatKES(target.last_year_month, true)} />
            </div>
        </Card>
    );
}

// 1 ── Receivables ────────────────────────────────────────────────────────────
export function ReceivablesCard({ data, basePath = "/admin" }: { data: DashboardInsights["receivables"]; basePath?: string }): ReactElement {
    const buckets = [
        { key: "current", label: "Not yet due", color: BRAND.green },
        { key: "d1_30", label: "1–30 days late", color: BRAND.yellow },
        { key: "d31_60", label: "31–60", color: BRAND.orange },
        { key: "d61_90", label: "61–90", color: BRAND.red },
        { key: "d90_plus", label: "90+", color: "#7F1D1D" },
    ] as const;
    const chart = buckets.map((b) => ({ ...b, value: data.buckets[b.key] }));
    return (
        <Card
            title="Money owed to us"
            subtitle={`${formatKES(data.total)} across ${data.invoices} unpaid invoice${data.invoices === 1 ? "" : "s"}`}
            exportName="receivables"
            exportRows={(): Record<string, string | number>[] => data.top_debtors.map((d) => ({ Client: d.name, Balance: Math.round(d.balance), Invoices: d.invoices, "Oldest (days late)": d.oldest_days }))}
        >
            <div className="h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(v: number): string => formatKES(v, true).replace("KES ", "")} />
                        <Tooltip formatter={(v): [string, string] => [formatKES(Number(v)), "Owed"]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {chart.map((c) => <Cell key={c.key} fill={c.color} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <h3 className="mt-4 mb-1 text-sm font-semibold text-gray-900">Biggest debtors</h3>
            {data.top_debtors.length === 0 ? <Empty>Nobody owes us anything.</Empty> : (
                <Table head={["Client", "Owed", "Invoices", "Oldest"]}>
                    {data.top_debtors.map((d) => (
                        <tr key={d.id}>
                            <td className="py-2 pr-3"><Link href={`${basePath}/financial?client=${d.id}`} className="hover:text-brand-blue">{d.name}</Link></td>
                            <td className="py-2 pr-3 text-right font-semibold">{formatKES(d.balance)}</td>
                            <td className="py-2 pr-3 text-right">{d.invoices}</td>
                            <td className={`py-2 text-right ${d.oldest_days > 60 ? "font-semibold text-brand-red" : ""}`}>{d.oldest_days ? `${d.oldest_days}d late` : "not due"}</td>
                        </tr>
                    ))}
                </Table>
            )}
        </Card>
    );
}

// 2 ── Profit ─────────────────────────────────────────────────────────────────
export function ProfitCard({ data, basePath = "/admin" }: { data: DashboardInsights["profit"]; basePath?: string }): ReactElement {
    const [view, setView] = useState<"am" | "product" | "low">("am");
    const t = data.totals;
    const rows = view === "am" ? data.by_account_manager : view === "product" ? data.by_product : [];
    return (
        <Card
            title="Profit"
            subtitle={`Approved work in this period, quote value minus production and vendor costs${t.uncosted_jobs ? ` · ${t.uncosted_jobs} job${t.uncosted_jobs === 1 ? "" : "s"} with no cost recorded left out` : ""}`}
            actions={<Segmented ariaLabel="Profit view" value={view} onChange={setView} options={[{ value: "am", label: "By account manager" }, { value: "product", label: "By product" }, { value: "low", label: "Lowest margins" }]} />}
            exportName="profit"
            exportRows={(): Record<string, string | number | null>[] =>
                view === "low"
                    ? data.lowest_margin_jobs.map((j) => ({ Quote: j.ref, Job: j.job_number, Client: j.client, Revenue: Math.round(j.revenue), Cost: Math.round(j.cost), Profit: Math.round(j.profit), "Margin %": j.margin }))
                    : rows.map((r) => ({ Name: r.name, Revenue: Math.round(r.revenue), Cost: Math.round(r.cost), Profit: Math.round(r.profit), "Margin %": r.margin }))}
        >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Revenue" value={formatKES(t.revenue, true)} hint={`${t.costed_jobs} costed jobs`} />
                <Stat label="Cost" value={formatKES(t.cost, true)} />
                <Stat label="Profit" value={formatKES(t.profit, true)} tone={t.profit >= 0 ? "up" : "down"} hint={t.profit >= 0 ? "gross profit" : "loss"} />
                <Stat label="Margin" value={pct(t.margin)} tone={t.margin === null ? "neutral" : t.margin >= 30 ? "up" : "down"} hint="gross margin" />
            </div>
            <div className="mt-4">
                {view === "low" ? (
                    data.lowest_margin_jobs.length === 0 ? <Empty>No costed jobs in this period.</Empty> : (
                        <Table head={["Quote / job", "Revenue", "Cost", "Margin"]}>
                            {data.lowest_margin_jobs.map((j) => (
                                <tr key={j.quote_id}>
                                    <td className="py-2 pr-3">
                                        <Link href={j.job_id ? `${basePath}/jobs/${j.job_id}` : `${basePath}/quotes?open=${j.quote_id}`} className="hover:text-brand-blue">
                                            <span className="font-semibold">{j.ref}</span> <span className="text-gray-500">· {j.client}</span>
                                        </Link>
                                    </td>
                                    <td className="py-2 pr-3 text-right">{formatKES(j.revenue, true)}</td>
                                    <td className="py-2 pr-3 text-right">{formatKES(j.cost, true)}</td>
                                    <td className={`py-2 text-right font-semibold ${(j.margin ?? 0) < 15 ? "text-brand-red" : ""}`}>{pct(j.margin)}</td>
                                </tr>
                            ))}
                        </Table>
                    )
                ) : rows.length === 0 ? <Empty>No costed jobs in this period.</Empty> : (
                    <Table head={[view === "am" ? "Account manager" : "Product", "Revenue", "Profit", "Margin"]}>
                        {rows.map((r) => (
                            <tr key={r.name}>
                                <td className="py-2 pr-3">{r.name}</td>
                                <td className="py-2 pr-3 text-right">{formatKES(r.revenue, true)}</td>
                                <td className={`py-2 pr-3 text-right font-semibold ${r.profit < 0 ? "text-brand-red" : ""}`}>{formatKES(r.profit, true)}</td>
                                <td className="py-2 text-right">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${(r.margin ?? 0) >= 30 ? "bg-brand-green/10 text-brand-green" : (r.margin ?? 0) >= 15 ? "bg-brand-yellow/20 text-gray-800" : "bg-brand-red/10 text-brand-red"}`}>{pct(r.margin)}</span>
                                </td>
                            </tr>
                        ))}
                    </Table>
                )}
            </div>
        </Card>
    );
}

// 4 ── Capacity ───────────────────────────────────────────────────────────────
export function CapacityCard({ data }: { data: DashboardInsights["capacity"] }): ReactElement {
    const days = data.next_14_days.map((d) => ({
        ...d,
        label: new Date(d.date).toLocaleDateString("en-KE", { weekday: "short", day: "numeric" }),
    }));
    const heavy = data.avg_per_day > 0 ? data.avg_per_day * 1.5 : 3;
    const maxJobs = Math.max(1, ...data.team.map((t) => t.open_jobs));
    return (
        <Card
            title="Production capacity"
            subtitle={`Jobs due per day for the next 2 weeks · avg ${data.avg_per_day}/day${data.unassigned_jobs ? ` · ${data.unassigned_jobs} open jobs unassigned` : ""}`}
            exportName="production-capacity"
            exportRows={(): Record<string, string | number>[] => data.team.map((t) => ({ Person: t.name, "Open jobs": t.open_jobs, "Open items": t.open_items, Overdue: t.overdue, "Due this week": t.due_this_week }))}
        >
            <div className="h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={days} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F3" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6B7280" }} interval={0} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
                        <Tooltip formatter={(v): [string, string] => [String(v), "Jobs due"]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                        <ReferenceLine y={data.avg_per_day} stroke={BRAND.gray} strokeDasharray="4 4" />
                        <Bar dataKey="jobs" radius={[4, 4, 0, 0]}>
                            {days.map((d) => <Cell key={d.date} fill={d.jobs >= heavy ? BRAND.red : d.jobs > data.avg_per_day ? BRAND.orange : BRAND.blue} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-500">Red days are overloaded (50%+ above average). Think twice before taking rush work due then.</p>
            <h3 className="mt-4 mb-2 text-sm font-semibold text-gray-900">Workload per person</h3>
            {data.team.length === 0 ? <Empty>No production team members found.</Empty> : (
                <ul className="space-y-2">
                    {data.team.map((t) => (
                        <li key={t.id} className="text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-800">{t.name}</span>
                                <span className="text-xs text-gray-500">
                                    <b className="text-gray-900">{t.open_jobs}</b> jobs · {t.open_items} items
                                    {t.overdue > 0 && <span className="ml-1 font-semibold text-brand-red">· {t.overdue} overdue</span>}
                                </span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                                <div className={`h-full rounded-full ${t.overdue ? "bg-brand-red" : "bg-brand-blue"}`} style={{ width: `${(t.open_jobs / maxJobs) * 100}%` }} />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

// 5 ── Team performance ───────────────────────────────────────────────────────
export function TeamCard({ data }: { data: DashboardInsights["team"] }): ReactElement {
    const [view, setView] = useState<"sales" | "production">("sales");
    return (
        <Card
            title="Team performance"
            subtitle="For the selected period"
            actions={<Segmented ariaLabel="Team" value={view} onChange={setView} options={[{ value: "sales", label: "Account managers" }, { value: "production", label: "Production" }]} />}
            exportName={`team-${view}`}
            exportRows={(): Record<string, string | number | null>[] =>
                view === "sales"
                    ? data.sales.map((s) => ({ Name: s.name, Created: s.created, Sent: s.sent, Approved: s.approved, Lost: s.lost, "Win rate %": s.win_rate, "Approved value": Math.round(s.approved_value), "Avg days to send": s.avg_days_to_send }))
                    : data.production.map((p) => ({ Name: p.name, Completed: p.completed, "On time": p.on_time, "On-time %": p.on_time_rate }))}
        >
            {view === "sales" ? (
                data.sales.length === 0 ? <Empty>No quotes in this period.</Empty> : (
                    <Table head={["Account manager", "Quotes", "Won", "Win rate", "Value won", "Days to send"]}>
                        {data.sales.map((s) => (
                            <tr key={s.name}>
                                <td className="py-2 pr-3 font-medium">{s.name}</td>
                                <td className="py-2 pr-3 text-right">{s.created}</td>
                                <td className="py-2 pr-3 text-right">{s.approved}</td>
                                <td className="py-2 pr-3 text-right">{pct(s.win_rate)}</td>
                                <td className="py-2 pr-3 text-right font-semibold">{formatKES(s.approved_value, true)}</td>
                                <td className="py-2 text-right">{s.avg_days_to_send === null ? "—" : `${s.avg_days_to_send}d`}</td>
                            </tr>
                        ))}
                    </Table>
                )
            ) : data.production.length === 0 ? <Empty>No jobs completed in this period.</Empty> : (
                <Table head={["Person", "Completed", "On time", "On-time rate"]}>
                    {data.production.map((p) => (
                        <tr key={p.name}>
                            <td className="py-2 pr-3 font-medium">{p.name}</td>
                            <td className="py-2 pr-3 text-right">{p.completed}</td>
                            <td className="py-2 pr-3 text-right">{p.on_time}</td>
                            <td className={`py-2 text-right font-semibold ${(p.on_time_rate ?? 100) < 80 ? "text-brand-red" : "text-brand-green"}`}>{pct(p.on_time_rate)}</td>
                        </tr>
                    ))}
                </Table>
            )}
        </Card>
    );
}

// 6 ── Vendors ────────────────────────────────────────────────────────────────
export function VendorCard({ data, basePath = "/admin" }: { data: DashboardInsights["vendors"]; basePath?: string }): ReactElement {
    const [view, setView] = useState<"spend" | "unpaid">("spend");
    return (
        <Card
            title="Vendor performance"
            subtitle={`${formatKES(data.total_spend, true)} spent in this period · ${data.overdue_orders} purchase order${data.overdue_orders === 1 ? "" : "s"} overdue now`}
            actions={<Segmented ariaLabel="Vendors" value={view} onChange={setView} options={[{ value: "spend", label: "Spend & lateness" }, { value: "unpaid", label: `Unpaid invoices (${data.unpaid_invoices.count})` }]} />}
            exportName={`vendors-${view}`}
            exportRows={(): Record<string, string | number | null>[] =>
                view === "spend"
                    ? data.vendors.map((v) => ({ Vendor: v.name, Spend: Math.round(v.spend), Orders: v.orders, Late: v.late, "Late %": v.late_rate, "Avg days late": v.avg_days_late }))
                    : data.unpaid_invoices.items.map((i) => ({ Invoice: i.ref, Vendor: i.vendor, Amount: Math.round(i.amount), Due: i.due, Status: i.status }))}
        >
            {view === "spend" ? (
                data.vendors.length === 0 ? <Empty>No purchase orders in this period.</Empty> : (
                    <Table head={["Vendor", "Spend", "Orders", "Late", "Avg late"]}>
                        {data.vendors.map((v) => (
                            <tr key={v.id}>
                                <td className="py-2 pr-3"><Link href={`${basePath}/vendors`} className="hover:text-brand-blue">{v.name}</Link></td>
                                <td className="py-2 pr-3 text-right font-semibold">{formatKES(v.spend, true)}</td>
                                <td className="py-2 pr-3 text-right">{v.orders}</td>
                                <td className={`py-2 pr-3 text-right ${(v.late_rate ?? 0) > 25 ? "font-semibold text-brand-red" : ""}`}>{v.late_rate === null ? "—" : `${v.late}/${v.completed}`}</td>
                                <td className="py-2 text-right">{v.avg_days_late ? `${v.avg_days_late}d` : "—"}</td>
                            </tr>
                        ))}
                    </Table>
                )
            ) : (
                <>
                    <p className="mb-2 text-sm text-gray-600">{formatKES(data.unpaid_invoices.total)} waiting to be paid</p>
                    {data.unpaid_invoices.items.length === 0 ? <Empty>All vendor invoices are paid.</Empty> : (
                        <Table head={["Invoice", "Amount", "Due", "Status"]}>
                            {data.unpaid_invoices.items.map((i) => (
                                <tr key={i.id}>
                                    <td className="py-2 pr-3"><span className="font-semibold">{i.ref}</span> <span className="text-gray-500">· {i.vendor}</span></td>
                                    <td className="py-2 pr-3 text-right font-semibold">{formatKES(i.amount)}</td>
                                    <td className={`py-2 pr-3 text-right ${i.due && new Date(i.due) < new Date() ? "font-semibold text-brand-red" : ""}`}>{fmtDate(i.due)}</td>
                                    <td className="py-2 text-right capitalize">{i.status}</td>
                                </tr>
                            ))}
                        </Table>
                    )}
                </>
            )}
        </Card>
    );
}

// 7 ── Leads & storefront ─────────────────────────────────────────────────────
export function FunnelCard({ data, basePath = "/admin" }: { data: DashboardInsights["funnel"]; basePath?: string }): ReactElement {
    const maxLeads = Math.max(1, ...data.leads.by_source.map((s) => s.leads));
    const sf = data.storefront;
    return (
        <Card
            title="Leads & storefront"
            subtitle="Where new business comes from in this period"
            exportName="lead-sources"
            exportRows={(): Record<string, string | number | null>[] => data.leads.by_source.map((s) => ({ Source: s.source, Leads: s.leads, Converted: s.converted, "Conversion %": s.conversion }))}
        >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="New leads" value={data.leads.total} />
                <Stat label="Converted" value={data.leads.converted} hint={`${pct(data.leads.conversion)} conversion`} tone={(data.leads.conversion ?? 0) >= 20 ? "up" : "neutral"} />
                <Stat label="Storefront requests" value={sf.requests} hint={`${sf.converted_to_quote} became quotes`} />
                <Stat label="Online quotes" value={sf.online_quotes} hint={`${sf.online_quotes_approved} approved`} />
            </div>
            <h3 className="mt-4 mb-2 text-sm font-semibold text-gray-900">Leads by source</h3>
            {data.leads.by_source.length === 0 ? <Empty>No leads in this period.</Empty> : (
                <ul className="space-y-2">
                    {data.leads.by_source.map((s) => (
                        <li key={s.source}>
                            <Link href={`${basePath}/leads`} className="block text-sm hover:text-brand-blue">
                                <div className="flex justify-between">
                                    <span>{s.source}</span>
                                    <span className="text-xs text-gray-500"><b className="text-gray-900">{s.leads}</b> leads · {pct(s.conversion)} converted</span>
                                </div>
                                <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-gray-100">
                                    <div className="h-full bg-brand-green" style={{ width: `${(s.converted / maxLeads) * 100}%` }} />
                                    <div className="h-full bg-brand-blue/40" style={{ width: `${((s.leads - s.converted) / maxLeads) * 100}%` }} />
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            <Link href={`${basePath}/quote-requests`} className="mt-4 inline-block text-xs font-semibold text-brand-blue hover:underline">Open storefront quote requests →</Link>
        </Card>
    );
}

// 8 ── Client health ──────────────────────────────────────────────────────────
export function ClientHealthCard({ data }: { data: DashboardInsights["clients"] }): ReactElement {
    const [view, setView] = useState<"top" | "quiet">("top");
    return (
        <Card
            title="Client health"
            subtitle="Who's buying, who's new, and who's gone quiet"
            actions={<Segmented ariaLabel="Clients" value={view} onChange={setView} options={[{ value: "top", label: "Top this month" }, { value: "quiet", label: `Gone quiet (${data.quiet_clients.length})` }]} />}
            exportName={`clients-${view}`}
            exportRows={(): Record<string, string | number>[] =>
                view === "top"
                    ? data.top_clients.map((c) => ({ Client: c.name, "This month": Math.round(c.this_month), "Last month": Math.round(c.last_month) }))
                    : data.quiet_clients.map((c) => ({ Client: c.name, "Last order": c.last_order, "Days quiet": c.days_quiet, "Lifetime value": Math.round(c.lifetime_value), Orders: c.orders }))}
        >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="New clients" value={data.new_clients} hint="added in period" />
                <Stat label="Buying clients" value={data.buying_clients} hint="placed orders" />
                <Stat label="Repeat" value={data.repeat_clients} hint="had ordered before" tone="up" />
                <Stat label="First-time buyers" value={data.first_time_buyers} />
            </div>
            <div className="mt-4">
                {view === "top" ? (
                    data.top_clients.length === 0 ? <Empty>No orders this month yet.</Empty> : (
                        <Table head={["Client", "This month", "Last month", "Change"]}>
                            {data.top_clients.map((c) => {
                                const ch = c.last_month ? ((c.this_month - c.last_month) / c.last_month) * 100 : null;
                                return (
                                    <tr key={c.id}>
                                        <td className="py-2 pr-3">{c.name}</td>
                                        <td className="py-2 pr-3 text-right font-semibold">{formatKES(c.this_month, true)}</td>
                                        <td className="py-2 pr-3 text-right text-gray-500">{formatKES(c.last_month, true)}</td>
                                        <td className={`py-2 text-right text-xs font-semibold ${ch === null ? "text-brand-blue" : ch >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                                            {ch === null ? "new" : `${ch >= 0 ? "▲" : "▼"} ${Math.abs(ch).toFixed(0)}%`}
                                        </td>
                                    </tr>
                                );
                            })}
                        </Table>
                    )
                ) : data.quiet_clients.length === 0 ? <Empty>No regular clients have gone quiet.</Empty> : (
                    <Table head={["Client", "Last order", "Lifetime", "Orders"]}>
                        {data.quiet_clients.map((c) => (
                            <tr key={c.id}>
                                <td className="py-2 pr-3">{c.name}</td>
                                <td className="py-2 pr-3 text-right"><span className={c.days_quiet > 120 ? "font-semibold text-brand-red" : "text-brand-orange"}>{c.days_quiet}d ago</span></td>
                                <td className="py-2 pr-3 text-right font-semibold">{formatKES(c.lifetime_value, true)}</td>
                                <td className="py-2 text-right">{c.orders}</td>
                            </tr>
                        ))}
                    </Table>
                )}
            </div>
        </Card>
    );
}

"use client";

import { type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchFinancials, fetchPortalQuotes } from "@/services/client-portal-extras";
import { fetchClientOrders } from "@/services/client-orders";
import {
    TrendingUp, ShoppingBag, FileText, CreditCard,
    AlertTriangle, ArrowRight, Package, Wallet,
} from "lucide-react";

function fmt(v: string | number) {
    return new Intl.NumberFormat("en-KE", {
        style: "currency", currency: "KES", minimumFractionDigits: 0,
    }).format(Number(v));
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function KPICard({
    label, value, icon: Icon, bg, iconColor, sub, subColor = "text-gray-400",
}: {
    label: string; value: string; icon: typeof TrendingUp;
    bg: string; iconColor: string; sub?: string; subColor?: string;
}) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
                <p className="text-xs font-medium text-gray-500 mt-1">{label}</p>
                {sub && <p className={`text-xs mt-0.5 ${subColor}`}>{sub}</p>}
            </div>
        </div>
    );
}

// ── Horizontal bar row ────────────────────────────────────────────────────────

function StatusRow({ label, count, total, color, dot }: {
    label: string; count: number; total: number; color: string; dot: string;
}) {
    const pct = total > 0 ? Math.max(2, Math.round((count / total) * 100)) : 0;
    return (
        <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
            <span className="text-xs text-gray-600 w-32 shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-6 text-right">{count}</span>
        </div>
    );
}

// ── Donut ring (CSS only) ─────────────────────────────────────────────────────

function DonutStat({ value, label, color }: { value: number; label: string; color: string }) {
    return (
        <div className="flex flex-col items-center gap-1">
            <div className={`w-3 h-3 rounded-full ${color}`} />
            <span className="text-lg font-bold text-gray-900">{value}</span>
            <span className="text-xs text-gray-400 text-center leading-tight">{label}</span>
        </div>
    );
}

// ── Empty state banner ────────────────────────────────────────────────────────

function EmptyBanner() {
    return (
        <div className="bg-gradient-to-br from-brand-blue to-brand-blue/80 rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -top-4 -left-4 w-24 h-24 rounded-full bg-white/5" />
            <div className="relative">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-1">Your analytics start here</h3>
                <p className="text-sm text-white/70 max-w-sm mb-5">
                    Place your first order and your spend, order history, and quote activity will all appear on this page automatically.
                </p>
                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/portal/cart"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-brand-blue text-sm font-semibold rounded-xl hover:bg-white/90 transition-colors"
                    >
                        <ShoppingBag className="w-4 h-4" /> Place an Order
                    </Link>
                    <Link
                        href="/portal/quotes"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-xl hover:bg-white/20 transition-colors"
                    >
                        View Quotes <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage(): ReactElement {
    const { data: fin, isLoading: finLoading } = useQuery({
        queryKey: ["portal-financials"],
        queryFn: fetchFinancials,
        staleTime: 60_000,
    });
    const { data: quotesData, isLoading: quotesLoading } = useQuery({
        queryKey: ["portal-quotes", "all"],
        queryFn: () => fetchPortalQuotes("all"),
        staleTime: 60_000,
    });
    const { data: ordersData, isLoading: ordersLoading } = useQuery({
        queryKey: ["client-orders"],
        queryFn: () => fetchClientOrders({}),
        staleTime: 60_000,
    });

    const summary = fin?.summary;
    const orders = ordersData?.results ?? [];
    const quotes = quotesData?.results ?? [];
    const hasAnyData = orders.length > 0 || quotes.length > 0 || Number(summary?.total_quoted ?? 0) > 0;

    const totalOrders = orders.length;
    const orderCounts: Record<string, number> = {
        submitted:    orders.filter(o => o.status === "submitted").length,
        acknowledged: orders.filter(o => o.status === "acknowledged").length,
        in_production:orders.filter(o => o.status === "in_production").length,
        ready:        orders.filter(o => o.status === "ready").length,
        shipped:      orders.filter(o => o.status === "shipped").length,
        delivered:    orders.filter(o => o.status === "delivered").length,
    };
    const activeOrders = orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length;

    const totalQuotes = quotes.length;
    const pendingQuotes    = quotes.filter(q => q.status === "Sent to Customer").length;
    const approvedQuotes   = quotes.filter(q => q.status === "Approved").length;
    const draftQuotes      = quotes.filter(q => q.status === "Draft").length;
    const lostQuotes       = quotes.filter(q => q.status === "Lost").length;

    const isLoading = finLoading || quotesLoading || ordersLoading;

    return (
        <>
            <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">

                {/* Page header */}
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-brand-blue" />
                        Analytics
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5">Print spend, order activity, and quote history</p>
                </div>

                {/* Empty state banner — only when no data */}
                {!isLoading && !hasAnyData && <EmptyBanner />}

                {/* KPI row — always visible */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {isLoading ? (
                        [...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-28 animate-pulse" />
                        ))
                    ) : (
                        <>
                            <KPICard
                                label="Total Quoted"
                                value={summary ? fmt(summary.total_quoted) : "KES 0"}
                                icon={FileText}
                                bg="bg-blue-100"
                                iconColor="text-blue-600"
                            />
                            <KPICard
                                label="Total Invoiced"
                                value={summary ? fmt(summary.total_invoiced) : "KES 0"}
                                icon={Wallet}
                                bg="bg-indigo-100"
                                iconColor="text-indigo-600"
                            />
                            <KPICard
                                label="Total Paid"
                                value={summary ? fmt(summary.total_paid) : "KES 0"}
                                icon={CreditCard}
                                bg="bg-green-100"
                                iconColor="text-green-600"
                            />
                            <KPICard
                                label="Outstanding"
                                value={summary ? fmt(summary.outstanding_balance) : "KES 0"}
                                icon={AlertTriangle}
                                bg={Number(summary?.outstanding_balance ?? 0) > 0 ? "bg-red-100" : "bg-gray-100"}
                                iconColor={Number(summary?.outstanding_balance ?? 0) > 0 ? "text-red-500" : "text-gray-400"}
                                sub={summary?.overdue_invoices ? `${summary.overdue_invoices} overdue invoice${summary.overdue_invoices !== 1 ? "s" : ""}` : undefined}
                                subColor="text-red-500"
                            />
                        </>
                    )}
                </div>

                {/* Orders + Quotes charts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                    {/* Orders by status */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-brand-blue/10 rounded-lg flex items-center justify-center">
                                        <Package className="w-4 h-4 text-brand-blue" />
                                    </div>
                                    <h2 className="text-sm font-semibold text-gray-800">Orders</h2>
                                </div>
                                <p className="text-xs text-gray-400 mt-1 ml-10">{totalOrders} total · {activeOrders} active</p>
                            </div>
                            <Link href="/portal/orders" className="text-xs text-brand-blue hover:underline flex items-center gap-0.5">
                                View all <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>

                        {totalOrders === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
                                    <ShoppingBag className="w-7 h-7 text-gray-300" />
                                </div>
                                <p className="text-sm font-medium text-gray-400">No orders yet</p>
                                <p className="text-xs text-gray-300 mt-0.5">Your order breakdown will appear here</p>
                                <Link href="/portal/cart" className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-blue font-medium hover:underline">
                                    Place your first order <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <StatusRow label="Submitted"    count={orderCounts.submitted}    total={totalOrders} color="bg-blue-400"   dot="bg-blue-400" />
                                <StatusRow label="Acknowledged" count={orderCounts.acknowledged} total={totalOrders} color="bg-indigo-400" dot="bg-indigo-400" />
                                <StatusRow label="In Production"count={orderCounts.in_production}total={totalOrders} color="bg-amber-400"  dot="bg-amber-400" />
                                <StatusRow label="Ready"        count={orderCounts.ready}        total={totalOrders} color="bg-purple-400" dot="bg-purple-400" />
                                <StatusRow label="Shipped"      count={orderCounts.shipped}      total={totalOrders} color="bg-orange-400" dot="bg-orange-400" />
                                <StatusRow label="Delivered"    count={orderCounts.delivered}    total={totalOrders} color="bg-green-500"  dot="bg-green-500" />
                            </div>
                        )}
                    </div>

                    {/* Quotes by status */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-purple-500" />
                                    </div>
                                    <h2 className="text-sm font-semibold text-gray-800">Quotes</h2>
                                </div>
                                <p className="text-xs text-gray-400 mt-1 ml-10">{totalQuotes} total · {pendingQuotes} awaiting approval</p>
                            </div>
                            <Link href="/portal/quotes" className="text-xs text-brand-blue hover:underline flex items-center gap-0.5">
                                View all <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>

                        {totalQuotes === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
                                    <FileText className="w-7 h-7 text-gray-300" />
                                </div>
                                <p className="text-sm font-medium text-gray-400">No quotes yet</p>
                                <p className="text-xs text-gray-300 mt-0.5">Quotes will appear once our team reviews your order</p>
                            </div>
                        ) : (
                            <>
                                {/* Dot stats */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-5 p-3 bg-gray-50 rounded-xl">
                                    <DonutStat value={draftQuotes}   label="Draft"    color="bg-gray-300" />
                                    <DonutStat value={pendingQuotes} label="Pending"  color="bg-blue-400" />
                                    <DonutStat value={approvedQuotes}label="Approved" color="bg-green-500" />
                                    <DonutStat value={lostQuotes}    label="Lost"     color="bg-red-400" />
                                </div>
                                <div className="space-y-3">
                                    <StatusRow label="Draft"            count={draftQuotes}    total={totalQuotes} color="bg-gray-300"  dot="bg-gray-300" />
                                    <StatusRow label="Pending approval" count={pendingQuotes}  total={totalQuotes} color="bg-blue-400"  dot="bg-blue-400" />
                                    <StatusRow label="Approved"         count={approvedQuotes} total={totalQuotes} color="bg-green-500" dot="bg-green-500" />
                                    <StatusRow label="Lost / Declined"  count={lostQuotes}     total={totalQuotes} color="bg-red-400"   dot="bg-red-400" />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Recent payments */}
                {fin?.recent_payments && fin.recent_payments.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                                <CreditCard className="w-4 h-4 text-green-600" />
                            </div>
                            <h2 className="text-sm font-semibold text-gray-800">Recent Payments</h2>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {fin.recent_payments.slice(0, 6).map((p) => (
                                <div key={p.id} className="flex items-center justify-between py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center shrink-0">
                                            <CreditCard className="w-3.5 h-3.5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">{fmt(p.amount)}</p>
                                            <p className="text-xs text-gray-400 capitalize">{p.method?.replace("_", " ") || "Payment"}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Paid</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {p.payment_date ? new Date(p.payment_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short" }) : "—"}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick actions — always visible */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { href: "/portal/cart",       icon: ShoppingBag, label: "Place an Order",    sub: "Browse catalog & build cart", bg: "bg-brand-blue/5",  text: "text-brand-blue" },
                        { href: "/portal/quotes",      icon: FileText,    label: "Review Quotes",     sub: "Approve pending quotes",      bg: "bg-purple-50",     text: "text-purple-600" },
                        { href: "/portal/financials",  icon: TrendingUp,  label: "View Financials",   sub: "Invoices & payment history",  bg: "bg-green-50",      text: "text-green-600" },
                    ].map(({ href, icon: Icon, label, sub, bg, text }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-3 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all ${bg} group`}
                        >
                            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                <Icon className={`w-4 h-4 ${text}`} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">{label}</p>
                                <p className="text-xs text-gray-400 truncate">{sub}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 ml-auto shrink-0 transition-colors" />
                        </Link>
                    ))}
                </div>

            </div>
        </>
    );
}

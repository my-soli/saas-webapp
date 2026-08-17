"use client";

import { useQuery } from "@tanstack/react-query";
import { SparklesIcon, StarIcon, ClockIcon, BarChart2Icon, Loader2Icon } from "lucide-react";
import AccountManagerLayout from "@/components/account-manager/account-manager-layout";
import { fetchLeadPriority, fetchQuoteInsights, fetchClientPatterns } from "@/services/analytics";

export default function AMInsightsPage() {
    const leadQuery = useQuery({
        queryKey: ["lead-priority"],
        queryFn: fetchLeadPriority,
        staleTime: 300_000,
    });

    const quoteQuery = useQuery({
        queryKey: ["quote-insights"],
        queryFn: fetchQuoteInsights,
        staleTime: 300_000,
    });

    const clientQuery = useQuery({
        queryKey: ["client-patterns"],
        queryFn: fetchClientPatterns,
        staleTime: 600_000,
    });

    const loading = leadQuery.isLoading || quoteQuery.isLoading || clientQuery.isLoading;

    return (
        <AccountManagerLayout>
            <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                        <SparklesIcon className="w-5 h-5 text-brand-blue" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">AI Insights</h1>
                        <p className="text-sm text-gray-500">Live data — lead priorities, cold quotes, client patterns</p>
                    </div>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2Icon className="w-6 h-6 text-brand-blue animate-spin" />
                    </div>
                )}

                {/* Lead Priority */}
                {leadQuery.data && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                            <StarIcon className="w-5 h-5 text-amber-500" />
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">Lead Priority Ranking</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Ranked by age, follow-up status, and value signals</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Lead</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Interest</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Age</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Follow-up</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {leadQuery.data.slice(0, 20).map((lead, i) => (
                                        <tr key={lead.lead_id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-gray-900">{lead.name}</p>
                                                {lead.company !== "—" && <p className="text-xs text-gray-500">{lead.company}</p>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${
                                                    lead.status === "Qualified" ? "bg-green-100 text-green-700" :
                                                    lead.status === "Contacted" ? "bg-blue-100 text-blue-700" :
                                                    "bg-gray-100 text-gray-600"
                                                }`}>{lead.status}</span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">{lead.product_interest}</td>
                                            <td className="px-4 py-3 text-right text-xs text-gray-500">{lead.age_days}d</td>
                                            <td className="px-4 py-3 text-right">
                                                {lead.follow_up_overdue ? (
                                                    <span className="text-xs font-semibold text-red-600">Overdue</span>
                                                ) : lead.follow_up_date ? (
                                                    <span className="text-xs text-gray-500">{lead.follow_up_date}</span>
                                                ) : (
                                                    <span className="text-xs text-gray-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-flex text-xs font-bold px-2 py-0.5 rounded ${
                                                    lead.priority_score >= 70 ? "bg-red-100 text-red-700" :
                                                    lead.priority_score >= 40 ? "bg-amber-100 text-amber-700" :
                                                    "bg-gray-100 text-gray-600"
                                                }`}>{lead.priority_score}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {leadQuery.data.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-10">No active leads.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Quote Pipeline */}
                {quoteQuery.data && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                            <ClockIcon className="w-5 h-5 text-brand-blue" />
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">Quote Pipeline</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Cold quotes and 30-day conversion stats</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Conversion stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-gray-50 rounded-xl">
                                    <p className="text-2xl font-bold text-gray-900">{quoteQuery.data.conversion_30d.total_sent}</p>
                                    <p className="text-xs text-gray-500 mt-1">Quotes sent (30d)</p>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-xl">
                                    <p className="text-2xl font-bold text-green-600">{quoteQuery.data.conversion_30d.approved}</p>
                                    <p className="text-xs text-gray-500 mt-1">Approved</p>
                                </div>
                                <div className="text-center p-4 bg-blue-50 rounded-xl">
                                    <p className="text-2xl font-bold text-brand-blue">{quoteQuery.data.conversion_30d.rate}%</p>
                                    <p className="text-xs text-gray-500 mt-1">Conversion rate</p>
                                </div>
                            </div>

                            {/* Cold quotes */}
                            {quoteQuery.data.cold_quotes.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                        Cold Quotes — Sent but no response in 7+ days ({quoteQuery.data.cold_quotes.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {quoteQuery.data.cold_quotes.map((q, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900">{q.quote_id}</p>
                                                    <p className="text-xs text-gray-500">{q.client}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{q.days_old}d old</span>
                                                    {q.expired && <p className="text-xs text-red-500 mt-1">Expired</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {quoteQuery.data.cold_quotes.length === 0 && (
                                <p className="text-sm text-green-600 text-center py-2">✓ No cold quotes right now.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Client Approval Patterns */}
                {clientQuery.data && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                            <BarChart2Icon className="w-5 h-5 text-purple-500" />
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">Client Approval Patterns</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Conversion rate and avg days to approve per client (last 12 months)</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Client</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Quotes</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Approved</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Rate</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Avg Days</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {clientQuery.data.map((c, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium text-gray-900">{c.client}</td>
                                            <td className="px-6 py-3 text-right text-gray-600">{c.quotes_12m}</td>
                                            <td className="px-6 py-3 text-right text-green-600 font-medium">{c.approved}</td>
                                            <td className="px-6 py-3 text-right">
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                    c.conversion_rate >= 70 ? "bg-green-100 text-green-700" :
                                                    c.conversion_rate >= 40 ? "bg-amber-100 text-amber-700" :
                                                    "bg-red-100 text-red-700"
                                                }`}>{c.conversion_rate}%</span>
                                            </td>
                                            <td className="px-6 py-3 text-right text-gray-500 text-xs">
                                                {c.avg_days_to_approve !== null ? `${c.avg_days_to_approve}d` : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {clientQuery.data.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-10">No quote data for the last 12 months.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AccountManagerLayout>
    );
}

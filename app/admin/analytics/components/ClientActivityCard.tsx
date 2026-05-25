"use client";

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line,
} from "recharts";
import { Users, Activity, MousePointerClick } from "lucide-react";
import { ClientActivityData } from "../types";

const ACTION_COLORS: Record<string, string> = {
    login: "#2563eb",
    invoice_viewed: "#7c3aed",
    invoice_downloaded: "#6d28d9",
    order_created: "#059669",
    order_updated: "#10b981",
    order_submitted: "#34d399",
    payment_made: "#0891b2",
    ticket_created: "#d97706",
    document_downloaded: "#ea580c",
    profile_updated: "#64748b",
};

interface Props {
    data: ClientActivityData;
}

export default function ClientActivityCard({ data }: Props) {
    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{data.total_portal_users}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Total portal users</p>
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Activity className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{data.active_last_n_days}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Active last {data.period_days} days</p>
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <MousePointerClick className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{data.total_actions}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Total actions ({data.period_days}d)</p>
                    </div>
                </div>
            </div>

            {/* Action breakdown + activity trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Action breakdown bar chart */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <h2 className="text-sm font-semibold text-gray-900">Actions by Type</h2>
                        <p className="text-xs text-gray-500 mt-0.5">What clients do most in the portal</p>
                    </div>
                    <div className="p-6">
                        {data.action_breakdown.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">No activity recorded yet.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={Math.max(160, data.action_breakdown.length * 40)}>
                                <BarChart data={data.action_breakdown} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} stroke="#d1d5db" allowDecimals={false} />
                                    <YAxis type="category" dataKey="label" tick={{ fill: "#374151", fontSize: 11 }} stroke="#d1d5db" width={130} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }}
                                        formatter={(v) => [`${v} actions`]}
                                    />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                        {data.action_breakdown.map((entry) => (
                                            <rect key={entry.action} fill={ACTION_COLORS[entry.action] ?? "#94a3b8"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Activity over time line chart */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <h2 className="text-sm font-semibold text-gray-900">Activity Trend</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Daily portal actions — last {data.period_days} days</p>
                    </div>
                    <div className="p-6">
                        {data.activity_over_time.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">No activity recorded yet.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={data.activity_over_time}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: "#6b7280", fontSize: 10 }}
                                        stroke="#d1d5db"
                                        tickFormatter={(v) => v.slice(5)}
                                    />
                                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} stroke="#d1d5db" allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }}
                                        formatter={(v) => [`${v} actions`]}
                                    />
                                    <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Top active clients table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="text-sm font-semibold text-gray-900">Most Active Clients</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Ranked by portal interactions in the last {data.period_days} days</p>
                </div>
                {data.top_active_clients.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No client activity recorded yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client ID</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.top_active_clients.map((client, i) => (
                                    <tr key={client.client_id || i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 text-gray-400 font-medium">{i + 1}</td>
                                        <td className="px-6 py-3 font-medium text-gray-900">{client.client_name}</td>
                                        <td className="px-6 py-3 text-gray-500 font-mono text-xs">{client.client_id || "—"}</td>
                                        <td className="px-6 py-3 text-right">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                {client.action_count}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right text-gray-500 text-xs">
                                            {client.last_active ?? "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

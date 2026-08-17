"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { OutstandingReceivables } from "../types";

interface Props {
    data: OutstandingReceivables;
}

export default function ReceivablesAgingChart({ data }: Props) {
    const agingData = [
        { label: "0–30 days", value: data.current, color: "#009444" },
        { label: "31–60 days", value: data.days_30_60, color: "#F6B619" },
        { label: "61–90 days", value: data.days_60_90, color: "#f97316" },
        { label: "90+ days", value: data.over_90, color: "#dc2626" },
    ];

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900">Receivables Aging</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{data.unpaid_invoices_count} unpaid invoices</p>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-500">Total Outstanding</div>
                    <div className="text-lg font-bold text-gray-900">
                        KES {data.total_receivables.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    {data.overdue_percentage > 0 && (
                        <div className="text-xs text-red-600 font-medium">{data.overdue_percentage}% overdue</div>
                    )}
                </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
                <BarChart data={agingData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis
                        type="number"
                        tick={{ fill: "#6b7280", fontSize: 11 }}
                        stroke="#d1d5db"
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis type="category" dataKey="label" tick={{ fill: "#374151", fontSize: 11 }} stroke="#d1d5db" width={80} />
                    <Tooltip
                        formatter={(v: unknown) => [`KES ${Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, "Amount"]}
                        contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {agingData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { RevenueByCategory } from "../types";

interface RevenueByCategoryChartProps {
    data: RevenueByCategory[];
}

export default function RevenueByCategoryChart({ data }: RevenueByCategoryChartProps) {
    const chartHeight = Math.max(260, data.length * 44);
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue by Category</h3>
            <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis
                        type="number"
                        tick={{ fill: "#6b7280", fontSize: 11 }}
                        stroke="#d1d5db"
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                        type="category"
                        dataKey="product_name"
                        tick={{ fill: "#374151", fontSize: 12 }}
                        stroke="#d1d5db"
                        width={180}
                    />
                    <Tooltip
                        formatter={(value: any) => [`KES ${(Number(value ?? 0)).toLocaleString()}`, "Revenue"]}
                        contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                    />
                    <Bar dataKey="revenue" fill="#093756" radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

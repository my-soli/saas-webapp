"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Download,
    FileText,
    CreditCard,
    Briefcase,
    Loader2,
    Table2,
    BarChart3,
    TrendingUp,
} from "lucide-react";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import AdminLayout from "@/components/admin/admin-layout";
import { toast } from "sonner";

type SourceType = "quotes" | "payments" | "jobs";
type ExportFormat = "csv" | "xlsx" | "pdf";
type VizType = "table" | "bar" | "trend";

interface SourceConfig {
    type: SourceType;
    label: string;
    description: string;
    icon: React.ElementType;
    iconColor: string;
    statusOptions: { value: string; label: string }[];
    // Column indices into the preview `headers`/`rows` arrays, used for the
    // client-side Bar/Trend aggregation (based on the same PREVIEW_ROW_CAP
    // rows the table shows — an approximation, not an exact aggregate).
    statusIndex: number;
    dateIndex: number;
}

const SOURCES: SourceConfig[] = [
    {
        type: "quotes",
        label: "Quotes",
        description: "Quote ID, client, status, total amount, dates, and assigned account manager.",
        icon: FileText,
        iconColor: "text-blue-500 bg-blue-50",
        statusOptions: [
            { value: "", label: "All Statuses" },
            { value: "Draft", label: "Draft" },
            { value: "Sent to PT", label: "Sent to PT" },
            { value: "Costed", label: "Costed" },
            { value: "Sent to Customer", label: "Sent to Customer" },
            { value: "Approved", label: "Approved" },
            { value: "Lost", label: "Lost" },
        ],
        statusIndex: 2,
        dateIndex: 4,
    },
    {
        type: "payments",
        label: "Payments",
        description: "Payment date, client, reference, LPO number, method, amount, and status.",
        icon: CreditCard,
        iconColor: "text-green-500 bg-green-50",
        statusOptions: [
            { value: "", label: "All Statuses" },
            { value: "completed", label: "Completed" },
            { value: "pending", label: "Pending" },
            { value: "failed", label: "Failed" },
            { value: "refunded", label: "Refunded" },
        ],
        statusIndex: 6,
        dateIndex: 0,
    },
    {
        type: "jobs",
        label: "Jobs",
        description: "Job number, name, client, status, start date, expected completion, and person in charge.",
        icon: Briefcase,
        iconColor: "text-purple-500 bg-purple-50",
        statusOptions: [
            { value: "", label: "All Statuses" },
            { value: "pending", label: "Pending" },
            { value: "in_progress", label: "In Progress" },
            { value: "on_hold", label: "On Hold" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
        ],
        statusIndex: 3,
        dateIndex: 4,
    },
];

const CHART_COLORS = ["#0B5CD5", "#F6B619", "#009444", "#ED1C24", "#7C3AED", "#0891B2"];

interface PreviewResponse {
    headers: string[];
    rows: (string | number | null)[][];
    total_count: number;
}

async function fetchPreview(type: SourceType, params: { status: string; dateFrom: string; dateTo: string }): Promise<PreviewResponse> {
    const query = new URLSearchParams({ type });
    if (params.status) query.set("status", params.status);
    if (params.dateFrom) query.set("date_from", params.dateFrom);
    if (params.dateTo) query.set("date_to", params.dateTo);
    const res = await fetch(`/api/proxy/api/v1/export/preview/?${query.toString()}`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Preview failed: ${res.status}`);
    return res.json();
}

async function downloadExport(type: SourceType, format: ExportFormat, params: { status: string; dateFrom: string; dateTo: string }) {
    const query = new URLSearchParams({ format });
    if (params.status) query.set("status", params.status);
    if (params.dateFrom) query.set("date_from", params.dateFrom);
    if (params.dateTo) query.set("date_to", params.dateTo);
    const url = `/api/proxy/api/v1/export/${type}/?${query.toString()}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = `${type}_export_${new Date().toISOString().split("T")[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(objUrl);
    document.body.removeChild(a);
}

export default function ReportsPage() {
    const [source, setSource] = useState<SourceConfig>(SOURCES[0]);
    const [status, setStatus] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [format, setFormat] = useState<ExportFormat>("csv");
    const [viz, setViz] = useState<VizType>("table");
    const [exporting, setExporting] = useState(false);

    const filters = { status, dateFrom, dateTo };

    const previewQuery = useQuery({
        queryKey: ["export-preview", source.type, status, dateFrom, dateTo],
        queryFn: () => fetchPreview(source.type, filters),
    });

    const chartData = useMemo(() => {
        if (!previewQuery.data) return [];
        const { rows } = previewQuery.data;
        if (viz === "bar") {
            const counts = new Map<string, number>();
            for (const row of rows) {
                const key = String(row[source.statusIndex] ?? "—") || "—";
                counts.set(key, (counts.get(key) ?? 0) + 1);
            }
            return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
        }
        if (viz === "trend") {
            const counts = new Map<string, number>();
            for (const row of rows) {
                const raw = String(row[source.dateIndex] ?? "");
                const day = raw.slice(0, 10) || "—";
                counts.set(day, (counts.get(day) ?? 0) + 1);
            }
            return Array.from(counts.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([name, value]) => ({ name, value }));
        }
        return [];
    }, [previewQuery.data, viz, source]);

    const handleSourceChange = (next: SourceConfig) => {
        setSource(next);
        setStatus("");
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            await downloadExport(source.type, format, filters);
        } catch {
            toast.error(`Failed to export ${source.label.toLowerCase()}.`);
        } finally {
            setExporting(false);
        }
    };

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 lg:py-6">
                    <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Exports</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Pick a data source, filter it, preview it as a table or chart, then export as CSV, Excel, or PDF.
                    </p>
                </div>
            </header>

            <main className="bg-gray-50 min-h-screen">
                <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">
                    {/* Data source picker */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {SOURCES.map((cfg) => {
                            const Icon = cfg.icon;
                            const active = cfg.type === source.type;
                            return (
                                <button
                                    key={cfg.type}
                                    type="button"
                                    onClick={() => handleSourceChange(cfg)}
                                    className={`text-left rounded-lg border p-4 transition-colors ${
                                        active ? "border-brand-blue ring-1 ring-brand-blue bg-white" : "border-gray-200 bg-white hover:border-gray-300"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconColor}`}>
                                            <Icon className="w-4.5 h-4.5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900">{cfg.label}</p>
                                            <p className="text-xs text-gray-500 truncate">{cfg.description}</p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Filters + format + viz + export */}
                    <div className="bg-white rounded-lg border border-gray-200 p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                >
                                    {source.statusOptions.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Format</label>
                                <select
                                    value={format}
                                    onChange={(e) => setFormat(e.target.value as ExportFormat)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                >
                                    <option value="csv">CSV</option>
                                    <option value="xlsx">Excel</option>
                                    <option value="pdf">PDF</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 w-fit">
                                {([
                                    { key: "table", label: "Table", icon: Table2 },
                                    { key: "bar", label: "Bar", icon: BarChart3 },
                                    { key: "trend", label: "Trend", icon: TrendingUp },
                                ] as const).map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setViz(key)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                            viz === key ? "bg-brand-blue text-white" : "text-gray-600 hover:bg-gray-50"
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleExport}
                                disabled={exporting}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-brand-blue text-white hover:bg-brand-blue/90 disabled:opacity-60 transition-colors"
                            >
                                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                {exporting ? "Generating…" : `Run & Export ${format.toUpperCase()}`}
                            </button>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-white rounded-lg border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-700">Preview</h3>
                            {previewQuery.data && (
                                <p className="text-xs text-gray-400">
                                    Showing {previewQuery.data.rows.length} of {previewQuery.data.total_count} matching rows
                                    {viz !== "table" ? " (chart reflects this preview sample, not the full export)" : ""}
                                </p>
                            )}
                        </div>

                        {previewQuery.isLoading && (
                            <div className="flex items-center justify-center py-16 text-gray-400">
                                <Loader2 className="w-5 h-5 animate-spin" />
                            </div>
                        )}

                        {previewQuery.isError && (
                            <p className="py-8 text-center text-sm text-red-500">Failed to load preview.</p>
                        )}

                        {previewQuery.data && previewQuery.data.rows.length === 0 && (
                            <p className="py-12 text-center text-sm text-gray-400">No matching records.</p>
                        )}

                        {previewQuery.data && previewQuery.data.rows.length > 0 && viz === "table" && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50">
                                            {previewQuery.data.headers.map((h) => (
                                                <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {previewQuery.data.rows.map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                {row.map((cell, j) => (
                                                    <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap">{cell ?? ""}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {previewQuery.data && previewQuery.data.rows.length > 0 && viz === "bar" && (
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#d1d5db" }} />
                                    <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#d1d5db" }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "0.5rem", fontSize: "0.875rem" }}
                                        cursor={{ fill: "#f3f4f6" }}
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                        {chartData.map((_entry, index) => (
                                            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}

                        {previewQuery.data && previewQuery.data.rows.length > 0 && viz === "trend" && (
                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#d1d5db" }} />
                                    <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#d1d5db" }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "0.5rem", fontSize: "0.875rem" }}
                                    />
                                    <Line type="monotone" dataKey="value" stroke="#0B5CD5" strokeWidth={2} dot={{ r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">About Reports</h3>
                        <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
                            <li>The full export (CSV/Excel/PDF) always reflects every matching record, regardless of the preview sample size shown above.</li>
                            <li>Leaving filters blank exports all records for that source.</li>
                            <li>Bar and Trend charts are drawn from the preview sample only — for large result sets, download the full export for exact totals.</li>
                            <li>Scheduled/recurring reports are not available yet.</li>
                        </ul>
                    </div>
                </div>
            </main>
        </AdminLayout>
    );
}

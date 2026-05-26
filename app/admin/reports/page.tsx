"use client";

import { useState } from "react";
import { Download, FileText, CreditCard, Briefcase, Loader2, CheckCircle2 } from "lucide-react";
import AdminLayout from "@/components/admin/admin-layout";
import { toast } from "sonner";

type ExportType = "quotes" | "payments" | "jobs";

interface ExportConfig {
    type: ExportType;
    label: string;
    description: string;
    icon: React.ElementType;
    iconColor: string;
    statusOptions: { value: string; label: string }[];
}

const EXPORT_CONFIGS: ExportConfig[] = [
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
    },
];

interface ExportPanelState {
    status: string;
    dateFrom: string;
    dateTo: string;
    loading: boolean;
    done: boolean;
}

const defaultPanelState = (): ExportPanelState => ({
    status: "",
    dateFrom: "",
    dateTo: "",
    loading: false,
    done: false,
});

async function downloadCsv(type: ExportType, params: { status: string; dateFrom: string; dateTo: string }) {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.dateFrom) query.set("date_from", params.dateFrom);
    if (params.dateTo) query.set("date_to", params.dateTo);
    const qs = query.toString();
    const url = `/api/proxy/api/v1/export/${type}/${qs ? `?${qs}` : ""}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = `${type}_export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(objUrl);
    document.body.removeChild(a);
}

function ExportCard({ config }: { config: ExportConfig }) {
    const [state, setState] = useState<ExportPanelState>(defaultPanelState());
    const Icon = config.icon;

    const handleExport = async () => {
        setState((s) => ({ ...s, loading: true, done: false }));
        try {
            await downloadCsv(config.type, { status: state.status, dateFrom: state.dateFrom, dateTo: state.dateTo });
            setState((s) => ({ ...s, loading: false, done: true }));
            setTimeout(() => setState((s) => ({ ...s, done: false })), 3000);
        } catch {
            toast.error(`Failed to export ${config.label.toLowerCase()}.`);
            setState((s) => ({ ...s, loading: false }));
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start gap-4 mb-5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.iconColor}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-base font-semibold text-gray-900">{config.label} Export</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{config.description}</p>
                </div>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select
                        value={state.status}
                        onChange={(e) => setState((s) => ({ ...s, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    >
                        {config.statusOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
                        <input
                            type="date"
                            value={state.dateFrom}
                            onChange={(e) => setState((s) => ({ ...s, dateFrom: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
                        <input
                            type="date"
                            value={state.dateTo}
                            onChange={(e) => setState((s) => ({ ...s, dateTo: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                        />
                    </div>
                </div>

                {(state.status || state.dateFrom || state.dateTo) && (
                    <button
                        onClick={() => setState(defaultPanelState())}
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        Clear filters
                    </button>
                )}

                <button
                    onClick={handleExport}
                    disabled={state.loading || state.done}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        state.done
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-brand-blue text-white hover:bg-brand-blue/90 disabled:opacity-60"
                    }`}
                >
                    {state.loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating CSV…
                        </>
                    ) : state.done ? (
                        <>
                            <CheckCircle2 className="w-4 h-4" />
                            Downloaded!
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4" />
                            Download CSV
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

export default function ReportsPage() {
    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 lg:py-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Exports</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Download CSV exports for quotes, payments, and jobs — filtered by status and date range.
                        </p>
                    </div>
                </div>
            </header>

            <main className="bg-gray-50 min-h-screen">
                <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {EXPORT_CONFIGS.map((config) => (
                            <ExportCard key={config.type} config={config} />
                        ))}
                    </div>

                    <div className="mt-8 bg-white rounded-lg border border-gray-200 p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">About Exports</h3>
                        <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
                            <li>All exports are in CSV format and can be opened in Excel or Google Sheets.</li>
                            <li>Leaving filters blank exports all records for that type.</li>
                            <li>Date filters apply to the creation date for quotes and jobs, and payment date for payments.</li>
                            <li>Exports are generated in real-time and reflect the latest data.</li>
                        </ul>
                    </div>
                </div>
            </main>
        </AdminLayout>
    );
}

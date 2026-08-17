"use client";

import { useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import AdminLayout from "@/components/admin/admin-layout";
import SearchableSelect from "@/components/admin/searchable-select";
import StatusPill, { type StatusPillTone } from "@/components/admin/status-pill";
import { ArrowLeft, Download, FileText } from "lucide-react";
import {
    fetchClientOptions,
    fetchCustomerStatement,
    getStatementPdfUrl,
} from "@/services/customer-statements";

const SOURCE_LABEL: Record<string, string> = {
    client_invoice: "Invoice",
    client_payment: "Payment",
    financial_invoice: "Invoice (New)",
    financial_invoice_payment: "Payment (New)",
};

const STATUS_TONE: Record<string, StatusPillTone> = {
    draft: "neutral", issued: "warning", overdue: "danger", paid: "success", cancelled: "neutral",
    pending: "warning", processing: "warning", completed: "success", failed: "danger", refunded: "neutral",
    sent: "warning", void: "neutral",
};

export default function CustomerStatementsPage(): ReactElement {
    const [clientId, setClientId] = useState<number | null>(null);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const { data: clients = [] } = useQuery({ queryKey: ["client-options"], queryFn: fetchClientOptions });
    const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));

    const { data: statement, isLoading, isError } = useQuery({
        queryKey: ["customer-statement", clientId, startDate, endDate],
        queryFn: () => fetchCustomerStatement(clientId as number, startDate || undefined, endDate || undefined),
        enabled: clientId !== null,
    });

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 lg:py-6">
                    <Link href="/admin/financial" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-1">
                        <ArrowLeft className="w-3.5 h-3.5" /> Invoices
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Customer Statements</h1>
                    <p className="mt-1 text-sm text-gray-500">A running ledger of invoices and payments per client</p>
                </div>
            </header>

            <div className="p-4 lg:p-8 space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                        <div className="sm:col-span-2 space-y-1">
                            <label className="text-sm font-medium text-gray-700">Client</label>
                            <SearchableSelect
                                options={clientOptions}
                                value={clientId}
                                onChange={(v) => setClientId(Number(v))}
                                placeholder="Select a client…"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">From</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">To</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                        </div>
                    </div>
                </div>

                {clientId === null && (
                    <div className="text-center py-20">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">Select a client to view their statement</p>
                    </div>
                )}

                {clientId !== null && isLoading && <div className="text-center py-16 text-gray-400 text-sm">Loading statement…</div>}
                {clientId !== null && isError && <div className="text-center py-16 text-gray-500 text-sm">Failed to load statement.</div>}

                {statement && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="grid grid-cols-3 gap-4 flex-1 max-w-xl">
                                <div className="bg-white rounded-xl border border-gray-200 p-4">
                                    <p className="text-xs text-gray-400 uppercase tracking-wide">Total Invoiced</p>
                                    <p className="mt-1 text-lg font-bold text-gray-900">KES {statement.summary.total_invoiced.toLocaleString()}</p>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-200 p-4">
                                    <p className="text-xs text-gray-400 uppercase tracking-wide">Total Paid</p>
                                    <p className="mt-1 text-lg font-bold text-gray-900">KES {statement.summary.total_paid.toLocaleString()}</p>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-200 p-4">
                                    <p className="text-xs text-gray-400 uppercase tracking-wide">Balance</p>
                                    <p className="mt-1 text-lg font-bold text-gray-900">KES {statement.summary.balance.toLocaleString()}</p>
                                </div>
                            </div>
                            <a
                                href={getStatementPdfUrl(clientId as number, startDate || undefined, endDate || undefined)}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                            >
                                <Download className="w-4 h-4" /> Download PDF
                            </a>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                                        <th className="px-4 py-3 font-medium">Date</th>
                                        <th className="px-4 py-3 font-medium">Description</th>
                                        <th className="px-4 py-3 font-medium">Reference</th>
                                        <th className="px-4 py-3 font-medium">Type</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium text-right">Debit</th>
                                        <th className="px-4 py-3 font-medium text-right">Credit</th>
                                        <th className="px-4 py-3 font-medium text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {statement.transactions.length === 0 && (
                                        <tr><td colSpan={8} className="text-center py-10 text-gray-400">No transactions in this period.</td></tr>
                                    )}
                                    {statement.transactions.map((t, i) => (
                                        <tr key={i} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-3 text-gray-500">{t.date}</td>
                                            <td className="px-4 py-3 text-gray-900">
                                                {(t.source === "financial_invoice" || t.source === "financial_invoice_payment") && t.source_id ? (
                                                    <Link href={`/admin/financial/${t.source_id}/edit`} className="text-brand-blue hover:underline">
                                                        {t.description}
                                                    </Link>
                                                ) : t.description}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 font-mono text-xs">{t.reference}</td>
                                            <td className="px-4 py-3 text-gray-500">{SOURCE_LABEL[t.source] ?? t.source}</td>
                                            <td className="px-4 py-3">
                                                <StatusPill label={t.status} tone={STATUS_TONE[t.status] ?? "neutral"} />
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-900">{t.debit ? t.debit.toLocaleString() : "—"}</td>
                                            <td className="px-4 py-3 text-right text-gray-900">{t.credit ? t.credit.toLocaleString() : "—"}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-900">{t.balance.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

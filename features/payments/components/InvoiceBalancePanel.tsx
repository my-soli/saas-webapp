"use client";

import type { ReactElement } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";
import { applyInvoiceCredit, type FinancialInvoice } from "@/services/financial-invoices";

const kes = (n: number): string =>
    `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

/** Ribbon label + colour, Zoho-style. */
function ribbonFor(invoice: FinancialInvoice): { label: string; cls: string } {
    if (invoice.status === "void") return { label: "Void", cls: "bg-gray-400" };
    if (invoice.payment_status === "paid") return { label: "Paid", cls: "bg-brand-green" };
    if (invoice.payment_status === "partially_paid") return { label: "Partially Paid", cls: "bg-brand-orange" };
    if (invoice.effective_status === "overdue") return { label: "Overdue", cls: "bg-brand-red" };
    if (invoice.status === "draft") return { label: "Draft", cls: "bg-gray-400" };
    return { label: "Unpaid", cls: "bg-brand-blue" };
}

/**
 * Payment summary shown at the top of an invoice: status ribbon, Balance Due,
 * Payment Made / Credits Applied / Balance Due rows, the payments received, and
 * the client's available credit with an Apply button.
 */
export default function InvoiceBalancePanel({ invoice }: { invoice: FinancialInvoice }): ReactElement {
    const queryClient = useQueryClient();
    const total = parseFloat(invoice.total) || 0;
    const received = invoice.payments_received ?? invoice.amount_paid ?? 0;
    const overpaid = invoice.overpayment_credited ?? 0;
    const paymentMade = received - overpaid;
    const creditApplied = invoice.credit_applied ?? 0;
    const balance = Math.max(invoice.balance_due ?? 0, 0);
    const creditAvailable = invoice.client_credit_available ?? 0;
    const payments = invoice.payments ?? [];
    const ribbon = ribbonFor(invoice);
    const canApplyCredit = invoice.status !== "void" && balance > 0 && creditAvailable > 0;

    const applyMutation = useMutation({
        mutationFn: () => applyInvoiceCredit(invoice.id),
        onSuccess: (res) => {
            toast.success(`${kes(res.applied)} credit applied to ${invoice.invoice_number}`);
            void queryClient.invalidateQueries({ queryKey: ["financial-invoice", invoice.id] });
            void queryClient.invalidateQueries({ queryKey: ["financial-invoices"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    return (
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white">
            {/* Corner ribbon */}
            <div className="pointer-events-none absolute -left-10 top-5 w-40 -rotate-45 text-center">
                <span className={`block py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow ${ribbon.cls}`}>
                    {ribbon.label}
                </span>
            </div>

            <div className="grid grid-cols-1 gap-6 px-6 py-5 pl-20 md:grid-cols-[1fr_auto]">
                {/* Payments received */}
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-gray-900">Payments received</h2>
                    {payments.length === 0 && creditApplied === 0 ? (
                        <p className="mt-2 text-sm text-gray-500">No payments recorded yet.</p>
                    ) : (
                        <div className="mt-2 overflow-x-auto">
                            <table className="w-full min-w-[420px] text-sm">
                                <thead>
                                    <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                                        <th className="py-1.5 pr-3 font-medium">Date</th>
                                        <th className="py-1.5 pr-3 font-medium">Method</th>
                                        <th className="py-1.5 pr-3 font-medium">Reference</th>
                                        <th className="py-1.5 text-right font-medium">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {payments.map((p) => (
                                        <tr key={p.id}>
                                            <td className="py-1.5 pr-3 text-gray-700">{formatDate(p.payment_date)}</td>
                                            <td className="py-1.5 pr-3 text-gray-700">{p.payment_method_display}</td>
                                            <td className="py-1.5 pr-3 font-mono text-xs text-gray-500">{p.reference_number || "—"}</td>
                                            <td className="py-1.5 text-right font-medium text-gray-900">{kes(p.amount)}</td>
                                        </tr>
                                    ))}
                                    {creditApplied > 0 && (
                                        <tr>
                                            <td className="py-1.5 pr-3 text-gray-700" colSpan={3}>Client credit applied</td>
                                            <td className="py-1.5 text-right font-medium text-gray-900">{kes(creditApplied)}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {overpaid > 0 && (
                        <p className="mt-3 rounded-lg border border-brand-green/30 bg-brand-green/5 px-3 py-2 text-xs text-gray-700">
                            The client paid <span className="font-semibold">{kes(overpaid)}</span> more than this invoice. It&apos;s kept as
                            credit on their account and can be applied to their next invoice.
                        </p>
                    )}

                    {canApplyCredit && (
                        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-brand-blue/20 bg-brand-blue/5 px-3 py-2">
                            <Wallet className="h-4 w-4 text-brand-blue" />
                            <span className="text-sm text-gray-700">
                                This client has <span className="font-semibold">{kes(creditAvailable)}</span> credit available.
                            </span>
                            <button
                                type="button"
                                onClick={() => applyMutation.mutate()}
                                disabled={applyMutation.isPending}
                                className="ml-auto flex items-center gap-1.5 rounded-md bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-60"
                            >
                                {applyMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Apply {kes(Math.min(creditAvailable, balance))}
                            </button>
                        </div>
                    )}
                </div>

                {/* Balance summary */}
                <div className="md:w-72">
                    <div className="text-right">
                        <p className="text-xs font-semibold text-gray-500">Balance Due</p>
                        <p className={`text-2xl font-bold ${balance > 0 ? "text-gray-900" : "text-brand-green"}`}>{kes(balance)}</p>
                    </div>
                    <dl className="mt-4 space-y-1.5 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Total</dt>
                            <dd className="font-medium text-gray-900">{kes(total)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Payment Made</dt>
                            <dd className="font-medium text-brand-red">(-) {kes(paymentMade)}</dd>
                        </div>
                        {creditApplied > 0 && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Credits Applied</dt>
                                <dd className="font-medium text-brand-red">(-) {kes(creditApplied)}</dd>
                            </div>
                        )}
                        <div className="flex justify-between rounded-md bg-gray-50 px-2 py-1.5 font-semibold">
                            <dt className="text-gray-900">Balance Due</dt>
                            <dd className="text-gray-900">{kes(balance)}</dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    );
}

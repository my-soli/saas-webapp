"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Mail, Phone } from "lucide-react";
import confetti from "canvas-confetti";
import { fetchQuoteByToken, acceptQuoteByToken, rejectQuoteByToken } from "@/services/quotes";
import type { Quote } from "@/types/quotes";

export default function QuoteAcceptancePage() {
    const params = useParams();
    const token = params.token as string;

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [accepted, setAccepted] = useState(false);
    const [rejected, setRejected] = useState(false);

    const { data: quote, isLoading, error } = useQuery({
        queryKey: ["quote-public", token],
        queryFn: () => fetchQuoteByToken(token),
        enabled: !!token,
        retry: 1,
    });

    const acceptMutation = useMutation({
        mutationFn: () => acceptQuoteByToken(token),
        onSuccess: () => {
            setAccepted(true);
            confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.6 },
                colors: ["#1a56db", "#f5a623", "#22c55e", "#f59e0b"],
                scalar: 0.9,
                ticks: 150,
            });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: (reason: string) => rejectQuoteByToken(token, reason),
        onSuccess: () => {
            setRejected(true);
            setShowRejectModal(false);
        },
    });

    const formatCurrency = (value: number | null | string) => {
        const num = value === null ? null : Number(value);
        if (num === null || isNaN(num)) return "N/A";
        return new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency: "KES",
            maximumFractionDigits: 2,
        }).format(num);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">Loading quote...</p>
                </div>
            </div>
        );
    }

    if (error || !quote) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                    <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Quote Not Found</h1>
                    <p className="text-gray-500 text-sm mb-6">
                        This quote link is invalid or has expired. Please contact us for assistance.
                    </p>
                    <div className="space-y-2 text-sm text-gray-400">
                        <p className="flex items-center justify-center gap-2">
                            <Mail className="w-4 h-4" /> info@printduka.co.ke
                        </p>
                        <p className="flex items-center justify-center gap-2">
                            <Phone className="w-4 h-4" /> +254 795 332 766
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (accepted) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote Accepted!</h1>
                    <p className="text-gray-500 text-sm mb-6">
                        Thank you! Our team will contact you shortly to proceed with your order.
                    </p>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-3 inline-block mb-4">
                        <p className="text-xs text-gray-400 mb-0.5">Quote Reference</p>
                        <p className="text-lg font-mono font-bold text-gray-900">{quote.quote_id}</p>
                    </div>
                    <p className="text-xs text-gray-400">You will receive a confirmation email shortly.</p>
                </div>
            </div>
        );
    }

    if (rejected) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                    <XCircle className="w-14 h-14 text-gray-400 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Quote Declined</h1>
                    <p className="text-gray-500 text-sm">
                        We've received your response. If you change your mind, please don't hesitate to reach out.
                    </p>
                </div>
            </div>
        );
    }

    const canAccept = quote.status === "Sent to Customer" || quote.status === "Costed";
    const alreadyProcessed = quote.status === "Approved" || quote.status === "Lost";

    const subtotal = quote.line_items
        ? quote.line_items.reduce((sum, item) => sum + Number(item.unit_price) * item.quantity, 0)
        : 0;
    const vatAmount = quote.include_vat
        ? subtotal * ((quote.tax_rate ?? 16) / 100)
        : 0;
    const total = quote.total_amount ? Number(quote.total_amount) : subtotal + vatAmount;

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4">
            {/* Centered document card */}
            <div className="max-w-3xl mx-auto">
                {alreadyProcessed && (
                    <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800 font-medium">
                        This quote has already been {quote.status === "Approved" ? "accepted" : "declined"}.
                    </div>
                )}

                <div className="bg-white shadow-md rounded-xl overflow-hidden">
                    {/* Document body — styled like PDF */}
                    <div className="px-10 pt-8 pb-6">

                        {/* ── Header row: company name left, QUOTE + ref right ── */}
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="text-base font-bold text-gray-900 leading-tight">Print Duka Ltd</p>
                                <p className="text-xs text-gray-500 mt-0.5">Nairobi, Kenya</p>
                                <p className="text-xs text-gray-500">+254 795 332 766</p>
                                <p className="text-xs text-gray-500">info@printduka.co.ke</p>
                            </div>
                            <div className="text-right">
                                <p className="text-4xl font-light tracking-widest text-gray-800 leading-none">QUOTE</p>
                                <p className="text-sm text-gray-500 mt-1 font-mono">#{quote.quote_id}</p>
                            </div>
                        </div>

                        <hr className="border-gray-200 mb-4" />

                        {/* ── Bill To / Dates ── */}
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Bill To</p>
                                <p className="text-sm font-bold text-gray-900">
                                    {quote.client_name || quote.lead_name || "—"}
                                </p>
                                {(quote as any).recipient_pin && (
                                    <p className="text-xs text-gray-500 mt-0.5">PIN {(quote as any).recipient_pin}</p>
                                )}
                            </div>
                            <div className="text-right text-sm text-gray-700 space-y-1">
                                <p>
                                    <span className="text-gray-400 text-xs">Issue Date: </span>
                                    {formatDate(quote.quote_date)}
                                </p>
                                <p>
                                    <span className="text-gray-400 text-xs">Expiry Date: </span>
                                    {formatDate(quote.valid_until)}
                                </p>
                                {quote.payment_terms && (
                                    <p>
                                        <span className="text-gray-400 text-xs">Payment Terms: </span>
                                        {quote.payment_terms}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* ── Line items table ── */}
                        <table className="w-full text-sm mb-0">
                            <thead>
                                <tr className="border-t border-b border-gray-300">
                                    <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600 w-8">#</th>
                                    <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600">Item &amp; Description</th>
                                    <th className="text-right py-2 px-2 text-xs font-semibold text-gray-600 w-16">Qty</th>
                                    <th className="text-right py-2 px-2 text-xs font-semibold text-gray-600 w-24">Rate</th>
                                    {quote.include_vat && (
                                        <th className="text-right py-2 px-2 text-xs font-semibold text-gray-600 w-20">VAT</th>
                                    )}
                                    <th className="text-right py-2 px-2 text-xs font-semibold text-gray-600 w-28">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quote.line_items && quote.line_items.length > 0 ? (
                                    quote.line_items.map((item, index) => {
                                        const lineTotal = Number(item.unit_price) * item.quantity;
                                        const lineVat = quote.include_vat
                                            ? lineTotal * ((quote.tax_rate ?? 16) / 100)
                                            : 0;
                                        return (
                                            <tr key={item.id} className="border-b border-gray-100">
                                                <td className="py-2.5 px-2 text-gray-500 align-top">{index + 1}</td>
                                                <td className="py-2.5 px-2 align-top">
                                                    <p className="font-medium text-gray-900">{item.product_name}</p>
                                                    {item.customization_level_snapshot && (
                                                        <p className="text-xs text-gray-400 mt-0.5">{item.customization_level_snapshot}</p>
                                                    )}
                                                    {(item as any).description && (
                                                        <p className="text-xs text-gray-400 mt-0.5 whitespace-pre-wrap">{(item as any).description}</p>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-2 text-right text-gray-700 align-top">{item.quantity}</td>
                                                <td className="py-2.5 px-2 text-right text-gray-700 align-top">
                                                    {formatCurrency(Number(item.unit_price))}
                                                </td>
                                                {quote.include_vat && (
                                                    <td className="py-2.5 px-2 text-right text-gray-700 align-top">
                                                        {formatCurrency(lineVat)}
                                                        <span className="block text-xs text-gray-400">{quote.tax_rate ?? 16}%</span>
                                                    </td>
                                                )}
                                                <td className="py-2.5 px-2 text-right font-medium text-gray-900 align-top">
                                                    {formatCurrency(lineTotal + (quote.include_vat ? lineVat : 0))}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={quote.include_vat ? 6 : 5} className="py-8 text-center text-gray-400 text-sm">
                                            No items found
                                        </td>
                                    </tr>
                                )}

                                {/* Sub Total */}
                                <tr className="border-t border-gray-200">
                                    <td colSpan={quote.include_vat ? 4 : 3} />
                                    <td className="py-2 px-2 text-right text-sm font-semibold text-gray-700">Sub Total</td>
                                    {quote.include_vat && <td />}
                                    <td className="py-2 px-2 text-right text-sm text-gray-700">{formatCurrency(subtotal)}</td>
                                </tr>

                                {/* VAT row */}
                                {quote.include_vat && (
                                    <tr>
                                        <td colSpan={4} />
                                        <td className="py-1 px-2 text-right text-sm text-gray-600">VAT ({quote.tax_rate ?? 16}%)</td>
                                        <td />
                                        <td className="py-1 px-2 text-right text-sm text-gray-600">{formatCurrency(vatAmount)}</td>
                                    </tr>
                                )}

                                {/* Shipping */}
                                {quote.shipping_charges && Number(quote.shipping_charges) > 0 && (
                                    <tr>
                                        <td colSpan={quote.include_vat ? 4 : 3} />
                                        <td className="py-1 px-2 text-right text-sm text-gray-600">Shipping</td>
                                        {quote.include_vat && <td />}
                                        <td className="py-1 px-2 text-right text-sm text-gray-600">{formatCurrency(Number(quote.shipping_charges))}</td>
                                    </tr>
                                )}

                                {/* Total */}
                                <tr className="border-t-2 border-b-2 border-gray-700">
                                    <td colSpan={quote.include_vat ? 4 : 3} />
                                    <td className="py-2.5 px-2 text-right text-base font-bold text-gray-900">Total</td>
                                    {quote.include_vat && <td />}
                                    <td className="py-2.5 px-2 text-right text-base font-bold text-gray-900">
                                        KES {total.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Notes & Terms */}
                    {(quote.customer_notes || quote.custom_terms) && (
                        <div className="px-10 py-5 border-t border-gray-100 space-y-4">
                            {quote.customer_notes && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.customer_notes}</p>
                                </div>
                            )}
                            {quote.custom_terms && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Terms &amp; Conditions</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.custom_terms}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action buttons */}
                    {!alreadyProcessed && canAccept && (
                        <div className="px-10 py-5 bg-gray-50 border-t border-gray-200">
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <button
                                    onClick={() => acceptMutation.mutate()}
                                    disabled={acceptMutation.isPending}
                                    className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    {acceptMutation.isPending ? "Processing..." : "Accept Quote"}
                                </button>
                                <button
                                    onClick={() => setShowRejectModal(true)}
                                    disabled={rejectMutation.isPending}
                                    className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <XCircle className="w-5 h-5" />
                                    Decline Quote
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Contact footer */}
                <div className="mt-6 text-center text-xs text-gray-400 space-y-1">
                    <p>Questions? Contact us:</p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <a href="mailto:info@printduka.co.ke" className="flex items-center gap-1 hover:text-brand-blue">
                            <Mail className="w-3.5 h-3.5" /> info@printduka.co.ke
                        </a>
                        <a href="tel:+254795332766" className="flex items-center gap-1 hover:text-brand-blue">
                            <Phone className="w-3.5 h-3.5" /> +254 795 332 766
                        </a>
                    </div>
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="border-b border-gray-200 p-4">
                            <h3 className="text-base font-semibold text-gray-900">Decline Quote</h3>
                        </div>
                        <div className="p-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason (Optional)
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Please let us know why you're declining..."
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none text-sm"
                            />
                        </div>
                        <div className="border-t border-gray-200 p-4 flex gap-3 justify-end">
                            <button
                                onClick={() => { setShowRejectModal(false); setRejectReason(""); }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => rejectMutation.mutate(rejectReason)}
                                disabled={rejectMutation.isPending}
                                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {rejectMutation.isPending ? "Processing..." : "Decline Quote"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

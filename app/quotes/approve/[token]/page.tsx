"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DownloadIcon } from "lucide-react";

interface LineItem {
    id: number;
    product_name: string;
    description?: string;
    quantity: number;
    unit_price: string | number;
    line_total: string | number;
}

interface PublicQuoteDetail {
    quote_id: string;
    line_items: LineItem[];
    total_amount: string | number | null;
    include_vat: boolean;
    tax_rate: number | null;
    quote_date: string;
    valid_until: string;
    payment_terms: string;
    customer_notes?: string;
    custom_terms?: string;
    payment_options?: string;
    status: string;
    client_name?: string;
    client_email?: string;
    recipient_pin?: string;
    company_name?: string;
    company_pin?: string;
    company_website?: string;
    company_phone?: string;
    company_address?: string;
    company_email?: string;
    company_logo_b64?: string;
    token_used?: boolean;
}

const fmtNum = (n: string | number | null | undefined) => {
    const num = typeof n === "string" ? parseFloat(n) : (n ?? 0);
    return (isNaN(num) ? 0 : num).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmt = (n: string | number | null | undefined) => `KES ${fmtNum(n)}`;

const fmtDate = (s: string | undefined | null) => {
    if (!s) return "—";
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
};

export default function QuoteApprovePage() {
    const params = useParams();
    const token = params.token as string;

    const [quote, setQuote] = useState<PublicQuoteDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [action, setAction] = useState<"accept" | "adjust" | "reject" | null>(null);
    const [notes, setNotes] = useState("");
    const [approvedBy, setApprovedBy] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState<{ type: string; message: string } | null>(null);
    const [downloading, setDownloading] = useState(false);

    const handleDownloadPDF = async () => {
        setDownloading(true);
        try {
            const res = await fetch(`/api/proxy/api/v1/quotes/public/${token}/pdf/`);
            if (!res.ok) throw new Error("Could not generate PDF");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `quote_${quote?.quote_id ?? token}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert("PDF download failed. Please try again.");
        } finally {
            setDownloading(false);
        }
    };

    useEffect(() => {
        if (!token) return;
        fetch(`/api/proxy/api/v1/quotes/public/${token}/`, { cache: "no-store" })
            .then(async (res) => {
                if (!res.ok) {
                    const body = await res.json().catch(() => ({})) as { detail?: string };
                    throw new Error(body.detail || "This link is invalid or has expired.");
                }
                return res.json() as Promise<PublicQuoteDetail>;
            })
            .then((data) => { setQuote(data); setLoading(false); })
            .catch((err: Error) => { setError(err.message); setLoading(false); });
    }, [token]);

    const post = async (path: string, body?: Record<string, string>) => {
        const res = await fetch(`/api/proxy/api/v1/quotes/public/${token}/${path}/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({})) as { detail?: string };
            throw new Error(data.detail || "Something went wrong. Please try again.");
        }
        return res.json();
    };

    const handleAccept = async () => {
        if (!approvedBy.trim()) return;
        setSubmitting(true);
        try {
            await post("accept", { approved_by_name: approvedBy.trim() });
            setDone({ type: "accept", message: "Your quote has been accepted! Our team will be in touch shortly to confirm the next steps." });
        } catch (err) { alert((err as Error).message); }
        finally { setSubmitting(false); }
    };

    const handleAdjust = async () => {
        if (!notes.trim()) return;
        setSubmitting(true);
        try {
            await post("adjust", { notes });
            setDone({ type: "adjust", message: "Your adjustment request has been submitted. We will review it and send you an updated quote shortly." });
        } catch (err) { alert((err as Error).message); }
        finally { setSubmitting(false); }
    };

    const handleReject = async () => {
        if (!notes.trim()) return;
        setSubmitting(true);
        try {
            await post("reject", { reason: notes });
            setDone({ type: "reject", message: "Thank you for your response. We have noted your decision and will follow up with you shortly." });
        } catch (err) { alert((err as Error).message); }
        finally { setSubmitting(false); }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
                    <p className="mt-3 text-gray-500 text-sm">Loading your quote...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full text-center">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h1 className="text-xl font-semibold text-gray-800 mb-2">Link Not Found</h1>
                    <p className="text-gray-600 text-sm">{error}</p>
                    <p className="mt-4 text-xs text-gray-400">Please contact us if you believe this is an error.</p>
                </div>
            </div>
        );
    }

    if (done) {
        const config = {
            accept: { icon: "✅", color: "text-green-600" },
            adjust: { icon: "📝", color: "text-blue-600" },
            reject: { icon: "✖️", color: "text-gray-500" },
        }[done.type as "accept" | "adjust" | "reject"] ?? { icon: "✅", color: "text-green-600" };
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full text-center">
                    <div className={`text-5xl mb-4 ${config.color}`}>{config.icon}</div>
                    <p className="text-gray-700 text-lg leading-relaxed">{done.message}</p>
                    <p className="mt-5 text-xs text-gray-400">Reference: <strong>{quote?.quote_id}</strong></p>
                </div>
            </div>
        );
    }

    const lineItems = quote?.line_items ?? [];
    const subtotal = lineItems.reduce((s, item) => s + parseFloat(String(item.line_total ?? 0)), 0);
    const taxRate = Number(quote?.tax_rate ?? 16);
    const vatAmount = quote?.include_vat ? subtotal * (taxRate / 100) : 0;
    const total = subtotal + vatAmount;

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4">
            <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">

                {/* ── Header ── */}
                <div className="p-8 pb-0">
                    {/* Logo + QUOTE heading */}
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            {quote?.company_logo_b64 ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={quote.company_logo_b64}
                                    alt={quote.company_name ?? "Company Logo"}
                                    className="h-20 w-auto object-contain"
                                />
                            ) : (
                                <p className="text-xl font-bold text-gray-900">{quote?.company_name ?? "PrintDuka"}</p>
                            )}
                        </div>
                        <div className="text-right">
                            <h1 className="text-5xl font-bold text-gray-900 tracking-widest">QUOTE</h1>
                            <p className="text-sm text-gray-500 mt-1"># {quote?.quote_id}</p>
                            <button
                                onClick={handleDownloadPDF}
                                disabled={downloading}
                                title="Download PDF"
                                className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-400 hover:text-gray-800 disabled:opacity-50 transition-colors"
                            >
                                <DownloadIcon className="h-3.5 w-3.5" />
                                {downloading ? "Generating…" : "Download PDF"}
                            </button>
                        </div>
                    </div>

                    {/* Company details */}
                    <div className="text-sm font-semibold text-gray-900 mb-0.5">{quote?.company_name}</div>
                    <div className="text-sm text-gray-500 space-y-0.5 mb-5">
                        {quote?.company_address && <p>{quote.company_address}</p>}
                        {quote?.company_pin     && <p>PIN {quote.company_pin}</p>}
                        {quote?.company_email   && <p>{quote.company_email}</p>}
                        {quote?.company_website && <p>{quote.company_website}</p>}
                        {quote?.company_phone   && <p>Tel: {quote.company_phone}</p>}
                    </div>

                    <hr className="border-gray-300 mb-5" />

                    {/* Bill To + Dates */}
                    <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Bill To</p>
                            <p className="font-bold text-gray-900">{quote?.client_name || "—"}</p>
                            {quote?.recipient_pin && <p className="text-sm text-gray-500">PIN {quote.recipient_pin}</p>}
                        </div>
                        <div className="text-sm space-y-0.5 sm:text-right">
                            <p className="text-gray-600"><span className="text-gray-400">Issue Date : </span>{fmtDate(quote?.quote_date)}</p>
                            <p className="text-gray-600"><span className="text-gray-400">Expiry Date : </span>{fmtDate(quote?.valid_until)}</p>
                        </div>
                    </div>

                    {/* ── Line Items Table ── */}
                    <div className="mb-6 overflow-x-auto">
                        <table className="w-full text-sm min-w-[560px]">
                            <thead>
                                <tr className="bg-gray-100 text-gray-600 border-b border-gray-300">
                                    <th className="text-left py-2 px-3">#</th>
                                    <th className="text-left py-2 px-3">Item &amp; Description</th>
                                    <th className="text-right py-2 px-3">Qty</th>
                                    <th className="text-right py-2 px-3">Rate</th>
                                    {quote?.include_vat && (
                                        <th className="text-right py-2 px-3">VAT</th>
                                    )}
                                    <th className="text-right py-2 px-3">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {lineItems.map((item, i) => {
                                    const lineTotal = parseFloat(String(item.line_total ?? 0));
                                    const vatAmt = quote?.include_vat ? lineTotal * (taxRate / 100) : 0;
                                    return (
                                        <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                                            <td className="py-2.5 px-3 text-gray-400">{i + 1}</td>
                                            <td className="py-2.5 px-3">
                                                <p className="font-medium text-gray-800">{item.product_name}</p>
                                                {item.description && (
                                                    <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{item.description}</p>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-gray-700">{Number(item.quantity).toFixed(2)}</td>
                                            <td className="py-2.5 px-3 text-right text-gray-700">{fmtNum(item.unit_price)}</td>
                                            {quote?.include_vat && (
                                                <td className="py-2.5 px-3 text-right text-gray-700">
                                                    <p>{fmtNum(vatAmt)}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{taxRate.toFixed(2)}%</p>
                                                </td>
                                            )}
                                            <td className="py-2.5 px-3 text-right text-gray-700">{fmtNum(lineTotal)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Totals ── */}
                    <div className="border-t border-gray-300 pt-2 mb-6">
                        <div className="flex justify-end">
                            <div className="w-56 text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 font-medium">Sub Total</span>
                                    <span className="text-gray-700">{fmtNum(subtotal)}</span>
                                </div>
                                {quote?.include_vat && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">VAT ({taxRate.toFixed(0)}%)</span>
                                        <span className="text-gray-700">{fmtNum(vatAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between border-t border-gray-900 pt-1 font-bold text-base">
                                    <span className="text-gray-900">Total</span>
                                    <span className="text-gray-900">{fmt(total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── VAT Summary ── */}
                    {quote?.include_vat && (
                        <div className="mb-6">
                            <p className="text-sm text-gray-600 mb-2">Vat Summary</p>
                            <table className="w-full text-sm border border-gray-200 rounded overflow-hidden">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="text-left py-2 px-3 font-medium text-gray-600">VAT Details</th>
                                        <th className="text-right py-2 px-3 font-medium text-gray-600">VATable Amount<br />(KES)</th>
                                        <th className="text-right py-2 px-3 font-medium text-gray-600">VAT (KES)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    <tr className="bg-white">
                                        <td className="py-2 px-3 text-gray-600">Exempt (A) - Ex</td>
                                        <td className="py-2 px-3 text-right text-gray-700">0.00</td>
                                        <td className="py-2 px-3 text-right text-gray-700">0.00</td>
                                    </tr>
                                    <tr className="bg-white">
                                        <td className="py-2 px-3 text-gray-600">Zero Rate (C) - 0</td>
                                        <td className="py-2 px-3 text-right text-gray-700">0.00</td>
                                        <td className="py-2 px-3 text-right text-gray-700">0.00</td>
                                    </tr>
                                    <tr className="bg-white">
                                        <td className="py-2 px-3 text-gray-600">General Rate (B) - {taxRate.toFixed(0)}</td>
                                        <td className="py-2 px-3 text-right text-gray-700">{fmtNum(subtotal)}</td>
                                        <td className="py-2 px-3 text-right text-gray-700">{fmtNum(vatAmount)}</td>
                                    </tr>
                                    <tr className="border-t border-gray-400 font-semibold">
                                        <td className="py-2 px-3 text-gray-800">Total</td>
                                        <td className="py-2 px-3 text-right text-gray-800">{fmt(subtotal)}</td>
                                        <td className="py-2 px-3 text-right text-gray-800">{fmt(vatAmount)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── Notes / Terms / Payment Options ── */}
                    {quote?.customer_notes && (
                        <div className="mb-5">
                            <p className="text-sm text-gray-500 mb-1">Notes</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.customer_notes}</p>
                        </div>
                    )}
                    {quote?.custom_terms && (
                        <div className="mb-5">
                            <p className="text-sm text-gray-500 mb-1">Terms &amp; Conditions</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.custom_terms}</p>
                        </div>
                    )}
                    {quote?.payment_options && (
                        <div className="mb-6">
                            <p className="text-sm text-gray-500 mb-1">Payment Options</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.payment_options}</p>
                        </div>
                    )}
                </div>

                {/* ── Action Section ── */}
                <div className="bg-gray-50 border-t border-gray-200 p-8">
                    {quote?.token_used ? (
                        <div className="text-center">
                            <p className="text-gray-600 font-medium">You have already responded to this quote.</p>
                            <p className="text-sm text-gray-400 mt-1">Please contact us if you need any assistance.</p>
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-center font-semibold text-gray-800 mb-1 text-lg">Your Response</h2>
                            <p className="text-center text-sm text-gray-400 mb-6">
                                Please review the quotation above and select one of the options below.
                            </p>

                            {!action && (
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <button
                                        onClick={() => setAction("accept")}
                                        className="flex-1 sm:flex-none sm:min-w-[160px] px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-sm"
                                    >
                                        ✓ Accept Quote
                                    </button>
                                    <button
                                        onClick={() => { setAction("adjust"); setNotes(""); }}
                                        className="flex-1 sm:flex-none sm:min-w-[180px] px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm"
                                    >
                                        ↩ Request Adjustments
                                    </button>
                                    <button
                                        onClick={() => { setAction("reject"); setNotes(""); }}
                                        className="flex-1 sm:flex-none sm:min-w-[160px] px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors text-sm"
                                    >
                                        ✕ Reject Quote
                                    </button>
                                </div>
                            )}

                            {action === "accept" && (
                                <div className="max-w-md mx-auto">
                                    <p className="text-gray-700 mb-4 text-sm text-center">
                                        By accepting this quote you confirm the order. Please enter the full name of the person approving.
                                    </p>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Approved by <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={approvedBy}
                                            onChange={(e) => setApprovedBy(e.target.value)}
                                            placeholder="Full name of approver"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                    <div className="flex gap-3 justify-end">
                                        <button
                                            onClick={() => { setAction(null); setApprovedBy(""); }}
                                            className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAccept}
                                            disabled={submitting || !approvedBy.trim()}
                                            className="px-7 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg disabled:opacity-60 transition-colors text-sm"
                                        >
                                            {submitting ? "Accepting..." : "Confirm Acceptance"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {action === "adjust" && (
                                <div className="max-w-lg mx-auto">
                                    <p className="text-gray-700 mb-2 text-sm font-medium">Describe the adjustments you need:</p>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={4}
                                        placeholder="e.g. Please reduce quantity to 200 units and add foil finish..."
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 resize-none"
                                    />
                                    <div className="flex gap-3 justify-end">
                                        <button
                                            onClick={() => setAction(null)}
                                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAdjust}
                                            disabled={submitting || !notes.trim()}
                                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm disabled:opacity-60 transition-colors"
                                        >
                                            {submitting ? "Submitting..." : "Submit Request"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {action === "reject" && (
                                <div className="max-w-lg mx-auto">
                                    <p className="text-gray-700 mb-2 text-sm font-medium">Please tell us why you are rejecting this quote:</p>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={3}
                                        placeholder="Please provide a reason..."
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-3 resize-none"
                                    />
                                    <div className="flex gap-3 justify-end">
                                        <button
                                            onClick={() => setAction(null)}
                                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleReject}
                                            disabled={submitting || !notes.trim()}
                                            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm disabled:opacity-60 transition-colors"
                                        >
                                            {submitting ? "Submitting..." : "Submit"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
                {quote?.company_name ?? "PrintDuka"} · Valid until {fmtDate(quote?.valid_until)}
            </p>
        </div>
    );
}

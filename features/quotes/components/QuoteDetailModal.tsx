"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { X, Mail, MessageCircle, Send, Loader2, Pencil } from "lucide-react";
import type { MultiProductQuote, QuoteLineItemDetailed } from "@/types/quotes";
import type { SendEmailFields } from "@/services/quotes";
import { getApprovalLink } from "@/services/quotes";
import { getCurrentUser } from "@/services/users";

interface QuoteDetailModalProps {
    quote: MultiProductQuote | null;
    onClose: () => void;
    onSendToPT: (quoteId: number) => void;
    onSendToCustomer: (quoteId: number, emailFields: SendEmailFields) => void;
    isSendingToCustomer?: boolean;
    onMarkLost: (quoteId: number) => void;
    onConvertToJob: (quoteId: number) => void;
    onApproveForClient?: (quoteId: number) => void;
    onGenerateInvoice: (quoteId: number) => void;
    onDownloadPdf: (quoteId: string) => void;
    onEdit?: (quoteId: number) => void;
}

export default function QuoteDetailModal({
    quote,
    onClose,
    onSendToPT,
    onSendToCustomer,
    isSendingToCustomer,
    onMarkLost,
    onConvertToJob,
    onApproveForClient,
    onGenerateInvoice,
    onDownloadPdf,
    onEdit,
}: QuoteDetailModalProps) {
    const router = useRouter();
    const [showEmailDraft, setShowEmailDraft] = useState(false);
    const [emailFrom, setEmailFrom] = useState("");
    const [emailTo, setEmailTo] = useState("");
    const [emailCc, setEmailCc] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");

    const { data: currentUser } = useQuery({
        queryKey: ["current-user"],
        queryFn: getCurrentUser,
    });

    if (!quote) return null;

    const isWithinEditWindow = (() => {
        const ref = quote.first_sent_at || quote.approved_at;
        if (!ref) return true; // no timestamp recorded — allow edit
        return Date.now() - new Date(ref).getTime() < 30 * 24 * 60 * 60 * 1000;
    })();

    const openEmailDraft = () => {
        const senderEmail = currentUser?.email || "info@printduka.co.ke";
        setEmailFrom(senderEmail);
        setEmailTo("");
        setEmailCc("");
        setEmailSubject(`Quote ${quote.quote_id} from Print Duka Ltd`);
        setEmailBody(
            `Dear ${quote.client_name || "Valued Customer"},\n\nI hope this message finds you well.\n\nPlease find attached your quotation ${quote.quote_id} from Print Duka Ltd. We have prepared this quote based on your requirements and look forward to your feedback.\n\nPlease review the attached quote and feel free to reach out if you have any questions or need any adjustments.\n\nBest regards,\nPrint Duka Ltd\nNairobi, Kenya\n${senderEmail} | +254 795 332 766`
        );
        setShowEmailDraft(true);
    };

    const handleSendEmail = () => {
        onSendToCustomer(quote.id, {
            email_from: emailFrom.trim() || undefined,
            email_to: emailTo.trim() || undefined,
            email_cc: emailCc.trim() || undefined,
            email_subject: emailSubject.trim() || undefined,
            email_body: emailBody.trim() || undefined,
        });
        setShowEmailDraft(false);
    };

    const handleWhatsApp = async (): Promise<void> => {
        let approvalUrl = "";
        try {
            const result = await getApprovalLink(quote.id);
            approvalUrl = result.approval_url;
        } catch {
            // proceed without link if fetch fails
        }
        const linkLine = approvalUrl
            ? `\nKindly review and approve your quote here:\n${approvalUrl}\n`
            : "";
        const msg = `Hello ${quote.client_name || ""},\n\nPlease find your quote *${quote.quote_id}* from Print Duka Ltd.\n\n*Total: KES ${quote.total_value.toLocaleString()}*\nValid Until: ${quote.valid_until}\n${linkLine}\nThank you!`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency: "KES",
            maximumFractionDigits: 0,
        }).format(value);
    };

    const getStatusBadgeClass = (status: string): string => {
        const baseClasses = "px-3 py-1 text-xs font-medium rounded";

        switch (status) {
            case "Draft":
                return `${baseClasses} bg-gray-100 text-gray-700`;
            case "Sent to PT":
                return `${baseClasses} bg-brand-yellow/20 text-brand-black`;
            case "Costed":
                return `${baseClasses} bg-brand-blue/10 text-brand-blue`;
            case "Sent to Customer":
                return `${baseClasses} bg-brand-purple/10 text-brand-purple`;
            case "Approved":
                return `${baseClasses} bg-brand-green/10 text-brand-green`;
            case "Lost":
                return `${baseClasses} bg-brand-red/10 text-brand-red`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-500`;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e): void => e.stopPropagation()}>
                {/* Header */}
                <div className="border-b border-gray-200 p-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">{quote.quote_id}</h2>
                            <p className="text-sm text-gray-600 mt-1">{quote.client_name || "—"}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{quote.created_date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={getStatusBadgeClass(quote.status)}>
                                {quote.status}
                            </span>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                type="button"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Quick Info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-4 border-b border-gray-200">
                        <div>
                            <p className="text-xs text-gray-500">Items</p>
                            <p className="text-lg font-semibold text-gray-900">{quote.item_count}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Total</p>
                            <p className="text-lg font-semibold text-gray-900">{formatCurrency(quote.total_value)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Margin</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {quote.margin > 0 ? `${quote.margin.toFixed(1)}%` : "—"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Valid Until</p>
                            <p className="text-sm font-semibold text-gray-900">{quote.valid_until}</p>
                            {quote.days_remaining > 0 && quote.days_remaining <= 7 && (
                                <p className="text-xs text-brand-yellow mt-0.5">{quote.days_remaining}d left</p>
                            )}
                            {quote.days_remaining <= 0 && (
                                <p className="text-xs text-brand-red mt-0.5">Expired</p>
                            )}
                        </div>
                    </div>

                    {/* Line Items */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Line Items</h3>
                        <div className="border border-gray-200 rounded overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Product</th>
                                        <th className="text-center py-2 px-3 text-xs font-medium text-gray-600">Qty</th>
                                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Unit Price</th>
                                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Discount</th>
                                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quote.line_items && quote.line_items.length > 0 ? (
                                        quote.line_items.map((item: QuoteLineItemDetailed) => (
                                            <tr key={item.id} className="border-b border-gray-100 last:border-0">
                                                <td className="py-2 px-3">
                                                    <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                                                    {item.customization_level_snapshot && (
                                                        <p className="text-xs text-gray-500">{item.customization_level_snapshot}</p>
                                                    )}
                                                </td>
                                                <td className="py-2 px-3 text-center">{item.quantity}</td>
                                                <td className="py-2 px-3 text-right">
                                                    {item.unit_price != null && item.unit_price !== "" && !isNaN(Number(item.unit_price))
                                                        ? formatCurrency(Number(item.unit_price))
                                                        : "—"}
                                                </td>
                                                <td className="py-2 px-3 text-right">
                                                    {Number(item.discount_amount) > 0
                                                        ? item.discount_type === "percent"
                                                            ? `${item.discount_amount}%`
                                                            : formatCurrency(Number(item.discount_amount))
                                                        : "—"}
                                                </td>
                                                <td className="py-2 px-3 text-right font-medium">
                                                    {formatCurrency(Number(item.line_total))}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                                                No line items available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pricing Summary */}
                    <div className="bg-gray-50 rounded p-3 border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Pricing Summary</h3>
                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-medium">{formatCurrency(quote.subtotal)}</span>
                            </div>
                            {quote.discount_total > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Discount</span>
                                    <span className="font-medium text-brand-red">-{formatCurrency(quote.discount_total)}</span>
                                </div>
                            )}
                            {quote.include_vat && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Tax ({quote.tax_rate}%)</span>
                                    <span className="font-medium">{formatCurrency(quote.tax_total)}</span>
                                </div>
                            )}
                            {quote.shipping_charges > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Shipping</span>
                                    <span className="font-medium">{formatCurrency(quote.shipping_charges)}</span>
                                </div>
                            )}
                            {quote.adjustment_amount !== 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        Adjustment
                                        {quote.adjustment_reason && ` (${quote.adjustment_reason})`}
                                    </span>
                                    <span className={`font-medium ${quote.adjustment_amount > 0 ? "text-brand-green" : "text-brand-red"}`}>
                                        {quote.adjustment_amount > 0 ? "+" : ""}
                                        {formatCurrency(quote.adjustment_amount)}
                                    </span>
                                </div>
                            )}
                            <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between">
                                <span className="font-semibold text-gray-900">Total</span>
                                <span className="text-lg font-bold text-brand-blue">
                                    {formatCurrency(quote.total_value)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Notes & Terms */}
                    {(quote.notes || quote.terms || quote.custom_terms) && (
                        <div className="space-y-3">
                            {quote.notes && (
                                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                    <h3 className="text-xs font-semibold text-brand-blue mb-1">Notes</h3>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
                                </div>
                            )}
                            {(quote.custom_terms || quote.terms) && (
                                <div className="bg-purple-50 border border-purple-200 rounded p-3">
                                    <h3 className="text-xs font-semibold text-brand-purple mb-1">Terms & Conditions</h3>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.custom_terms || quote.terms}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Loss Reason */}
                    {quote.loss_reason && (
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                            <h3 className="text-xs font-semibold text-brand-red mb-1">Loss Reason</h3>
                            <p className="text-sm text-red-700 whitespace-pre-wrap">{quote.loss_reason}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                            onClick={(): void => onDownloadPdf(quote.quote_id)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                            type="button"
                        >
                            Download PDF
                        </button>

                        <div className="flex flex-wrap items-center gap-2">
                            {quote.status === "Draft" && (
                                <button
                                    onClick={(): void => onSendToPT(quote.id)}
                                    className="px-4 py-2 text-sm font-medium bg-brand-yellow text-brand-black hover:bg-brand-yellow/90 rounded transition-colors"
                                    type="button"
                                >
                                    Send to Production Team
                                </button>
                            )}

                            {(quote.status === "Draft" || quote.status === "Costed") && (
                                <button
                                    onClick={openEmailDraft}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-brand-purple text-white hover:bg-brand-purple/90 rounded transition-colors"
                                    type="button"
                                >
                                    <Mail className="w-4 h-4" />
                                    Send to Customer
                                </button>
                            )}

                            {quote.status !== "Lost" && quote.status !== "Rejected" && (
                                <button
                                    onClick={handleWhatsApp}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-500 text-white hover:bg-green-600 rounded transition-colors"
                                    type="button"
                                    title="Share via WhatsApp"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    WhatsApp
                                </button>
                            )}

                            {(quote.status === "Sent to Customer" || (quote.status === "Approved" && isWithinEditWindow)) && (
                                <button
                                    onClick={(): void => {
                                        if (onEdit) {
                                            onEdit(quote.id);
                                        } else {
                                            router.push(`/account-manager/quotes/create?edit=${quote.id}`);
                                        }
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-brand-blue text-white hover:bg-brand-blue/90 rounded transition-colors"
                                    type="button"
                                    title={quote.status === "Approved" ? "Edit and resend within 30-day window" : "Edit quote"}
                                >
                                    <Pencil className="w-4 h-4" />
                                    {quote.status === "Approved" ? "Edit & Resend" : "Edit Quote"}
                                </button>
                            )}

                            {onApproveForClient && (quote.status === "Draft" || quote.status === "Costed" || quote.status === "Sent to Customer") && (
                                <button
                                    onClick={(): void => onApproveForClient(quote.id)}
                                    className="px-4 py-2 text-sm font-medium bg-brand-green text-white hover:bg-brand-green/90 rounded transition-colors"
                                    type="button"
                                    title="Record the client's approval (WhatsApp, call, in person). The job is created automatically."
                                >
                                    Approve for Client
                                </button>
                            )}

                            {/* Approval now creates the job automatically. This stays only as a
                                fallback for quotes approved before that change, which may have no job. */}
                            {quote.status === "Approved" && (
                                <button
                                    onClick={(): void => onConvertToJob(quote.id)}
                                    className="px-4 py-2 text-sm font-medium border border-brand-green text-brand-green hover:bg-brand-green/5 rounded transition-colors"
                                    type="button"
                                    title="Creates the job if this approved quote doesn't have one yet"
                                >
                                    Create Job
                                </button>
                            )}

                            <button
                                onClick={(): void => onGenerateInvoice(quote.id)}
                                className="px-4 py-2 text-sm font-medium border border-brand-blue text-brand-blue hover:bg-brand-blue/5 rounded transition-colors"
                                type="button"
                                title="Generate a draft invoice from this quote, available in any status"
                            >
                                Generate Invoice
                            </button>

                            {quote.status !== "Approved" && quote.status !== "Lost" && (
                                <button
                                    onClick={(): void => onMarkLost(quote.id)}
                                    className="px-4 py-2 text-sm font-medium bg-brand-red text-white hover:bg-brand-red/90 rounded transition-colors"
                                    type="button"
                                >
                                    Mark as Lost
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Email Composer */}
            {showEmailDraft && (
                <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4" onClick={() => setShowEmailDraft(false)}>
                    <div
                        className="bg-white w-full sm:rounded-xl shadow-2xl sm:max-w-2xl flex flex-col max-h-[92vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Composer header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                            <span className="text-sm font-semibold text-gray-800">New Message</span>
                            <button onClick={() => setShowEmailDraft(false)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Fields */}
                        <div className="shrink-0">
                            <div className="flex items-center border-b border-gray-100 px-4 py-2 gap-3">
                                <span className="text-xs font-medium text-gray-400 w-12 shrink-0">From</span>
                                <input
                                    type="email"
                                    value={emailFrom}
                                    onChange={(e) => setEmailFrom(e.target.value)}
                                    className="flex-1 text-sm text-gray-800 bg-transparent outline-none placeholder-gray-300"
                                    placeholder="your@email.com"
                                />
                            </div>
                            <div className="flex items-center border-b border-gray-100 px-4 py-2 gap-3">
                                <span className="text-xs font-medium text-gray-400 w-12 shrink-0">To</span>
                                <input
                                    type="email"
                                    value={emailTo}
                                    onChange={(e) => setEmailTo(e.target.value)}
                                    placeholder="client@example.com"
                                    className="flex-1 text-sm text-gray-800 bg-transparent outline-none placeholder-gray-300"
                                />
                            </div>
                            <div className="flex items-center border-b border-gray-100 px-4 py-2 gap-3">
                                <span className="text-xs font-medium text-gray-400 w-12 shrink-0">CC</span>
                                <input
                                    type="text"
                                    value={emailCc}
                                    onChange={(e) => setEmailCc(e.target.value)}
                                    placeholder="cc@example.com, other@example.com"
                                    className="flex-1 text-sm text-gray-800 bg-transparent outline-none placeholder-gray-300"
                                />
                            </div>
                            <div className="flex items-center border-b border-gray-200 px-4 py-2 gap-3">
                                <span className="text-xs font-medium text-gray-400 w-12 shrink-0">Subject</span>
                                <input
                                    type="text"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    className="flex-1 text-sm font-medium text-gray-800 bg-transparent outline-none"
                                />
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto">
                            <textarea
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                className="w-full h-full min-h-[260px] px-4 py-3 text-sm text-gray-800 bg-transparent outline-none resize-none leading-relaxed"
                                placeholder="Write your message here..."
                            />
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 shrink-0">
                            <p className="text-xs text-gray-400">Quote PDF will be attached automatically</p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowEmailDraft(false)}
                                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={handleSendEmail}
                                    disabled={isSendingToCustomer}
                                    className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSendingToCustomer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    {isSendingToCustomer ? "Sending…" : "Send"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

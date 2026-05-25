"use client";

import type { ReactElement } from "react";

interface QuoteNotesSectionProps {
    customerNotes: string;
    termsAndConditions: string;
    paymentOptions: string;
    onCustomerNotesChange: (value: string) => void;
    onTermsChange: (value: string) => void;
    onPaymentOptionsChange: (value: string) => void;
}

const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";
const textareaClass =
    "w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent placeholder:text-gray-400 resize-y leading-relaxed";

export default function QuoteNotesSection({
    customerNotes,
    termsAndConditions,
    paymentOptions,
    onCustomerNotesChange,
    onTermsChange,
    onPaymentOptionsChange,
}: QuoteNotesSectionProps): ReactElement {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Notes, Terms & Payment</h2>
            <div className="space-y-5">
                <div>
                    <label className={labelClass}>Customer Notes</label>
                    <textarea
                        value={customerNotes}
                        onChange={(e): void => onCustomerNotesChange(e.target.value)}
                        rows={3}
                        placeholder="Add a note visible to the customer on the quote…"
                        className={textareaClass}
                    />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div>
                        <label className={labelClass}>Terms &amp; Conditions</label>
                        <textarea
                            value={termsAndConditions}
                            onChange={(e): void => onTermsChange(e.target.value)}
                            rows={8}
                            placeholder="Payment terms, delivery conditions, or other clauses…"
                            className={textareaClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Payment Options</label>
                        <textarea
                            value={paymentOptions}
                            onChange={(e): void => onPaymentOptionsChange(e.target.value)}
                            rows={8}
                            placeholder="Bank transfer details, M-Pesa paybill, etc."
                            className={textareaClass}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

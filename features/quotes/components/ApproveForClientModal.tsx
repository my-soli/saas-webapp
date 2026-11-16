"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import type { MultiProductQuote } from "@/types/quotes";

interface ApproveForClientModalProps {
    quote: MultiProductQuote;
    onClose: () => void;
    onConfirm: (approvedByName: string) => void;
    isLoading?: boolean;
}

/**
 * The "Your Response" section of the customer approval page
 * (/quotes/approve/[token]), shown on its own so staff can record an approval
 * the client gave by WhatsApp, phone or in person.
 */
export default function ApproveForClientModal({
    quote,
    onClose,
    onConfirm,
    isLoading = false,
}: ApproveForClientModalProps): ReactElement {
    const [approvedBy, setApprovedBy] = useState("");
    const canSubmit = approvedBy.trim().length > 0 && !isLoading;

    const handleConfirm = (): void => {
        if (canSubmit) onConfirm(approvedBy.trim());
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4" onClick={isLoading ? undefined : onClose}>
            <div
                className="bg-gray-50 rounded-xl shadow-xl w-full max-w-xl px-6 py-8 sm:px-10"
                onClick={(e): void => e.stopPropagation()}
            >
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-gray-900">Your Response</h2>
                    <p className="mt-1 text-sm text-gray-400">
                        Approving {quote.quote_id} on behalf of {quote.client_name || "the client"}.
                    </p>
                    <p className="mt-6 text-sm text-gray-700 max-w-md mx-auto">
                        By accepting this quote you confirm the order. Please enter the full name of the person approving.
                    </p>
                </div>

                <div className="mt-6 max-w-md mx-auto">
                    <label htmlFor="approved-by" className="block text-sm font-medium text-gray-800 mb-1.5">
                        Approved by <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="approved-by"
                        type="text"
                        value={approvedBy}
                        onChange={(e): void => setApprovedBy(e.target.value)}
                        onKeyDown={(e): void => { if (e.key === "Enter") handleConfirm(); }}
                        placeholder="Full name of approver"
                        autoFocus
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />

                    <div className="mt-5 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={!canSubmit}
                            className="px-7 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? "Confirming…" : "Confirm Acceptance"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

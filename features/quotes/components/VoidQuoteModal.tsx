import { X } from "lucide-react";
import { useState } from "react";

interface VoidQuoteModalProps {
    quoteId: string;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}

export default function VoidQuoteModal({ quoteId, onClose, onConfirm }: VoidQuoteModalProps) {
    const [reason, setReason] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (reason.trim()) {
            onConfirm(reason.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="border-b border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Nullify Quote</h2>
                        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors" type="button">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                        Quote {quoteId} will be marked as <strong>Void</strong> and can no longer be used.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-4">
                        <label htmlFor="void-reason" className="block text-sm font-medium text-gray-700 mb-2">
                            Reason for voiding <span className="text-brand-red">*</span>
                        </label>
                        <textarea
                            id="void-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Duplicate quote, Client request, Pricing error..."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red text-sm"
                            autoFocus
                        />
                    </div>

                    <div className="border-t border-gray-200 p-4 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!reason.trim()}
                            className="px-4 py-2 text-sm font-medium bg-gray-700 text-white hover:bg-gray-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Void Quote
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

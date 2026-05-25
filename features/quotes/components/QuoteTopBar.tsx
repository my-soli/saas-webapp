"use client";

import { ArrowLeft, MessageCircle } from "lucide-react";
import type { ReactElement } from "react";

interface QuoteTopBarProps {
    isEditMode: boolean;
    quoteDisplayId?: string;
    quoteStatus?: string;
    isWithinEditWindow?: boolean;
    isSaving: boolean;
    onBack: () => void;
    onSaveDraft: () => void;
    onSendToPT: () => void;
    onEmailClient: () => void;
    onWhatsApp?: () => void;
    clientName?: string;
}

export default function QuoteTopBar({
    isEditMode,
    quoteDisplayId,
    quoteStatus,
    isWithinEditWindow = true,
    isSaving,
    onBack,
    onSaveDraft,
    onSendToPT,
    onEmailClient,
    onWhatsApp,
    clientName,
}: QuoteTopBarProps): ReactElement {
    const isCosted = quoteStatus === "Costed";
    const isSentToCustomer = quoteStatus === "Sent to Customer";
    const isSentToPT = quoteStatus === "Sent to PT";
    const isApproved = quoteStatus === "Approved";
    const canEdit = !isEditMode
        || (quoteStatus !== "Lost" && (quoteStatus !== "Approved" || isWithinEditWindow));

    const subtitleText = (): string | null => {
        if (!isEditMode) return null;
        if (quoteStatus === "Draft") return "Draft — editing enabled";
        if (isCosted) return "Costed by PT — set selling prices, then email client";
        if (isSentToCustomer) return "Previously emailed to client — edit and re-send below";
        if (isSentToPT) return "Awaiting PT costing — you can still edit or email client directly";
        if (isApproved && isWithinEditWindow) return "Approved — editable within 30-day window";
        return null;
    };

    const subtitleColour = (): string => {
        if (isCosted) return "text-amber-600 font-medium";
        if (isSentToCustomer) return "text-brand-purple font-medium";
        if (isSentToPT) return "text-brand-blue font-medium";
        if (isApproved) return "text-green-600 font-medium";
        return "text-gray-400";
    };

    const subtitle = subtitleText();

    return (
        <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 sticky top-0 z-10">
            <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={onBack}
                        className="shrink-0 p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-base font-semibold text-gray-900 truncate">
                            {isEditMode
                                ? `Edit Quote${quoteDisplayId ? ` · ${quoteDisplayId}` : ""}`
                                : "New Quote"}
                        </h1>
                        {subtitle && (
                            <p className={`text-xs mt-0.5 ${subtitleColour()}`}>{subtitle}</p>
                        )}
                    </div>
                </div>

                {canEdit ? (
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={onSaveDraft}
                            disabled={isSaving}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
                            {isEditMode ? "Save Changes" : "Save Draft"}
                        </button>
                        {!isCosted && !isSentToCustomer && !isApproved && (
                            <button
                                type="button"
                                onClick={onSendToPT}
                                disabled={isSaving}
                                className="px-3 py-1.5 text-sm font-medium text-white bg-brand-blue rounded-md hover:bg-brand-blue/90 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                                {isEditMode ? "Save & Send to PT" : "Send to PT"}
                            </button>
                        )}
                        {onWhatsApp && (
                            <button
                                type="button"
                                onClick={onWhatsApp}
                                disabled={isSaving}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors whitespace-nowrap"
                                title={`Send via WhatsApp${clientName ? ` to ${clientName}` : ""}`}
                            >
                                <MessageCircle className="w-4 h-4" />
                                <span className="hidden sm:inline">WhatsApp</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onEmailClient}
                            disabled={isSaving}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-brand-green rounded-md hover:bg-brand-green/90 disabled:opacity-50 transition-colors ring-2 ring-brand-green/20 whitespace-nowrap"
                        >
                            {isCosted
                                ? "Set Prices & Email"
                                : isSentToCustomer || isApproved
                                    ? "Re-send to Client"
                                    : isEditMode
                                        ? "Save & Email Client"
                                        : "Email Client"}
                        </button>
                    </div>
                ) : (
                    <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 whitespace-nowrap">
                        Status:{" "}
                        <span className="font-medium text-gray-700">{quoteStatus}</span>
                        {isApproved && !isWithinEditWindow
                            ? " — edit window passed"
                            : " — read only"}
                    </span>
                )}
            </div>
        </div>
    );
}

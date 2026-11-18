"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Check, Copy, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppCopyModalProps {
    /** The message to share. The popup is hidden while this is null. */
    message: string | null;
    onClose: () => void;
}

/** Build the standard quote message sent to clients over WhatsApp. */
export function buildQuoteWhatsAppMessage(opts: {
    clientName?: string | null;
    quoteRef?: string | null;
    total?: number | null;
    validUntil?: string | null;
    approvalUrl?: string | null;
}): string {
    const lines: string[] = [`Hello ${opts.clientName || ""},`, ""];
    lines.push(`Please find your quote${opts.quoteRef ? ` *${opts.quoteRef}*` : ""} from Print Duka Ltd.`);
    if (opts.total !== undefined && opts.total !== null) {
        lines.push("", `*Total: KES ${opts.total.toLocaleString()}*`);
        if (opts.validUntil) lines.push(`Valid Until: ${opts.validUntil}`);
    } else if (opts.validUntil) {
        lines.push("", `Valid Until: ${opts.validUntil}`);
    }
    if (opts.approvalUrl) lines.push("", "Kindly review and approve your quote here:", opts.approvalUrl);
    lines.push("", "Thank you!");
    return lines.join("\n");
}

async function copyToClipboard(text: string, fallbackEl: HTMLTextAreaElement | null): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Older browsers / non-secure contexts: select the text and use execCommand.
        if (!fallbackEl) return false;
        fallbackEl.focus();
        fallbackEl.select();
        try {
            return document.execCommand("copy");
        } catch {
            return false;
        }
    }
}

/**
 * Shows the WhatsApp message for a quote with a Copy button, so staff can paste
 * it into WhatsApp themselves. It no longer opens WhatsApp in a new tab.
 */
export default function WhatsAppCopyModal({ message, onClose }: WhatsAppCopyModalProps): ReactElement | null {
    const [copied, setCopied] = useState(false);
    const textRef = useRef<HTMLTextAreaElement>(null);

    const close = useCallback((): void => {
        setCopied(false);
        onClose();
    }, [onClose]);

    useEffect(() => {
        if (message === null) return;
        const onKey = (e: KeyboardEvent): void => {
            if (e.key === "Escape") close();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [message, close]);

    if (message === null) return null;

    const handleCopy = async (): Promise<void> => {
        const ok = await copyToClipboard(message, textRef.current);
        if (ok) {
            setCopied(true);
            toast.success("Message copied. Paste it into WhatsApp.");
        } else {
            toast.error("Couldn't copy automatically. Select the text and copy it.");
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={close}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="wa-copy-title"
                className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
                            <MessageCircle className="h-4 w-4" />
                        </span>
                        <div>
                            <h2 id="wa-copy-title" className="text-sm font-semibold text-gray-900">WhatsApp message</h2>
                            <p className="text-xs text-gray-500">Copy it, then paste it into the client&apos;s chat.</p>
                        </div>
                    </div>
                    <button type="button" onClick={close} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-5">
                    <textarea
                        ref={textRef}
                        readOnly
                        value={message}
                        rows={Math.min(14, message.split("\n").length + 1)}
                        onFocus={(e) => e.currentTarget.select()}
                        className="w-full resize-none rounded-lg border border-gray-200 bg-[#f0fdf4] p-3 font-sans text-sm leading-relaxed text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                    />
                </div>

                <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
                    <button type="button" onClick={close} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleCopy()}
                        className="flex items-center gap-1.5 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
                    >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? "Copied" : "Copy message"}
                    </button>
                </div>
            </div>
        </div>
    );
}

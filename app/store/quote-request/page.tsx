"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    ShoppingCartIcon,
    Trash2Icon,
    UploadCloudIcon,
    CheckCircleIcon,
    ArrowLeftIcon,
    XIcon,
} from "lucide-react";
import { useQuoteCart } from "@/features/store/quote-cart-context";
import { submitQuoteRequest, uploadQuoteAttachment } from "@/services/quote-request";

export default function QuoteRequestPage(): ReactElement {
    const { items, updateQuantity, updateNotes, removeItem, clearCart } = useQuoteCart();
    const [files, setFiles] = useState<File[]>([]);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [company, setCompany] = useState("");
    const [specialNotes, setSpecialNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState<{ estimateId: string } | null>(null);

    const handleFilesChange = (fileList: FileList | null): void => {
        if (!fileList) return;
        setFiles((prev) => [...prev, ...Array.from(fileList)]);
    };

    const removeFile = (index: number): void => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (): Promise<void> => {
        if (items.length === 0) return;
        if (!name.trim() || !email.trim() || !phone.trim()) {
            setError("Please fill in your name, email, and phone number.");
            return;
        }
        setError(null);
        setIsSubmitting(true);
        try {
            const result = await submitQuoteRequest(
                {
                    customer_name: name.trim(),
                    customer_email: email.trim(),
                    customer_phone: phone.trim(),
                    customer_company: company.trim(),
                },
                items.map((item) => ({
                    product_id: String(item.productId),
                    product_name: item.name,
                    quantity: item.quantity,
                    // Colour picked on the product page travels in the line's notes,
                    // which the sales team already sees on the request.
                    notes: [item.color && `Colour: ${item.color}`, item.notes.trim()].filter(Boolean).join(" — "),
                })),
                specialNotes.trim(),
            );

            for (const file of files) {
                try {
                    await uploadQuoteAttachment(result.id, file);
                } catch {
                    // Non-fatal — the quote request itself already succeeded;
                    // a missed attachment can be re-sent when our team follows up.
                }
            }

            clearCart();
            setSubmitted({ estimateId: result.estimate_id });
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to submit quote request. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="mx-auto max-w-2xl px-4 sm:px-6 py-20 text-center">
                <CheckCircleIcon className="h-14 w-14 text-brand-green mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900">Quote request sent</h1>
                <p className="mt-2 text-gray-500">
                    Reference: <span className="font-semibold text-gray-700">{submitted.estimateId}</span>
                </p>
                <p className="mt-1 text-sm text-gray-500">
                    Our team will confirm availability and get back to you with pricing shortly.
                </p>
                <Link
                    href="/store"
                    className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-blue px-6 py-3 text-sm font-semibold text-white hover:bg-brand-blue/90 transition-colors"
                >
                    Continue browsing
                </Link>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="mx-auto max-w-2xl px-4 sm:px-6 py-20 text-center">
                <ShoppingCartIcon className="h-14 w-14 text-gray-300 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-gray-900">Your quote request is empty</h1>
                <p className="mt-2 text-sm text-gray-500">
                    Browse products and use &ldquo;Add to Quote&rdquo; on any Quote Only item to get started.
                </p>
                <Link
                    href="/store"
                    className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-blue px-6 py-3 text-sm font-semibold text-white hover:bg-brand-blue/90 transition-colors"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to store
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 lg:py-12">
            <Link href="/store" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-brand-blue transition-colors mb-6">
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                Back to store
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Request a Quote</h1>
            <p className="mt-1 text-sm text-gray-500">
                Review your items, attach any logo or artwork, and share your details — we&apos;ll confirm availability and send an official quote.
            </p>

            {/* Cart items */}
            <div className="mt-8 space-y-4">
                {items.map((item) => (
                    <div key={item.key} className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-4">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                            {item.imageUrl ? (
                                <Image src={item.imageUrl} alt={item.name} fill className="object-contain bg-gray-50" sizes="80px" />
                            ) : (
                                <div className="flex h-full items-center justify-center text-gray-300">
                                    <ShoppingCartIcon className="h-6 w-6" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                                    {item.color && (
                                        <p className="mt-0.5 text-xs text-gray-500">Colour: <span className="font-medium text-gray-700">{item.color}</span></p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeItem(item.key)}
                                    className="text-gray-300 hover:text-brand-red transition-colors shrink-0"
                                    aria-label={`Remove ${item.name}`}
                                >
                                    <Trash2Icon className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <label className="text-xs text-gray-500" htmlFor={`qty-${item.key}`}>Qty</label>
                                <input
                                    id={`qty-${item.key}`}
                                    type="number"
                                    min={1}
                                    value={item.quantity}
                                    onChange={(e) => updateQuantity(item.key, Number(e.target.value) || 1)}
                                    className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                                />
                            </div>
                            <input
                                type="text"
                                placeholder="Notes for this item (size, colour, etc.) — optional"
                                value={item.notes}
                                onChange={(e) => updateNotes(item.key, e.target.value)}
                                className="mt-2 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Artwork upload */}
            <div className="mt-8">
                <h2 className="text-sm font-bold text-gray-900 mb-2">Logo / Artwork (optional)</h2>
                <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-8 cursor-pointer hover:border-brand-blue/40 transition-colors">
                    <UploadCloudIcon className="h-7 w-7 text-gray-300" />
                    <span className="text-sm text-gray-500">Click to upload files</span>
                    <input type="file" multiple className="hidden" onChange={(e) => handleFilesChange(e.target.files)} />
                </label>
                {files.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                        {files.map((file, i) => (
                            <li key={`${file.name}-${i}`} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
                                <span className="truncate">{file.name}</span>
                                <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-brand-red">
                                    <XIcon className="h-3.5 w-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Customer details */}
            <div className="mt-8">
                <h2 className="text-sm font-bold text-gray-900 mb-3">Your Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" placeholder="Full name *" value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
                    <input type="email" placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
                    <input type="tel" placeholder="Phone *" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
                    <input type="text" placeholder="Company (optional)" value={company} onChange={(e) => setCompany(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
                </div>
                <textarea
                    placeholder="Anything else we should know? (optional)"
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    rows={3}
                    className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
            </div>

            {error && <p className="mt-4 text-sm text-brand-red">{error}</p>}

            <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting}
                className="mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand-orange px-8 py-3 text-sm font-bold text-white hover:bg-brand-orange/90 transition-colors disabled:opacity-60"
            >
                {isSubmitting ? "Submitting…" : "Submit Quote Request"}
            </button>
        </div>
    );
}

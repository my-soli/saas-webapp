"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, Trash2Icon, GripVerticalIcon, SaveIcon } from "lucide-react";
import { getCsrfToken } from "@/lib/api/auth";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

interface FAQItem {
    id: number;
    question: string;
    answer: string;
    display_order: number;
    is_active: boolean;
}

interface DraftFAQ {
    question: string;
    answer: string;
}

async function fetchFAQs(productId: number): Promise<FAQItem[]> {
    const response = await fetch(
        `${PROXY_BASE}/api/proxy/api/v1/product-faqs/?product=${productId}`,
        { credentials: "include" },
    );
    if (!response.ok) throw new Error("Failed to load FAQs");
    const data = await response.json() as { results?: FAQItem[] } | FAQItem[];
    return Array.isArray(data) ? data : (data.results ?? []);
}

async function createFAQ(productId: number, draft: DraftFAQ, order: number): Promise<FAQItem> {
    const csrf = await getCsrfToken();
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-faqs/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
        body: JSON.stringify({ product: productId, ...draft, display_order: order, is_active: true }),
    });
    if (!response.ok) throw new Error("Failed to create FAQ");
    return response.json() as Promise<FAQItem>;
}

async function updateFAQ(id: number, data: Partial<FAQItem>): Promise<FAQItem> {
    const csrf = await getCsrfToken();
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-faqs/${id}/`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update FAQ");
    return response.json() as Promise<FAQItem>;
}

async function deleteFAQ(id: number): Promise<void> {
    const csrf = await getCsrfToken();
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-faqs/${id}/`, {
        method: "DELETE",
        credentials: "include",
        headers: { "X-CSRFToken": csrf },
    });
    if (!response.ok) throw new Error("Failed to delete FAQ");
}

interface ProductFAQManagerProps {
    productId: number;
}

export default function ProductFAQManager({ productId }: ProductFAQManagerProps): ReactElement {
    const queryClient = useQueryClient();
    const queryKey = ["product-faqs", productId];

    const { data: faqs = [], isLoading } = useQuery<FAQItem[]>({
        queryKey,
        queryFn: () => fetchFAQs(productId),
    });

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValues, setEditValues] = useState<{ question: string; answer: string }>({ question: "", answer: "" });
    const [draft, setDraft] = useState<DraftFAQ>({ question: "", answer: "" });
    const [showAddForm, setShowAddForm] = useState(false);

    const saveMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<FAQItem> }) => updateFAQ(id, data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey });
            setEditingId(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteFAQ(id),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
    });

    const createMutation = useMutation({
        mutationFn: (d: DraftFAQ) => createFAQ(productId, d, faqs.length + 1),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey });
            setDraft({ question: "", answer: "" });
            setShowAddForm(false);
        },
    });

    const startEdit = (faq: FAQItem): void => {
        setEditingId(faq.id);
        setEditValues({ question: faq.question, answer: faq.answer });
    };

    const sorted = [...faqs].sort((a, b) => a.display_order - b.display_order);

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-gray-900">Product FAQs</h2>
                    <p className="text-xs text-gray-500 mt-0.5">These appear on the storefront product page.</p>
                </div>
                {!showAddForm && (
                    <button
                        type="button"
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-2 text-xs font-semibold text-white hover:bg-brand-blue/90 transition-colors"
                    >
                        <PlusIcon className="h-3.5 w-3.5" />
                        Add FAQ
                    </button>
                )}
            </div>

            {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

            {!isLoading && sorted.length === 0 && !showAddForm && (
                <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">
                    No FAQs yet. Add one to display it on the store page.
                </p>
            )}

            <div className="space-y-3">
                {sorted.map((faq) => (
                    <div key={faq.id} className="border border-gray-200 rounded-xl overflow-hidden">
                        {editingId === faq.id ? (
                            <div className="p-4 space-y-3 bg-gray-50">
                                <input
                                    type="text"
                                    value={editValues.question}
                                    onChange={(e) => setEditValues((v) => ({ ...v, question: e.target.value }))}
                                    placeholder="Question"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                                />
                                <textarea
                                    value={editValues.answer}
                                    onChange={(e) => setEditValues((v) => ({ ...v, answer: e.target.value }))}
                                    placeholder="Answer"
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 resize-none"
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => saveMutation.mutate({ id: faq.id, data: editValues })}
                                        disabled={saveMutation.isPending}
                                        className="flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-50 transition-colors"
                                    >
                                        <SaveIcon className="h-3.5 w-3.5" />
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingId(null)}
                                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-3 p-4">
                                <GripVerticalIcon className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <button
                                        type="button"
                                        onClick={() => startEdit(faq)}
                                        className="text-left w-full group"
                                    >
                                        <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-blue transition-colors">{faq.question}</p>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{faq.answer}</p>
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => deleteMutation.mutate(faq.id)}
                                    disabled={deleteMutation.isPending}
                                    className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                                    aria-label="Delete FAQ"
                                >
                                    <Trash2Icon className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {showAddForm && (
                <div className="border border-brand-blue/30 rounded-xl p-4 space-y-3 bg-blue-50/30">
                    <p className="text-xs font-semibold text-gray-700">New FAQ</p>
                    <input
                        type="text"
                        value={draft.question}
                        onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
                        placeholder="Question"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                    />
                    <textarea
                        value={draft.answer}
                        onChange={(e) => setDraft((d) => ({ ...d, answer: e.target.value }))}
                        placeholder="Answer"
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 resize-none"
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => createMutation.mutate(draft)}
                            disabled={!draft.question.trim() || !draft.answer.trim() || createMutation.isPending}
                            className="flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-50 transition-colors"
                        >
                            <PlusIcon className="h-3.5 w-3.5" />
                            Add
                        </button>
                        <button
                            type="button"
                            onClick={() => { setShowAddForm(false); setDraft({ question: "", answer: "" }); }}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { ChevronDownIcon } from "lucide-react";

interface FAQItem {
    id: number;
    question: string;
    answer: string;
    display_order: number;
}

interface ProductFAQSectionProps {
    faqs: FAQItem[];
}

export default function ProductFAQSection({ faqs }: ProductFAQSectionProps): ReactElement | null {
    const [openId, setOpenId] = useState<number | null>(null);

    const activeFaqs = [...faqs].sort((a, b) => a.display_order - b.display_order);

    if (activeFaqs.length === 0) return null;

    return (
        <div className="border-t border-gray-200 py-12 mt-4">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Frequently asked questions</h2>
            <div className="divide-y divide-gray-200">
                {activeFaqs.map((faq) => {
                    const isOpen = openId === faq.id;
                    return (
                        <div key={faq.id}>
                            <button
                                type="button"
                                onClick={() => setOpenId(isOpen ? null : faq.id)}
                                className="flex w-full items-center justify-between gap-4 py-4 text-left"
                                aria-expanded={isOpen}
                            >
                                <span className="text-sm font-semibold text-gray-900">{faq.question}</span>
                                <ChevronDownIcon
                                    className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                                />
                            </button>
                            {isOpen && (
                                <p className="pb-4 text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

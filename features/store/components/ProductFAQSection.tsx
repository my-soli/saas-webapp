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
    const activeFaqs = [...faqs].sort((a, b) => a.display_order - b.display_order);
    const [openId, setOpenId] = useState<number | null>(activeFaqs[0]?.id ?? null);

    if (activeFaqs.length === 0) return null;

    return (
        <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Frequently asked questions</h2>
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
                {activeFaqs.map((faq, i) => {
                    const isOpen = openId === faq.id;
                    const isLast = i === activeFaqs.length - 1;
                    return (
                        <div key={faq.id} className={!isLast ? "border-b border-gray-100" : ""}>
                            <button
                                type="button"
                                onClick={() => setOpenId(isOpen ? null : faq.id)}
                                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                                aria-expanded={isOpen}
                            >
                                <span className="text-sm font-semibold text-gray-900">{faq.question}</span>
                                <ChevronDownIcon
                                    className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                                />
                            </button>
                            {isOpen && (
                                <div className="px-5 pb-4">
                                    <p className="text-sm text-gray-500 leading-relaxed">{faq.answer}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

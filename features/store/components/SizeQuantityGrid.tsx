"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import Image from "next/image";
import { RulerIcon, XIcon } from "lucide-react";
import type { CatalogProduct } from "@/services/store";

export type SizeQuantities = Record<string, number>;

/** Sizes come from the product's own spec group named "Size"/"Sizes" (by name or
 *  customer label) — its active options, in display order. Products without such
 *  a group have no sizes. Exact match on purpose, so e.g. "Paper Size" isn't
 *  turned into a per-size quantity grid. */
export function getProductSizes(product: CatalogProduct): string[] {
    const isSizeLabel = (s: string | undefined): boolean => /^sizes?$/i.test((s ?? "").trim());
    const group = product.spec_groups.find(
        (g) => g.is_active && (isSizeLabel(g.name) || isSizeLabel(g.display_label)),
    );
    if (!group) return [];
    return [...group.options]
        .filter((o) => o.is_active)
        .sort((a, b) => a.display_order - b.display_order)
        .map((o) => o.name.trim())
        .filter(Boolean);
}

export function totalSizeQuantity(q: SizeQuantities): number {
    return Object.values(q).reduce((sum, n) => sum + (n > 0 ? n : 0), 0);
}

/** "S×10, M×20" — only sizes with a quantity, in the product's size order. */
export function describeSizeQuantities(sizes: string[], q: SizeQuantities): string {
    return sizes.filter((s) => (q[s] ?? 0) > 0).map((s) => `${s}×${q[s]}`).join(", ");
}

interface SizeQuantityGridProps {
    product: CatalogProduct;
    sizes: string[];
    value: SizeQuantities;
    onChange: (value: SizeQuantities) => void;
    showError?: boolean;
}

/** Vistaprint-style "Size and quantity" grid: one quantity box per size + size chart link. */
export default function SizeQuantityGrid({ product, sizes, value, onChange, showError = false }: SizeQuantityGridProps): ReactElement {
    const [chartOpen, setChartOpen] = useState(false);
    const chart = product.images.find((img) => img.image_type === "size-comparison" && img.image_url);
    const total = totalSizeQuantity(value);

    return (
        <div className="space-y-2.5">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">
                    Size and quantity<span className="text-brand-red">*</span>
                </p>
                {chart && (
                    <button
                        type="button"
                        onClick={() => setChartOpen(true)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
                    >
                        <RulerIcon className="h-3.5 w-3.5" />
                        Size chart
                    </button>
                )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {sizes.map((size) => (
                    <label key={size} className="flex flex-col items-center gap-1 rounded-xl border border-gray-200 px-2 py-2 focus-within:border-brand-blue">
                        <span className="text-xs font-semibold text-gray-700">{size}</span>
                        <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            placeholder="0"
                            value={value[size] ? String(value[size]) : ""}
                            onChange={(e) => {
                                const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                                onChange({ ...value, [size]: n });
                            }}
                            className="w-full rounded-md border border-gray-200 px-1.5 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                            aria-label={`Quantity for size ${size}`}
                        />
                    </label>
                ))}
            </div>
            <p className="text-xs text-gray-500">
                Total: <span className="font-semibold text-gray-800">{total}</span> pcs
            </p>
            {showError && total === 0 && (
                <p className="text-xs font-medium text-brand-red">Enter a quantity for at least one size.</p>
            )}

            {chartOpen && chart?.image_url && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={() => setChartOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Size chart"
                >
                    <div className="relative w-full max-w-2xl rounded-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900">Size chart</p>
                            <button type="button" onClick={() => setChartOpen(false)} aria-label="Close size chart" className="text-gray-400 hover:text-gray-700">
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="relative aspect-[4/3] w-full">
                            <Image src={chart.image_url} alt={chart.alt_text || "Size chart"} fill className="object-contain" sizes="(max-width: 768px) 100vw, 672px" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

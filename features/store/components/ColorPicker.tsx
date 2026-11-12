"use client";

import type { ReactElement } from "react";
import { CheckIcon } from "lucide-react";
import type { CatalogProduct } from "@/services/store";
import { sortProductImages } from "@/features/store/components/ProductImageGallery";

export interface ProductColor {
    name: string;
    hex: string;
}

/** One entry per distinct colour tagged on the product's images, in gallery order. */
export function getProductColors(product: CatalogProduct): ProductColor[] {
    const colors: ProductColor[] = [];
    const seen = new Set<string>();
    for (const img of sortProductImages(product)) {
        if (img.color_name && !seen.has(img.color_name)) {
            seen.add(img.color_name);
            colors.push({ name: img.color_name, hex: img.color_hex });
        }
    }
    return colors;
}

interface ColorPickerProps {
    colors: ProductColor[];
    selected: string | null;
    onSelect: (name: string) => void;
    /** Show the "please choose" hint (after the customer tried to continue without one). */
    showError?: boolean;
}

/** Required colour choice shown in the options panel, Vistaprint-style. */
export default function ColorPicker({ colors, selected, onSelect, showError = false }: ColorPickerProps): ReactElement {
    return (
        <div className="space-y-2.5">
            <p className="text-sm font-semibold text-gray-900">
                Colour<span className="text-brand-red">*</span>
                {selected && <span className="ml-2 font-normal text-gray-600">{selected}</span>}
            </p>
            <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Colour">
                {colors.map((c) => {
                    const isSelected = c.name === selected;
                    return (
                        <button
                            key={c.name}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={c.name}
                            title={c.name}
                            onClick={() => onSelect(c.name)}
                            className={`relative h-9 w-9 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
                                isSelected
                                    ? "ring-2 ring-brand-blue ring-offset-2"
                                    : "ring-1 ring-gray-300 hover:ring-gray-500 hover:scale-105"
                            }`}
                            style={{ backgroundColor: c.hex || "#e5e7eb" }}
                        >
                            {isSelected && (
                                <CheckIcon
                                    className="absolute inset-0 m-auto h-4 w-4 text-white mix-blend-difference"
                                    aria-hidden="true"
                                />
                            )}
                        </button>
                    );
                })}
            </div>
            {showError && !selected && (
                <p className="text-xs font-medium text-brand-red">Please choose a colour.</p>
            )}
        </div>
    );
}

"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import Image from "next/image";
import { PackageIcon } from "lucide-react";
import type { CatalogProduct } from "@/services/store";

interface ProductImageGalleryProps {
    product: CatalogProduct;
}

export default function ProductImageGallery({ product }: ProductImageGalleryProps): ReactElement {
    const sorted = [...product.images].sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
        return a.display_order - b.display_order;
    });

    const [activeIndex, setActiveIndex] = useState(0);
    const [zoomed, setZoomed] = useState(false);

    const active = sorted[activeIndex] ?? null;
    const displayUrl = active?.image_url ?? product.primary_image_url;

    // One swatch per distinct colour, each pointing at its first image.
    // Products with no colour-tagged images show no swatch row at all.
    const colorSwatches: Array<{ name: string; hex: string; index: number }> = [];
    const seenColors = new Set<string>();
    sorted.forEach((img, i) => {
        if (img.color_name && !seenColors.has(img.color_name)) {
            seenColors.add(img.color_name);
            colorSwatches.push({ name: img.color_name, hex: img.color_hex, index: i });
        }
    });
    const selectedColorName = active?.color_name || null;

    return (
        <div className="space-y-3">
            {/* Colour swatches */}
            {colorSwatches.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">
                        Colour{selectedColorName ? `: ${selectedColorName}` : ""}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                        {colorSwatches.map((swatch) => (
                            <button
                                key={swatch.name}
                                type="button"
                                title={swatch.name}
                                aria-label={swatch.name}
                                onClick={() => { setActiveIndex(swatch.index); setZoomed(false); }}
                                className={`w-8 h-8 rounded-full flex-shrink-0 transition-all ${swatch.name === selectedColorName
                                        ? "ring-2 ring-brand-blue ring-offset-2"
                                        : "ring-1 ring-gray-300 hover:ring-gray-400"
                                    }`}
                                style={{ backgroundColor: swatch.hex || "#e5e7eb" }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Main image */}
            <div
                className={`relative bg-gray-50 rounded-2xl overflow-hidden aspect-square ${displayUrl ? "cursor-zoom-in" : ""} ${zoomed ? "cursor-zoom-out" : ""}`}
                onClick={() => { if (displayUrl) setZoomed((z) => !z); }}
            >
                {displayUrl ? (
                    <Image
                        src={displayUrl}
                        alt={active?.alt_text || product.name}
                        fill
                        className={`object-cover transition-transform duration-300 ${zoomed ? "scale-150" : "scale-100"}`}
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        priority
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <PackageIcon className="h-24 w-24 text-gray-200" />
                    </div>
                )}
            </div>

            {/* Thumbnail strip */}
            {sorted.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {sorted.map((img, i) => (
                        <button
                            key={img.id}
                            type="button"
                            onClick={() => { setActiveIndex(i); setZoomed(false); }}
                            className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 transition-all ${i === activeIndex
                                    ? "ring-2 ring-brand-blue ring-offset-2"
                                    : "ring-1 ring-gray-200 opacity-70 hover:opacity-100"
                                }`}
                            aria-label={img.alt_text || `Image ${i + 1}`}
                        >
                            {img.image_url ? (
                                <Image
                                    src={img.image_url}
                                    alt={img.alt_text || product.name}
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-100" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

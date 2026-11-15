"use client";

import { useEffect, useState } from "react";
import type { ReactElement, MouseEvent } from "react";
import Image from "next/image";
import { PackageIcon, ChevronLeftIcon, ChevronRightIcon, ExpandIcon } from "lucide-react";
import type { CatalogProduct } from "@/services/store";

interface ProductImageGalleryProps {
    product: CatalogProduct;
    /** Colour picked in the options panel — the gallery jumps to that colour's first image. */
    selectedColor?: string | null;
}

/** Gallery images in display order: primary first, then display_order. Size-chart
 *  images are left out (they're shown behind the "Size chart" link instead). */
export function sortProductImages(product: CatalogProduct): CatalogProduct["images"] {
    return product.images.filter((img) => img.image_type !== "size-comparison").sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
        return a.display_order - b.display_order;
    });
}

export default function ProductImageGallery({ product, selectedColor = null }: ProductImageGalleryProps): ReactElement {
    const sorted = sortProductImages(product);

    const [activeIndex, setActiveIndex] = useState(0);
    const [zoomed, setZoomed] = useState(false);

    useEffect(() => {
        if (!selectedColor) return;
        const idx = sorted.findIndex((img) => img.color_name === selectedColor);
        if (idx >= 0) {
            setActiveIndex(idx);
            setZoomed(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedColor]);

    const active = sorted[activeIndex] ?? null;
    const displayUrl = active?.image_url ?? product.primary_image_url;

    const goPrev = (e: MouseEvent): void => {
        e.stopPropagation();
        setActiveIndex((i) => (i - 1 + sorted.length) % sorted.length);
        setZoomed(false);
    };
    const goNext = (e: MouseEvent): void => {
        e.stopPropagation();
        setActiveIndex((i) => (i + 1) % sorted.length);
        setZoomed(false);
    };

    return (
        <div className="space-y-3">
            {/* Main image */}
            <div
                className={`relative bg-gray-50 rounded-2xl overflow-hidden aspect-square ring-1 ring-gray-100 ${displayUrl ? "cursor-zoom-in" : ""} ${zoomed ? "cursor-zoom-out" : ""}`}
                onClick={() => { if (displayUrl) setZoomed((z) => !z); }}
            >
                {displayUrl ? (
                    <Image
                        src={displayUrl}
                        alt={active?.alt_text || product.name}
                        fill
                        className={`object-contain transition-transform duration-300 ${zoomed ? "scale-150" : "scale-100"}`}
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        priority
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <PackageIcon className="h-24 w-24 text-gray-200" />
                    </div>
                )}

                {sorted.length > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={goPrev}
                            aria-label="Previous image"
                            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md hover:bg-white transition-colors"
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={goNext}
                            aria-label="Next image"
                            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md hover:bg-white transition-colors"
                        >
                            <ChevronRightIcon className="h-4 w-4" />
                        </button>
                        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
                            {activeIndex + 1}/{sorted.length}
                        </span>
                    </>
                )}
                {displayUrl && (
                    <span className="absolute bottom-2.5 left-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm">
                        <ExpandIcon className="h-3.5 w-3.5" />
                    </span>
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
                                    className="w-full h-full object-contain bg-gray-50"
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

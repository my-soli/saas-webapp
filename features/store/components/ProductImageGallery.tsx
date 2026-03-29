"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import { ShoppingCartIcon, HeartIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { CatalogProduct } from "@/services/store";

interface ProductImageGalleryProps {
    product: CatalogProduct;
}

export default function ProductImageGallery({ product }: ProductImageGalleryProps): ReactElement {
    return (
        <div className="space-y-4">
            <div className="relative bg-gray-100 rounded-lg aspect-square flex items-center justify-center overflow-hidden group">
                {product.primary_image_url ? (
                    <Image
                        src={product.primary_image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <ShoppingCartIcon className="h-20 w-20 text-gray-200" />
                )}
                <div className="absolute top-4 left-4 flex flex-wrap gap-1.5 z-10">
                    {product.bestseller_badge && (
                        <span className="rounded-full bg-brand-yellow px-2.5 py-0.5 text-[11px] font-bold text-brand-black shadow-sm">
                            Best Seller
                        </span>
                    )}
                    {product.new_arrival && (
                        <span className="rounded-full bg-brand-green text-white px-2.5 py-0.5 text-[11px] font-bold shadow-sm">
                            New
                        </span>
                    )}
                    {product.on_sale_badge && (
                        <span className="rounded-full bg-brand-red text-white px-2.5 py-0.5 text-[11px] font-bold shadow-sm">
                            Sale
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-100 shadow-lg z-10"
                    aria-label="Save to wishlist"
                >
                    <HeartIcon className="h-5 w-5 text-gray-600" />
                </button>
                <button
                    type="button"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white rounded-lg p-2 hover:bg-gray-100 shadow-lg z-10"
                    aria-label="Previous image"
                >
                    <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                </button>
                <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white rounded-lg p-2 hover:bg-gray-100 shadow-lg z-10"
                    aria-label="Next image"
                >
                    <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                </button>
            </div>
            {product.primary_image_url && (
                <div className="flex gap-3">
                    <button
                        type="button"
                        className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-900 flex-shrink-0"
                    >
                        <Image
                            src={product.primary_image_url}
                            alt={product.name}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                        />
                    </button>
                </div>
            )}
        </div>
    );
}

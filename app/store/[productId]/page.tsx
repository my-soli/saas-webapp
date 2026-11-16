"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ReactElement } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowLeftIcon,
    LoaderIcon,
    AlertCircleIcon,
    MessageSquareIcon,
} from "lucide-react";
import {
    fetchCatalogProduct,
    calculatePrice,
    type CatalogProduct,
    type PriceCalculationResult,
} from "@/services/store";
import type { ProductSpecGroup } from "@/types/products";
import ProductImageGallery from "@/features/store/components/ProductImageGallery";
import SpecGroupSection from "@/features/store/components/SpecGroupSection";
import PriceSummary from "@/features/store/components/PriceSummary";
import ProductInfoTable from "@/features/store/components/ProductInfoTable";
import ProductFAQSection from "@/features/store/components/ProductFAQSection";
import ColorPicker, { getProductColors } from "@/features/store/components/ColorPicker";
import SizeQuantityGrid, {
    getProductSizes,
    totalSizeQuantity,
    describeSizeQuantities,
    type SizeQuantities,
} from "@/features/store/components/SizeQuantityGrid";
import PriceBreaks from "@/features/store/components/PriceBreaks";
import DeliveryEstimate from "@/features/store/components/DeliveryEstimate";
import RelatedProducts from "@/features/store/components/RelatedProducts";
import { BulkQuoteCta, DesignServicesBanner, TrustBadge } from "@/features/store/components/ProductExtras";
import { UploadCloudIcon } from "lucide-react";
import {
    buildInitialState,
    buildSelectionsPayload,
    isGroupVisible,
    buildDefaultGroupState,
} from "@/features/store/utils";
import type { GroupStates, SpecGroupSelectionState } from "@/features/store/types";
import { formatKES } from "@/lib/format";
import { useQuoteCart } from "@/features/store/quote-cart-context";

export default function ProductDetailPage(): ReactElement {
    const params = useParams();
    const router = useRouter();
    const productId = Number(params.productId);

    const { data: product, isLoading, isError } = useQuery<CatalogProduct>({
        queryKey: ["catalog-product", productId],
        queryFn: () => fetchCatalogProduct(productId),
        enabled: !isNaN(productId),
        staleTime: 30_000,
    });

    const [groupStates, setGroupStates] = useState<GroupStates>({});
    const [priceResult, setPriceResult] = useState<PriceCalculationResult | null>(null);
    const [priceError, setPriceError] = useState<string | null>(null);
    const [isPricing, setIsPricing] = useState<boolean>(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { addItem } = useQuoteCart();
    const [quoteQuantity, setQuoteQuantity] = useState<number>(1);
    const [added, setAdded] = useState<boolean>(false);

    // Colour is required whenever the product has colour-tagged images.
    const colors = product ? getProductColors(product) : [];
    const colorRequired = colors.length > 0;
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [showColorError, setShowColorError] = useState<boolean>(false);
    const colorMissing = colorRequired && !selectedColor;

    // Size + quantity grid — only for quote-only products that have a "Size" spec
    // group. Auto-priced products keep Size as a normal priced option instead.
    const sizes = product && product.pricing_mode === "quote_only" ? getProductSizes(product) : [];
    const [sizeQty, setSizeQty] = useState<SizeQuantities>({});
    const [showSizeError, setShowSizeError] = useState<boolean>(false);
    const sizeTotal = totalSizeQuantity(sizeQty);

    useEffect(() => {
        setSelectedColor(null);
        setShowColorError(false);
        setSizeQty({});
        setShowSizeError(false);
    }, [productId]);

    /** Human-readable summary of the options picked in the configurator. */
    const describeConfiguration = (): string => {
        if (!product) return "";
        const parts: string[] = [];
        for (const g of visibleGroups) {
            const s = groupStates[g.id];
            if (!s) continue;
            const label = g.display_label || g.name;
            const optName = (id: number | null): string | undefined => g.options.find((o) => o.id === id)?.name;
            let value: string | undefined;
            if (g.group_type === "multi_select_modifier") {
                value = s.multiOptions.map((id) => optName(id)).filter(Boolean).join(", ") || undefined;
            } else if (g.group_type === "numeric_input") {
                value = s.numericValue.trim() || undefined;
            } else if (g.group_type === "dimension_input") {
                value = s.dimValue.width && s.dimValue.height ? `${s.dimValue.width} × ${s.dimValue.height} ${g.dim_unit}` : undefined;
            } else if (g.group_type !== "display_only") {
                value = optName(s.singleOption);
            }
            if (value) parts.push(`${label}: ${value}`);
        }
        return parts.join(" · ");
    };

    /** Quantity picked in the configurator's Quantity Tier group, if any. */
    const tierQuantity = (): number | null => {
        const g = visibleGroups.find((grp) => grp.group_type === "quantity_tier");
        const opt = g?.options.find((o) => o.id === groupStates[g.id]?.singleOption);
        return opt?.quantity_value ?? null;
    };

    /** Validate colour/sizes and add the configured product to the quote request.
     *  Returns false (and shows the relevant hint) when something required is missing. */
    const addConfiguredToQuote = (): boolean => {
        if (!product) return false;
        let ok = true;
        if (colorMissing) { setShowColorError(true); ok = false; }
        if (sizes.length > 0 && sizeTotal === 0) { setShowSizeError(true); ok = false; }
        if (!ok) return false;

        const colorImage = selectedColor
            ? product.images.find((img) => img.color_name === selectedColor && img.image_url)
            : undefined;
        const sizeDesc = sizes.length > 0 ? describeSizeQuantities(sizes, sizeQty) : "";
        const config = isQuoteOnly ? "" : describeConfiguration();
        addItem({
            productId: product.id,
            name: product.name,
            imageUrl: colorImage?.image_url ?? product.primary_image_url,
            quantity: sizeTotal || (isQuoteOnly ? quoteQuantity : tierQuantity() ?? quoteQuantity),
            color: selectedColor ?? "",
            details: [sizeDesc && `Sizes: ${sizeDesc}`, config].filter(Boolean).join(" · "),
        });
        return true;
    };

    const handleAddToQuote = (): void => {
        if (!addConfiguredToQuote()) return;
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };

    const handleUploadDesign = (): void => {
        if (addConfiguredToQuote()) router.push("/store/quote-request#artwork");
    };

    const handleBulkQuote = (): void => {
        if (addConfiguredToQuote()) router.push("/store/quote-request");
    };

    useEffect(() => {
        if (product) {
            setGroupStates(buildInitialState(product.spec_groups));
        }
    }, [product]);

    const sortedGroups: ProductSpecGroup[] = product
        ? [...product.spec_groups].sort((a, b) => a.display_order - b.display_order)
        : [];

    const currentSelections = product
        ? buildSelectionsPayload(sortedGroups, groupStates)
        : {};

    const visibleGroups = sortedGroups.filter((g) => isGroupVisible(g, currentSelections));

    const recalculate = useCallback(
        async (groups: ProductSpecGroup[], states: GroupStates): Promise<void> => {
            if (!product || product.pricing_mode !== "auto_calculate") return;
            const payload = buildSelectionsPayload(
                groups.filter((g) => isGroupVisible(g, buildSelectionsPayload(groups, states))),
                states,
            );
            if (Object.keys(payload).length === 0) return;
            setIsPricing(true);
            setPriceError(null);
            try {
                const result = await calculatePrice(product.id, payload);
                setPriceResult(result);
            } catch (e: unknown) {
                setPriceError(e instanceof Error ? e.message : "Calculation failed");
            } finally {
                setIsPricing(false);
            }
        },
        [product],
    );

    const updateGroupState = (groupId: number, update: Partial<SpecGroupSelectionState>): void => {
        setGroupStates((prev) => {
            const next = { ...prev, [groupId]: { ...prev[groupId], ...update } };
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                void recalculate(sortedGroups, next);
            }, 400);
            return next;
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <LoaderIcon className="h-10 w-10 text-brand-blue animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Loading product…</p>
                </div>
            </div>
        );
    }

    if (isError || !product) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircleIcon className="h-10 w-10 text-red-400 mx-auto mb-3" />
                    <p className="text-gray-700 font-semibold">Product not found</p>
                    <Link
                        href="/store"
                        className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-blue hover:underline"
                    >
                        <ArrowLeftIcon className="h-3.5 w-3.5" />
                        Back to store
                    </Link>
                </div>
            </div>
        );
    }

    const isQuoteOnly = product.pricing_mode === "quote_only";

    const handleOrder = (): void => {
        if (colorMissing) {
            setShowColorError(true);
            return;
        }
        void (async () => {
            setIsPricing(true);
            setPriceError(null);
            try {
                const payload = buildSelectionsPayload(visibleGroups, groupStates);
                const result = await calculatePrice(product.id, payload);
                setPriceResult(result);
                if (!result.valid && result.errors) {
                    setPriceError(result.errors.join(", "));
                }
            } catch (e: unknown) {
                setPriceError(e instanceof Error ? e.message : "Calculation failed");
            } finally {
                setIsPricing(false);
            }
        })();
    };

    return (
        <div className="bg-white">
            {/* Breadcrumb bar */}
            <div className="bg-gray-50 border-b border-gray-100">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-10 items-center gap-1.5 text-xs text-gray-400">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="hover:text-brand-blue transition-colors"
                        >
                            <ArrowLeftIcon className="h-3.5 w-3.5" />
                        </button>
                        <span>/</span>
                        <Link href="/store" className="hover:text-brand-blue transition-colors">Store</Link>
                        {product.primary_category_name && (
                            <>
                                <span>/</span>
                                <span className="hidden sm:inline">{product.primary_category_name}</span>
                            </>
                        )}
                        <span>/</span>
                        <span className="text-gray-600 font-medium truncate max-w-[200px]">{product.name}</span>
                    </div>
                </div>
            </div>

            {/* Main product section */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-8 lg:gap-16 items-start">

                    {/* LEFT — image gallery */}
                    <ProductImageGallery product={product} selectedColor={selectedColor} />

                    {/* RIGHT — config + purchase */}
                    <div className="lg:sticky lg:top-6 space-y-5">
                        {/* Title + badges */}
                        <div>
                            {(product.bestseller_badge || product.new_arrival || product.on_sale_badge) && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {product.bestseller_badge && (
                                        <span className="rounded-full bg-brand-yellow px-2.5 py-0.5 text-[11px] font-bold text-brand-black">Best Seller</span>
                                    )}
                                    {product.new_arrival && (
                                        <span className="rounded-full bg-brand-green text-white px-2.5 py-0.5 text-[11px] font-bold">New</span>
                                    )}
                                    {product.on_sale_badge && (
                                        <span className="rounded-full bg-brand-red text-white px-2.5 py-0.5 text-[11px] font-bold">Sale</span>
                                    )}
                                </div>
                            )}
                            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-snug">{product.name}</h1>
                            {product.short_description && (
                                <p className="mt-2 text-sm text-gray-500 leading-relaxed break-words">{product.short_description}</p>
                            )}
                        </div>

                        {/* Starting-from teaser — independent of the live/quote pricing below */}
                        {product.starting_price && (
                            <p className="text-sm text-gray-500">
                                Starting from{" "}
                                <span className="text-lg font-bold text-brand-blue">{formatKES(product.starting_price)}</span>
                            </p>
                        )}

                        {/* Live price */}
                        {!isQuoteOnly && (
                            <div className="flex items-baseline gap-2">
                                {isPricing ? (
                                    <span className="text-sm text-gray-400 flex items-center gap-1.5">
                                        <LoaderIcon className="h-3.5 w-3.5 animate-spin" />
                                        Calculating…
                                    </span>
                                ) : priceResult && parseFloat(priceResult.final_selling_price) > 0 ? (
                                    <>
                                        <span className="text-3xl font-bold text-gray-900">{formatKES(priceResult.final_selling_price)}</span>
                                        <span className="text-sm text-gray-400">per piece</span>
                                    </>
                                ) : (
                                    <span className="text-sm text-gray-400">Configure below to see price</span>
                                )}
                            </div>
                        )}

                        {/* Tags */}
                        {product.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {product.tags.map((tag) => (
                                    <span key={tag.id} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                        {tag.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Ready-by estimate */}
                        <DeliveryEstimate product={product} />

                        {/* Colour (required when the product has colour-tagged images) */}
                        {colorRequired && (
                            <ColorPicker
                                colors={colors}
                                selected={selectedColor}
                                onSelect={(name) => {
                                    setSelectedColor(name);
                                    setShowColorError(false);
                                }}
                                showError={showColorError}
                            />
                        )}

                        {/* Size + quantity grid (products with sizes configured) */}
                        {sizes.length > 0 && (
                            <SizeQuantityGrid
                                product={product}
                                sizes={sizes}
                                value={sizeQty}
                                onChange={(v) => {
                                    setSizeQty(v);
                                    setShowSizeError(false);
                                }}
                                showError={showSizeError}
                            />
                        )}

                        {/* Quantity price breaks (auto-priced products with tiers) */}
                        {!isQuoteOnly && <PriceBreaks product={product} />}

                        {/* Configuration or quote */}
                        {isQuoteOnly ? (
                            <div className="rounded-2xl bg-gray-50 p-5 space-y-3">
                                <p className="text-sm font-semibold text-gray-800">Custom quote required</p>
                                <p className="text-sm text-gray-500">
                                    Add it to your quote request with the quantity you need — our team will confirm
                                    availability and get back to you with a tailored price.
                                </p>
                                {/* Single quantity box — replaced by the size grid above when the product has sizes */}
                                {sizes.length === 0 && (
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm text-gray-600" htmlFor="quote-quantity">Quantity</label>
                                        <input
                                            id="quote-quantity"
                                            type="number"
                                            min={1}
                                            value={quoteQuantity}
                                            onChange={(e) => setQuoteQuantity(Math.max(1, Number(e.target.value) || 1))}
                                            className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                                        />
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={handleAddToQuote}
                                    className="inline-flex items-center gap-2 bg-brand-orange px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:bg-brand-orange/90 transition-colors"
                                >
                                    <MessageSquareIcon className="h-4 w-4" />
                                    {added ? "Added to Quote ✓" : "Add to Quote"}
                                </button>
                                {added && (
                                    <p className="text-xs text-gray-500">
                                        <Link href="/store/quote-request" className="font-semibold text-brand-blue hover:underline">
                                            View your quote request →
                                        </Link>
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-gray-100 px-5 pb-5">
                                {visibleGroups.map((group, i) => (
                                    <SpecGroupSection
                                        key={group.id}
                                        group={group}
                                        stepNumber={i + 1}
                                        state={groupStates[group.id] ?? buildDefaultGroupState()}
                                        onUpdate={(update) => updateGroupState(group.id, update)}
                                    />
                                ))}
                                <PriceSummary
                                    result={priceResult}
                                    isPending={isPricing}
                                    error={priceError}
                                    onOrder={handleOrder}
                                />
                            </div>
                        )}

                        {/* Upload your design → adds to quote and jumps to the artwork upload */}
                        <button
                            type="button"
                            onClick={handleUploadDesign}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-brand-blue px-5 py-3 text-sm font-bold text-brand-blue hover:bg-brand-blue/5 transition-colors"
                        >
                            <UploadCloudIcon className="h-4 w-4" />
                            Upload your design
                        </button>

                        <BulkQuoteCta onRequest={handleBulkQuote} />
                        <TrustBadge />
                    </div>
                </div>

                {/* Bottom content — description, specs, FAQs */}
                {(product.long_description || product.internal_code || product.faqs.length > 0) && (
                    <div className="mt-16 pt-12 border-t border-gray-100 space-y-12">
                        {/* Description + specs */}
                        {(product.long_description || product.internal_code) && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                {product.long_description && (
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 mb-4">About this product</h2>
                                        <ul className="space-y-2.5">
                                            {product.long_description.split("\n").filter(Boolean).map((line, idx) => (
                                                <li key={idx} className="flex gap-3 text-gray-600 text-sm leading-relaxed">
                                                    <span className="text-brand-blue font-bold flex-shrink-0 mt-0.5">•</span>
                                                    <span>{line}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {product.internal_code && (
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 mb-4">Specifications</h2>
                                        <ProductInfoTable product={product} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* FAQs */}
                        <ProductFAQSection faqs={product.faqs} />
                    </div>
                )}

                {/* Design services + related products */}
                <div className="mt-16 space-y-12">
                    <DesignServicesBanner />
                    <RelatedProducts product={product} />
                </div>
            </div>
        </div>
    );
}

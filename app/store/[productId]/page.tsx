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
    ChevronDownIcon,
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
import {
    buildInitialState,
    buildSelectionsPayload,
    isGroupVisible,
    buildDefaultGroupState,
} from "@/features/store/utils";
import type { GroupStates, SpecGroupSelectionState } from "@/features/store/types";
import { formatKES } from "@/lib/format";

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

    return (
        <div className="min-h-screen bg-white">
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6">
                    <div className="flex h-14 items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-brand-blue transition-colors"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">Back</span>
                        </button>
                        <div className="h-5 w-px bg-gray-200" />
                        <nav className="flex items-center gap-1 text-xs text-gray-400 min-w-0">
                            <Link href="/store" className="hover:text-brand-blue transition-colors flex-shrink-0">
                                Store
                            </Link>
                            <ChevronDownIcon className="h-3 w-3 rotate-[-90deg] flex-shrink-0" />
                            {product.primary_category_name && (
                                <>
                                    <span className="hover:text-brand-blue cursor-pointer flex-shrink-0 hidden sm:inline">
                                        {product.primary_category_name}
                                    </span>
                                    <ChevronDownIcon className="h-3 w-3 rotate-[-90deg] flex-shrink-0 hidden sm:inline" />
                                </>
                            )}
                            <span className="text-gray-700 font-medium truncate">{product.name}</span>
                        </nav>
                        <div className="ml-auto">
                            <Link href="/" className="flex-shrink-0">
                                <Image
                                    src="/logo/logo.png"
                                    alt="Print Duka"
                                    width={120}
                                    height={54}
                                    className="h-8 w-auto"
                                />
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                    <ProductImageGallery product={product} />

                    <div>
                        {product.primary_category_name && (
                            <p className="text-xs font-semibold uppercase tracking-widest text-brand-blue/70 mb-3">
                                {product.primary_category_name}
                                {product.sub_category_name && ` · ${product.sub_category_name}`}
                            </p>
                        )}
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
                        {product.short_description && (
                            <p className="text-gray-700 text-sm leading-relaxed mb-3">{product.short_description}</p>
                        )}
                        {!isQuoteOnly && priceResult && parseFloat(priceResult.final_selling_price) > 0 && (
                            <div className="mb-5">
                                <span className="text-xl font-bold text-gray-900">
                                    {formatKES(priceResult.final_selling_price)}
                                </span>{" "}
                                <span className="text-sm text-gray-500">each</span>
                            </div>
                        )}
                        {product.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {product.tags.map((tag) => (
                                    <span
                                        key={tag.id}
                                        className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500"
                                    >
                                        {tag.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        {isQuoteOnly ? (
                            <div className="border-t border-gray-200 mt-6 pt-6 space-y-4">
                                <p className="text-gray-600 text-sm">
                                    This product requires a custom quote. Our team will get back to you within 2 hours.
                                </p>
                                <Link
                                    href="/contact"
                                    className="inline-flex items-center gap-2 bg-brand-orange px-5 py-2.5 rounded-lg text-sm font-bold text-white hover:bg-brand-orange/90 transition-colors"
                                >
                                    <MessageSquareIcon className="h-4 w-4" />
                                    Request a Quote
                                </Link>
                            </div>
                        ) : (
                            <>
                                {visibleGroups.length === 0 && (
                                    <p className="text-sm text-gray-400 mt-6">
                                        No configuration needed for this product.
                                    </p>
                                )}
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
                                    onOrder={() => {
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
                                    }}
                                />
                            </>
                        )}
                    </div>
                </div>

                {(product.long_description || product.internal_code) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 border-t border-gray-200 py-12 mt-4">
                        {product.long_description && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
                                <ul className="space-y-2">
                                    {product.long_description.split("\n").filter(Boolean).map((line, idx) => (
                                        <li key={idx} className="flex gap-3 text-gray-700 text-sm">
                                            <span className="text-brand-blue font-bold flex-shrink-0">•</span>
                                            <span>{line}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Product details</h2>
                            <ProductInfoTable product={product} />
                        </div>
                    </div>
                )}
                <ProductFAQSection faqs={product.faqs} />
            </div>
        </div>
    );
}

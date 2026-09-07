"use client";

import { memo, useMemo, useState, useDeferredValue, Suspense } from "react";
import type { ReactElement } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import ImpactSection from "@/components/ImpactSection";
import {
    ShoppingCartIcon,
    ArrowRightIcon,
    FilterIcon,
    ChevronRightIcon,
    HeartIcon,
    TruckIcon,
    ShieldCheckIcon,
    PhoneIcon,
    ZapIcon,
    AlertCircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchCatalogProducts, type CatalogProduct } from "@/services/store";
import type { ProductSpecGroup, SpecOption } from "@/types/products";

interface ProductCategory {
    id: number;
    name: string;
    slug: string;
}

async function fetchCategories(): Promise<ProductCategory[]> {
    const res = await fetch(`/api/proxy/api/v1/product-categories/?page_size=100`);
    if (!res.ok) return [];
    const data = await res.json() as { results?: ProductCategory[] } | ProductCategory[];
    return Array.isArray(data) ? data : (data.results ?? []);
}

const TRUST_ITEMS = [
    { icon: TruckIcon, title: "Nairobi Delivery", subtitle: "Same-day & next-day options" },
    { icon: ShieldCheckIcon, title: "Quality Guarantee", subtitle: "Reprint or full refund" },
    { icon: ZapIcon, title: "Fast Turnaround", subtitle: "As quick as 4 hours" },
    { icon: PhoneIcon, title: "Dedicated Support", subtitle: "Mon–Sat, 8am–6pm" },
];

function formatKES(amount: number): string {
    return `KES ${amount.toLocaleString("en-KE")}`;
}

function getMinPrice(product: CatalogProduct): number | null {
    for (const group of product.spec_groups) {
        if (group.group_type === "quantity_tier" && group.options.length > 0) {
            const prices = group.options
                .map((o: SpecOption) => (o.selling_price ? parseFloat(o.selling_price) : null))
                .filter((p: number | null): p is number => p !== null);
            if (prices.length > 0) return Math.min(...prices);
        }
        if (group.group_type === "numeric_input" && group.ranges.length > 0) {
            const prices = group.ranges
                .map((r) => parseFloat(r.selling_price_base))
                .filter((p) => !isNaN(p));
            if (prices.length > 0) return Math.min(...prices);
        }
    }
    return null;
}

function getStartingPrice(product: CatalogProduct): { price: number; moq: number | null } | null {
    if (!product.starting_price) return null;
    const price = parseFloat(product.starting_price);
    if (isNaN(price)) return null;
    return { price, moq: product.starting_price_moq };
}

function getBadge(product: CatalogProduct): { label: string; cls: string } | null {
    if (product.bestseller_badge) return { label: "Best Seller", cls: "bg-brand-yellow text-brand-black" };
    if (product.new_arrival) return { label: "New", cls: "bg-brand-green text-white" };
    if (product.on_sale_badge) return { label: "Sale", cls: "bg-brand-red text-white" };
    if (product.feature_product) return { label: "Featured", cls: "bg-brand-blue text-white" };
    return null;
}

const ProductCard = memo(function ProductCard({ product }: { product: CatalogProduct }): ReactElement {
    const [favorited, setFavorited] = useState<boolean>(false);
    const [imgError, setImgError] = useState<boolean>(false);
    const minPrice = getMinPrice(product);
    const startingPrice = getStartingPrice(product);
    const badge = getBadge(product);

    return (
        <Link href={`/store/${product.id}`} className="group block">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 h-full"
            >
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                    {product.primary_image_url && !imgError ? (
                        <Image
                            src={product.primary_image_url}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                            <ShoppingCartIcon className="h-12 w-12" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setFavorited((p) => !p); }}
                        className="absolute top-3 right-3 h-8 w-8 z-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                    >
                        <HeartIcon
                            className={cn(
                                "h-4 w-4",
                                favorited ? "fill-brand-red text-brand-red" : "text-gray-400",
                            )}
                        />
                    </button>
                    {badge && (
                        <span className={cn("absolute top-3 left-3 z-10 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide", badge.cls)}>
                            {badge.label}
                        </span>
                    )}
                </div>

                <div className="p-4 flex flex-col gap-1.5 flex-1">
                    {product.primary_category_name && (
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-blue/70">
                            {product.primary_category_name}
                        </span>
                    )}
                    <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
                        {product.name}
                    </h3>
                    {product.short_description && (
                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                            {product.short_description}
                        </p>
                    )}

                    <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                        {startingPrice !== null ? (
                            <div>
                                <span className="text-[10px] text-gray-400 block">
                                    Starting from{startingPrice.moq ? ` (${startingPrice.moq} pcs)` : ""}
                                </span>
                                <span className="text-base font-extrabold text-brand-blue">
                                    {formatKES(startingPrice.price)}
                                </span>
                            </div>
                        ) : product.pricing_mode === "auto_calculate" ? (
                            <div>
                                {minPrice !== null ? (
                                    <>
                                        <span className="text-[10px] text-gray-400 block">From</span>
                                        <span className="text-base font-extrabold text-brand-blue">
                                            {formatKES(minPrice)}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-[10px] text-gray-400 block">Pricing</span>
                                        <span className="text-sm font-bold text-brand-blue">Configure</span>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div>
                                <span className="text-[10px] text-gray-400 block">Pricing</span>
                                <span className="text-sm font-bold text-brand-orange">Custom Quote</span>
                            </div>
                        )}
                        <span
                            className={cn(
                                "rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200",
                                product.pricing_mode === "auto_calculate"
                                    ? "bg-brand-blue text-white group-hover:bg-brand-blue/90"
                                    : "bg-brand-orange text-white group-hover:bg-brand-orange/90",
                            )}
                        >
                            {product.pricing_mode === "auto_calculate" ? "Order Now" : "Get Quote"}
                        </span>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
});
ProductCard.displayName = "ProductCard";

function StorePageInner(): ReactElement {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeCategoryId = searchParams.get("category") ?? "";
    const searchQuery = searchParams.get("q") ?? "";
    const deferredSearch = useDeferredValue(searchQuery);

    const { data: categoriesData = [] } = useQuery<ProductCategory[]>({
        queryKey: ["product-categories"],
        queryFn: fetchCategories,
        staleTime: 5 * 60_000,
    });

    const {
        data,
        isLoading,
        isError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ["catalog-products", activeCategoryId, deferredSearch],
        queryFn: ({ pageParam }) =>
            fetchCatalogProducts({
                search: deferredSearch || undefined,
                category: activeCategoryId || undefined,
                page_size: 48,
                page: pageParam,
            }),
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.reduce((sum, p) => sum + p.results.length, 0);
            return loaded < lastPage.count ? allPages.length + 1 : undefined;
        },
        staleTime: 30_000,
    });

    const allProducts = data?.pages.flatMap((p) => p.results) ?? [];

    const categoryLabel = useMemo(() => {
        const match = categoriesData.find((c) => String(c.id) === activeCategoryId);
        return match?.name ?? "All";
    }, [categoriesData, activeCategoryId]);

    return (
        <>
            {/* ── HERO BANNER ────────────────────────────────────────── */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">
                <div className="relative overflow-hidden rounded-3xl bg-brand-blue min-h-[380px] flex">
                    {/* Background image */}
                    <div className="absolute inset-0">
                        <Image
                            src="/banner/banner.jpg"
                            alt="Hero"
                            fill
                            className="object-cover opacity-20"
                            priority
                        />
                    </div>
                    {/* Yellow accent shape */}
                    <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-yellow/30 blur-3xl" />
                    <div className="absolute -left-8 -bottom-16 h-48 w-48 rounded-full bg-brand-red/20 blur-2xl" />

                    <div className="relative z-10 flex flex-col justify-center px-8 sm:px-12 py-12 max-w-xl">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <span className="inline-block rounded-full bg-brand-yellow/20 border border-brand-yellow/40 px-3 py-1 text-xs font-semibold text-brand-yellow mb-4">
                                Kenya's #1 Print Partner
                            </span>
                            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
                                Print That
                                <br />
                                <span className="text-brand-yellow">Builds Brands.</span>
                            </h1>
                            <p className="text-white/80 text-base mb-8 max-w-sm leading-relaxed">
                                From business cards to full vehicle wraps — high-quality
                                printing delivered fast across Nairobi and beyond.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        document
                                            .getElementById("products-section")
                                            ?.scrollIntoView({ behavior: "smooth" })
                                    }
                                    className="inline-flex items-center gap-2 rounded-xl bg-brand-yellow px-6 py-3 text-sm font-bold text-brand-black hover:bg-brand-yellow/90 transition-colors shadow-lg shadow-brand-yellow/30"
                                >
                                    Shop Now
                                    <ArrowRightIcon className="h-4 w-4" />
                                </button>
                                <Link
                                    href="/contact"
                                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
                                >
                                    Get a Quote
                                </Link>
                            </div>
                        </motion.div>
                    </div>

                    {/* Hero right — category cards */}
                    <div className="hidden md:flex ml-auto items-end gap-3 pr-8 pb-8 z-10 flex-wrap justify-end content-end max-w-xs">
                        {[
                            { label: "Banners", img: "/banner/banner.jpg" },
                            { label: "Clothing", img: "/banner/clothing.png" },
                            { label: "Stationery", img: "/banner/stationary.jpg" },
                        ].map((item, i) => (
                            <motion.div
                                key={item.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + i * 0.1 }}
                                className="relative h-24 w-24 rounded-2xl overflow-hidden border-2 border-white/20 hover:border-brand-yellow/60 hover:scale-105 transition-all cursor-pointer"
                            >
                                <Image src={item.img} alt={item.label} fill className="object-cover" />
                                <div className="absolute inset-x-0 bottom-0 bg-black/50 py-1 text-center text-[10px] font-semibold text-white">
                                    {item.label}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TRUST BADGES ───────────────────────────────────────── */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {TRUST_ITEMS.map(({ icon: Icon, title, subtitle }) => (
                        <div
                            key={title}
                            className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm"
                        >
                            <div className="h-9 w-9 rounded-xl bg-brand-blue/5 flex items-center justify-center flex-shrink-0">
                                <Icon className="h-4.5 w-4.5 text-brand-blue" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate">{title}</p>
                                <p className="text-[10px] text-gray-500 truncate">{subtitle}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CATEGORY FILTER PILLS ──────────────────────────────── */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-10" id="products-section">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-extrabold text-gray-900">Our Products</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {isLoading
                                ? "Loading\u2026"
                                : (() => {
                                      const total = data?.pages[0]?.count ?? allProducts.length;
                                      return `${total} product${total !== 1 ? "s" : ""}${activeCategoryId ? ` in ${categoryLabel}` : ""}`;
                                  })()}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <FilterIcon className="h-4 w-4" />
                        Filter
                    </button>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
                    <button
                        key="all"
                        type="button"
                        onClick={() => {
                            const next = new URLSearchParams(searchParams.toString());
                            next.delete("category");
                            router.push(`/store?${next.toString()}`);
                        }}
                        className={cn(
                            "flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                            !activeCategoryId
                                ? "bg-brand-blue text-white shadow-md shadow-brand-blue/30"
                                : "bg-white border border-gray-200 text-gray-600 hover:border-brand-blue/40 hover:text-brand-blue",
                        )}
                    >
                        All
                    </button>
                    {categoriesData.map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                                const next = new URLSearchParams(searchParams.toString());
                                next.set("category", String(cat.id));
                                router.push(`/store?${next.toString()}`);
                            }}
                            className={cn(
                                "flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                                activeCategoryId === String(cat.id)
                                    ? "bg-brand-blue text-white shadow-md shadow-brand-blue/30"
                                    : "bg-white border border-gray-200 text-gray-600 hover:border-brand-blue/40 hover:text-brand-blue",
                            )}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </section>

            {/* ── PRODUCTS GRID ──────────────────────────────────────── */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
                {isLoading && (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="rounded-2xl bg-gray-200 animate-pulse aspect-[3/4]" />
                        ))}
                    </div>
                )}
                {isError && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <AlertCircleIcon className="h-10 w-10 text-red-400 mb-3" />
                        <p className="text-gray-600 font-medium">Failed to load products.</p>
                        <p className="text-sm text-gray-400 mt-1">Make sure the backend is running at <code className="text-brand-blue">localhost:8000</code></p>
                    </div>
                )}
                {!isLoading && !isError && allProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <span className="text-5xl mb-4">🖨️</span>
                        <p className="text-gray-500 font-medium">No products yet.</p>
                        <p className="text-sm text-gray-400 mt-1">
                            {deferredSearch ? "Try a different search term." : "Products will appear here once published by the admin."}
                        </p>
                    </div>
                )}
                {!isLoading && !isError && allProducts.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                        {allProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
                {hasNextPage && (
                    <div className="mt-8 text-center">
                        <button
                            type="button"
                            onClick={() => void fetchNextPage()}
                            disabled={isFetchingNextPage}
                            className="inline-flex items-center gap-2 rounded-xl border-2 border-brand-blue px-8 py-3 text-sm font-semibold text-brand-blue hover:bg-brand-blue hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isFetchingNextPage ? "Loading…" : "Load More Products"}
                            {!isFetchingNextPage && <ChevronRightIcon className="h-4 w-4" />}
                        </button>
                    </div>
                )}
            </section>

            {/* ── IMPACT SECTION ─────────────────────────────────────── */}
            <ImpactSection />

            {/* ── FOOTER ─────────────────────────────────────────────── */}
            <footer className="mt-20 bg-brand-blue text-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div>
                            <Image
                                src="/logo/pd.png"
                                alt="Print Duka"
                                width={120}
                                height={54}
                                className="h-12 w-auto mb-4 brightness-0 invert"
                            />
                            <p className="text-sm text-white/70 leading-relaxed">
                                Kenya's leading print & branding partner. Quality you can see and trust.
                            </p>
                        </div>
                        {[
                            {
                                heading: "Products",
                                links: ["Flyers & Brochures", "Banners & Signage", "Clothing", "Stationery", "Promotional"],
                            },
                            {
                                heading: "Company",
                                links: ["About Us", "Our Work", "Blog", "Careers", "Contact"],
                            },
                            {
                                heading: "Support",
                                links: ["How to Order", "File Setup Guide", "Delivery Info", "Returns Policy", "FAQ"],
                            },
                        ].map((col) => (
                            <div key={col.heading}>
                                <h4 className="text-sm font-bold text-brand-yellow mb-3">{col.heading}</h4>
                                <ul className="space-y-2">
                                    {col.links.map((link) => (
                                        <li key={link}>
                                            <Link
                                                href="#"
                                                className="text-sm text-white/70 hover:text-white transition-colors"
                                            >
                                                {link}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/50">
                        <p>© {new Date().getFullYear()} Print Duka. All rights reserved.</p>
                        <div className="flex gap-6">
                            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((item) => (
                                <Link key={item} href="#" className="hover:text-white transition-colors">
                                    {item}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
}

export default function StorePage(): ReactElement {
    return (
        <Suspense>
            <StorePageInner />
        </Suspense>
    );
}

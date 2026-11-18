"use client";

import { memo, useEffect, useMemo, useRef, useState, useDeferredValue, Suspense } from "react";
import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import LogoCloud from "@/components/ui/logo-cloud";
import {
    ShoppingCartIcon,
    ArrowRightIcon,
    TruckIcon,
    ShieldCheckIcon,
    PhoneIcon,
    ZapIcon,
    AlertCircleIcon,
    SearchIcon,
    XIcon,
    MousePointerClickIcon,
    SlidersHorizontalIcon,
    UploadCloudIcon,
    PackageCheckIcon,
    Loader2Icon,
    MessageSquareQuoteIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAllCatalog, fetchCatalogProducts, type CatalogProduct } from "@/services/store";
import type { SpecOption } from "@/types/products";

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

interface CategoryGroup {
    key: string;
    id: number | null;
    name: string;
    products: CatalogProduct[];
}

/** Group products by primary category, keeping the admin's category order. */
function groupByCategory(products: CatalogProduct[], categories: ProductCategory[]): CategoryGroup[] {
    const map = new Map<string, CategoryGroup>();
    for (const p of products) {
        const catId = p.category_id ?? p.primary_category;
        const key = catId ? String(catId) : "other";
        let g = map.get(key);
        if (!g) {
            g = { key, id: catId ?? null, name: p.category_name || p.primary_category_name || "More products", products: [] };
            map.set(key, g);
        }
        g.products.push(p);
    }
    const order = new Map(categories.map((c, i) => [String(c.id), i]));
    return [...map.values()].sort((a, b) => {
        if (a.key === "other") return 1;
        if (b.key === "other") return -1;
        return (order.get(a.key) ?? 999) - (order.get(b.key) ?? 999) || a.name.localeCompare(b.name);
    });
}

/** "type" URL param → the catalog API's pricing_mode filter. */
const TYPE_FILTERS = [
    { value: "", label: "All", pricingMode: undefined },
    { value: "online", label: "Order online", pricingMode: "auto_calculate" },
    { value: "quote", label: "Custom quote", pricingMode: "quote_only" },
] as const;

const TRUST_ITEMS = [
    { icon: TruckIcon, title: "Nairobi delivery", subtitle: "Same-day & next-day options" },
    { icon: ShieldCheckIcon, title: "Quality guarantee", subtitle: "Reprint or full refund" },
    { icon: ZapIcon, title: "Fast turnaround", subtitle: "As quick as 4 hours" },
    { icon: PhoneIcon, title: "Real people", subtitle: "Mon–Sat, 8am–6pm" },
];

const STEPS = [
    { icon: MousePointerClickIcon, title: "Pick a product", text: "Browse by category or search for what you need." },
    { icon: SlidersHorizontalIcon, title: "Configure it", text: "Choose size, paper, finish and quantity. Prices update live." },
    { icon: UploadCloudIcon, title: "Send your artwork", text: "Upload your design, or ask our team to create one." },
    { icon: PackageCheckIcon, title: "We print & deliver", text: "Quality-checked, then delivered or ready for pick-up." },
];

/** Hero tiles: each opens the first category whose name contains one of its keywords. */
const HERO_TILES = [
    { label: "Banners & signage", img: "/banner/banner.jpg", keywords: ["banner", "sign"] },
    { label: "Branded clothing", img: "/banner/clothing.png", keywords: ["cloth", "apparel", "wear", "shirt"] },
    { label: "Stationery", img: "/banner/stationary.jpg", keywords: ["station", "card", "letter"] },
    { label: "Vehicle branding", img: "/banner/van.jpg", keywords: ["vehicle", "car", "van", "vinyl"] },
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

function getStartingPrice(product: CatalogProduct): number | null {
    if (product.starting_price) {
        const price = parseFloat(product.starting_price);
        if (!isNaN(price)) return price;
    }
    return product.pricing_mode === "auto_calculate" ? getMinPrice(product) : null;
}

function getBadge(product: CatalogProduct): { label: string; cls: string } | null {
    if (product.bestseller_badge) return { label: "Best seller", cls: "bg-brand-yellow text-brand-black" };
    if (product.new_arrival) return { label: "New", cls: "bg-brand-green text-white" };
    if (product.on_sale_badge) return { label: "Sale", cls: "bg-brand-red text-white" };
    if (product.feature_product) return { label: "Featured", cls: "bg-brand-blue text-white" };
    return null;
}

const ProductCard = memo(function ProductCard({ product }: { product: CatalogProduct }): ReactElement {
    const [imgError, setImgError] = useState<boolean>(false);
    const price = getStartingPrice(product);
    const badge = getBadge(product);
    const orderOnline = product.pricing_mode === "auto_calculate";

    return (
        <Link
            href={`/store/${product.id}`}
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-blue/20 hover:shadow-xl hover:shadow-brand-blue/5"
        >
            <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                {product.primary_image_url && !imgError ? (
                    <Image
                        src={product.primary_image_url}
                        alt={product.name}
                        fill
                        className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                        <ShoppingCartIcon className="h-12 w-12" />
                    </div>
                )}
                {badge && (
                    <span className={cn("absolute left-3 top-3 z-10 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide shadow-sm", badge.cls)}>
                        {badge.label}
                    </span>
                )}
                <span
                    className={cn(
                        "absolute bottom-3 left-3 z-10 rounded-full px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm",
                        orderOnline ? "bg-white/90 text-brand-blue" : "bg-white/90 text-brand-orange",
                    )}
                >
                    {orderOnline ? "Instant price" : "Quoted for you"}
                </span>
            </div>

            <div className="flex flex-1 flex-col gap-1 p-4">
                {(product.category_name || product.primary_category_name) && (
                    <span className="truncate text-[10px] font-semibold uppercase tracking-widest text-brand-blue/70">
                        {product.category_name || product.primary_category_name}
                    </span>
                )}
                <h3 className="line-clamp-2 break-words text-sm font-bold leading-snug text-gray-900 group-hover:text-brand-blue">
                    {product.name}
                </h3>
                {product.short_description && (
                    <p className="line-clamp-2 break-words text-xs leading-relaxed text-gray-500">{product.short_description}</p>
                )}

                <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                    {price !== null ? (
                        <div className="min-w-0">
                            <span className="block text-[10px] text-gray-400">Starting from</span>
                            <span className="block truncate text-base font-extrabold text-brand-blue">{formatKES(price)}</span>
                        </div>
                    ) : (
                        <div className="min-w-0">
                            <span className="block text-[10px] text-gray-400">Pricing</span>
                            <span className="block text-sm font-bold text-brand-orange">{orderOnline ? "Configure" : "On request"}</span>
                        </div>
                    )}
                    <span
                        className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition-all duration-200 group-hover:w-[4.5rem]",
                            orderOnline ? "bg-brand-blue" : "bg-brand-orange",
                        )}
                        aria-hidden="true"
                    >
                        <span className="hidden text-xs font-semibold group-hover:inline">{orderOnline ? "Order" : "Quote"}&nbsp;</span>
                        <ArrowRightIcon className="h-4 w-4 shrink-0" />
                    </span>
                </div>
            </div>
        </Link>
    );
});
ProductCard.displayName = "ProductCard";

function StorePageInner(): ReactElement {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeCategoryId = searchParams.get("category") ?? "";
    const activeType = searchParams.get("type") ?? "";
    const searchQuery = searchParams.get("q") ?? "";
    const deferredSearch = useDeferredValue(searchQuery);
    const pricingMode = TYPE_FILTERS.find((t) => t.value === activeType)?.pricingMode;
    const productsRef = useRef<HTMLElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const { data: categoriesData = [] } = useQuery<ProductCategory[]>({
        queryKey: ["product-categories"],
        queryFn: fetchCategories,
        staleTime: 5 * 60_000,
    });

    // No filters → browse view, organised by category. Any filter or search → grid.
    const hasFilters = Boolean(activeCategoryId || activeType || searchQuery);
    const browse = useQuery({
        queryKey: ["catalog-all"],
        queryFn: fetchAllCatalog,
        staleTime: 5 * 60_000,
        enabled: !hasFilters,
    });
    const groups = useMemo(() => groupByCategory(browse.data ?? [], categoriesData), [browse.data, categoriesData]);
    // Once the catalog is loaded, only offer categories that actually have products
    // (an empty category pill just leads to "No products").
    const shopCategories = useMemo(() => {
        if (!browse.data) return categoriesData;
        const withProducts = new Set(groups.map((g) => g.key));
        return categoriesData.filter((c) => withProducts.has(String(c.id)) || String(c.id) === activeCategoryId);
    }, [browse.data, groups, categoriesData, activeCategoryId]);
    const popular = useMemo(
        () => (browse.data ?? []).filter((p) => p.bestseller_badge || p.feature_product || p.on_sale_badge || p.new_arrival).slice(0, 12),
        [browse.data],
    );

    const {
        data,
        isLoading,
        isError,
        isPlaceholderData,
        isFetching,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ["catalog-products", activeCategoryId, deferredSearch, pricingMode ?? ""],
        queryFn: ({ pageParam }) =>
            fetchCatalogProducts({
                search: deferredSearch || undefined,
                category: activeCategoryId || undefined,
                pricing_mode: pricingMode,
                page_size: 24,
                page: pageParam,
            }),
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.reduce((sum, p) => sum + p.results.length, 0);
            return loaded < lastPage.count ? allPages.length + 1 : undefined;
        },
        // Keep showing the current products while a new filter loads, so the
        // page keeps its height and the browser doesn't snap back to the top.
        placeholderData: keepPreviousData,
        staleTime: 60_000,
        enabled: hasFilters,
    });

    const allProducts = data?.pages.flatMap((p) => p.results) ?? [];
    const total = data?.pages[0]?.count ?? 0;
    const switching = isPlaceholderData && isFetching;

    const categoryLabel = useMemo(() => {
        const match = categoriesData.find((c) => String(c.id) === activeCategoryId);
        return match?.name ?? "";
    }, [categoriesData, activeCategoryId]);

    // Load the next page automatically when the end of the grid comes into view.
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || !hasNextPage) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
            },
            { rootMargin: "600px 0px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    /** Update the URL filters without scrolling. If the visitor has scrolled past
     *  the top of the product grid, bring its top back into view. */
    const setFilters = (changes: Record<string, string | null>): void => {
        const next = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
        }
        const qs = next.toString();
        router.push(qs ? `/store?${qs}` : "/store", { scroll: false });
        const top = productsRef.current?.getBoundingClientRect().top;
        if (top !== undefined && top < 0) {
            productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    const scrollToProducts = (): void => {
        productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const openTile = (keywords: readonly string[]): void => {
        const match = categoriesData.find((c) => keywords.some((k) => c.name.toLowerCase().includes(k)));
        if (match) setFilters({ category: String(match.id) });
        scrollToProducts();
    };

    return (
        <>
            {/* ── HERO ───────────────────────────────────────────────── */}
            <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
                <div className="relative overflow-hidden rounded-3xl bg-brand-blue">
                    <div className="absolute inset-0">
                        <Image src="/banner/banner.jpg" alt="" fill className="object-cover opacity-15" priority />
                        <div className="absolute inset-0 bg-gradient-to-r from-brand-blue via-brand-blue/90 to-brand-blue/40" />
                    </div>
                    <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-yellow/25 blur-3xl" />

                    <div className="relative z-10 grid items-center gap-8 px-6 py-10 sm:px-12 sm:py-14 lg:grid-cols-[1.1fr_1fr]">
                        <div>
                            <span className="mb-4 inline-block rounded-full border border-brand-yellow/40 bg-brand-yellow/15 px-3 py-1 text-xs font-semibold text-brand-yellow">
                                Print &amp; branding, delivered
                            </span>
                            <h1 className="mb-4 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
                                Print that
                                <br />
                                <span className="text-brand-yellow">builds brands.</span>
                            </h1>
                            <p className="mb-7 max-w-md text-base leading-relaxed text-white/80">
                                From business cards to full vehicle wraps. Configure your order, see the price
                                instantly, and get it delivered across Nairobi and beyond.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={scrollToProducts}
                                    className="inline-flex items-center gap-2 rounded-xl bg-brand-yellow px-6 py-3 text-sm font-bold text-brand-black shadow-lg shadow-brand-yellow/30 transition-colors hover:bg-brand-yellow/90"
                                >
                                    Browse products
                                    <ArrowRightIcon className="h-4 w-4" />
                                </button>
                                <Link
                                    href="/contact"
                                    className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                                >
                                    Talk to us
                                </Link>
                            </div>
                            {categoriesData.length > 0 && (
                                <div className="mt-6 flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-medium text-white/60">Popular:</span>
                                    {shopCategories.slice(0, 5).map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => { setFilters({ category: String(cat.id) }); scrollToProducts(); }}
                                            className="rounded-full border border-white/25 px-3 py-1 text-xs font-medium text-white/85 transition-colors hover:border-brand-yellow hover:text-brand-yellow"
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {HERO_TILES.map((tile) => (
                                <button
                                    key={tile.label}
                                    type="button"
                                    onClick={() => openTile(tile.keywords)}
                                    className="group relative aspect-[4/3] overflow-hidden rounded-2xl border-2 border-white/15 text-left transition-all hover:border-brand-yellow/70"
                                >
                                    <Image src={tile.img} alt="" fill sizes="(max-width: 1024px) 50vw, 20vw" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                    <span className="absolute inset-x-3 bottom-2.5 flex items-center justify-between text-xs font-semibold text-white sm:text-sm">
                                        {tile.label}
                                        <ArrowRightIcon className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── TRUST STRIP ────────────────────────────────────────── */}
            <section className="mx-auto mt-5 max-w-7xl px-4 sm:px-6">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {TRUST_ITEMS.map(({ icon: Icon, title, subtitle }) => (
                        <div key={title} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue/5">
                                <Icon className="h-4 w-4 text-brand-blue" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-gray-900">{title}</p>
                                <p className="truncate text-[11px] text-gray-500">{subtitle}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── PRODUCTS ───────────────────────────────────────────── */}
            <section ref={productsRef} id="products-section" className="mx-auto mt-12 max-w-7xl scroll-mt-20 px-4 sm:px-6">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900">
                            {hasFilters ? categoryLabel || (searchQuery ? "Search results" : "Products") : "Shop by category"}
                        </h2>
                        <p className="mt-0.5 text-sm text-gray-500">
                            {hasFilters ? (
                                <>
                                    {isLoading ? "Loading…" : `${total} product${total !== 1 ? "s" : ""}`}
                                    {searchQuery && <> matching &ldquo;{searchQuery}&rdquo;</>}
                                </>
                            ) : browse.data ? (
                                `${browse.data.length} products in ${groups.length} categories`
                            ) : (
                                "Loading…"
                            )}
                        </p>
                    </div>
                    {hasFilters && (
                        <button
                            type="button"
                            onClick={() => setFilters({ category: null, type: null, q: null })}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                        >
                            <XIcon className="h-4 w-4" />
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Sticky filter bar (sticks under the navbar on tablet and desktop) */}
                <div className="z-30 -mx-4 border-y border-gray-100 bg-gray-50/95 px-4 py-3 backdrop-blur-sm sm:sticky sm:top-16 sm:-mx-6 sm:px-6">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-none">
                            <FilterPill active={!activeCategoryId} onClick={() => setFilters({ category: null })}>
                                All categories
                            </FilterPill>
                            {shopCategories.map((cat) => (
                                <FilterPill
                                    key={cat.id}
                                    active={activeCategoryId === String(cat.id)}
                                    onClick={() => setFilters({ category: String(cat.id) })}
                                >
                                    {cat.name}
                                </FilterPill>
                            ))}
                        </div>
                        <div className="inline-flex shrink-0 self-start rounded-xl border border-gray-200 bg-white p-1 lg:self-auto" role="group" aria-label="How it's priced">
                            {TYPE_FILTERS.map((t) => (
                                <button
                                    key={t.value}
                                    type="button"
                                    aria-pressed={activeType === t.value}
                                    onClick={() => setFilters({ type: t.value || null })}
                                    className={cn(
                                        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                                        activeType === t.value ? "bg-brand-blue text-white" : "text-gray-600 hover:text-brand-blue",
                                    )}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {!hasFilters && (
                    <BrowseView
                        loading={browse.isLoading}
                        error={browse.isError}
                        onRetry={() => void browse.refetch()}
                        groups={groups}
                        popular={popular}
                        onOpenCategory={(id) => setFilters({ category: id === null ? null : String(id) })}
                    />
                )}

                <div className={cn("mt-6", !hasFilters && "hidden")}>
                    {isLoading && (
                        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                                    <div className="aspect-square animate-pulse bg-gray-100" />
                                    <div className="space-y-2 p-4">
                                        <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
                                        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
                                        <div className="h-5 w-1/2 animate-pulse rounded bg-gray-100" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {isError && !isLoading && (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 text-center">
                            <AlertCircleIcon className="mb-3 h-10 w-10 text-brand-red/70" />
                            <p className="font-medium text-gray-700">We couldn&apos;t load the products.</p>
                            <p className="mt-1 text-sm text-gray-500">Check your connection and try again.</p>
                            <button
                                type="button"
                                onClick={() => void refetch()}
                                className="mt-5 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue/90"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {!isLoading && !isError && allProducts.length === 0 && (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
                            <SearchIcon className="mb-3 h-10 w-10 text-gray-300" />
                            <p className="font-medium text-gray-700">No products match these filters.</p>
                            <p className="mt-1 max-w-sm text-sm text-gray-500">
                                Try another category or search term, or tell us what you need and we&apos;ll quote it for you.
                            </p>
                            <div className="mt-5 flex flex-wrap justify-center gap-3">
                                {hasFilters && (
                                    <button
                                        type="button"
                                        onClick={() => setFilters({ category: null, type: null, q: null })}
                                        className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                    >
                                        Clear filters
                                    </button>
                                )}
                                <Link href="/contact" className="rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-orange/90">
                                    Request a custom quote
                                </Link>
                            </div>
                        </div>
                    )}

                    {!isLoading && !isError && allProducts.length > 0 && (
                        <div
                            className={cn(
                                "grid grid-cols-2 gap-4 transition-opacity duration-200 sm:gap-5 md:grid-cols-3 lg:grid-cols-4",
                                switching && "pointer-events-none opacity-50",
                            )}
                            aria-busy={switching}
                        >
                            {allProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    )}

                    <div ref={sentinelRef} aria-hidden="true" />
                    {(hasNextPage || isFetchingNextPage) && !isLoading && (
                        <div className="mt-8 flex flex-col items-center gap-2">
                            <p className="text-xs text-gray-500">
                                Showing {allProducts.length} of {total}
                            </p>
                            <button
                                type="button"
                                onClick={() => void fetchNextPage()}
                                disabled={isFetchingNextPage}
                                className="inline-flex items-center gap-2 rounded-xl border-2 border-brand-blue px-8 py-3 text-sm font-semibold text-brand-blue transition-all duration-200 hover:bg-brand-blue hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isFetchingNextPage && <Loader2Icon className="h-4 w-4 animate-spin" />}
                                {isFetchingNextPage ? "Loading more…" : "Load more products"}
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* ── HOW IT WORKS ───────────────────────────────────────── */}
            <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
                <div className="mb-8 text-center">
                    <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">How ordering works</h2>
                    <p className="mt-2 text-sm text-gray-500">Four steps from idea to your door.</p>
                </div>
                <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {STEPS.map(({ icon: Icon, title, text }, i) => (
                        <li key={title} className="relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                            <span className="absolute right-4 top-4 text-3xl font-extrabold text-gray-100">{i + 1}</span>
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-yellow/20">
                                <Icon className="h-5 w-5 text-brand-blue" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                            <p className="mt-1 text-sm leading-relaxed text-gray-500">{text}</p>
                        </li>
                    ))}
                </ol>
            </section>

            {/* ── CLIENTS ────────────────────────────────────────────── */}
            <section className="mt-20">
                <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Trusted by teams across Kenya
                </p>
                <LogoCloud />
            </section>

            {/* ── CUSTOM QUOTE CTA ───────────────────────────────────── */}
            <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
                <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-r from-brand-orange to-brand-red px-8 py-10 text-white sm:flex-row sm:items-center sm:px-12">
                    <div className="flex items-start gap-4">
                        <MessageSquareQuoteIcon className="mt-1 hidden h-10 w-10 shrink-0 opacity-80 sm:block" />
                        <div>
                            <h2 className="text-2xl font-extrabold">Can&apos;t find what you need?</h2>
                            <p className="mt-1 max-w-xl text-sm text-white/85">
                                Event branding, large runs, special finishes: tell us about the job and we&apos;ll send you a tailored quote.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/contact"
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-brand-red transition-colors hover:bg-white/90"
                    >
                        Request a quote
                        <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            {/* ── FOOTER ─────────────────────────────────────────────── */}
            <footer className="mt-20 bg-brand-blue text-white">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <Image src="/logo/pd.png" alt="Print Duka" width={120} height={54} className="mb-4 h-12 w-auto brightness-0 invert" />
                            <p className="text-sm leading-relaxed text-white/70">
                                Kenya&apos;s print &amp; branding partner. Quality you can see and trust.
                            </p>
                        </div>
                        <div>
                            <h4 className="mb-3 text-sm font-bold text-brand-yellow">Shop</h4>
                            <ul className="space-y-2">
                                {shopCategories.slice(0, 5).map((cat) => (
                                    <li key={cat.id}>
                                        <button
                                            type="button"
                                            onClick={() => setFilters({ category: String(cat.id) })}
                                            className="text-left text-sm text-white/70 transition-colors hover:text-white"
                                        >
                                            {cat.name}
                                        </button>
                                    </li>
                                ))}
                                <li>
                                    <button type="button" onClick={() => setFilters({ category: null, type: null, q: null })} className="text-sm text-white/70 transition-colors hover:text-white">
                                        All products
                                    </button>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="mb-3 text-sm font-bold text-brand-yellow">Your order</h4>
                            <ul className="space-y-2 text-sm">
                                <li><Link href="/store/quote-request" className="text-white/70 transition-colors hover:text-white">Quote cart</Link></li>
                                <li><Link href="/login" className="text-white/70 transition-colors hover:text-white">Sign in</Link></li>
                                <li><Link href="/register" className="text-white/70 transition-colors hover:text-white">Create an account</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="mb-3 text-sm font-bold text-brand-yellow">Company</h4>
                            <ul className="space-y-2 text-sm">
                                <li><Link href="/" className="text-white/70 transition-colors hover:text-white">About Print Duka</Link></li>
                                <li><Link href="/impact" className="text-white/70 transition-colors hover:text-white">Our impact</Link></li>
                                <li><Link href="/contact" className="text-white/70 transition-colors hover:text-white">Contact us</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-10 border-t border-white/10 pt-8 text-sm text-white/50">
                        <p>© {new Date().getFullYear()} Print Duka. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </>
    );
}

function ProductSkeleton(): ReactElement {
    return (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <div className="aspect-square animate-pulse bg-gray-100" />
            <div className="space-y-2 p-4">
                <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
                <div className="h-5 w-1/2 animate-pulse rounded bg-gray-100" />
            </div>
        </div>
    );
}

/** A row of products: a 4-column grid on desktop, a swipeable strip on mobile. */
function ProductRow({ products, onSeeAll, seeAllLabel }: { products: CatalogProduct[]; onSeeAll?: () => void; seeAllLabel?: string }): ReactElement {
    const trackRef = useRef<HTMLDivElement>(null);
    const [edges, setEdges] = useState<{ start: boolean; end: boolean }>({ start: true, end: false });

    const updateEdges = (): void => {
        const el = trackRef.current;
        if (!el) return;
        setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    };
    useEffect(updateEdges, [products.length]);

    const page = (dir: 1 | -1): void => {
        const el = trackRef.current;
        if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
    };

    const itemCls = "w-[46%] shrink-0 snap-start sm:w-[calc((100%-2.5rem)/3)] lg:w-[calc((100%-3.75rem)/4)]";

    return (
        <div className="group/row relative">
            <div
                ref={trackRef}
                onScroll={updateEdges}
                className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 scrollbar-none sm:mx-0 sm:gap-5 sm:px-0"
            >
                {products.map((p) => (
                    <div key={p.id} className={itemCls}>
                        <ProductCard product={p} />
                    </div>
                ))}
                {onSeeAll && (
                    <div className={itemCls}>
                        <button
                            type="button"
                            onClick={onSeeAll}
                            className="flex h-full min-h-[16rem] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/[0.03] p-6 text-center text-brand-blue transition-colors hover:border-brand-blue/50 hover:bg-brand-blue/5"
                        >
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue text-white">
                                <ArrowRightIcon className="h-5 w-5" />
                            </span>
                            <span className="text-sm font-bold">{seeAllLabel ?? "See all"}</span>
                        </button>
                    </div>
                )}
            </div>
            {!edges.start && (
                <button
                    type="button"
                    onClick={() => page(-1)}
                    aria-label="Scroll left"
                    className="absolute -left-4 top-1/3 z-10 hidden h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-lg transition hover:text-brand-blue sm:flex"
                >
                    <ChevronLeftIcon className="h-5 w-5" />
                </button>
            )}
            {!edges.end && (
                <button
                    type="button"
                    onClick={() => page(1)}
                    aria-label="Scroll right"
                    className="absolute -right-4 top-1/3 z-10 hidden h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-lg transition hover:text-brand-blue sm:flex"
                >
                    <ChevronRightIcon className="h-5 w-5" />
                </button>
            )}
        </div>
    );
}

function CategoryCard({ group, onOpen }: { group: CategoryGroup; onOpen: () => void }): ReactElement {
    const images = group.products.map((p) => p.primary_image_url).filter((u): u is string => Boolean(u)).slice(0, 3);
    return (
        <button
            type="button"
            onClick={onOpen}
            className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-blue/20 hover:shadow-xl hover:shadow-brand-blue/5"
        >
            <div className="grid aspect-[4/3] grid-cols-2 grid-rows-2 gap-0.5 bg-gray-100">
                {images.length === 0 ? (
                    <div className="col-span-2 row-span-2 flex items-center justify-center bg-gradient-to-br from-brand-blue/5 to-brand-yellow/10">
                        <ShoppingCartIcon className="h-10 w-10 text-brand-blue/30" />
                    </div>
                ) : (
                    images.map((src, i) => (
                        <div
                            key={src + i}
                            className={cn(
                                "relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100",
                                i === 0 && "row-span-2",
                                images.length === 1 && "col-span-2",
                                images.length === 2 && "row-span-2",
                            )}
                        >
                            <Image src={src} alt="" fill sizes="(max-width: 640px) 50vw, 20vw" className="object-contain p-2 transition-transform duration-500 group-hover:scale-105" />
                        </div>
                    ))
                )}
            </div>
            <div className="flex items-center justify-between gap-2 p-4">
                <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-gray-900 group-hover:text-brand-blue">{group.name}</h3>
                    <p className="text-xs text-gray-500">
                        {group.products.length} product{group.products.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue/5 text-brand-blue transition-colors group-hover:bg-brand-blue group-hover:text-white">
                    <ArrowRightIcon className="h-4 w-4" />
                </span>
            </div>
        </button>
    );
}

function SectionHeader({ title, subtitle, actionLabel, onAction }: { title: string; subtitle?: string; actionLabel?: string; onAction?: () => void }): ReactElement {
    return (
        <div className="mb-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
                <h3 className="truncate text-lg font-extrabold text-gray-900">{title}</h3>
                {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
            {actionLabel && onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-blue hover:underline"
                >
                    {actionLabel}
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

interface BrowseViewProps {
    loading: boolean;
    error: boolean;
    onRetry: () => void;
    groups: CategoryGroup[];
    popular: CatalogProduct[];
    onOpenCategory: (id: number | null) => void;
}

/** Default /store view: category cards, popular picks, then one row per category. */
function BrowseView({ loading, error, onRetry, groups, popular, onOpenCategory }: BrowseViewProps): ReactElement {
    if (loading) {
        return (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
        );
    }
    if (error) {
        return (
            <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 text-center">
                <AlertCircleIcon className="mb-3 h-10 w-10 text-brand-red/70" />
                <p className="font-medium text-gray-700">We couldn&apos;t load the products.</p>
                <p className="mt-1 text-sm text-gray-500">Check your connection and try again.</p>
                <button type="button" onClick={onRetry} className="mt-5 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue/90">
                    Try again
                </button>
            </div>
        );
    }
    if (groups.length === 0) {
        return <p className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center text-sm text-gray-500">Products will appear here soon.</p>;
    }

    return (
        <div className="mt-6 space-y-14">
            <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                {groups.filter((g) => g.id !== null).map((g) => (
                    <CategoryCard key={g.key} group={g} onOpen={() => onOpenCategory(g.id)} />
                ))}
            </div>

            {popular.length > 0 && (
                <div className="rounded-3xl bg-gradient-to-br from-brand-yellow/15 via-white to-brand-blue/5 p-5 sm:p-8">
                    <SectionHeader title="Popular picks" subtitle="Best sellers, new arrivals and offers" />
                    <ProductRow products={popular} />
                </div>
            )}

            {groups.map((g) => (
                <div key={g.key}>
                    <SectionHeader
                        title={g.name}
                        subtitle={`${g.products.length} product${g.products.length !== 1 ? "s" : ""}`}
                        actionLabel={g.id === null ? undefined : g.products.length > 4 ? `View all ${g.products.length}` : "View category"}
                        onAction={() => onOpenCategory(g.id)}
                    />
                    <ProductRow
                        products={g.products.slice(0, 12)}
                        onSeeAll={g.id !== null && g.products.length > 4 ? () => onOpenCategory(g.id) : undefined}
                        seeAllLabel={`See all ${g.products.length} in ${g.name}`}
                    />
                </div>
            ))}
        </div>
    );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }): ReactElement {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                active
                    ? "bg-brand-blue text-white shadow-md shadow-brand-blue/25"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-brand-blue/40 hover:text-brand-blue",
            )}
        >
            {children}
        </button>
    );
}

export default function StorePage(): ReactElement {
    return (
        <Suspense>
            <StorePageInner />
        </Suspense>
    );
}

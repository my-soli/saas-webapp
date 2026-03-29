"use client";

import { useState, useRef, useEffect } from "react";
import type { ReactElement, KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
    SearchIcon,
    UserIcon,
    ShoppingCartIcon,
    ChevronDownIcon,
    MenuIcon,
    XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MAX_NAV_CATS = 5;

interface ProductCategory {
    id: number;
    name: string;
    slug: string;
}

async function fetchCategories(): Promise<ProductCategory[]> {
    const res = await fetch(`${API_BASE_URL}/api/v1/product-categories/?page_size=100`);
    if (!res.ok) return [];
    const data = await res.json() as { results?: ProductCategory[] } | ProductCategory[];
    return Array.isArray(data) ? data : (data.results ?? []);
}

export default function StoreNavbar(): ReactElement {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeCategory = searchParams.get("category") ?? "All";
    const isStoreListing = pathname === "/store";

    const [searchValue, setSearchValue] = useState<string>("");
    const [showMore, setShowMore] = useState<boolean>(false);
    const [mobileOpen, setMobileOpen] = useState<boolean>(false);
    const moreRef = useRef<HTMLDivElement>(null);

    const { data: categories = [] } = useQuery<ProductCategory[]>({
        queryKey: ["product-categories"],
        queryFn: fetchCategories,
        staleTime: 5 * 60_000,
    });

    const visibleCats = categories.slice(0, MAX_NAV_CATS);
    const overflowCats = categories.slice(MAX_NAV_CATS);

    const buildCategoryHref = (name: string): string =>
        name === "All" ? "/store" : `/store?category=${encodeURIComponent(name)}`;

    const handleSearchSubmit = (e: KeyboardEvent<HTMLInputElement>): void => {
        if (e.key !== "Enter" || !searchValue.trim()) return;
        router.push(`/store?q=${encodeURIComponent(searchValue.trim())}`);
        setSearchValue("");
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent): void => {
            if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
                setShowMore(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isCatActive = (name: string): boolean =>
        isStoreListing && activeCategory === name;

    const allActive = isStoreListing && activeCategory === "All" && !searchParams.get("q");

    return (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <div className="flex h-16 items-center gap-4">
                    {/* Logo */}
                    <Link href="/store" className="flex-shrink-0">
                        <Image
                            src="/logo/logo.png"
                            alt="Print Duka"
                            width={160}
                            height={72}
                            className="h-10 w-auto"
                            priority
                        />
                    </Link>

                    {/* Desktop category nav */}
                    <nav className="hidden lg:flex items-center gap-0.5 ml-4">
                        <Link
                            href="/store"
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                                allActive
                                    ? "bg-brand-blue/10 text-brand-blue"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                            )}
                        >
                            All Products
                        </Link>

                        {visibleCats.map((cat) => (
                            <Link
                                key={cat.id}
                                href={buildCategoryHref(cat.name)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                                    isCatActive(cat.name)
                                        ? "bg-brand-blue/10 text-brand-blue"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                                )}
                            >
                                {cat.name}
                            </Link>
                        ))}

                        {overflowCats.length > 0 && (
                            <div ref={moreRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowMore((s) => !s)}
                                    className={cn(
                                        "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                        showMore
                                            ? "bg-brand-blue/10 text-brand-blue"
                                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                                    )}
                                >
                                    More
                                    <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", showMore && "rotate-180")} />
                                </button>
                                {showMore && (
                                    <div className="absolute left-0 top-full mt-1 w-48 rounded-2xl bg-white border border-gray-100 shadow-xl py-1.5 z-50">
                                        {overflowCats.map((cat) => (
                                            <Link
                                                key={cat.id}
                                                href={buildCategoryHref(cat.name)}
                                                onClick={() => setShowMore(false)}
                                                className={cn(
                                                    "block px-4 py-2 text-sm transition-colors",
                                                    isCatActive(cat.name)
                                                        ? "text-brand-blue font-semibold bg-brand-blue/5"
                                                        : "text-gray-700 hover:bg-gray-50",
                                                )}
                                            >
                                                {cat.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </nav>

                    {/* Search */}
                    <div className="flex-1 max-w-sm mx-auto hidden sm:block">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search products…"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                onKeyDown={handleSearchSubmit}
                                className="w-full rounded-xl bg-gray-100 pl-9 pr-4 py-2 text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-all"
                            />
                        </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-2 ml-auto">
                        <button type="button" className="sm:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100">
                            <SearchIcon className="h-5 w-5" />
                        </button>
                        <Link
                            href="/login"
                            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <UserIcon className="h-4 w-4" />
                            Sign In
                        </Link>
                        <button
                            type="button"
                            className="relative p-2 rounded-xl bg-brand-blue text-white hover:bg-brand-blue/90 transition-colors"
                            aria-label="Cart"
                        >
                            <ShoppingCartIcon className="h-5 w-5" />
                        </button>
                        {/* Mobile menu toggle */}
                        <button
                            type="button"
                            className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                            onClick={() => setMobileOpen((o) => !o)}
                            aria-label="Toggle menu"
                        >
                            {mobileOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile search */}
                <div className="sm:hidden pb-3">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search products…"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onKeyDown={handleSearchSubmit}
                            className="w-full rounded-xl bg-gray-100 pl-9 pr-4 py-2 text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Mobile category menu */}
            {mobileOpen && (
                <div className="lg:hidden border-t border-gray-100 bg-white px-4 pt-3 pb-4 space-y-1">
                    <Link
                        href="/store"
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                            "block rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                            allActive ? "bg-brand-blue/10 text-brand-blue" : "text-gray-700 hover:bg-gray-50",
                        )}
                    >
                        All Products
                    </Link>
                    {categories.map((cat) => (
                        <Link
                            key={cat.id}
                            href={buildCategoryHref(cat.name)}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                                "block rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                                isCatActive(cat.name) ? "bg-brand-blue/10 text-brand-blue" : "text-gray-700 hover:bg-gray-50",
                            )}
                        >
                            {cat.name}
                        </Link>
                    ))}
                    <div className="pt-2 border-t border-gray-100">
                        <Link
                            href="/login"
                            className="block rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}

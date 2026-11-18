"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DownloadIcon, PlusIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/admin-layout";
import {
    archiveProduct,
    deleteProduct,
    fetchProducts,
    publishProduct,
} from "@/services/products";
import type { ProductPricingMode, ProductStatus, ProductsQueryParams } from "@/types/products";
import ProductsFilters from "@/features/products/components/ProductsFilters";
import ProductsTable from "@/features/products/components/ProductsTable";
import ProductsPagination from "@/features/products/components/ProductsPagination";
import ProductsSkeleton from "@/features/products/components/ProductsSkeleton";
import ProductsEmptyState from "@/features/products/components/ProductsEmptyState";
import ProductsExportModal from "@/features/products/components/ProductsExportModal";
import { fetchPrintCategories, fetchProductCategories } from "@/services/product-catalog-setup";
import { resolveProductsBasePath } from "@/lib/product-routes";

export default function AdminProductsPage(): ReactElement {
    const router = useRouter();
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const basePath = resolveProductsBasePath(pathname);

    // Filters are remembered for the browser session (like the page number), so
    // coming back from editing a product keeps the same filtered list.
    const filtersStorageKey = `products-list-filters:${basePath}`;
    const savedFilters = ((): Partial<Record<"search" | "status" | "pricingMode" | "printCategory" | "category", string>> => {
        if (typeof window === "undefined") return {};
        try {
            return JSON.parse(sessionStorage.getItem(filtersStorageKey) ?? "{}") as Record<string, string>;
        } catch {
            return {};
        }
    })();
    const [search, setSearch] = useState<string>(savedFilters.search ?? "");
    const [debouncedSearch, setDebouncedSearch] = useState<string>(savedFilters.search ?? "");
    const [status, setStatus] = useState<ProductStatus | "all">((savedFilters.status as ProductStatus | "all") ?? "all");
    const [pricingMode, setPricingMode] = useState<ProductPricingMode | "all">((savedFilters.pricingMode as ProductPricingMode | "all") ?? "all");
    const [printCategory, setPrintCategory] = useState<string>(savedFilters.printCategory ?? "");
    const [category, setCategory] = useState<string>(savedFilters.category ?? "");
    const [showExport, setShowExport] = useState<boolean>(false);

    useEffect((): void => {
        try {
            sessionStorage.setItem(
                filtersStorageKey,
                JSON.stringify({ search: debouncedSearch, status, pricingMode, printCategory, category }),
            );
        } catch {
            // storage unavailable — filters just won't be remembered
        }
    }, [filtersStorageKey, debouncedSearch, status, pricingMode, printCategory, category]);

    // Remembered per list (admin/business/production-team each have their own
    // products list) so returning via a sidebar link — not browser back —
    // still lands on the page the admin was on, instead of resetting to 1.
    const pageStorageKey = `products-list-page:${basePath}`;
    const [page, setPage] = useState<number>(() => {
        if (typeof window === "undefined") return 1;
        const stored = Number(sessionStorage.getItem(pageStorageKey));
        return stored > 0 ? stored : 1;
    });
    const [pageSize, setPageSize] = useState<number>(20);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

    useEffect((): void => {
        sessionStorage.setItem(pageStorageKey, String(page));
    }, [page, pageStorageKey]);

    useEffect((): (() => void) => {
        const timer = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    const queryParams = useMemo(
        (): ProductsQueryParams => ({
            search: debouncedSearch,
            status,
            pricingMode,
            printCategory,
            category,
            page,
            pageSize,
        }),
        [debouncedSearch, status, pricingMode, printCategory, category, page, pageSize],
    );

    const { data, isLoading, isError } = useQuery({
        queryKey: ["products", queryParams],
        queryFn: async () => {
            try {
                return await fetchProducts(queryParams);
            } catch (e) {
                // A remembered page number can be past the end once products change
                // (the API answers 404): go back to page 1 instead of showing an error.
                if (queryParams.page > 1 && String((e as Error).message).includes("404")) {
                    setPage(1);
                    return fetchProducts({ ...queryParams, page: 1 });
                }
                throw e;
            }
        },
    });

    // Names for the export summary (same cached queries the filters use).
    const { data: printCategories = [] } = useQuery({ queryKey: ["print-categories"], queryFn: fetchPrintCategories, staleTime: 5 * 60_000 });
    const { data: productCategories = [] } = useQuery({ queryKey: ["product-categories"], queryFn: fetchProductCategories, staleTime: 5 * 60_000 });
    const filterSummary = [
        debouncedSearch && `"${debouncedSearch}"`,
        status !== "all" && status.charAt(0).toUpperCase() + status.slice(1),
        pricingMode !== "all" && (pricingMode === "auto_calculate" ? "Auto Calculate" : "Quote Only"),
        printCategory && (printCategories.find((c) => String(c.id) === printCategory)?.name ?? "Print category"),
        category && (productCategories.find((c) => String(c.id) === category)?.name ?? "Category"),
    ].filter((x): x is string => Boolean(x));

    const deleteMutation = useMutation({
        mutationFn: deleteProduct,
        onSuccess: () => {
            toast.success("Product deleted.");
            queryClient.invalidateQueries({ queryKey: ["products"] });
            setDeleteConfirmId(null);
        },
        onError: () => toast.error("Unable to delete product. Please try again."),
    });

    const publishMutation = useMutation({
        mutationFn: publishProduct,
        onSuccess: () => {
            toast.success("Product published.");
            queryClient.invalidateQueries({ queryKey: ["products"] });
        },
        onError: (err: Error) => toast.error(err.message ?? "Unable to publish product. Please try again."),
    });

    const archiveMutation = useMutation({
        mutationFn: archiveProduct,
        onSuccess: () => {
            toast.success("Product archived.");
            queryClient.invalidateQueries({ queryKey: ["products"] });
        },
        onError: () => toast.error("Unable to archive product. Please try again."),
    });

    const handleResetFilters = (): void => {
        setStatus("all");
        setPricingMode("all");
        setPrintCategory("");
        setCategory("");
        setSearch("");
        setPage(1);
    };

    const isFiltered =
        Boolean(debouncedSearch) ||
        status !== "all" ||
        pricingMode !== "all" ||
        Boolean(printCategory) ||
        Boolean(category);

    const products = data?.results ?? [];
    const count = data?.count ?? 0;

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 lg:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                        {data && (
                            <p className="mt-0.5 text-sm text-gray-500">
                                {count} {count === 1 ? "product" : "products"}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowExport(true)}
                        disabled={!data || count === 0}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        title="Export the products matching the current filters"
                    >
                        <DownloadIcon className="h-4 w-4" />
                        Export
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push(`${basePath}/new`)}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90"
                    >
                        <PlusIcon className="h-4 w-4" />
                        New Product
                    </button>
                    </div>
                </div>
            </header>

            <main className="bg-gray-50 min-h-screen px-4 lg:px-8 py-4 lg:py-6 space-y-4">
                <ProductsFilters
                    search={search}
                    status={status}
                    pricingMode={pricingMode}
                    printCategory={printCategory}
                    category={category}
                    onSearchChange={(v) => { setSearch(v); setPage(1); }}
                    onStatusChange={(v) => { setStatus(v); setPage(1); }}
                    onPricingModeChange={(v) => { setPricingMode(v); setPage(1); }}
                    onPrintCategoryChange={(v) => { setPrintCategory(v); setPage(1); }}
                    onCategoryChange={(v) => { setCategory(v); setPage(1); }}
                    onReset={handleResetFilters}
                />

                {isLoading && <ProductsSkeleton />}

                {isError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        Unable to load products. Please refresh the page.
                    </div>
                )}

                {!isLoading && !isError && products.length === 0 && (
                    <ProductsEmptyState
                        isFiltered={isFiltered}
                        onNewProduct={() => router.push(`${basePath}/new`)}
                    />
                )}

                {!isLoading && !isError && products.length > 0 && (
                    <>
                        <ProductsTable
                            products={products}
                            onEdit={(id) => router.push(`${basePath}/${id}/edit`)}
                            onDelete={(id) => setDeleteConfirmId(id)}
                            onPublish={(id) => publishMutation.mutate(id)}
                            onArchive={(id) => archiveMutation.mutate(id)}
                        />
                        <ProductsPagination
                            count={count}
                            page={page}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                        />
                    </>
                )}
            </main>

            {showExport && (
                <ProductsExportModal
                    params={queryParams}
                    count={count}
                    filterSummary={filterSummary}
                    onClose={() => setShowExport(false)}
                />
            )}

            {/* Delete confirmation modal */}
            {deleteConfirmId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                        <h3 className="text-base font-semibold text-gray-900">Delete Product?</h3>
                        <p className="mt-2 text-sm text-gray-500">
                            This action is permanent and cannot be undone.
                        </p>
                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                                disabled={deleteMutation.isPending}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                            >
                                {deleteMutation.isPending ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

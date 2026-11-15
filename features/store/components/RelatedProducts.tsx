"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { PackageIcon } from "lucide-react";
import { fetchCatalogProducts, type CatalogProduct } from "@/services/store";
import { formatKES } from "@/lib/format";

/** "You may also like" — other products in the same category. */
export default function RelatedProducts({ product }: { product: CatalogProduct }): ReactElement | null {
    const categoryId = product.primary_category;
    const { data } = useQuery({
        queryKey: ["related-products", categoryId],
        queryFn: () => fetchCatalogProducts({ category: String(categoryId), page_size: 9 }),
        enabled: categoryId !== null,
        staleTime: 60_000,
    });

    const related: CatalogProduct[] = (data?.results ?? []).filter((p) => p.id !== product.id).slice(0, 4);
    if (related.length === 0) return null;

    return (
        <div>
            <h2 className="mb-4 text-lg font-bold text-gray-900">You may also like</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {related.map((p) => (
                    <Link
                        key={p.id}
                        href={`/store/${p.id}`}
                        className="group overflow-hidden rounded-2xl border border-gray-100 bg-white transition-shadow hover:shadow-md"
                    >
                        <div className="relative aspect-[4/3] bg-gray-50">
                            {p.primary_image_url ? (
                                <Image
                                    src={p.primary_image_url}
                                    alt={p.name}
                                    fill
                                    className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-gray-300">
                                    <PackageIcon className="h-10 w-10" />
                                </div>
                            )}
                        </div>
                        <div className="p-3">
                            <p className="line-clamp-2 text-sm font-semibold text-gray-900">{p.name}</p>
                            {p.starting_price && (
                                <p className="mt-1 text-xs text-gray-500">
                                    From <span className="font-bold text-brand-blue">{formatKES(p.starting_price)}</span>
                                </p>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

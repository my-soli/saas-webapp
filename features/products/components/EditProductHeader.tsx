"use client";

import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import type { Product } from "@/types/products";

interface EditProductHeaderProps {
    product: Product;
    basePath: string;
}

export default function EditProductHeader({ product, basePath }: EditProductHeaderProps): ReactElement {
    const router = useRouter();
    return (
        <header className="border-b border-gray-200 bg-white">
            <div className="px-4 lg:px-8 py-4">
                <nav className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                    <a href="/admin" className="hover:text-brand-blue">Admin</a>
                    <span>/</span>
                    <button type="button" onClick={() => router.back()} className="hover:text-brand-blue">Products</button>
                    <span>/</span>
                    <span className="text-gray-700">{product.name}</span>
                    <span>/</span>
                    <span className="text-gray-700">Edit</span>
                </nav>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            aria-label="Back to products"
                            title="Back to products"
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-brand-blue transition-colors"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                            <p className="mt-0.5 text-xs font-mono text-gray-400">
                                {product.internal_code}
                            </p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400">
                        Updated {new Date(product.updated_at).toLocaleDateString()}
                    </p>
                </div>
            </div>
        </header>
    );
}

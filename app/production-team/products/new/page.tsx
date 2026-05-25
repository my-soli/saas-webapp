"use client";

import { Suspense, type ReactElement, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminLayout from "@/components/admin/admin-layout";
import ProductForm from "@/features/products/components/ProductForm";
import { useNewProduct } from "@/features/products/hooks/useNewProduct";

const BASE_PATH = "/production-team/products";

function NewProductContent(): ReactElement {
    const router = useRouter();
    const searchParams = useSearchParams();

    const { values, isSubmitting, image, handleValuesChange, handleImageChange, handleSubmit } =
        useNewProduct(BASE_PATH);

    // Pre-fill name from ?name= query param (e.g. from PT notification link)
    useEffect(() => {
        const prefilledName = searchParams.get("name");
        if (prefilledName) {
            handleValuesChange({ ...values, name: prefilledName });
        }
        // Only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4">
                    <nav className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                        <a href="/production-team" className="hover:text-brand-blue">Production Team</a>
                        <span>/</span>
                        <a href={BASE_PATH} className="hover:text-brand-blue">Products</a>
                        <span>/</span>
                        <span className="text-gray-700">New</span>
                    </nav>
                    <h1 className="text-2xl font-bold text-gray-900">Create Product</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Saved as draft until you publish it to the storefront.
                    </p>
                </div>
            </header>
            <main className="bg-gray-50 min-h-screen">
                <div className="px-4 py-6">
                    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                        <ProductForm
                            values={values}
                            onValuesChange={handleValuesChange}
                            onImageChange={handleImageChange}
                            selectedImageName={image?.name ?? null}
                            onSubmit={handleSubmit}
                            onCancel={() => router.push(BASE_PATH)}
                            submitLabel="Create Product"
                            isSubmitting={isSubmitting}
                            isNew
                        />
                    </div>
                </div>
            </main>
        </AdminLayout>
    );
}

export default function NewProductPage(): ReactElement {
    return (
        <Suspense>
            <NewProductContent />
        </Suspense>
    );
}

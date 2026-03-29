"use client";

import { useState, useRef } from "react";
import type { ReactElement, ChangeEvent, DragEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { StarIcon, Trash2Icon, UploadCloudIcon, CheckCircleIcon } from "lucide-react";
import { getCsrfToken } from "@/lib/api/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ProductImage {
    id: number;
    product: number;
    image: string;
    image_url: string | null;
    alt_text: string;
    caption: string;
    image_type: string;
    is_primary: boolean;
    display_order: number;
    uploaded_at: string;
}

async function fetchImages(productId: number): Promise<ProductImage[]> {
    const response = await fetch(
        `${API_BASE_URL}/api/v1/product-images/?product=${productId}&page_size=50`,
        { credentials: "include" },
    );
    if (!response.ok) throw new Error("Failed to load images");
    const data = await response.json() as { results?: ProductImage[] } | ProductImage[];
    return Array.isArray(data) ? data : (data.results ?? []);
}

async function uploadImage(productId: number, file: File, isPrimary: boolean): Promise<ProductImage> {
    const csrf = await getCsrfToken();
    const formData = new FormData();
    formData.append("product", String(productId));
    formData.append("image", file);
    formData.append("alt_text", file.name.replace(/\.[^.]+$/, ""));
    formData.append("is_primary", isPrimary ? "true" : "false");
    formData.append("image_type", "product-photo");
    const response = await fetch(`${API_BASE_URL}/api/v1/product-images/`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRFToken": csrf },
        body: formData,
    });
    if (!response.ok) throw new Error("Upload failed");
    return response.json() as Promise<ProductImage>;
}

async function setPrimary(imageId: number): Promise<ProductImage> {
    const csrf = await getCsrfToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/product-images/${imageId}/`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
        body: JSON.stringify({ is_primary: true }),
    });
    if (!response.ok) throw new Error("Failed to set primary");
    return response.json() as Promise<ProductImage>;
}

async function deleteImage(imageId: number): Promise<void> {
    const csrf = await getCsrfToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/product-images/${imageId}/`, {
        method: "DELETE",
        credentials: "include",
        headers: { "X-CSRFToken": csrf },
    });
    if (!response.ok) throw new Error("Failed to delete image");
}

interface ProductImageManagerProps {
    productId: number;
}

export default function ProductImageManager({ productId }: ProductImageManagerProps): ReactElement {
    const queryClient = useQueryClient();
    const queryKey = ["product-images", productId];
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const { data: images = [], isLoading } = useQuery<ProductImage[]>({
        queryKey,
        queryFn: () => fetchImages(productId),
    });

    const uploadMutation = useMutation({
        mutationFn: ({ file, isPrimary }: { file: File; isPrimary: boolean }) =>
            uploadImage(productId, file, isPrimary),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
    });

    const primaryMutation = useMutation({
        mutationFn: (imageId: number) => setPrimary(imageId),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
    });

    const deleteMutation = useMutation({
        mutationFn: (imageId: number) => deleteImage(imageId),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
    });

    const handleFiles = (files: FileList | null): void => {
        if (!files) return;
        const isPrimaryFirst = images.length === 0;
        Array.from(files).forEach((file, i) => {
            uploadMutation.mutate({ file, isPrimary: isPrimaryFirst && i === 0 });
        });
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
        handleFiles(e.target.files);
        e.target.value = "";
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    const sorted = [...images].sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
        return a.display_order - b.display_order;
    });

    return (
        <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-gray-900">Product Images</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Upload multiple images. Click a thumbnail to set it as primary.
                    </p>
                </div>
            </div>

            {/* Drop zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed cursor-pointer transition-colors py-8 ${
                    dragging ? "border-brand-blue bg-brand-blue/5" : "border-gray-200 hover:border-gray-300 bg-gray-50"
                }`}
            >
                <UploadCloudIcon className={`h-8 w-8 ${dragging ? "text-brand-blue" : "text-gray-300"}`} />
                <p className="text-sm font-medium text-gray-600">Drop images here or click to browse</p>
                <p className="text-xs text-gray-400">PNG, JPG, WebP — multiple files supported</p>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleInputChange}
                />
            </div>

            {uploadMutation.isPending && (
                <p className="text-xs text-brand-blue animate-pulse">Uploading…</p>
            )}

            {isLoading && <p className="text-sm text-gray-400">Loading images…</p>}

            {/* Image grid */}
            {sorted.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {sorted.map((img) => (
                        <div
                            key={img.id}
                            className={`relative group rounded-xl overflow-hidden aspect-square bg-gray-100 ${
                                img.is_primary ? "ring-2 ring-brand-blue ring-offset-2" : "ring-1 ring-gray-200"
                            }`}
                        >
                            {img.image_url ? (
                                <Image
                                    src={img.image_url}
                                    alt={img.alt_text}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 33vw, 25vw"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-gray-300 text-xs">
                                    No preview
                                </div>
                            )}

                            {/* Primary badge */}
                            {img.is_primary && (
                                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-brand-blue px-2 py-0.5">
                                    <CheckCircleIcon className="h-3 w-3 text-white" />
                                    <span className="text-[10px] font-bold text-white">Primary</span>
                                </div>
                            )}

                            {/* Hover actions */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                                {!img.is_primary && (
                                    <button
                                        type="button"
                                        onClick={() => primaryMutation.mutate(img.id)}
                                        disabled={primaryMutation.isPending}
                                        className="flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-[11px] font-semibold text-gray-800 hover:bg-white transition-colors disabled:opacity-50"
                                        title="Set as primary"
                                    >
                                        <StarIcon className="h-3 w-3 text-brand-yellow" />
                                        Set primary
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => deleteMutation.mutate(img.id)}
                                    disabled={deleteMutation.isPending}
                                    className="ml-auto flex items-center justify-center rounded-lg bg-red-500/90 p-1.5 hover:bg-red-600 transition-colors disabled:opacity-50"
                                    aria-label="Delete image"
                                >
                                    <Trash2Icon className="h-3.5 w-3.5 text-white" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && sorted.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">No images yet.</p>
            )}
        </div>
    );
}

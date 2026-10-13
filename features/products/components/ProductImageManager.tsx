"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactElement, ChangeEvent, DragEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { StarIcon, Trash2Icon, UploadCloudIcon, CheckCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { getCsrfToken } from "@/lib/api/auth";

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
    const body = await response.json().catch(() => null) as { detail?: string; image?: string[] } | null;
    return body?.detail || body?.image?.[0] || `${fallback} (${response.status})`;
}

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

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
    color_name: string;
    color_hex: string;
    uploaded_at: string;
}

async function fetchImages(productId: number): Promise<ProductImage[]> {
    const response = await fetch(
        `${PROXY_BASE}/api/proxy/api/v1/product-images/?product=${productId}&page_size=50`,
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
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-images/`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRFToken": csrf },
        body: formData,
    });
    if (!response.ok) throw new Error(await extractErrorMessage(response, "Upload failed"));
    return response.json() as Promise<ProductImage>;
}

async function setPrimary(imageId: number): Promise<ProductImage> {
    const csrf = await getCsrfToken();
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-images/${imageId}/`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
        body: JSON.stringify({ is_primary: true }),
    });
    if (!response.ok) throw new Error(await extractErrorMessage(response, "Failed to set primary"));
    return response.json() as Promise<ProductImage>;
}

async function updateColor(imageId: number, color_name: string, color_hex: string): Promise<ProductImage> {
    const csrf = await getCsrfToken();
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-images/${imageId}/`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
        body: JSON.stringify({ color_name, color_hex }),
    });
    if (!response.ok) throw new Error(await extractErrorMessage(response, "Failed to update colour"));
    return response.json() as Promise<ProductImage>;
}

async function deleteImage(imageId: number): Promise<void> {
    const csrf = await getCsrfToken();
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-images/${imageId}/`, {
        method: "DELETE",
        credentials: "include",
        headers: { "X-CSRFToken": csrf },
    });
    if (!response.ok) throw new Error(await extractErrorMessage(response, "Failed to delete image"));
}

// Common apparel/merchandise colours — click one to fill both the name and
// swatch hex in one go. "Custom…" falls back to the raw colour picker for
// anything not on this list.
const COMMON_COLORS: Array<{ name: string; hex: string }> = [
    { name: "Black", hex: "#111111" },
    { name: "White", hex: "#ffffff" },
    { name: "Grey", hex: "#9ca3af" },
    { name: "Charcoal", hex: "#374151" },
    { name: "Navy", hex: "#1e3a5f" },
    { name: "Royal Blue", hex: "#2563eb" },
    { name: "Sky Blue", hex: "#7dd3fc" },
    { name: "Red", hex: "#dc2626" },
    { name: "Maroon", hex: "#7f1d1d" },
    { name: "Orange", hex: "#f97316" },
    { name: "Yellow", hex: "#facc15" },
    { name: "Gold", hex: "#d4af37" },
    { name: "Green", hex: "#16a34a" },
    { name: "Olive", hex: "#65741e" },
    { name: "Purple", hex: "#7c3aed" },
    { name: "Pink", hex: "#ec4899" },
    { name: "Brown", hex: "#78350f" },
    { name: "Beige", hex: "#d9c6a5" },
];

interface ColorTagRowProps {
    image: ProductImage;
    onSave: (name: string, hex: string) => void;
}

/** Debounced colour-name + swatch editor for one image. Blank name = no swatch on the storefront. */
function ColorTagRow({ image, onSave }: ColorTagRowProps): ReactElement {
    const [name, setName] = useState(image.color_name);
    const [hex, setHex] = useState(image.color_hex || "#cccccc");
    const [open, setOpen] = useState(false);
    const [customMode, setCustomMode] = useState(false);
    const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setName(image.color_name);
        setHex(image.color_hex || "#cccccc");
    }, [image.color_name, image.color_hex]);

    useEffect(() => {
        if (name === image.color_name && hex === (image.color_hex || "#cccccc")) return;
        const timer = setTimeout(() => onSave(name, name ? hex : ""), 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [name, hex]);

    useEffect(() => {
        if (!open) return;
        function handleClickOutside(e: MouseEvent) {
            const target = e.target as Node;
            if (
                triggerRef.current && !triggerRef.current.contains(target) &&
                popoverRef.current && !popoverRef.current.contains(target)
            ) {
                setOpen(false);
                setCustomMode(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    function toggleOpen() {
        if (!open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPopoverPos({ top: rect.bottom + 4, left: rect.left });
        }
        setOpen((o) => !o);
    }

    function pickPreset(preset: { name: string; hex: string }) {
        setName(preset.name);
        setHex(preset.hex);
        setOpen(false);
        setCustomMode(false);
    }

    return (
        <div className="flex items-center gap-1.5">
            <button
                ref={triggerRef}
                type="button"
                onClick={toggleOpen}
                className="h-6 w-6 shrink-0 cursor-pointer rounded-full border border-gray-300"
                style={{ backgroundColor: hex }}
                title="Choose colour"
            />
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Colour name (optional)"
                className="min-w-0 flex-1 rounded border border-gray-200 px-1.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-brand-blue/40"
            />
            {open && popoverPos && createPortal(
                <div
                    ref={popoverRef}
                    className="fixed z-50 w-48 rounded-lg border border-gray-200 bg-white p-2.5 shadow-xl"
                    style={{ top: popoverPos.top, left: popoverPos.left }}
                >
                    <div className="grid grid-cols-6 gap-2">
                        {COMMON_COLORS.map((c) => (
                            <button
                                key={c.name}
                                type="button"
                                onClick={() => pickPreset(c)}
                                title={c.name}
                                className={`h-6 w-6 rounded-full border transition-shadow ${
                                    c.hex === hex ? "ring-2 ring-brand-blue ring-offset-1" : "border-gray-300"
                                }`}
                                style={{ backgroundColor: c.hex }}
                            />
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setCustomMode((m) => !m)}
                        className="mt-2 text-[11px] font-medium text-brand-blue hover:underline"
                    >
                        Custom colour…
                    </button>
                    {customMode && (
                        <input
                            type="color"
                            value={hex}
                            onChange={(e) => setHex(e.target.value)}
                            className="mt-1.5 h-7 w-full cursor-pointer rounded border border-gray-200"
                        />
                    )}
                </div>,
                document.body,
            )}
        </div>
    );
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
        onError: (err: Error) => toast.error(err.message || "Upload failed"),
    });

    const primaryMutation = useMutation({
        mutationFn: (imageId: number) => setPrimary(imageId),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
        onError: (err: Error) => toast.error(err.message || "Failed to set primary"),
    });

    const deleteMutation = useMutation({
        mutationFn: (imageId: number) => deleteImage(imageId),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
        onError: (err: Error) => toast.error(err.message || "Failed to delete image"),
    });

    const colorMutation = useMutation({
        mutationFn: ({ id, name, hex }: { id: number; name: string; hex: string }) => updateColor(id, name, hex),
        onSuccess: (updated) => {
            queryClient.setQueryData<ProductImage[]>(queryKey, (old) =>
                old?.map((i) => (i.id === updated.id ? updated : i)));
        },
        onError: (err: Error) => toast.error(err.message || "Failed to update colour"),
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
                        Upload multiple images. Click a thumbnail to set it as primary. Tag an image with a
                        colour to show it as a colour swatch on the storefront.
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
                        <div key={img.id} className="space-y-1.5">
                        <div
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

                            {/* Set primary — hover only */}
                            {!img.is_primary && (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
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
                                </div>
                            )}
                            {/* Delete — always visible */}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(img.id); }}
                                disabled={deleteMutation.isPending && deleteMutation.variables === img.id}
                                className="absolute top-1.5 right-1.5 z-10 flex items-center justify-center rounded-full bg-red-500 p-1 shadow hover:bg-red-600 transition-colors disabled:opacity-50"
                                aria-label="Delete image"
                            >
                                {deleteMutation.isPending && deleteMutation.variables === img.id
                                    ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    : <Trash2Icon className="h-3 w-3 text-white" />
                                }
                            </button>
                        </div>
                        <ColorTagRow
                            image={img}
                            onSave={(name, hex) => colorMutation.mutate({ id: img.id, name, hex })}
                        />
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

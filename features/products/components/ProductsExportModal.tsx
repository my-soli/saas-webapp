"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { Download, FileSpreadsheet, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { exportProducts, PRODUCT_EXPORT_COLUMNS } from "@/services/products";
import type { ProductsQueryParams } from "@/types/products";

const STORAGE_KEY = "products-export-columns";

function initialColumns(): string[] {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as string[] | null;
        if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch {
        // ignore unreadable storage
    }
    return PRODUCT_EXPORT_COLUMNS.filter((c) => c.default).map((c) => c.key);
}

interface Props {
    params: ProductsQueryParams;
    count: number;
    filterSummary: string[];
    onClose: () => void;
}

/** Pick columns and format, then download the products matching the current filters. */
export default function ProductsExportModal({ params, count, filterSummary, onClose }: Props): ReactElement {
    const [columns, setColumns] = useState<string[]>(initialColumns);
    const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
    const [busy, setBusy] = useState(false);

    const toggle = (key: string): void =>
        setColumns((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

    // Keep the on-screen order regardless of click order.
    const ordered = PRODUCT_EXPORT_COLUMNS.map((c) => c.key).filter((k) => columns.includes(k));

    const handleExport = async (): Promise<void> => {
        if (ordered.length === 0) {
            toast.error("Pick at least one column.");
            return;
        }
        setBusy(true);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ordered));
        } catch {
            // ignore
        }
        try {
            await exportProducts(params, ordered, format);
            toast.success(`Exported ${count} product${count === 1 ? "" : "s"}.`);
            onClose();
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-brand-blue" />
                        <h2 className="text-base font-semibold text-gray-900">Export products</h2>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100" aria-label="Close">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="space-y-5 px-6 py-5">
                    <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                        <span className="font-semibold">{count} product{count === 1 ? "" : "s"}</span>
                        {filterSummary.length > 0 ? <> matching: {filterSummary.join(" · ")}</> : " (no filters, all products)"}
                        <p className="mt-0.5 text-xs text-gray-500">Change the filters on the Products page to export a different set.</p>
                    </div>

                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-800">Columns</p>
                            <div className="flex gap-3 text-xs">
                                <button type="button" className="text-brand-blue hover:underline" onClick={() => setColumns(PRODUCT_EXPORT_COLUMNS.map((c) => c.key))}>
                                    Select all
                                </button>
                                <button type="button" className="text-brand-blue hover:underline" onClick={() => setColumns(PRODUCT_EXPORT_COLUMNS.filter((c) => c.default).map((c) => c.key))}>
                                    Default
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {PRODUCT_EXPORT_COLUMNS.map((c) => (
                                <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={columns.includes(c.key)}
                                        onChange={() => toggle(c.key)}
                                        className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                                    />
                                    {c.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="mb-2 text-sm font-semibold text-gray-800">Format</p>
                        <div className="grid grid-cols-2 gap-2">
                            {([
                                { value: "xlsx", title: "Excel (.xlsx)", hint: "Images shown in the sheet" },
                                { value: "csv", title: "CSV", hint: "Image as a link" },
                            ] as const).map((f) => (
                                <label
                                    key={f.value}
                                    className={`cursor-pointer rounded-lg border-2 px-3 py-2 ${format === f.value ? "border-brand-blue bg-brand-blue/5" : "border-gray-200"}`}
                                >
                                    <input type="radio" name="export-format" className="sr-only" checked={format === f.value} onChange={() => setFormat(f.value)} />
                                    <span className="block text-sm font-semibold text-gray-900">{f.title}</span>
                                    <span className="block text-xs text-gray-500">{f.hint}</span>
                                </label>
                            ))}
                        </div>
                        {format === "xlsx" && ordered.includes("image") && count > 200 && (
                            <p className="mt-2 text-xs text-gray-500">With images, a large export can take up to a minute.</p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                    <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleExport()}
                        disabled={busy || count === 0}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-60"
                    >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        {busy ? "Preparing…" : "Export"}
                    </button>
                </div>
            </div>
        </div>
    );
}

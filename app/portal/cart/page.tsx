"use client";

import { useState, useEffect, useRef, type ReactElement, type ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    ShoppingCart, Search, Plus, Minus, Trash2, X, Package,
    CheckCircle2, ShoppingBag, Paperclip, Check, Copy,
    ExternalLink, Pencil, Eye,
} from "lucide-react";
import {
    fetchCart, addToCart, updateCartItem, removeFromCart,
    clearCart, checkoutCart, fetchDesigns, fetchAMs, fetchPortalProducts,
} from "@/services/client-portal-extras";
import type { CartItem, DesignFile, CheckoutResult, NotifyVia, AMUser, PortalProduct } from "@/types/client-portal-extras";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: string | number): string {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(Number(v));
}

function fmtSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }): ReactElement {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        await navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors shrink-0"
        >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy link"}
        </button>
    );
}

// ── Quantity Stepper (manual type + buttons) ─────────────────────────────────

function QuantityStepper({ value, onChange, size = "md" }: { value: number; onChange: (q: number) => void; size?: "sm" | "md" }): ReactElement {
    const [raw, setRaw] = useState(String(value));
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setRaw(String(value)); }, [value]);

    const commit = (s: string) => {
        const n = parseInt(s, 10);
        if (!isNaN(n) && n >= 1) { onChange(n); setRaw(String(n)); }
        else setRaw(String(value));
    };

    const btnCls = size === "sm"
        ? "w-6 h-6 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
        : "w-7 h-7 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors";
    const inputCls = size === "sm"
        ? "w-10 text-center text-sm font-bold text-brand-blue border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-blue/40 bg-transparent"
        : "w-12 text-center text-sm font-semibold text-gray-800 border border-gray-200 rounded-lg py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-blue/40";

    return (
        <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => { const q = Math.max(1, value - 1); onChange(q); setRaw(String(q)); }} disabled={value <= 1} className={btnCls}>
                <Minus className="w-3 h-3" />
            </button>
            <input
                ref={inputRef}
                type="number"
                min={1}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                onBlur={(e) => commit(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { commit(raw); inputRef.current?.blur(); } }}
                className={inputCls}
            />
            <button type="button" onClick={() => { const q = value + 1; onChange(q); setRaw(String(q)); }} className={btnCls}>
                <Plus className="w-3 h-3" />
            </button>
        </div>
    );
}

// ── Multi-select Product Picker ───────────────────────────────────────────────

interface PickerItem { product: PortalProduct; quantity: number; }
interface CustomPickerItem { name: string; quantity: number; description: string; }

interface ProductPickerProps {
    onAdd: (items: PickerItem[], custom: CustomPickerItem[]) => void;
    onClose: () => void;
}

function ProductPicker({ onAdd, onClose }: ProductPickerProps): ReactElement {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Map<number, PickerItem>>(new Map());
    const [customItems, setCustomItems] = useState<CustomPickerItem[]>([]);
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [customName, setCustomName] = useState("");
    const [customDesc, setCustomDesc] = useState("");
    const [customQty, setCustomQty] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ["portal-products-picker", search],
        queryFn: () => fetchPortalProducts(search),
        staleTime: 60_000,
    });

    const products: PortalProduct[] = data?.results ?? [];
    const count = selected.size + customItems.length;

    const toggle = (p: PortalProduct) => {
        setSelected(prev => {
            const next = new Map(prev);
            if (next.has(p.id)) next.delete(p.id);
            else next.set(p.id, { product: p, quantity: 1 });
            return next;
        });
    };

    const updateQty = (id: number, qty: number) => {
        setSelected(prev => {
            const next = new Map(prev);
            const item = next.get(id);
            if (item) next.set(id, { ...item, quantity: Math.max(1, qty) });
            return next;
        });
    };

    const addCustomItem = () => {
        if (!customName.trim()) return;
        setCustomItems(prev => [...prev, { name: customName.trim(), quantity: customQty, description: customDesc.trim() }]);
        setCustomName(""); setCustomDesc(""); setCustomQty(1); setShowCustomForm(false);
    };

    const removeCustom = (idx: number) => setCustomItems(prev => prev.filter((_, i) => i !== idx));

    const handleAdd = () => {
        onAdd([...selected.values()], customItems);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
            <div
                className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col h-[88vh] sm:h-auto sm:max-h-[88vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">Select Products</h2>
                        {count > 0 && <p className="text-xs text-brand-blue mt-0.5">{count} product{count !== 1 ? "s" : ""} selected</p>}
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 pt-3 pb-2 shrink-0">
                    <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2">
                        <Search className="w-4 h-4 text-gray-400 shrink-0" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                            placeholder="Search products…"
                            className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Selected chips */}
                {count > 0 && (
                    <div className="px-4 pb-2 shrink-0 flex flex-wrap gap-1.5">
                        {[...selected.values()].map(({ product, quantity }) => (
                            <div key={product.id} className="flex items-center gap-1 bg-brand-blue/10 text-brand-blue text-xs rounded-full px-2.5 py-1">
                                <span className="truncate max-w-[120px]">{product.name}</span>
                                <span className="font-semibold">×{quantity}</span>
                                <button type="button" onClick={() => toggle(product)} className="hover:text-brand-blue/60 ml-0.5">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        {customItems.map((ci, idx) => (
                            <div key={`c${idx}`} className="flex items-center gap-1 bg-orange-100 text-orange-700 text-xs rounded-full px-2.5 py-1">
                                <span className="truncate max-w-[120px]">{ci.name}</span>
                                <span className="font-semibold">×{ci.quantity}</span>
                                <button type="button" onClick={() => removeCustom(idx)} className="hover:text-orange-900 ml-0.5">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Product list */}
                <div className="flex-1 overflow-y-auto px-4 pb-2">
                    {isLoading ? (
                        <div className="space-y-2 mt-2">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                                    <div className="w-5 h-5 bg-gray-200 rounded" />
                                    <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-4 w-3/4 bg-gray-200 rounded" />
                                        <div className="h-3 w-1/2 bg-gray-200 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : products.length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-gray-400">
                            <Package className="w-10 h-10 mb-2 opacity-30" />
                            <p className="text-sm">No products found</p>
                        </div>
                    ) : (
                        <div className="space-y-1.5 mt-2">
                            {products.map((p) => {
                                const sel = selected.get(p.id);
                                const isSelected = !!sel;
                                return (
                                    <div
                                        key={p.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isSelected ? "border-brand-blue bg-brand-blue/5" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"}`}
                                    >
                                        {/* Row: checkbox + image + name */}
                                        <button
                                            type="button"
                                            onClick={() => toggle(p)}
                                            className="flex items-center gap-3 flex-1 text-left min-w-0"
                                        >
                                            <div className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected ? "bg-brand-blue border-brand-blue" : "border-gray-300"}`}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                                                {p.primary_image_url ? (
                                                    <img src={p.primary_image_url} alt={p.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package className="w-5 h-5 text-gray-300" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                                                {p.short_description && (
                                                    <p className="text-xs text-gray-400 mt-0.5 truncate">{p.short_description}</p>
                                                )}
                                                <p className="text-xs text-gray-400 mt-0.5">Price quoted by team</p>
                                            </div>
                                        </button>

                                        {/* Right-side controls */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {/* View in storefront */}
                                            <a
                                                href={`/store/${p.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                title="View in catalog"
                                                className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-400 hover:text-brand-blue hover:border-brand-blue/40 transition-colors"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </a>
                                            {/* Quantity stepper — only when selected */}
                                            {isSelected && (
                                                <QuantityStepper
                                                    value={sel?.quantity ?? 1}
                                                    onChange={(q) => updateQty(p.id, q)}
                                                    size="sm"
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Custom item form */}
                {showCustomForm && (
                    <div className="px-4 pb-3 shrink-0 border-t border-orange-100 bg-orange-50/60 space-y-2 pt-3">
                        <p className="text-xs font-medium text-orange-700">Add unlisted item</p>
                        <input
                            type="text"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            placeholder="Product name (e.g. Custom Banner 3×6ft)"
                            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                            autoFocus
                        />
                        <input
                            type="text"
                            value={customDesc}
                            onChange={(e) => setCustomDesc(e.target.value)}
                            placeholder="Description / specs (optional)"
                            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                        />
                        <div className="flex items-center gap-2">
                            <QuantityStepper value={customQty} onChange={setCustomQty} size="sm" />
                            <button
                                type="button"
                                disabled={!customName.trim()}
                                onClick={addCustomItem}
                                className="ml-auto px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-orange-600 transition-colors"
                            >
                                Add
                            </button>
                            <button type="button" onClick={() => setShowCustomForm(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 shrink-0 space-y-3">
                    {!showCustomForm && (
                        <button
                            type="button"
                            onClick={() => setShowCustomForm(true)}
                            className="w-full text-xs text-orange-600 hover:text-orange-700 border border-dashed border-orange-200 rounded-lg py-2 hover:bg-orange-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Can&apos;t find it? Add a custom / unlisted item
                        </button>
                    )}
                    <div className="flex items-center justify-between gap-3">
                        <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={count === 0}
                            onClick={handleAdd}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white text-sm font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-blue/90 transition-colors"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            {count === 0 ? "Select products" : `Add ${count} item${count !== 1 ? "s" : ""} to Cart`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Checkout modal ────────────────────────────────────────────────────────────

const NOTIFY_OPTIONS: { value: NotifyVia; label: string; desc: string }[] = [
    { value: "email",    label: "Email the sales team",    desc: "We'll email PrintDuka on your behalf automatically." },
    { value: "whatsapp", label: "Share via WhatsApp",      desc: "Get a pre-filled WhatsApp message to send to us." },
    { value: "am",       label: "Assign to a specific AM", desc: "Choose your account manager and we'll notify them." },
];

interface CheckoutModalProps {
    total: string;
    itemCount: number;
    onClose: () => void;
    onSuccess: (result: CheckoutResult) => void;
}

function CheckoutModal({ total, itemCount, onClose, onSuccess }: CheckoutModalProps): ReactElement {
    const [projectName, setProjectName] = useState("");
    const [notes, setNotes] = useState("");
    const [deliveryDate, setDeliveryDate] = useState("");
    const [notifyVia, setNotifyVia] = useState<NotifyVia>("email");
    const [selectedAMId, setSelectedAMId] = useState<number | "">("");

    const { data: ams = [] } = useQuery<AMUser[]>({
        queryKey: ["portal-ams"],
        queryFn: fetchAMs,
        enabled: notifyVia === "am",
        staleTime: 300_000,
    });

    const mutation = useMutation({
        mutationFn: () => checkoutCart({
            project_name: projectName,
            notes,
            delivery_date: deliveryDate || undefined,
            notify_via: notifyVia,
            assigned_am_id: notifyVia === "am" && selectedAMId ? Number(selectedAMId) : undefined,
        }),
        onSuccess: (data) => {
            toast.success("Order placed!");
            onSuccess(data);
        },
        onError: (err: Error) => {
            toast.error(err.message || "Checkout failed. Please try again.");
        },
    });

    const canSubmit = notifyVia !== "am" || selectedAMId !== "";

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <h2 className="text-base font-semibold text-gray-900">Place Your Order</h2>
                    <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    {/* Summary */}
                    <div className="bg-brand-blue/5 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
                            <p className="text-lg font-bold text-gray-900">{total}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Final price confirmed in your quote</p>
                        </div>
                        <ShoppingBag className="w-8 h-8 text-brand-blue/30" />
                    </div>

                    {/* Project name */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Project Name <span className="text-gray-400">(optional)</span></label>
                        <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="e.g. Annual Conference 2026"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                        />
                    </div>

                    {/* Delivery date */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Requested Delivery Date <span className="text-gray-400">(optional)</span></label>
                        <input
                            type="date"
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Notes <span className="text-gray-400">(optional)</span></label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Special requirements, finish preferences, variants…"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue resize-none"
                        />
                    </div>

                    {/* Notification channel */}
                    <div>
                        <p className="text-xs font-medium text-gray-700 mb-2">How should we reach you?</p>
                        <div className="space-y-2">
                            {NOTIFY_OPTIONS.map((opt) => (
                                <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${notifyVia === opt.value ? "border-brand-blue bg-brand-blue/5" : "border-gray-200 hover:bg-gray-50"}`}>
                                    <input
                                        type="radio"
                                        name="notify_via"
                                        value={opt.value}
                                        checked={notifyVia === opt.value}
                                        onChange={() => { setNotifyVia(opt.value); setSelectedAMId(""); }}
                                        className="mt-0.5 accent-brand-blue"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* AM picker */}
                    {notifyVia === "am" && (
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Select Account Manager</label>
                            {ams.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No account managers found.</p>
                            ) : (
                                <select
                                    value={selectedAMId}
                                    onChange={(e) => setSelectedAMId(e.target.value ? Number(e.target.value) : "")}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
                                >
                                    <option value="">Choose an account manager…</option>
                                    {ams.map((am) => (
                                        <option key={am.id} value={am.id}>{am.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 px-5 pb-5">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending || !canSubmit}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {mutation.isPending && (
                            <span className="animate-spin rounded-full w-4 h-4 border-2 border-white border-t-transparent" />
                        )}
                        {mutation.isPending ? "Placing order…" : "Place Order"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Cart item row (with inline editing) ──────────────────────────────────────

interface CartItemRowProps {
    item: CartItem;
    designs: DesignFile[];
    onUpdate: (id: number, updates: Parameters<typeof updateCartItem>[1]) => void;
    onRemove: (id: number) => void;
    isUpdating: boolean;
}

function CartItemRow({ item, designs, onUpdate, onRemove, isUpdating }: CartItemRowProps): ReactElement {
    const [showDesignPicker, setShowDesignPicker] = useState(false);
    const [editingDesc, setEditingDesc] = useState(false);
    const [descVal, setDescVal] = useState(item.description);
    const [editingNotes, setEditingNotes] = useState(false);
    const [notesVal, setNotesVal] = useState(item.notes);

    useEffect(() => { setDescVal(item.description); }, [item.description]);
    useEffect(() => { setNotesVal(item.notes); }, [item.notes]);

    const saveDesc = () => {
        setEditingDesc(false);
        if (descVal !== item.description) onUpdate(item.id, { description: descVal });
    };

    const saveNotes = () => {
        setEditingNotes(false);
        if (notesVal !== item.notes) onUpdate(item.id, { notes: notesVal });
    };

    return (
        <div className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm transition-opacity ${isUpdating ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-4">
                {/* Product image */}
                <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.image_url ? (
                        <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                        <Package className="w-7 h-7 text-gray-300" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    {/* Name + remove */}
                    <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-gray-900 text-sm leading-snug">{item.product_name}</p>
                        <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            className="shrink-0 p-1 text-gray-300 hover:text-red-500 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Inline-editable description */}
                    {editingDesc ? (
                        <textarea
                            autoFocus
                            value={descVal}
                            onChange={(e) => setDescVal(e.target.value)}
                            onBlur={saveDesc}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveDesc(); } }}
                            rows={2}
                            placeholder="Size, color, finish, format…"
                            className="mt-1 w-full text-xs border border-brand-blue/40 rounded-lg px-2 py-1.5 outline-none resize-none focus:ring-1 focus:ring-brand-blue/30"
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => setEditingDesc(true)}
                            className="group flex items-center gap-1 mt-1 text-left w-full"
                        >
                            <p className={`text-xs flex-1 ${descVal ? "text-gray-500" : "text-gray-300 italic"}`}>
                                {descVal || "Add description (size, color, finish…)"}
                            </p>
                            <Pencil className="w-3 h-3 text-gray-300 group-hover:text-brand-blue shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                        </button>
                    )}

                    {/* Quantity + price */}
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                        <QuantityStepper
                            value={item.quantity}
                            onChange={(q) => onUpdate(item.id, { quantity: q })}
                        />
                        <div className="ml-auto text-right">
                            {Number(item.unit_price) > 0 ? (
                                <>
                                    <p className="text-xs text-gray-400">{fmt(item.unit_price)} × {item.quantity}</p>
                                    <p className="text-sm font-bold text-gray-900">{fmt(item.line_total)}</p>
                                </>
                            ) : (
                                <p className="text-xs text-gray-400 italic">Price on quote</p>
                            )}
                        </div>
                    </div>

                    {/* Inline-editable special instructions */}
                    <div className="mt-2">
                        {editingNotes ? (
                            <textarea
                                autoFocus
                                value={notesVal}
                                onChange={(e) => setNotesVal(e.target.value)}
                                onBlur={saveNotes}
                                rows={2}
                                placeholder="Special instructions (e.g. 'Matt laminate, double-sided')…"
                                className="w-full text-xs border border-brand-blue/40 rounded-lg px-2 py-1.5 outline-none resize-none focus:ring-1 focus:ring-brand-blue/30"
                            />
                        ) : (
                            <button type="button" onClick={() => setEditingNotes(true)} className="group flex items-center gap-1 text-left w-full">
                                {notesVal ? (
                                    <p className="text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-lg px-2 py-1 flex-1">{notesVal}</p>
                                ) : (
                                    <p className="text-xs text-gray-300 italic flex-1">Add special instructions…</p>
                                )}
                                <Pencil className="w-3 h-3 text-gray-300 group-hover:text-brand-blue shrink-0 opacity-0 group-hover:opacity-100 transition-all ml-1" />
                            </button>
                        )}
                    </div>

                    {/* Design file attachment */}
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                        {item.design_file_id ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-lg text-xs text-blue-700 border border-blue-100">
                                <Paperclip className="w-3 h-3" />
                                <span className="truncate max-w-[140px]">{item.design_file_name}</span>
                                <button
                                    type="button"
                                    onClick={() => onUpdate(item.id, { design_file_id: null })}
                                    className="text-blue-400 hover:text-blue-700 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowDesignPicker((p) => !p)}
                                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-brand-blue transition-colors"
                            >
                                <Paperclip className="w-3.5 h-3.5" />
                                Attach design file
                            </button>
                        )}
                    </div>

                    {/* Design picker dropdown */}
                    {showDesignPicker && designs.length > 0 && (
                        <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-2 max-h-48 overflow-y-auto">
                            {designs.map((d) => (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => { onUpdate(item.id, { design_file_id: d.id }); setShowDesignPicker(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                                >
                                    <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-800 truncate">{d.title}</p>
                                        <p className="text-xs text-gray-400">{fmtSize(d.file_size)}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                    {showDesignPicker && designs.length === 0 && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-400 text-center">
                            No designs uploaded yet.{" "}
                            <a href="/portal/designs" className="text-brand-blue hover:underline">Upload one →</a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PortalCartPage(): ReactElement {
    const [showPicker, setShowPicker] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [successResult, setSuccessResult] = useState<CheckoutResult | null>(null);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const queryClient = useQueryClient();

    const { data: cartData, isLoading: cartLoading } = useQuery({
        queryKey: ["portal-cart"],
        queryFn: fetchCart,
        staleTime: 15_000,
    });

    const { data: designsData } = useQuery({
        queryKey: ["portal-designs", "all"],
        queryFn: () => fetchDesigns("all"),
        staleTime: 60_000,
    });

    const items: CartItem[] = cartData?.items ?? [];
    const subtotal = cartData?.subtotal ?? "0";
    const designs: DesignFile[] = designsData?.results ?? [];

    // Add multiple items sequentially (catalog + custom)
    const addMutation = useMutation({
        mutationFn: async ({ items, custom }: { items: PickerItem[]; custom: CustomPickerItem[] }) => {
            for (const { product, quantity } of items) {
                await addToCart({ product_id: product.id, product_name: product.name, quantity, unit_price: 0 });
            }
            for (const c of custom) {
                await addToCart({ product_name: c.name, quantity: c.quantity, unit_price: 0, description: c.description });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["portal-cart"] });
            toast.success("Added to cart!");
        },
        onError: () => toast.error("Could not add items. Please try again."),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: number; updates: Parameters<typeof updateCartItem>[1] }) =>
            updateCartItem(id, updates),
        onMutate: ({ id }) => setUpdatingId(id),
        onSettled: () => setUpdatingId(null),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portal-cart"] }),
        onError: () => toast.error("Could not update item."),
    });

    const removeMutation = useMutation({
        mutationFn: removeFromCart,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["portal-cart"] });
            toast.success("Item removed.");
        },
        onError: () => toast.error("Could not remove item."),
    });

    const clearMutation = useMutation({
        mutationFn: clearCart,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["portal-cart"] });
            toast.success("Cart cleared.");
        },
    });

    // ── Order placed success screen ──────────────────────────────────────────
    if (successResult) {
        const orderLink = typeof window !== "undefined"
            ? `${window.location.origin}/portal/orders/${successResult.order_id}`
            : `/portal/orders/${successResult.order_id}`;

        return (
            <>
                <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Order Placed!</h2>
                    <p className="font-mono text-sm font-semibold text-brand-blue mb-1">{successResult.order_number}</p>
                    <p className="text-xs text-gray-400 mb-5">Quote ref: {successResult.quote_id}</p>

                    <p className="text-gray-500 text-sm max-w-sm mb-6">
                        Your order is live. Our team will review it and send you a formal quote within 1 business day.
                    </p>

                    {/* Shareable live order link */}
                    <div className="w-full max-w-sm bg-gray-50 rounded-xl p-3 mb-6 border border-gray-200 text-left">
                        <p className="text-xs text-gray-400 mb-1.5">Your live order link</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs text-brand-blue truncate">{orderLink}</code>
                            <CopyButton text={orderLink} />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {successResult.whatsapp_url && (
                            <a
                                href={successResult.whatsapp_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-5 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
                            >
                                Open WhatsApp
                            </a>
                        )}
                        <a
                            href={`/portal/orders/${successResult.order_id}`}
                            className="inline-flex items-center gap-2 px-5 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue/90 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            View Order
                        </a>
                        <a href="/portal/quotes" className="px-5 py-2 border border-gray-300 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                            View Quotes
                        </a>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            {showPicker && (
                <ProductPicker
                    onAdd={(items, custom) => addMutation.mutate({ items, custom })}
                    onClose={() => setShowPicker(false)}
                />
            )}
            {showCheckout && (
                <CheckoutModal
                    total={fmt(subtotal)}
                    itemCount={items.length}
                    onClose={() => setShowCheckout(false)}
                    onSuccess={(result) => {
                        setShowCheckout(false);
                        setSuccessResult(result);
                        queryClient.invalidateQueries({ queryKey: ["client-orders"] });
                    }}
                />
            )}

            <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-brand-blue" />
                        <h1 className="text-xl font-bold text-gray-900">My Cart</h1>
                        {!cartLoading && items.length > 0 && (
                            <span className="text-xs font-semibold bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full">
                                {items.length}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowPicker(true)}
                        disabled={addMutation.isPending}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue/90 disabled:opacity-60 transition-colors"
                    >
                        {addMutation.isPending ? (
                            <span className="animate-spin rounded-full w-4 h-4 border-2 border-white border-t-transparent" />
                        ) : (
                            <Plus className="w-4 h-4" />
                        )}
                        {addMutation.isPending ? "Adding…" : "Add Products"}
                    </button>
                </div>

                {/* Helper text */}
                <p className="text-xs text-gray-400 -mt-4">
                    Click any item to edit its description or add special instructions. Prices will be confirmed in your quote.
                </p>

                {cartLoading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-200 p-4 flex gap-4">
                                <div className="w-16 h-16 bg-gray-200 rounded-lg shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-1/2 bg-gray-200 rounded" />
                                    <div className="h-3 w-1/3 bg-gray-200 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <ShoppingCart className="w-14 h-14 mb-3 opacity-20" />
                        <p className="text-sm font-medium text-gray-500">Your cart is empty</p>
                        <p className="text-xs mt-1 text-center max-w-xs px-4">
                            Browse the product catalog and add items. You can select multiple products at once.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowPicker(true)}
                            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white text-sm font-semibold rounded-xl hover:bg-brand-blue/90 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Browse Products
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0 lg:items-start">
                        {/* Item list — 2/3 */}
                        <div className="lg:col-span-2 space-y-3">
                            {items.map((item) => (
                                <CartItemRow
                                    key={item.id}
                                    item={item}
                                    designs={designs}
                                    onUpdate={(id, updates) => updateMutation.mutate({ id, updates })}
                                    onRemove={(id) => removeMutation.mutate(id)}
                                    isUpdating={updatingId === item.id}
                                />
                            ))}
                            <button
                                type="button"
                                onClick={() => clearMutation.mutate()}
                                disabled={clearMutation.isPending}
                                className="text-xs text-red-400 hover:text-red-600 transition-colors flex items-center gap-1"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Clear cart
                            </button>
                        </div>

                        {/* Order summary — 1/3 */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                            <h3 className="text-sm font-semibold text-gray-900">Order Summary</h3>
                            <div className="space-y-2">
                                {items.map((item) => (
                                    <div key={item.id} className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-xs text-gray-700 truncate">{item.product_name}</p>
                                            {item.description && (
                                                <p className="text-xs text-gray-400 truncate">{item.description}</p>
                                            )}
                                        </div>
                                        <p className="text-xs font-medium text-gray-800 shrink-0">
                                            × {item.quantity}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-700">Total</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {Number(subtotal) > 0 ? fmt(subtotal) : "TBD"}
                                </p>
                            </div>
                            <p className="text-xs text-gray-400">
                                Final pricing confirmed in your quote within 1 business day.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowCheckout(true)}
                                className="w-full py-3 bg-brand-blue text-white text-sm font-semibold rounded-xl hover:bg-brand-blue/90 transition-colors flex items-center justify-center gap-2"
                            >
                                <ShoppingBag className="w-4 h-4" />
                                Place Order
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

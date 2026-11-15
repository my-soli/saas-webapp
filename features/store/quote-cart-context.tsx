"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";

const STORAGE_KEY = "printduka_quote_cart";

export interface QuoteCartItem {
    /** Unique per product + colour, so the same product in two colours is two lines. */
    key: string;
    productId: number;
    name: string;
    imageUrl: string | null;
    quantity: number;
    notes: string;
    /** Colour chosen on the product page (blank when the product has no colours). */
    color: string;
    /** Size breakdown / chosen options from the product page, e.g. "S×10, M×20". */
    details: string;
}

type NewQuoteCartItem = Omit<QuoteCartItem, "notes" | "key" | "color" | "details"> & { color?: string; details?: string };

interface QuoteCartContextValue {
    items: QuoteCartItem[];
    count: number;
    addItem: (item: NewQuoteCartItem) => void;
    updateQuantity: (key: string, quantity: number) => void;
    updateNotes: (key: string, notes: string) => void;
    removeItem: (key: string) => void;
    clearCart: () => void;
}

const QuoteCartContext = createContext<QuoteCartContextValue | null>(null);

const itemKey = (productId: number, color: string, details = ""): string => `${productId}:${color}:${details}`;

function readStoredCart(): QuoteCartItem[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        // Carts saved before colours existed have no key/color — fill them in.
        return (parsed as Array<Partial<QuoteCartItem> & { productId: number }>).map((i) => ({
            productId: i.productId,
            name: i.name ?? "",
            imageUrl: i.imageUrl ?? null,
            quantity: i.quantity ?? 1,
            notes: i.notes ?? "",
            color: i.color ?? "",
            details: i.details ?? "",
            key: i.key ?? itemKey(i.productId, i.color ?? "", i.details ?? ""),
        }));
    } catch {
        return [];
    }
}

export function QuoteCartProvider({ children }: { children: ReactNode }): ReactElement {
    const [items, setItems] = useState<QuoteCartItem[]>([]);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setItems(readStoredCart());
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {
            // localStorage unavailable (private mode, quota) — cart just won't persist
        }
    }, [items, hydrated]);

    const addItem = useCallback((item: NewQuoteCartItem) => {
        const color = item.color ?? "";
        const details = item.details ?? "";
        const key = itemKey(item.productId, color, details);
        setItems((prev) => {
            const existing = prev.find((i) => i.key === key);
            // A size breakdown is an exact spec — re-adding it replaces rather than doubles it.
            if (existing) {
                return prev.map((i) => (i.key === key
                    ? { ...i, quantity: details ? item.quantity : i.quantity + item.quantity }
                    : i));
            }
            return [...prev, { ...item, color, details, key, notes: "" }];
        });
    }, []);

    const updateQuantity = useCallback((key: string, quantity: number) => {
        setItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: Math.max(1, quantity) } : i)));
    }, []);

    const updateNotes = useCallback((key: string, notes: string) => {
        setItems((prev) => prev.map((i) => (i.key === key ? { ...i, notes } : i)));
    }, []);

    const removeItem = useCallback((key: string) => {
        setItems((prev) => prev.filter((i) => i.key !== key));
    }, []);

    const clearCart = useCallback(() => setItems([]), []);

    const count = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

    const value = useMemo(
        () => ({ items, count, addItem, updateQuantity, updateNotes, removeItem, clearCart }),
        [items, count, addItem, updateQuantity, updateNotes, removeItem, clearCart],
    );

    return <QuoteCartContext.Provider value={value}>{children}</QuoteCartContext.Provider>;
}

export function useQuoteCart(): QuoteCartContextValue {
    const ctx = useContext(QuoteCartContext);
    if (!ctx) throw new Error("useQuoteCart must be used within a QuoteCartProvider");
    return ctx;
}

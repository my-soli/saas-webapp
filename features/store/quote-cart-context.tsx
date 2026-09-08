"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";

const STORAGE_KEY = "printduka_quote_cart";

export interface QuoteCartItem {
    productId: number;
    name: string;
    imageUrl: string | null;
    quantity: number;
    notes: string;
}

interface QuoteCartContextValue {
    items: QuoteCartItem[];
    count: number;
    addItem: (item: Omit<QuoteCartItem, "notes">) => void;
    updateQuantity: (productId: number, quantity: number) => void;
    updateNotes: (productId: number, notes: string) => void;
    removeItem: (productId: number) => void;
    clearCart: () => void;
}

const QuoteCartContext = createContext<QuoteCartContextValue | null>(null);

function readStoredCart(): QuoteCartItem[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? (parsed as QuoteCartItem[]) : [];
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

    const addItem = useCallback((item: Omit<QuoteCartItem, "notes">) => {
        setItems((prev) => {
            const existing = prev.find((i) => i.productId === item.productId);
            if (existing) {
                return prev.map((i) =>
                    i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i,
                );
            }
            return [...prev, { ...item, notes: "" }];
        });
    }, []);

    const updateQuantity = useCallback((productId: number, quantity: number) => {
        setItems((prev) =>
            prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, quantity) } : i)),
        );
    }, []);

    const updateNotes = useCallback((productId: number, notes: string) => {
        setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, notes } : i)));
    }, []);

    const removeItem = useCallback((productId: number) => {
        setItems((prev) => prev.filter((i) => i.productId !== productId));
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

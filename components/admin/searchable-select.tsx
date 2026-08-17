"use client";

import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { ChevronDownIcon, SearchIcon } from "lucide-react";

export interface SearchableSelectOption {
    value: number | string;
    label: string;
}

interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value: number | string | null;
    onChange: (value: number | string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    /** Optional controlled-open pair, e.g. to let an external "search" button open this same dropdown. */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function SearchableSelect({
    options, value, onChange, placeholder = "Select…", disabled, className = "",
    open: openProp, onOpenChange,
}: SearchableSelectProps): ReactElement {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = openProp ?? internalOpen;
    const setOpen = onOpenChange ?? setInternalOpen;
    const [query, setQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    const selected = options.find((o) => o.value === value) ?? null;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, query]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery("");
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [setOpen]);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-left focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:bg-gray-50 disabled:text-gray-400"
            >
                <span className={selected ? "text-gray-900" : "text-gray-400"}>
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDownIcon className="h-4 w-4 shrink-0 text-gray-400" />
            </button>

            {open && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                    <div className="relative border-b border-gray-100 p-2">
                        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        <input
                            autoFocus
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Type to search…"
                            className="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-2 text-sm focus:border-brand-blue focus:outline-none"
                        />
                    </div>
                    <ul className="max-h-56 overflow-y-auto py-1">
                        {filtered.length === 0 && (
                            <li className="px-3 py-2 text-sm text-gray-400">No matches</li>
                        )}
                        {filtered.map((o) => (
                            <li key={o.value}>
                                <button
                                    type="button"
                                    onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                                        o.value === value ? "bg-brand-blue/5 text-brand-blue font-medium" : "text-gray-700"
                                    }`}
                                >
                                    {o.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    SearchIcon, XIcon, BriefcaseIcon, FileTextIcon,
    UsersIcon, UserIcon, PackageIcon, LoaderCircleIcon,
} from "lucide-react";
import { globalSearch } from "@/services/search";

type Portal = "admin" | "account-manager" | "production-team";

// Which entity types each portal can search and navigate to
const PORTAL_SCOPES: Record<Portal, string[]> = {
    "admin":            ["jobs", "quotes", "clients", "leads", "vendors"],
    "account-manager":  ["jobs", "quotes", "clients", "leads"],
    "production-team":  ["jobs", "vendors"],
};

// Routes per portal per type. No detail page → navigate to list with ?search= param.
function buildPath(portal: Portal, type: string, item: any): string {
    switch (type) {
        case "jobs":
            // all three portals have /[portal]/jobs/[id]
            return `/${portal}/jobs/${item.id}`;
        case "quotes":
            // quotes list only — no detail route in AM or admin
            return `/${portal}/quotes?search=${encodeURIComponent(item.quote_id ?? "")}`;
        case "clients":
            return `/${portal}/clients?search=${encodeURIComponent(item.name ?? "")}`;
        case "leads":
            return `/${portal}/leads?search=${encodeURIComponent(item.name ?? "")}`;
        case "vendors":
            // admin and PT have /[portal]/vendors/[id]
            return `/${portal}/vendors/${item.id}`;
        default:
            return `/${portal}`;
    }
}

const GROUP_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    jobs:    { label: "Jobs",    icon: BriefcaseIcon, color: "text-brand-blue" },
    quotes:  { label: "Quotes",  icon: FileTextIcon,  color: "text-brand-green" },
    clients: { label: "Clients", icon: UsersIcon,     color: "text-brand-orange" },
    leads:   { label: "Leads",   icon: UserIcon,      color: "text-purple-500" },
    vendors: { label: "Vendors", icon: PackageIcon,   color: "text-teal-500" },
};

function itemLabel(type: string, item: any): string {
    switch (type) {
        case "jobs":    return item.job_number ? `${item.job_number} — ${item.job_name}` : item.job_name;
        case "quotes":  return `${item.quote_id} — ${item.product_name || "Quote"}`;
        case "clients": return item.name || item.company || "Client";
        case "leads":   return `${item.name}${item.company ? ` · ${item.company}` : ""}`;
        case "vendors": return item.name || "Vendor";
        default:        return "Result";
    }
}

function itemSub(type: string, item: any): string {
    switch (type) {
        case "jobs":    return [item.status?.replace(/_/g, " "), item.client?.name].filter(Boolean).join(" · ");
        case "quotes":  return [item.status, item.client?.name].filter(Boolean).join(" · ");
        case "clients": return item.email ?? item.phone ?? "";
        case "leads":   return item.email ?? item.status ?? "";
        case "vendors": return item.email ?? item.contact_person ?? "";
        default:        return "";
    }
}

interface Props {
    portal: Portal;
}

export default function UniversalSearch({ portal }: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(false);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const router = useRouter();

    const allowedScopes = PORTAL_SCOPES[portal];

    const flatItems: { type: string; item: any }[] = Object.entries(results).flatMap(
        ([type, items]) => items.map(item => ({ type, item }))
    );

    const close = useCallback(() => {
        setOpen(false);
        setQuery("");
        setResults({});
        setSelectedIdx(0);
    }, []);

    // Ctrl/Cmd+K to open
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen(o => !o);
            }
            if (e.key === "Escape") close();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [close]);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 50);
    }, [open]);

    // Debounced search — only request scopes this portal needs
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query.trim()) { setResults({}); return; }

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const data = await globalSearch(query.trim(), "all");
                const filtered: Record<string, any[]> = {};
                for (const [k, v] of Object.entries(data.results)) {
                    if (allowedScopes.includes(k) && Array.isArray(v) && v.length > 0) {
                        filtered[k] = v.slice(0, 5);
                    }
                }
                setResults(filtered);
                setSelectedIdx(0);
            } catch {
                // silently ignore
            } finally {
                setLoading(false);
            }
        }, 280);
    }, [query, allowedScopes]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, flatItems.length - 1)); }
        if (e.key === "ArrowUp")   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
        if (e.key === "Enter" && flatItems[selectedIdx]) {
            const { type, item } = flatItems[selectedIdx];
            router.push(buildPath(portal, type, item));
            close();
        }
    };

    const hasResults = Object.keys(results).length > 0;

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-24 right-5 z-40 flex items-center gap-2 rounded-full bg-white border border-gray-200 shadow-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:border-brand-blue hover:text-brand-blue transition-colors"
                title="Search (Ctrl+K)"
            >
                <SearchIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden sm:inline text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded border border-gray-200">⌘K</kbd>
            </button>
        );
    }

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/40" onClick={close} />

            <div className="fixed left-1/2 top-[15%] z-50 w-full max-w-xl -translate-x-1/2 px-4">
                <div className="rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
                    {/* Input */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                        {loading
                            ? <LoaderCircleIcon className="h-5 w-5 shrink-0 text-brand-blue animate-spin" />
                            : <SearchIcon className="h-5 w-5 shrink-0 text-gray-400" />
                        }
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={`Search ${allowedScopes.join(", ")}…`}
                            className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
                        />
                        <button onClick={close} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <XIcon className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Results */}
                    <div className="max-h-[420px] overflow-y-auto">
                        {!query.trim() && (
                            <p className="px-4 py-6 text-center text-sm text-gray-400">
                                Type to search across all records
                            </p>
                        )}
                        {query.trim() && !loading && !hasResults && (
                            <p className="px-4 py-6 text-center text-sm text-gray-400">
                                No results for <span className="font-medium text-gray-700">"{query}"</span>
                            </p>
                        )}
                        {hasResults && (() => {
                            let globalI = 0;
                            return Object.entries(results).map(([type, items]) => {
                                const meta = GROUP_META[type];
                                if (!meta) return null;
                                const Icon = meta.icon;
                                return (
                                    <div key={type}>
                                        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                                            <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{meta.label}</span>
                                        </div>
                                        {items.map(item => {
                                            const idx = globalI++;
                                            const isSelected = idx === selectedIdx;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => { router.push(buildPath(portal, type, item)); close(); }}
                                                    onMouseEnter={() => setSelectedIdx(idx)}
                                                    className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${isSelected ? "bg-brand-blue/5" : "hover:bg-gray-50"}`}
                                                >
                                                    <div className={`mt-0.5 h-6 w-6 shrink-0 flex items-center justify-center rounded-md ${isSelected ? "bg-brand-blue/10" : "bg-gray-100"}`}>
                                                        <Icon className={`h-3.5 w-3.5 ${isSelected ? meta.color : "text-gray-400"}`} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">{itemLabel(type, item)}</p>
                                                        {itemSub(type, item) && (
                                                            <p className="text-xs text-gray-500 truncate capitalize">{itemSub(type, item)}</p>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            });
                        })()}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
                        <span><kbd className="bg-gray-100 px-1 rounded">↑↓</kbd> navigate</span>
                        <span><kbd className="bg-gray-100 px-1 rounded">↵</kbd> open</span>
                        <span><kbd className="bg-gray-100 px-1 rounded">Esc</kbd> close</span>
                    </div>
                </div>
            </div>
        </>
    );
}

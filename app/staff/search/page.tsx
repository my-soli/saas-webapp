"use client";

import { useState, useCallback } from "react";
import { Search, Users, FileText, Briefcase, Building2, UserPlus } from "lucide-react";
import AdminLayout from "@/components/admin/admin-layout";
import { globalSearch, type SearchResults } from "@/services/search";

function useDebounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
    let timer: ReturnType<typeof setTimeout>;
    return ((...args: any[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    }) as T;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
    clients: <Users className="h-4 w-4" />,
    leads: <UserPlus className="h-4 w-4" />,
    quotes: <FileText className="h-4 w-4" />,
    jobs: <Briefcase className="h-4 w-4" />,
    vendors: <Building2 className="h-4 w-4" />,
};

const SECTION_LABELS: Record<string, string> = {
    clients: "Clients",
    leads: "Leads",
    quotes: "Quotes",
    jobs: "Jobs",
    vendors: "Vendors",
};

function ResultItem({ type, item }: { type: string; item: any }) {
    const href = (() => {
        if (type === "clients") return `/staff/clients?id=${item.id}`;
        if (type === "leads") return `/staff/leads?id=${item.id}`;
        if (type === "quotes") return `/staff/quotes?id=${item.id}`;
        if (type === "jobs") return `/staff/jobs?id=${item.id}`;
        if (type === "vendors") return `/staff/vendors/${item.id}`;
        return "#";
    })();

    const title = item.name || item.company || item.job_name || item.product_name || item.quote_id || item.job_number || item.lead_id || "—";
    const subtitle = item.email || item.quote_id || item.job_number || item.client_id || item.lead_id || "";
    const badge = item.status || item.client_type || "";

    return (
        <a
            href={href}
            className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors rounded-md group"
        >
            <div>
                <div className="text-sm font-medium text-gray-900 group-hover:text-brand-blue">{title}</div>
                {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
            </div>
            {badge && (
                <span className="ml-3 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 shrink-0">{badge}</span>
            )}
        </a>
    );
}

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runSearch = useCallback(async (q: string) => {
        if (q.trim().length < 2) {
            setResults(null);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await globalSearch(q);
            setResults(data);
        } catch (e: any) {
            setError(e.message || "Search failed");
        } finally {
            setLoading(false);
        }
    }, []);

    const debouncedSearch = useCallback(
        useDebounce((q: string) => runSearch(q), 350),
        [runSearch]
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        debouncedSearch(val);
    };

    const sections = results ? Object.entries(results.results).filter(([, items]) => items && items.length > 0) : [];

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white px-4 lg:px-8 py-4">
                <h1 className="text-2xl font-bold text-gray-900">Search</h1>
                <p className="text-sm text-gray-500 mt-1">Search across clients, leads, quotes, jobs, and vendors</p>
            </header>
            <main className="bg-gray-50 min-h-screen">
                <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8 space-y-6">
                    {/* Search input */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                        <input
                            autoFocus
                            type="text"
                            value={query}
                            onChange={handleChange}
                            placeholder="Search by name, ID, email, quote number…"
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent bg-white"
                        />
                        {loading && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
                        )}
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
                    )}

                    {results && results.total_results === 0 && (
                        <div className="text-center py-12 text-gray-400 text-sm">
                            No results found for &quot;{results.query}&quot;
                        </div>
                    )}

                    {results && results.total_results > 0 && (
                        <div className="space-y-4">
                            <p className="text-xs text-gray-500">
                                {results.total_results} result{results.total_results !== 1 ? "s" : ""} for &quot;{results.query}&quot;
                            </p>
                            {sections.map(([type, items]) => (
                                <div key={type} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                                        <span className="text-gray-500">{SECTION_ICONS[type]}</span>
                                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                            {SECTION_LABELS[type] || type} ({items!.length})
                                        </span>
                                    </div>
                                    <div className="p-2 space-y-0.5">
                                        {items!.map((item: any) => (
                                            <ResultItem key={item.id} type={type} item={item} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!query && (
                        <div className="text-center py-16 text-gray-400">
                            <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p className="text-sm">Start typing to search across the system</p>
                        </div>
                    )}
                </div>
            </main>
        </AdminLayout>
    );
}

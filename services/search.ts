const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

export interface SearchResults {
    query: string;
    total_results: number;
    results: {
        leads?: any[];
        clients?: any[];
        quotes?: any[];
        jobs?: any[];
        vendors?: any[];
    };
}

export async function globalSearch(query: string, scope = "all"): Promise<SearchResults> {
    const params = new URLSearchParams({ q: query, scope });
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/search/?${params}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
    });
    if (!response.ok) throw new Error(`Search failed: ${response.status}`);
    return response.json();
}

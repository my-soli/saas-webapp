"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Search, ShoppingCart, Trash2, Plus, Minus, Paperclip, X, Package,
    Share2, MessageCircle, Mail, Copy, Check, ExternalLink, Loader2, Link2,
    ClipboardList, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import AccountManagerLayout from "@/components/account-manager/account-manager-layout";
import { getCsrfToken } from "@/lib/api/auth";
import { fetchMultiProductQuotes } from "@/services/quotes";

const PROXY = "";

// Deterministic gradient per product name
const GRADIENTS = [
    "from-blue-500 to-indigo-600", "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600", "from-violet-500 to-purple-600",
    "from-rose-500 to-pink-600",   "from-cyan-500 to-sky-600",
    "from-lime-500 to-green-600",  "from-fuchsia-500 to-pink-600",
];
function gradientFor(name: string) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    return GRADIENTS[h % GRADIENTS.length];
}
function initialsFor(name: string) {
    return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface CartProduct {
    id: number; name: string; short_description: string;
    primary_image_url: string | null; min_price?: number | null;
}
interface ProductsPage { count: number; results: CartProduct[]; }
interface CartItem {
    product_id: number; product_name: string; description: string;
    unit_price: number; quantity: number; image_url: string | null; line_total: number;
}
interface CartData { cart: CartItem[]; subtotal: number; cart_count: number; }

interface ClientOrderItem { id: number; product_name: string; quantity: number; }
interface PendingClientOrder {
    id: number;
    order_number: string;
    client_name: string;
    client: number;
    quote: number | null;
    status: string;
    total_amount: string;
    submitted_at: string | null;
    items: ClientOrderItem[];
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchCartData(): Promise<CartData> {
    const res = await fetch(`${PROXY}/api/proxy/account-manager/cart/api/`, { credentials: "include", cache: "no-store" });
    if (!res.ok) throw new Error("Failed");
    return res.json();
}
async function fetchCatalog(search: string): Promise<ProductsPage> {
    const params = new URLSearchParams({ page_size: "36", status: "published" });
    if (search.trim()) params.set("search", search.trim());
    const res = await fetch(`${PROXY}/api/proxy/api/v1/product-admin/?${params}`, { credentials: "include", cache: "no-store" });
    if (!res.ok) throw new Error("Failed");
    return res.json();
}
async function postCart(path: string, body?: Record<string, string | number>) {
    const csrf = await getCsrfToken();
    const params = new URLSearchParams();
    if (body) Object.entries(body).forEach(([k, v]) => params.append(k, String(v)));
    const res = await fetch(`${PROXY}/api/proxy${path}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded", ...(csrf ? { "X-CSRFToken": csrf } : {}) },
        body: body ? params.toString() : undefined,
    });
    return res.json() as Promise<{ success: boolean; message?: string }>;
}
async function fetchPendingClientOrders(): Promise<PendingClientOrder[]> {
    const params = new URLSearchParams({ status: "submitted", page_size: "50" });
    const res = await fetch(`${PROXY}/api/proxy/api/v1/client-orders/?${params}`, { credentials: "include", cache: "no-store" });
    if (!res.ok) throw new Error("Failed");
    const data = await res.json() as { results: PendingClientOrder[] };
    // Only include orders without a quote attached
    return data.results.filter((o) => !("quote" in o) || o.quote === null);
}

async function createShareLink(): Promise<string> {
    const csrf = await getCsrfToken();
    const res = await fetch(`${PROXY}/api/proxy/account-manager/cart/share/`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded", ...(csrf ? { "X-CSRFToken": csrf } : {}) },
    });
    if (!res.ok) throw new Error("Failed to create share link");
    const data = await res.json() as { token: string };
    return `${window.location.origin}/shared-cart/${data.token}`;
}

// ─── Product Thumbnail ────────────────────────────────────────────────────────

function ProductThumb({ name, url, className }: { name: string; url: string | null; className?: string }) {
    const [err, setErr] = useState(false);
    const grad = gradientFor(name);
    if (url && !err) {
        return <img src={url} alt={name} onError={() => setErr(true)} className={`object-cover ${className}`} />;
    }
    return (
        <div className={`bg-gradient-to-br ${grad} flex items-center justify-center ${className}`}>
            <span className="text-white/90 font-bold text-lg">{initialsFor(name)}</span>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AMCartPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [submitted, setSubmitted] = useState("");
    const [qty, setQty] = useState<Record<number, number>>({});
    const [attachOpen, setAttachOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [shareLoading, setShareLoading] = useState(false);
    const [selectedQuoteId, setSelectedQuoteId] = useState("");
    const [copied, setCopied] = useState(false);

    const { data: catalog, isLoading: catalogLoading } = useQuery({
        queryKey: ["am-cart-catalog", submitted],
        queryFn: () => fetchCatalog(submitted),
    });
    const { data: cartData, isLoading: cartLoading } = useQuery({
        queryKey: ["am-cart"],
        queryFn: fetchCartData,
    });
    const { data: quotes = [] } = useQuery({
        queryKey: ["multi-product-quotes-brief"],
        queryFn: () => fetchMultiProductQuotes(),
    });

    const { data: pendingClientOrders = [], isLoading: pendingOrdersLoading } = useQuery({
        queryKey: ["am-pending-client-orders"],
        queryFn: fetchPendingClientOrders,
        staleTime: 30_000,
    });

    const inv = useCallback(() => queryClient.invalidateQueries({ queryKey: ["am-cart"] }), [queryClient]);

    const addMut = useMutation({
        mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
            postCart("/account-manager/cart/add/", { product_id: productId, quantity }),
        onSuccess: (d) => { if (d.success) inv(); else toast.error(d.message || "Failed"); },
        onError: () => toast.error("Failed to add"),
    });
    const removeMut = useMutation({ mutationFn: (idx: number) => postCart(`/account-manager/cart/remove/${idx}/`), onSuccess: inv });
    const clearMut = useMutation({ mutationFn: () => postCart("/account-manager/cart/clear/"), onSuccess: () => { inv(); toast.success("Cleared"); } });
    const attachMut = useMutation({
        mutationFn: (qid: string) => postCart("/account-manager/cart/attach-to-quote/", { quote_id: qid }),
        onSuccess: (d) => {
            if (d.success) { toast.success(d.message || "Attached"); setAttachOpen(false); setSelectedQuoteId(""); }
            else toast.error(d.message || "Failed");
        },
    });

    const cartItems = cartData?.cart ?? [];
    const subtotal = cartData?.subtotal ?? 0;

    const openShare = async () => {
        setShareOpen(true);
        if (!shareLink) {
            setShareLoading(true);
            try {
                const link = await createShareLink();
                setShareLink(link);
            } catch {
                toast.error("Could not generate share link");
            } finally {
                setShareLoading(false);
            }
        }
    };

    const handleCopy = async () => {
        if (!shareLink) return;
        try {
            await navigator.clipboard.writeText(shareLink);
            setCopied(true);
            toast.success("Link copied!");
            setTimeout(() => setCopied(false), 2000);
        } catch { toast.error("Copy failed"); }
    };
    const handleWhatsApp = () => {
        if (!shareLink) return;
        window.open(`https://wa.me/?text=${encodeURIComponent(`Here's your PrintDuka cart: ${shareLink}`)}`, "_blank");
    };
    const handleEmail = () => {
        if (!shareLink) return;
        window.location.href = `mailto:?subject=${encodeURIComponent("Your PrintDuka Cart")}&body=${encodeURIComponent(`Hi,\n\nHere's your PrintDuka cart:\n${shareLink}\n\nPlease review and let us know if you'd like to proceed.\n\nRegards,\nPrintDuka`)}`;
    };

    return (
        <AccountManagerLayout>
            <div className="max-w-7xl mx-auto px-4 py-6">

                {/* Header */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ShoppingCart className="w-6 h-6 text-brand-blue" /> Cart Builder
                        </h1>
                        <p className="text-sm text-gray-400 mt-0.5">Add products, then share a link with your client</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={openShare} disabled={!cartItems.length}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40 shadow-sm">
                            <Share2 className="w-4 h-4" /> Share Cart
                        </button>
                        <button onClick={() => setAttachOpen(true)} disabled={!cartItems.length}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors disabled:opacity-40 shadow-sm">
                            <Paperclip className="w-4 h-4" /> Attach to Quote
                        </button>
                        {cartItems.length > 0 && (
                            <button onClick={() => clearMut.mutate()} disabled={clearMut.isPending}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">
                                <Trash2 className="w-4 h-4" /> Clear
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── Catalog ── */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                            <form onSubmit={(e) => { e.preventDefault(); setSubmitted(search); }} className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                        placeholder="Search products…"
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
                                </div>
                                <button type="submit" className="px-4 py-2 text-sm font-semibold bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90">Search</button>
                                {submitted && (
                                    <button type="button" onClick={() => { setSearch(""); setSubmitted(""); }}
                                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">✕</button>
                                )}
                            </form>
                        </div>

                        {catalogLoading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white border border-gray-100 rounded-xl h-64 animate-pulse" />)}
                            </div>
                        ) : !catalog?.results.length ? (
                            <div className="bg-white border border-gray-100 rounded-xl p-12 text-center shadow-sm">
                                <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm text-gray-500">No products found{submitted ? ` for "${submitted}"` : "."}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {catalog.results.map((p) => (
                                    <div key={p.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all group">
                                        <div className="relative">
                                            <ProductThumb name={p.name} url={p.primary_image_url} className="w-full h-36" />
                                            <a href={`/store/${p.id}`} target="_blank" rel="noopener noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-gray-500 hover:text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity shadow">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        </div>
                                        <div className="p-3">
                                            <p className="text-sm font-semibold text-gray-900 leading-tight mb-1 line-clamp-2">{p.name}</p>
                                            {p.min_price
                                                ? <p className="text-xs font-bold text-brand-blue mb-2">From KES {p.min_price.toLocaleString()}</p>
                                                : <p className="text-xs text-gray-400 mb-2">Price on request</p>}
                                            <div className="flex items-center gap-1.5">
                                                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                                                    <button onClick={() => setQty(q => ({ ...q, [p.id]: Math.max(1, (q[p.id] ?? 1) - 1) }))}
                                                        className="px-2 py-1.5 text-gray-500 hover:bg-gray-50"><Minus className="w-3 h-3" /></button>
                                                    <span className="px-2 text-xs font-semibold min-w-[24px] text-center">{qty[p.id] ?? 1}</span>
                                                    <button onClick={() => setQty(q => ({ ...q, [p.id]: (q[p.id] ?? 1) + 1 }))}
                                                        className="px-2 py-1.5 text-gray-500 hover:bg-gray-50"><Plus className="w-3 h-3" /></button>
                                                </div>
                                                <button
                                                    onClick={() => addMut.mutate({ productId: p.id, quantity: qty[p.id] ?? 1 })}
                                                    disabled={addMut.isPending}
                                                    className="flex-1 py-1.5 text-xs font-semibold bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 disabled:opacity-50 transition-colors">
                                                    + Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Cart Panel ── */}
                    <div>
                        <div className="bg-white border border-gray-100 rounded-xl shadow-sm sticky top-4">
                            <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-brand-blue" /> Cart
                                </h2>
                                <span className="text-xs bg-brand-blue/10 text-brand-blue font-bold px-2 py-0.5 rounded-full">
                                    {cartLoading ? "…" : cartItems.length}
                                </span>
                            </div>
                            <div className="p-3 space-y-2 max-h-[360px] overflow-y-auto">
                                {cartLoading ? (
                                    <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
                                ) : !cartItems.length ? (
                                    <div className="py-10 text-center">
                                        <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                                        <p className="text-sm text-gray-400">Cart is empty</p>
                                    </div>
                                ) : cartItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-2.5 items-center p-2 rounded-xl bg-gray-50">
                                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                            <ProductThumb name={item.product_name} url={item.image_url} className="w-full h-full" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-900 leading-tight truncate">{item.product_name}</p>
                                            <p className="text-xs text-gray-400">×{item.quantity}{item.unit_price > 0 ? ` · KES ${item.unit_price.toLocaleString()}` : ""}</p>
                                            {item.unit_price > 0 && <p className="text-xs font-bold text-brand-blue">KES {item.line_total.toLocaleString()}</p>}
                                        </div>
                                        <button onClick={() => removeMut.mutate(idx)}
                                            className="shrink-0 p-1 text-gray-300 hover:text-red-500 transition-colors">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {cartItems.length > 0 && (
                                <div className="p-4 border-t border-gray-50 space-y-2">
                                    {subtotal > 0 && (
                                        <div className="flex justify-between text-sm font-bold mb-1">
                                            <span className="text-gray-500">Subtotal</span>
                                            <span className="text-gray-900">KES {subtotal.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <button onClick={openShare}
                                        className="w-full py-2.5 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                                        <Share2 className="w-4 h-4" /> Share Cart Link
                                    </button>
                                    <button onClick={() => setAttachOpen(true)}
                                        className="w-full py-2 text-sm font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
                                        <Paperclip className="w-4 h-4" /> Attach to Quote
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Client Orders Awaiting Quote ── */}
                <div className="mt-8">
                    <div className="flex items-center gap-2 mb-3">
                        <ClipboardList className="w-5 h-5 text-brand-blue" />
                        <h2 className="text-lg font-bold text-gray-900">Client Orders Awaiting Quote</h2>
                        {pendingClientOrders.length > 0 && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-brand-blue/10 text-brand-blue">
                                {pendingClientOrders.length}
                            </span>
                        )}
                    </div>

                    {pendingOrdersLoading ? (
                        <div className="bg-white border border-gray-100 rounded-xl p-6 flex justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                        </div>
                    ) : pendingClientOrders.length === 0 ? (
                        <div className="bg-white border border-gray-100 rounded-xl p-8 text-center shadow-sm">
                            <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">No client orders pending quote creation.</p>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-left">
                                        <th className="px-4 py-3 font-semibold text-gray-700">Order #</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Client</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Items</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Total</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Submitted</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {pendingClientOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 font-mono font-medium text-brand-blue">{order.order_number}</td>
                                            <td className="px-4 py-3 text-gray-700">{order.client_name}</td>
                                            <td className="px-4 py-3 text-gray-500">
                                                {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                {parseFloat(order.total_amount) > 0
                                                    ? `KES ${parseFloat(order.total_amount).toLocaleString()}`
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">
                                                {order.submitted_at
                                                    ? new Date(order.submitted_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Link
                                                    href={`/account-manager/quotes/create?client=${order.client}&order=${order.id}`}
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-brand-blue px-3 py-1.5 rounded-lg hover:bg-brand-blue/90 transition-colors"
                                                >
                                                    Create Quote <ArrowRight className="w-3 h-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Share Modal ── */}
            {shareOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShareOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900">Share Cart</h3>
                            <button onClick={() => setShareOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-5">
                            {shareLoading ? (
                                <div className="py-8 flex flex-col items-center gap-3">
                                    <Loader2 className="w-6 h-6 animate-spin text-brand-blue" />
                                    <p className="text-sm text-gray-400">Generating link…</p>
                                </div>
                            ) : shareLink ? (
                                <>
                                    {/* Link display */}
                                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 mb-4">
                                        <Link2 className="w-4 h-4 text-brand-blue shrink-0" />
                                        <p className="text-xs text-gray-600 truncate flex-1 font-mono">{shareLink}</p>
                                        <button onClick={handleCopy}
                                            className="shrink-0 p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                                            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                                        </button>
                                    </div>

                                    {/* Share buttons */}
                                    <div className="space-y-2">
                                        <button onClick={handleWhatsApp}
                                            className="w-full py-3 text-sm font-semibold bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
                                            <MessageCircle className="w-5 h-5" /> Send via WhatsApp
                                        </button>
                                        <button onClick={handleEmail}
                                            className="w-full py-3 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
                                            <Mail className="w-5 h-5" /> Send via Email
                                        </button>
                                        <button onClick={handleCopy}
                                            className="w-full py-2.5 text-sm border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                                            {copied ? <><Check className="w-4 h-4 text-green-500" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
                                        </button>
                                    </div>

                                    <p className="text-xs text-center text-gray-400 mt-4">
                                        Client opens the link in any browser — no login required
                                    </p>
                                </>
                            ) : (
                                <div className="py-8 text-center">
                                    <p className="text-sm text-red-500">Failed to generate link. Try again.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Attach to Quote ── */}
            {attachOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setAttachOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900">Attach to Quote</h3>
                            <button onClick={() => setAttachOpen(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-4 h-4 text-gray-400" /></button>
                        </div>
                        <div className="p-5">
                            <p className="text-sm text-gray-500 mb-3">Select a quote to attach this cart to.</p>
                            <select value={selectedQuoteId} onChange={e => setSelectedQuoteId(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
                                <option value="">— Select a quote —</option>
                                {quotes.map(q => (
                                    <option key={q.id} value={q.quote_id}>{q.quote_id} — {q.client_name || "No client"} ({q.status})</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2 px-5 pb-5">
                            <button onClick={() => setAttachOpen(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                            <button onClick={() => selectedQuoteId && attachMut.mutate(selectedQuoteId)}
                                disabled={!selectedQuoteId || attachMut.isPending}
                                className="px-5 py-2 text-sm font-semibold bg-brand-blue text-white rounded-xl hover:bg-brand-blue/90 disabled:opacity-50">
                                {attachMut.isPending ? "Attaching…" : "Attach"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AccountManagerLayout>
    );
}

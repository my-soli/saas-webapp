import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const DJANGO_API = process.env.DJANGO_API_URL || "http://localhost:8000";

interface CartItem {
    product_id: number;
    product_name: string;
    description?: string;
    unit_price: number;
    quantity: number;
    image_url: string | null;
    line_total: number;
}

interface SharedCartData {
    items: CartItem[];
    created_at: string;
}

const GRADIENTS = [
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600",
    "from-violet-500 to-purple-600",
    "from-rose-500 to-pink-600",
    "from-cyan-500 to-sky-600",
    "from-lime-500 to-green-600",
    "from-fuchsia-500 to-pink-600",
];
function gradientFor(name: string) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    return GRADIENTS[h % GRADIENTS.length];
}
function initialsFor(name: string) {
    return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

async function getCartData(token: string): Promise<SharedCartData | null> {
    try {
        const res = await fetch(`${DJANGO_API}/shared-cart/${token}/`, { cache: "no-store" });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
    return { title: "PrintDuka — Shared Cart" };
}

export default async function SharedCartPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const data = await getCartData(token);

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="text-5xl mb-4">🔗</div>
                <h1 className="text-xl font-bold text-gray-800 mb-2">Link not found</h1>
                <p className="text-gray-500 text-sm mb-6">This cart link may have expired or doesn&apos;t exist.</p>
                <Link href="/" className="text-sm text-blue-600 hover:underline">Go to PrintDuka →</Link>
            </div>
        );
    }

    const items = data.items;
    const subtotal = items.reduce((sum, i) => sum + (i.line_total ?? 0), 0);
    const hasAnyPrice = items.some(i => i.unit_price > 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center text-white font-bold text-xs">PD</div>
                        <div>
                            <p className="text-sm font-bold text-gray-900">PrintDuka</p>
                            <p className="text-xs text-gray-400">Shared Cart</p>
                        </div>
                    </div>
                    <a
                        href="https://wa.me/254795332766"
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.121.554 4.112 1.524 5.84L0 24l6.335-1.461A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.791 9.791 0 01-4.988-1.364l-.358-.213-3.757.866.947-3.658-.234-.376A9.793 9.793 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
                        </svg>
                        Order via WhatsApp
                    </a>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* Hero */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 text-xs text-gray-500 mb-4 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        Your PrintDuka Cart — {items.length} item{items.length !== 1 ? "s" : ""}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Your Print Order</h1>
                    <p className="text-sm text-gray-500">Review the items below and contact us to confirm your order</p>
                </div>

                {/* Items */}
                <div className="space-y-3 mb-8">
                    {items.map((item, idx) => (
                        <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex gap-0">
                            {/* Image */}
                            <div className="flex-shrink-0 w-24 sm:w-32">
                                {item.image_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className={`w-full h-full min-h-[96px] bg-gradient-to-br ${gradientFor(item.product_name)} flex items-center justify-center`}>
                                        <span className="text-2xl font-bold text-white/90">{initialsFor(item.product_name)}</span>
                                    </div>
                                )}
                            </div>
                            {/* Info */}
                            <div className="flex-1 p-4 flex flex-col justify-center">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className="font-semibold text-gray-900 text-sm leading-tight">{item.product_name}</p>
                                    <a
                                        href={`/store/${item.product_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="View in catalog"
                                        className="shrink-0 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        View
                                    </a>
                                </div>
                                {item.description && <p className="text-xs text-gray-400 mb-2 line-clamp-2">{item.description}</p>}
                                <div className="flex items-center justify-between flex-wrap gap-2 mt-auto">
                                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                                        Qty: {item.quantity}
                                    </span>
                                    {item.unit_price > 0 ? (
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400">×{item.quantity} @ KES {item.unit_price.toLocaleString()}</p>
                                            <p className="text-sm font-bold text-blue-700">KES {item.line_total.toLocaleString()}</p>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">Price on request</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Summary */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Items</span>
                        <span className="text-sm font-semibold text-gray-800">{items.length}</span>
                    </div>
                    {hasAnyPrice && (
                        <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-3">
                            <span className="font-bold text-gray-900">Estimated Total</span>
                            <span className="text-lg font-bold text-blue-700">KES {subtotal.toLocaleString()}</span>
                        </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                        {hasAnyPrice ? "Prices are estimates — final pricing confirmed in a quote." : "Prices will be confirmed in a quote."}
                    </p>
                </div>

                {/* CTAs */}
                <div className="space-y-3">
                    <a
                        href={`https://wa.me/254795332766?text=${encodeURIComponent(`Hi PrintDuka! I'd like to order from this cart: ${typeof window !== "undefined" ? window.location.href : ""}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3.5 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-colors text-sm shadow-sm"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.121.554 4.112 1.524 5.84L0 24l6.335-1.461A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.791 9.791 0 01-4.988-1.364l-.358-.213-3.757.866.947-3.658-.234-.376A9.793 9.793 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
                        </svg>
                        Order via WhatsApp
                    </a>
                    <a
                        href="mailto:orders@printduka.co.ke"
                        className="flex items-center justify-center gap-2 w-full py-3 border border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 transition-colors text-sm"
                    >
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                        Email to orders@printduka.co.ke
                    </a>
                </div>

                <p className="text-center text-xs text-gray-400 mt-8">
                    Shared by your PrintDuka Account Manager · <a href="https://printduka.co.ke" className="hover:underline">printduka.co.ke</a>
                </p>
            </div>
        </div>
    );
}

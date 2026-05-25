import type { ReactElement } from "react";
import type { BrandAsset, Client, ClientContact, ComplianceDocument } from "@/types/clients";
import type { MultiProductQuote } from "@/types/quotes";

interface ClientDetailDrawerProps {
    client: Client | null;
    contacts: ClientContact[];
    brandAssets: BrandAsset[];
    complianceDocuments: ComplianceDocument[];
    quotes?: MultiProductQuote[];
    isOpen: boolean;
    isLoading: boolean;
    isLoadingRelations: boolean;
    onClose: () => void;
    onEdit: (client: Client) => void;
}

const STATUS_COLORS: Record<string, string> = {
    Draft: "bg-gray-100 text-gray-700",
    Costed: "bg-blue-100 text-blue-700",
    "Sent to Customer": "bg-yellow-100 text-yellow-700",
    Approved: "bg-green-100 text-green-700",
    Lost: "bg-red-100 text-red-700",
};

export default function ClientDetailDrawer({
    client,
    contacts,
    brandAssets,
    complianceDocuments,
    quotes = [],
    isOpen,
    isLoading,
    isLoadingRelations,
    onClose,
    onEdit,
}: ClientDetailDrawerProps): ReactElement | null {
    if (!isOpen) {
        return null;
    }

    const formatDate = (value: string | null | undefined): string => {
        if (!value) return "—";
        return new Date(value).toLocaleString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
        });
    };

    const formatAmount = (value: number | string | null | undefined): string => {
        if (value === null || value === undefined) return "—";
        const parsed = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(parsed)) return "—";
        return parsed.toLocaleString("en-KE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const Field = ({ label, value }: { label: string; value: string | ReactElement }): ReactElement => (
        <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="font-medium text-gray-900 text-sm mt-0.5">{value}</p>
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-50 flex justify-end bg-black/40"
            onClick={onClose}
        >
            <aside
                className="h-full w-full max-w-3xl bg-white shadow-2xl overflow-y-auto"
                onClick={(e): void => e.stopPropagation()}
            >
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Client Detail</h2>
                        <p className="text-sm text-gray-600 mt-1">Review account profile and related records.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700"
                    >
                        Close
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {isLoading || client === null ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-5 bg-gray-200 rounded w-56"></div>
                            <div className="h-4 bg-gray-200 rounded w-80"></div>
                            <div className="h-28 bg-gray-100 rounded"></div>
                        </div>
                    ) : (
                        <>
                            {/* Summary */}
                            <section className="rounded-lg border border-gray-200 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Summary</h3>
                                    <button
                                        type="button"
                                        onClick={(): void => onEdit(client)}
                                        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                    >
                                        Edit Client
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                    <Field label="Client ID" value={client.client_id} />
                                    <Field label="Status" value={client.status} />
                                    <Field label="Type" value={client.client_type} />
                                    <Field label="Name" value={client.name} />
                                    {client.client_type === "B2B" && (
                                        <>
                                            <Field label="Company" value={client.company || "—"} />
                                            <Field label="Industry" value={client.industry || "—"} />
                                            <Field label="KRA PIN" value={client.kra_pin || "—"} />
                                            <Field label="VAT / Tax ID" value={client.vat_tax_id || "—"} />
                                            <Field label="Risk Rating" value={client.risk_rating || "—"} />
                                            <Field label="Credit Limit" value={`KES ${formatAmount(client.credit_limit)}`} />
                                            <Field label="Default Markup %" value={formatAmount(client.default_markup)} />
                                            <Field label="Reseller" value={client.is_reseller ? "Yes" : "No"} />
                                        </>
                                    )}
                                    <Field label="Email" value={client.email || "—"} />
                                    <Field label="Phone" value={client.phone || "—"} />
                                    <Field label="Preferred Channel" value={client.preferred_channel || "—"} />
                                    <Field label="Payment Terms" value={client.payment_terms || "—"} />
                                    <Field label="Lead Source" value={client.lead_source || "—"} />
                                    <Field label="Created" value={formatDate(client.created_at)} />
                                </div>
                            </section>

                            {/* Address */}
                            {(client.address || client.delivery_address || client.delivery_instructions) && (
                                <section className="rounded-lg border border-gray-200 p-4">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Address & Delivery</h3>
                                    <div className="grid grid-cols-1 gap-3 text-sm">
                                        {client.address && <Field label="Address" value={client.address} />}
                                        {client.delivery_address && <Field label="Delivery Address" value={client.delivery_address} />}
                                        {client.delivery_instructions && <Field label="Delivery Instructions" value={client.delivery_instructions} />}
                                    </div>
                                </section>
                            )}

                            {/* Contacts */}
                            {!isLoadingRelations && contacts.length > 0 && (
                                <section className="rounded-lg border border-gray-200 p-4">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                        Contacts ({contacts.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {contacts.map((c) => (
                                            <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md text-sm">
                                                <div>
                                                    <span className="font-medium text-gray-900">{c.full_name}</span>
                                                    {c.is_primary && (
                                                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Primary</span>
                                                    )}
                                                    <p className="text-xs text-gray-500 mt-0.5">{c.role || "—"} · {c.email || c.phone || "—"}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Quotes */}
                            <section className="rounded-lg border border-gray-200 p-4">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                    Quotes {!isLoadingRelations && `(${quotes.length})`}
                                </h3>
                                {isLoadingRelations ? (
                                    <p className="text-sm text-gray-500">Loading quotes...</p>
                                ) : quotes.length === 0 ? (
                                    <p className="text-sm text-gray-500">No quotes yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {quotes.map((q) => (
                                            <div key={q.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md text-sm">
                                                <div>
                                                    <span className="font-medium text-gray-900">{q.quote_id}</span>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {q.item_count} item{q.item_count !== 1 ? "s" : ""} · {formatDate(q.created_date)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-medium text-gray-700">
                                                        KES {formatAmount(q.total_value)}
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[q.status] ?? "bg-gray-100 text-gray-600"}`}>
                                                        {q.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* Assets & Docs summary */}
                            {!isLoadingRelations && (brandAssets.length > 0 || complianceDocuments.length > 0) && (
                                <section className="rounded-lg border border-gray-200 p-4">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Files</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="rounded-md bg-gray-50 p-3 border border-gray-100">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">Brand Assets</p>
                                            <p className="text-xl font-bold text-gray-900 mt-1">{brandAssets.length}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {brandAssets[0]?.asset_type ?? "—"}
                                            </p>
                                        </div>
                                        <div className="rounded-md bg-gray-50 p-3 border border-gray-100">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">Compliance Docs</p>
                                            <p className="text-xl font-bold text-gray-900 mt-1">{complianceDocuments.length}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {complianceDocuments[0]?.document_type ?? "—"}
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>
            </aside>
        </div>
    );
}

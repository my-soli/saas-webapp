"use client";

import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import AdminLayout from "@/components/admin/admin-layout";
import SearchableSelect from "@/components/admin/searchable-select";
import TaxRateSelect from "@/components/admin/tax-rate-select";
import {
    ArrowLeft, Plus, Trash2, Loader2, ChevronDown, ChevronRight, Layers, SearchIcon,
} from "lucide-react";
import {
    fetchInvoice,
    updateInvoice,
    fetchClientOptions,
    fetchProductSuggestions,
    computeDueDate,
    PAYMENT_TERMS_OPTIONS,
    type FinancialInvoice,
    type InvoiceLineItem,
    type ProductSuggestion,
} from "@/services/financial-invoices";

interface DraftLineItem {
    description: string;
    quantity: string;
    unit_rate: string;
    tax_rate: string;
}

function lineAmount(li: DraftLineItem): number {
    const qty = parseFloat(li.quantity) || 0;
    const rate = parseFloat(li.unit_rate) || 0;
    const taxRate = parseFloat(li.tax_rate) || 0;
    return qty * rate * (1 + taxRate / 100);
}

function ItemDescriptionCell({ value, onChange }: { value: string; onChange: (v: string) => void }): ReactElement {
    const [focused, setFocused] = useState(false);
    const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!focused || !value.trim()) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            const results = await fetchProductSuggestions(value);
            setSuggestions(results);
        }, 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [value, focused]);

    const visibleSuggestions = focused && value.trim() ? suggestions : [];

    return (
        <div className="relative">
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                placeholder="Type or click to select an item…"
                className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
            />
            {visibleSuggestions.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full max-h-44 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                    {visibleSuggestions.map((s) => (
                        <li key={s.id}>
                            <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); onChange(s.name); setSuggestions([]); }}
                                className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                {s.name}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function BulkAddModal({ onAdd, onClose }: {
    onAdd: (items: DraftLineItem[]) => void;
    onClose: () => void;
}): ReactElement {
    const [text, setText] = useState("");

    function parse(): DraftLineItem[] {
        return text
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
                const [description = "", quantity = "1", unit_rate = "0", tax_rate = "0"] = line.split(",").map((s) => s.trim());
                return { description, quantity: quantity || "1", unit_rate: unit_rate || "0", tax_rate: tax_rate || "0" };
            })
            .filter((li) => li.description);
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Add Items in Bulk</h2>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">✕</button>
                </div>
                <div className="p-6 space-y-3">
                    <p className="text-xs text-gray-500">
                        One item per line: <span className="font-mono">description, quantity, rate, tax%</span> (quantity/rate/tax% optional, default 1 / 0 / 0)
                    </p>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={8}
                        placeholder={"Business Cards, 500, 5, 16\nFlyers A5, 200, 3"}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-none"
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => { onAdd(parse()); onClose(); }}
                            disabled={!text.trim()}
                            className="px-5 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                        >
                            Add Items
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Form (mounted only once the invoice has loaded, so initial state derives
// from real data without an effect-based sync) ──────────────────────────────

function EditInvoiceForm({ invoice }: { invoice: FinancialInvoice }): ReactElement {
    const router = useRouter();
    const { data: clients = [] } = useQuery({ queryKey: ["client-options"], queryFn: fetchClientOptions });

    const [clientId, setClientId] = useState<number>(invoice.client);
    const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoice_number);
    const [invoiceDate, setInvoiceDate] = useState(invoice.invoice_date);
    const [paymentTerms, setPaymentTerms] = useState(invoice.payment_terms);
    const [dueDate, setDueDate] = useState(invoice.due_date ?? "");
    const [notes, setNotes] = useState(invoice.notes);
    const [terms, setTerms] = useState(invoice.terms);
    const [paymentOptions, setPaymentOptions] = useState(invoice.payment_options);
    const [discount, setDiscount] = useState(String(invoice.discount ?? "0"));
    const [showTotalSummary, setShowTotalSummary] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
    const [lineItems, setLineItems] = useState<DraftLineItem[]>(
        invoice.line_items.length > 0
            ? invoice.line_items.map((li) => ({
                description: li.description,
                quantity: String(li.quantity),
                unit_rate: String(li.unit_rate),
                tax_rate: String(li.tax_rate),
            }))
            : [{ description: "", quantity: "1", unit_rate: "0", tax_rate: "0" }]
    );

    function handleInvoiceDateChange(next: string) {
        setInvoiceDate(next);
        const computed = computeDueDate(next, paymentTerms);
        if (computed) setDueDate(computed);
    }

    function handlePaymentTermsChange(next: string) {
        setPaymentTerms(next);
        const computed = computeDueDate(invoiceDate, next);
        if (computed) setDueDate(computed);
    }

    const totals = useMemo(() => {
        let subtotal = 0;
        let tax = 0;
        for (const li of lineItems) {
            const qty = parseFloat(li.quantity) || 0;
            const rate = parseFloat(li.unit_rate) || 0;
            const taxRate = parseFloat(li.tax_rate) || 0;
            const base = qty * rate;
            subtotal += base;
            tax += base * (taxRate / 100);
        }
        const discountVal = parseFloat(discount) || 0;
        return { subtotal, tax, total: subtotal + tax - discountVal };
    }, [lineItems, discount]);

    function updateLine(index: number, field: keyof DraftLineItem, value: string) {
        setLineItems((prev) => prev.map((li, i) => (i === index ? { ...li, [field]: value } : li)));
    }

    function addLine() {
        setLineItems((prev) => [...prev, { description: "", quantity: "1", unit_rate: "0", tax_rate: "0" }]);
    }

    function addBulkLines(items: DraftLineItem[]) {
        setLineItems((prev) => [...prev.filter((li) => li.description.trim()), ...items]);
    }

    function removeLine(index: number) {
        setLineItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
    }

    const saveMutation = useMutation({
        mutationFn: () => {
            const line_items: InvoiceLineItem[] = lineItems
                .filter((li) => li.description.trim())
                .map((li) => ({
                    description: li.description,
                    quantity: li.quantity,
                    unit_rate: li.unit_rate,
                    tax_rate: li.tax_rate,
                }));
            return updateInvoice(invoice.id, {
                client: clientId,
                invoice_number: invoiceNumber,
                invoice_date: invoiceDate,
                payment_terms: paymentTerms,
                due_date: dueDate || null,
                discount,
                notes,
                terms,
                payment_options: paymentOptions,
                line_items,
            });
        },
        onSuccess: () => {
            toast.success("Invoice updated");
            router.push("/admin/financial");
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const canSave = invoiceDate && lineItems.some((li) => li.description.trim());
    const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));

    return (
        <>
            <div className="p-4 lg:p-8 pb-28">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Customer */}
                    <div className="px-6 py-5 bg-gray-50/60 border-b border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Customer Name <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2 max-w-xl">
                            <SearchableSelect
                                options={clientOptions}
                                value={clientId}
                                onChange={(v) => setClientId(Number(v))}
                                placeholder="Select or add a customer"
                                className="flex-1"
                                open={customerDropdownOpen}
                                onOpenChange={setCustomerDropdownOpen}
                            />
                            <button
                                type="button"
                                title="Search customers"
                                onClick={() => setCustomerDropdownOpen(true)}
                                className="shrink-0 px-3 rounded-md bg-brand-blue text-white hover:opacity-90 transition-opacity"
                            >
                                <SearchIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Invoice # */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Invoice # <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Dates + Terms */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Invoice Date <span className="text-red-500">*</span></label>
                                <input type="date" value={invoiceDate} onChange={(e) => handleInvoiceDateChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Terms</label>
                                <select value={paymentTerms} onChange={(e) => handlePaymentTermsChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent bg-white">
                                    {PAYMENT_TERMS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Due Date</label>
                                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                            </div>
                        </div>

                        {/* Item Table */}
                        <div>
                            <label className="text-sm font-semibold text-gray-800 block mb-2">Item Table</label>
                            <div className="border border-gray-200 rounded-lg overflow-x-auto">
                                <table className="w-full text-sm min-w-[680px]">
                                    <thead>
                                        <tr className="bg-gray-50 text-left text-xs text-gray-400 uppercase tracking-wide">
                                            <th className="px-3 py-2 font-medium">Item Details</th>
                                            <th className="px-3 py-2 font-medium w-24">Qty</th>
                                            <th className="px-3 py-2 font-medium w-28">Rate</th>
                                            <th className="px-3 py-2 font-medium w-36">Tax %</th>
                                            <th className="px-3 py-2 font-medium w-32 text-right">Amount</th>
                                            <th className="px-2 py-2 w-10" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {lineItems.map((li, idx) => (
                                            <tr key={idx}>
                                                <td className="px-3 py-2 align-top">
                                                    <ItemDescriptionCell value={li.description} onChange={(v) => updateLine(idx, "description", v)} />
                                                </td>
                                                <td className="px-3 py-2 align-top">
                                                    <input type="number" min={0} step="0.01" value={li.quantity} onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                                                        className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm text-right focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                                                </td>
                                                <td className="px-3 py-2 align-top">
                                                    <input type="number" min={0} step="0.01" value={li.unit_rate} onChange={(e) => updateLine(idx, "unit_rate", e.target.value)}
                                                        className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm text-right focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                                                </td>
                                                <td className="px-3 py-2 align-top">
                                                    <TaxRateSelect value={li.tax_rate} onChange={(v) => updateLine(idx, "tax_rate", v)} />
                                                </td>
                                                <td className="px-3 py-2 align-top text-right font-medium text-gray-900">
                                                    {lineAmount(li).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-2 py-2 align-top">
                                                    <button type="button" onClick={() => removeLine(idx)} disabled={lineItems.length === 1}
                                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-2 flex items-center gap-4">
                                <button type="button" onClick={addLine}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-brand-blue border border-brand-blue/30 rounded-md hover:bg-brand-blue/5 transition-colors">
                                    <Plus className="w-4 h-4" /> Add New Row
                                </button>
                                <button type="button" onClick={() => setShowBulkModal(true)}
                                    className="flex items-center gap-1.5 text-sm text-brand-blue hover:underline">
                                    <Layers className="w-4 h-4" /> Add Items in Bulk
                                </button>
                            </div>
                        </div>

                        {/* Notes + Totals */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Customer Notes</label>
                                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                                        placeholder="Thanks for your business."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-none" />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Terms &amp; Conditions</label>
                                    <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={5}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-y" />
                                </div>

                                {/* New section — only added to invoices still being drafted, not
                                    retrofitted onto already-sent ones (those keep their original
                                    Notes + Terms-only edit form, unchanged). */}
                                {invoice.status === "draft" && (
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Payment Options</label>
                                        <textarea value={paymentOptions} onChange={(e) => setPaymentOptions(e.target.value)} rows={8}
                                            placeholder="Bank transfer details, M-Pesa paybill, etc."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-y" />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                                    <div className="flex justify-between text-base">
                                        <span className="font-semibold text-gray-900">Total ( KES )</span>
                                        <span className="font-bold text-gray-900">{totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    <button type="button" onClick={() => setShowTotalSummary((s) => !s)}
                                        className="flex items-center gap-1 text-xs text-brand-blue hover:underline">
                                        {showTotalSummary ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                        Show Total Summary
                                    </button>

                                    {showTotalSummary && (
                                        <div className="pt-2 border-t border-gray-200 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Subtotal</span>
                                                <span className="font-medium text-gray-900">{totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Tax</span>
                                                <span className="font-medium text-gray-900">{totals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Discount</span>
                                                <input type="number" min={0} step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)}
                                                    className="w-28 px-2 py-1 border border-gray-300 rounded-md text-sm text-right focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky footer */}
            <div className="fixed bottom-0 left-0 right-0 lg:left-64 border-t border-gray-200 bg-white px-4 lg:px-8 py-3 flex items-center gap-3 z-10">
                <button type="button" disabled={!canSave || saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
                    {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Changes
                </button>
                <Link href="/admin/financial"
                    className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
                    Cancel
                </Link>
            </div>

            {showBulkModal && <BulkAddModal onAdd={addBulkLines} onClose={() => setShowBulkModal(false)} />}
        </>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EditInvoicePage(): ReactElement {
    const params = useParams();
    const invoiceId = Number(params.id);

    const { data: invoice, isLoading, isError } = useQuery({
        queryKey: ["financial-invoice", invoiceId],
        queryFn: () => fetchInvoice(invoiceId),
        enabled: Number.isFinite(invoiceId),
    });

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 lg:py-6">
                    <Link href="/admin/financial" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-1">
                        <ArrowLeft className="w-3.5 h-3.5" /> Invoices
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Edit Invoice {invoice ? `— ${invoice.invoice_number}` : ""}
                    </h1>
                </div>
            </header>

            {isLoading && <div className="text-center py-16 text-gray-400 text-sm">Loading invoice…</div>}
            {isError && <div className="text-center py-16 text-gray-500 text-sm">Failed to load invoice.</div>}

            {invoice && invoice.status === "void" && (
                <div className="p-4 lg:p-8">
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-5 text-sm">
                        This invoice is void and cannot be edited.
                    </div>
                </div>
            )}

            {invoice && invoice.status !== "void" && <EditInvoiceForm key={invoice.id} invoice={invoice} />}
        </AdminLayout>
    );
}

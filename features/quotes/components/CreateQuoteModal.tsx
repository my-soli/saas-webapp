import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { PaymentTerms, CreateQuoteInput } from "@/types/quotes";
import type { Client } from "@/types/clients";
import type { Lead } from "@/types/leads";
import type { Product } from "@/types/products";
import { fetchClients } from "@/services/clients";
import { fetchLeads } from "@/services/leads";
import { fetchProducts } from "@/services/products";

interface CreateQuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateQuoteInput) => void;
    isSubmitting: boolean;
}

interface LineItem {
    tempId: string;
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    discount_type: "percent" | "fixed";
}

export default function CreateQuoteModal({
    isOpen,
    onClose,
    onSubmit,
    isSubmitting,
}: CreateQuoteModalProps) {
    const [clientType, setClientType] = useState<"client" | "lead">("client");

    // Client combobox
    const [clientSearch, setClientSearch] = useState("");
    const [debouncedClientSearch, setDebouncedClientSearch] = useState("");
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
    const [selectedClientName, setSelectedClientName] = useState("");
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const clientInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedClientSearch(clientSearch), 300);
        return () => clearTimeout(t);
    }, [clientSearch]);

    // Lead combobox
    const [leadSearch, setLeadSearch] = useState("");
    const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
    const [selectedLeadName, setSelectedLeadName] = useState("");
    const [showLeadDropdown, setShowLeadDropdown] = useState(false);
    const leadInputRef = useRef<HTMLInputElement>(null);

    const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split("T")[0]);
    const [validUntil, setValidUntil] = useState(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    );
    const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>("Prepaid");
    const [includeVat, setIncludeVat] = useState(true);
    const [taxRate, setTaxRate] = useState(16);
    const [shippingCharges, setShippingCharges] = useState(0);
    const [adjustmentAmount, setAdjustmentAmount] = useState(0);
    const [adjustmentReason, setAdjustmentReason] = useState("");
    const [notes, setNotes] = useState("");
    const [customTerms, setCustomTerms] = useState("");
    const [lineItems, setLineItems] = useState<LineItem[]>([]);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setClientType("client");
            setClientSearch("");
            setDebouncedClientSearch("");
            setSelectedClientId(null);
            setSelectedClientName("");
            setLeadSearch("");
            setSelectedLeadId(null);
            setSelectedLeadName("");
            setLineItems([]);
        }
    }, [isOpen]);

    const { data: clientsData, isFetching: clientsFetching } = useQuery({
        queryKey: ["clients-search", debouncedClientSearch],
        queryFn: () =>
            fetchClients({
                page: 1,
                pageSize: 30,
                search: debouncedClientSearch,
                status: "all",
                clientType: "all",
            }),
        enabled: isOpen,
    });

    const { data: leadsData } = useQuery({
        queryKey: ["leads-search", leadSearch],
        queryFn: () =>
            fetchLeads({
                page: 1,
                pageSize: 20,
                search: leadSearch,
                status: "all",
                source: "all",
            }),
        enabled: isOpen && clientType === "lead",
    });

    const { data: productsData } = useQuery({
        queryKey: ["products", 1, 100, ""],
        queryFn: () =>
            fetchProducts({
                page: 1,
                pageSize: 100,
                search: "",
                status: "all",
                pricingMode: "all",
                printCategory: "",
                category: "",
            }),
        enabled: isOpen,
    });

    const clients = clientsData?.results || [];
    const leads = leadsData?.results || [];
    const products = productsData?.results || [];

    const selectClient = (client: Client) => {
        setSelectedClientId(client.id);
        setSelectedClientName(client.company || client.name);
        setClientSearch(client.company || client.name);
        setShowClientDropdown(false);
    };

    const selectLead = (lead: Lead) => {
        setSelectedLeadId(lead.id);
        setSelectedLeadName(lead.name);
        setLeadSearch(lead.name);
        setShowLeadDropdown(false);
    };

    const addLineItem = () => {
        setLineItems([
            ...lineItems,
            {
                tempId: Date.now().toString(),
                product_id: 0,
                product_name: "",
                quantity: 1,
                unit_price: 0,
                discount_amount: 0,
                discount_type: "percent",
            },
        ]);
    };

    const removeLineItem = (tempId: string) => {
        setLineItems(lineItems.filter((item) => item.tempId !== tempId));
    };

    const updateLineItem = (tempId: string, field: keyof LineItem, value: string | number) => {
        setLineItems(
            lineItems.map((item) => {
                if (item.tempId === tempId) {
                    if (field === "product_id") {
                        const product = products.find((p) => p.id === Number(value));
                        return {
                            ...item,
                            product_id: Number(value),
                            product_name: product?.name || "",
                            unit_price: 0,
                        };
                    }
                    return { ...item, [field]: value };
                }
                return item;
            })
        );
    };

    const calculateSubtotal = () => {
        return lineItems.reduce((sum, item) => {
            const lineTotal = item.quantity * item.unit_price;
            const discount =
                item.discount_type === "percent"
                    ? lineTotal * (item.discount_amount / 100)
                    : item.discount_amount;
            return sum + (lineTotal - discount);
        }, 0);
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        const tax = includeVat ? subtotal * (taxRate / 100) : 0;
        return subtotal + tax + shippingCharges + adjustmentAmount;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedClientId && !selectedLeadId) {
            alert("Please select a client or lead");
            return;
        }

        if (lineItems.length === 0) {
            alert("Please add at least one product");
            return;
        }

        const invalidItems = lineItems.filter((item) => !item.product_id || item.quantity <= 0);
        if (invalidItems.length > 0) {
            alert("Please complete all line items with valid products and quantities");
            return;
        }

        const quoteData: CreateQuoteInput = {
            client_id: clientType === "client" ? selectedClientId || undefined : undefined,
            lead_id: clientType === "lead" ? selectedLeadId || undefined : undefined,
            quote_date: quoteDate,
            valid_until: validUntil,
            payment_terms: paymentTerms,
            include_vat: includeVat,
            tax_rate: taxRate,
            shipping_charges: shippingCharges || undefined,
            adjustment_amount: adjustmentAmount || undefined,
            adjustment_reason: adjustmentReason || undefined,
            notes: notes || undefined,
            custom_terms: customTerms || undefined,
            line_items: lineItems.map((item) => ({
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_amount: item.discount_amount || undefined,
                discount_type: item.discount_type,
            })),
        };

        onSubmit(quoteData);
    };

    const handleClose = () => {
        if (!isSubmitting) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-semibold text-gray-900">New Quote</h2>
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Quote For
                            </label>
                            <div className="flex gap-4 mb-3">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        value="client"
                                        checked={clientType === "client"}
                                        onChange={(e) => {
                                            setClientType(e.target.value as "client" | "lead");
                                            setSelectedLeadId(null);
                                            setSelectedLeadName("");
                                            setLeadSearch("");
                                        }}
                                        className="text-brand-blue focus:ring-brand-blue"
                                    />
                                    <span className="text-sm text-gray-700">Existing Client</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        value="lead"
                                        checked={clientType === "lead"}
                                        onChange={(e) => {
                                            setClientType(e.target.value as "client" | "lead");
                                            setSelectedClientId(null);
                                            setSelectedClientName("");
                                            setClientSearch("");
                                        }}
                                        className="text-brand-blue focus:ring-brand-blue"
                                    />
                                    <span className="text-sm text-gray-700">Lead</span>
                                </label>
                            </div>

                            {clientType === "client" ? (
                                <div className="relative">
                                    <div className="relative">
                                        <input
                                            ref={clientInputRef}
                                            type="text"
                                            value={clientSearch}
                                            onChange={(e) => {
                                                setClientSearch(e.target.value);
                                                setSelectedClientId(null);
                                                setSelectedClientName("");
                                                setShowClientDropdown(true);
                                            }}
                                            onFocus={() => setShowClientDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
                                            placeholder="Search by name, company, phone…"
                                            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
                                            autoComplete="off"
                                        />
                                        {clientsFetching && !selectedClientId
                                            ? <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">…</span>
                                            : <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        }
                                    </div>
                                    {selectedClientId && (
                                        <p className="text-xs text-green-600 mt-1">
                                            ✓ {selectedClientName} selected
                                        </p>
                                    )}
                                    {showClientDropdown && clients.length > 0 && (
                                        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                                            {clients.map((client: Client) => (
                                                <li
                                                    key={client.id}
                                                    onMouseDown={() => selectClient(client)}
                                                    className="px-3 py-2 hover:bg-brand-blue/10 cursor-pointer text-sm"
                                                >
                                                    <span className="font-medium">
                                                        {client.company || client.name}
                                                    </span>
                                                    {client.company && client.name !== client.company && (
                                                        <span className="text-gray-500 ml-1">— {client.name}</span>
                                                    )}
                                                    <span className="text-gray-400 ml-2 text-xs">
                                                        {client.client_id}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {showClientDropdown && clientSearch.length > 0 && clients.length === 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500">
                                            No clients found
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="relative">
                                        <input
                                            ref={leadInputRef}
                                            type="text"
                                            value={leadSearch}
                                            onChange={(e) => {
                                                setLeadSearch(e.target.value);
                                                setSelectedLeadId(null);
                                                setSelectedLeadName("");
                                                setShowLeadDropdown(true);
                                            }}
                                            onFocus={() => setShowLeadDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowLeadDropdown(false), 150)}
                                            placeholder="Search by lead name, email or phone..."
                                            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
                                            autoComplete="off"
                                        />
                                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                    {selectedLeadId && (
                                        <p className="text-xs text-green-600 mt-1">
                                            ✓ {selectedLeadName} selected
                                        </p>
                                    )}
                                    {showLeadDropdown && leads.length > 0 && (
                                        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                                            {leads.map((lead: Lead) => (
                                                <li
                                                    key={lead.id}
                                                    onMouseDown={() => selectLead(lead)}
                                                    className="px-3 py-2 hover:bg-brand-blue/10 cursor-pointer text-sm"
                                                >
                                                    <span className="font-medium">{lead.name}</span>
                                                    {lead.company && (
                                                        <span className="text-gray-500 ml-1">— {lead.company}</span>
                                                    )}
                                                    {lead.email && (
                                                        <span className="text-gray-400 ml-2 text-xs">{lead.email}</span>
                                                    )}
                                                    <span className="text-gray-400 ml-2 text-xs">
                                                        {lead.lead_id}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {showLeadDropdown && leadSearch.length > 0 && leads.length === 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500">
                                            No leads found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Payment Terms
                            </label>
                            <select
                                value={paymentTerms}
                                onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                required
                            >
                                <option value="Prepaid">Prepaid</option>
                                <option value="Net 7">Net 7 Days</option>
                                <option value="Net 15">Net 15 Days</option>
                                <option value="Net 30">Net 30 Days</option>
                                <option value="Net 60">Net 60 Days</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">Products</h3>
                            <button
                                type="button"
                                onClick={addLineItem}
                                className="px-3 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Add Product
                            </button>
                        </div>

                        {lineItems.length === 0 ? (
                            <div className="bg-gray-50 rounded-lg p-8 text-center">
                                <p className="text-gray-600">No products added yet. Click "Add Product" to start.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {lineItems.map((item) => (
                                    <div
                                        key={item.tempId}
                                        className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-12 gap-3 items-start"
                                    >
                                        <div className="col-span-2 sm:col-span-4">
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Product
                                            </label>
                                            <select
                                                value={item.product_id || ""}
                                                onChange={(e) =>
                                                    updateLineItem(item.tempId, "product_id", e.target.value)
                                                }
                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                                required
                                            >
                                                <option value="">Select product</option>
                                                {products.map((product: Product) => (
                                                    <option key={product.id} value={product.id}>
                                                        {product.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-span-1 sm:col-span-2">
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Quantity
                                            </label>
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    updateLineItem(item.tempId, "quantity", Number(e.target.value))
                                                }
                                                min="1"
                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                                required
                                            />
                                        </div>

                                        <div className="col-span-1 sm:col-span-2">
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Unit Price
                                            </label>
                                            <input
                                                type="number"
                                                value={item.unit_price}
                                                onChange={(e) =>
                                                    updateLineItem(item.tempId, "unit_price", Number(e.target.value))
                                                }
                                                min="0"
                                                step="0.01"
                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                                required
                                            />
                                        </div>

                                        <div className="col-span-1 sm:col-span-3">
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Discount
                                            </label>
                                            <div className="flex gap-1">
                                                <input
                                                    type="number"
                                                    value={item.discount_amount}
                                                    onChange={(e) =>
                                                        updateLineItem(
                                                            item.tempId,
                                                            "discount_amount",
                                                            Number(e.target.value)
                                                        )
                                                    }
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                                />
                                                <select
                                                    value={item.discount_type}
                                                    onChange={(e) =>
                                                        updateLineItem(item.tempId, "discount_type", e.target.value)
                                                    }
                                                    className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                                >
                                                    <option value="percent">%</option>
                                                    <option value="fixed">KES</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="col-span-1 sm:col-span-1 flex items-end">
                                            <button
                                                type="button"
                                                onClick={() => removeLineItem(item.tempId)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Remove item"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="flex items-center gap-2 mb-2">
                                <input
                                    type="checkbox"
                                    checked={includeVat}
                                    onChange={(e) => setIncludeVat(e.target.checked)}
                                    className="text-brand-blue focus:ring-brand-blue"
                                />
                                <span className="text-sm font-medium text-gray-700">Include VAT</span>
                            </label>
                            {includeVat && (
                                <input
                                    type="number"
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(Number(e.target.value))}
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                    placeholder="Tax rate %"
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Shipping Charges (KES)
                            </label>
                            <input
                                type="number"
                                value={shippingCharges}
                                onChange={(e) => setShippingCharges(Number(e.target.value))}
                                min="0"
                                step="0.01"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Adjustment (KES)
                            </label>
                            <input
                                type="number"
                                value={adjustmentAmount}
                                onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                                step="0.01"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {adjustmentAmount !== 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Adjustment Reason
                            </label>
                            <input
                                type="text"
                                value={adjustmentReason}
                                onChange={(e) => setAdjustmentReason(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                placeholder="Reason for adjustment"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            placeholder="Internal notes for this quote"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Custom Terms &amp; Conditions
                        </label>
                        <textarea
                            value={customTerms}
                            onChange={(e) => setCustomTerms(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            placeholder="Custom terms for this quote (optional)"
                        />
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold text-gray-900">Estimated Total:</span>
                            <span className="text-2xl font-bold text-brand-blue">
                                KES {calculateTotal().toFixed(2)}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Subtotal: KES {calculateSubtotal().toFixed(2)}
                            {includeVat && ` | Tax: KES ${(calculateSubtotal() * (taxRate / 100)).toFixed(2)}`}
                            {shippingCharges > 0 && ` | Shipping: KES ${shippingCharges.toFixed(2)}`}
                            {adjustmentAmount !== 0 && ` | Adjustment: KES ${adjustmentAmount.toFixed(2)}`}
                        </p>
                    </div>
                </form>

                <div className="border-t border-gray-200 p-4 sm:p-6 bg-gray-50 flex flex-wrap items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="px-6 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || lineItems.length === 0}
                        className="px-6 py-2 text-sm bg-brand-blue text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Creating..." : "Create Quote"}
                    </button>
                </div>
            </div>
        </div>
    );
}

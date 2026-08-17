"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";
import { X, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { leadFormSchema } from "@/lib/validations/lead";
import type { Lead, LeadSource, LeadStatus } from "@/types/leads";

const PROXY_BASE = typeof window !== "undefined" ? "" : (process.env.NEXTAUTH_URL || "http://localhost:3000");

interface LeadFormDrawerProps {
    isOpen: boolean;
    isSubmitting: boolean;
    mode: "create" | "edit";
    lead: Lead | null;
    onClose: () => void;
    onSubmit: (payload: Partial<Lead>, leadId?: number) => void;
}

interface LeadFormState {
    name: string;
    email: string;
    phone: string;
    source: LeadSource | "";
    product_interest: string;
    products_of_interest_ids: Array<{ id: number; name: string }>;
    preferred_contact: "Email" | "Phone" | "WhatsApp";
    preferred_client_type: "B2B" | "B2C";
    follow_up_date: string;
    status: LeadStatus;
    notes: string;
    // B2B fields
    company: string;
    industry: string;
    vat_tax_id: string;
    kra_pin: string;
    primary_contact_name: string;
    primary_contact_email: string;
    primary_contact_phone: string;
    primary_contact_role: string;
}

const initialFormState: LeadFormState = {
    name: "",
    email: "",
    phone: "",
    source: "",
    product_interest: "",
    products_of_interest_ids: [],
    preferred_contact: "Email",
    preferred_client_type: "B2B",
    follow_up_date: "",
    status: "New",
    notes: "",
    company: "",
    industry: "",
    vat_tax_id: "",
    kra_pin: "",
    primary_contact_name: "",
    primary_contact_email: "",
    primary_contact_phone: "",
    primary_contact_role: "",
};

export default function LeadFormDrawer({
    isOpen,
    isSubmitting,
    mode,
    lead,
    onClose,
    onSubmit,
}: LeadFormDrawerProps): ReactElement | null {
    const [formState, setFormState] = useState<LeadFormState>(initialFormState);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isFormValid, setIsFormValid] = useState(false);
    const [productSearch, setProductSearch] = useState("");

    const { data: productsData } = useQuery({
        queryKey: ["products-catalog-simple"],
        queryFn: async () => {
            const res = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-admin/?status=published&page_size=100`, {
                credentials: "include",
            });
            return res.json() as Promise<{ results: Array<{ id: number; name: string }> }>;
        },
        enabled: isOpen,
        staleTime: 5 * 60 * 1000,
    });

    const filteredProducts = useMemo(() => {
        const all = productsData?.results ?? [];
        if (!productSearch.trim()) return all;
        const q = productSearch.toLowerCase();
        return all.filter(p => p.name.toLowerCase().includes(q));
    }, [productsData, productSearch]);

    const toggleProduct = (product: { id: number; name: string }) => {
        setFormState(s => {
            const already = s.products_of_interest_ids.some(p => p.id === product.id);
            return {
                ...s,
                products_of_interest_ids: already
                    ? s.products_of_interest_ids.filter(p => p.id !== product.id)
                    : [...s.products_of_interest_ids, product],
                product_interest: already
                    ? s.products_of_interest_ids.filter(p => p.id !== product.id).map(p => p.name).join(", ")
                    : [...s.products_of_interest_ids, product].map(p => p.name).join(", "),
            };
        });
    };

    useEffect((): void => {
        if (!isOpen) {
            return;
        }

        if (mode === "edit" && lead !== null) {
            setFormState({
                name: lead.name,
                email: lead.email || "",
                phone: lead.phone,
                source: lead.source,
                product_interest: lead.product_interest || "",
                products_of_interest_ids: lead.products_of_interest_ids || [],
                preferred_contact: lead.preferred_contact,
                preferred_client_type: lead.preferred_client_type,
                follow_up_date: lead.follow_up_date || "",
                status: lead.status as LeadStatus,
                notes: lead.notes || "",
                company: lead.company || "",
                industry: lead.industry || "",
                vat_tax_id: lead.vat_tax_id || "",
                kra_pin: lead.kra_pin || "",
                primary_contact_name: lead.primary_contact_name || "",
                primary_contact_email: lead.primary_contact_email || "",
                primary_contact_phone: lead.primary_contact_phone || "",
                primary_contact_role: lead.primary_contact_role || "",
            });
            return;
        }

        setFormState(initialFormState);
        setFieldErrors({});
    }, [isOpen, mode, lead]);

    useEffect(() => {
        const result = leadFormSchema.safeParse(formState);

        if (!result.success) {
            const errors = result.error.flatten().fieldErrors;
            const errorMap: Record<string, string> = {};
            Object.entries(errors).forEach(([key, messages]) => {
                if (messages && messages.length > 0) {
                    errorMap[key] = messages[0];
                }
            });
            setFieldErrors(errorMap);
            setIsFormValid(false);
        } else {
            setFieldErrors({});
            setIsFormValid(true);
        }
    }, [formState]);

    const title = useMemo((): string => {
        return mode === "create" ? "Add New Lead" : "Edit Lead";
    }, [mode]);

    if (!isOpen) {
        return null;
    }

    const handleInputChange = (field: keyof LeadFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
        setFormState((currentState: LeadFormState): LeadFormState => ({
            ...currentState,
            [field]: event.target.value,
        }));
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        const result = leadFormSchema.safeParse(formState);

        if (!result.success) {
            const errors = result.error.flatten().fieldErrors;
            const firstError = Object.values(errors)[0]?.[0];
            toast.error(firstError || "Please check the form for errors");
            return;
        }

        const payload: Partial<Lead> = {
            name: formState.name.trim(),
            email: formState.email.trim(),
            phone: formState.phone.trim(),
            source: formState.source || undefined,
            product_interest: formState.product_interest.trim(),
            products_of_interest_ids: formState.products_of_interest_ids,
            preferred_contact: formState.preferred_contact,
            preferred_client_type: formState.preferred_client_type,
            follow_up_date: formState.follow_up_date || null,
            notes: formState.notes.trim(),
            ...(formState.preferred_client_type === "B2B" && {
                company: formState.company.trim(),
                industry: formState.industry.trim(),
                vat_tax_id: formState.vat_tax_id.trim(),
                kra_pin: formState.kra_pin.trim(),
                primary_contact_name: formState.primary_contact_name.trim(),
                primary_contact_email: formState.primary_contact_email.trim(),
                primary_contact_phone: formState.primary_contact_phone.trim(),
                primary_contact_role: formState.primary_contact_role.trim(),
            }),
        };

        if (mode === "edit" && lead !== null) {
            onSubmit({ ...payload, status: formState.status }, lead.id);
            return;
        }

        onSubmit(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
            <aside className="h-full w-full max-w-2xl bg-white shadow-2xl overflow-y-auto" onClick={(e): void => e.stopPropagation()}>
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Capture prospect information and track sales pipeline
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-md border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 disabled:opacity-50"
                    >
                        Close
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <section className="rounded-lg border border-gray-200 p-4">
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                            <div className="md:col-span-2">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name *</label>
                                <p className="text-xs text-gray-500 mt-0.5">Full name of the prospect</p>
                                <input
                                    type="text"
                                    value={formState.name}
                                    onChange={handleInputChange("name")}
                                    required
                                    className={`mt-2 w-full rounded-md border px-3 py-2 text-sm ${fieldErrors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                                        }`}
                                />
                                {fieldErrors.name && (
                                    <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                                <p className="text-xs text-gray-500 mt-0.5">Primary email address</p>
                                <input
                                    type="email"
                                    value={formState.email}
                                    onChange={handleInputChange("email")}
                                    className={`mt-2 w-full rounded-md border px-3 py-2 text-sm ${fieldErrors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                                        }`}
                                />
                                {fieldErrors.email && (
                                    <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</label>
                                <p className="text-xs text-gray-500 mt-0.5">Contact number with country code</p>
                                <input
                                    type="text"
                                    value={formState.phone}
                                    onChange={handleInputChange("phone")}
                                    className={`mt-2 w-full rounded-md border px-3 py-2 text-sm ${fieldErrors.phone ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                                        }`}
                                />
                                {fieldErrors.phone && (
                                    <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preferred Contact</label>
                                <p className="text-xs text-gray-500 mt-0.5">Best way to reach them</p>
                                <select
                                    value={formState.preferred_contact}
                                    onChange={handleInputChange("preferred_contact")}
                                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                >
                                    <option value="Email">Email</option>
                                    <option value="Phone">Phone</option>
                                    <option value="WhatsApp">WhatsApp</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preferred Client Type</label>
                                <p className="text-xs text-gray-500 mt-0.5">Expected conversion type</p>
                                <select
                                    value={formState.preferred_client_type}
                                    onChange={handleInputChange("preferred_client_type")}
                                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                >
                                    <option value="B2B">B2B Business</option>
                                    <option value="B2C">B2C Retail</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {formState.preferred_client_type === "B2B" && (
                        <section className="rounded-lg border border-brand-blue/30 bg-brand-blue/5 p-4">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">B2B Company Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                <div className="md:col-span-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Company *</label>
                                    <p className="text-xs text-gray-500 mt-0.5">Legal company name</p>
                                    <input
                                        type="text"
                                        value={formState.company}
                                        onChange={handleInputChange("company")}
                                        className={`mt-2 w-full rounded-md border px-3 py-2 text-sm ${fieldErrors.company ? "border-red-500" : "border-gray-300"}`}
                                    />
                                    {fieldErrors.company && (
                                        <p className="text-xs text-red-600 mt-1">{fieldErrors.company}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Industry</label>
                                    <input
                                        type="text"
                                        value={formState.industry}
                                        onChange={handleInputChange("industry")}
                                        className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">VAT / Tax ID</label>
                                    <input
                                        type="text"
                                        value={formState.vat_tax_id}
                                        onChange={handleInputChange("vat_tax_id")}
                                        className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">KRA PIN</label>
                                    <input
                                        type="text"
                                        value={formState.kra_pin}
                                        onChange={handleInputChange("kra_pin")}
                                        className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>

                            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mt-4 mb-3">Primary Contact</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</label>
                                    <input
                                        type="text"
                                        value={formState.primary_contact_name}
                                        onChange={handleInputChange("primary_contact_name")}
                                        className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                                    <input
                                        type="email"
                                        value={formState.primary_contact_email}
                                        onChange={handleInputChange("primary_contact_email")}
                                        className={`mt-2 w-full rounded-md border px-3 py-2 text-sm ${fieldErrors.primary_contact_email ? "border-red-500" : "border-gray-300"}`}
                                    />
                                    {fieldErrors.primary_contact_email && (
                                        <p className="text-xs text-red-600 mt-1">{fieldErrors.primary_contact_email}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</label>
                                    <input
                                        type="text"
                                        value={formState.primary_contact_phone}
                                        onChange={handleInputChange("primary_contact_phone")}
                                        className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</label>
                                    <input
                                        type="text"
                                        value={formState.primary_contact_role}
                                        onChange={handleInputChange("primary_contact_role")}
                                        placeholder="e.g. Procurement Manager"
                                        className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    <section className="rounded-lg border border-gray-200 p-4">
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Lead Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Source</label>
                                <p className="text-xs text-gray-500 mt-0.5">How they found us</p>
                                <select
                                    value={formState.source}
                                    onChange={handleInputChange("source")}
                                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                >
                                    <option value="">Select source</option>
                                    <option value="Website">Website</option>
                                    <option value="Referral">Referral</option>
                                    <option value="Cold Call">Cold Call</option>
                                    <option value="Social Media">Social Media</option>
                                    <option value="Event">Event</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                                <p className="text-xs text-gray-500 mt-0.5">Current lead status</p>
                                {mode === "create" ? (
                                    <p className="mt-2 text-sm text-gray-700 font-medium">New</p>
                                ) : (
                                    <select
                                        value={formState.status}
                                        onChange={handleInputChange("status")}
                                        className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    >
                                        <option value="New">New</option>
                                        <option value="Contacted">Contacted</option>
                                        <option value="Qualified">Qualified</option>
                                        <option value="Converted">Converted</option>
                                        <option value="Lost">Lost</option>
                                    </select>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Products of Interest</label>
                                <p className="text-xs text-gray-500 mt-0.5">Select one or more products from the catalog</p>
                                {formState.products_of_interest_ids.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2 mb-2">
                                        {formState.products_of_interest_ids.map(p => (
                                            <span key={p.id} className="inline-flex items-center gap-1 bg-brand-blue/10 text-brand-blue text-xs font-medium px-2 py-0.5 rounded-full">
                                                {p.name}
                                                <button type="button" onClick={() => toggleProduct(p)} className="hover:text-red-500">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <input
                                    type="text"
                                    value={productSearch}
                                    onChange={e => setProductSearch(e.target.value)}
                                    placeholder="Search products..."
                                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                />
                                {filteredProducts.length > 0 && (
                                    <div className="mt-1 border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                                        {filteredProducts.map(p => {
                                            const selected = formState.products_of_interest_ids.some(s => s.id === p.id);
                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => toggleProduct(p)}
                                                    className={`flex items-center justify-between w-full px-3 py-2 text-sm text-left hover:bg-gray-50 ${selected ? "bg-brand-blue/5 text-brand-blue font-medium" : "text-gray-700"}`}
                                                >
                                                    {p.name}
                                                    {selected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Follow-up Date</label>
                                <p className="text-xs text-gray-500 mt-0.5">When to follow up with this lead</p>
                                <input
                                    type="date"
                                    value={formState.follow_up_date}
                                    onChange={handleInputChange("follow_up_date")}
                                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</label>
                                <p className="text-xs text-gray-500 mt-0.5">Additional information or context</p>
                                <textarea
                                    value={formState.notes}
                                    onChange={handleInputChange("notes")}
                                    rows={4}
                                    placeholder="Enter any relevant notes about this lead..."
                                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                    </section>

                    <div className="flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !isFormValid}
                            className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Saving..." : mode === "create" ? "Create Lead" : "Save Changes"}
                        </button>
                    </div>
                </form>
            </aside>
        </div>
    );
}

import type { ChangeEvent, FormEvent, ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPrintCategories } from "@/services/product-catalog-setup";
import { VendorFormValues, VendorSustainablePractices, ServiceRating } from "@/types/vendors";

interface VendorFormProps {
    values: VendorFormValues;
    onValuesChange: (values: VendorFormValues) => void;
    onSubmit: () => void;
    onCancel: () => void;
    submitLabel: string;
    isSubmitting: boolean;
    onSendInvite?: () => void;
    isSendingInvite?: boolean;
}

const RATING_OPTIONS = ["", "Excellent", "Good", "Fair", "Poor"];

function ServicesSection({
    values,
    updateField,
}: {
    values: VendorFormValues;
    updateField: <K extends keyof VendorFormValues>(field: K, value: VendorFormValues[K]) => void;
}): ReactElement {
    const { data: printCategories = [] } = useQuery({
        queryKey: ["print-categories"],
        queryFn: fetchPrintCategories,
        staleTime: 60_000,
    });

    const selectedNames = new Set(values.service_ratings.map((s) => s.name));

    const toggleService = (name: string): void => {
        if (selectedNames.has(name)) {
            updateField("service_ratings", values.service_ratings.filter((s) => s.name !== name));
        } else {
            updateField("service_ratings", [
                ...values.service_ratings,
                { name, rating: 0, quality: "", reliability: "", min_order: "", lead_time: "" },
            ]);
        }
    };

    const updateServiceField = (name: string, key: keyof ServiceRating, val: string | number): void => {
        updateField(
            "service_ratings",
            values.service_ratings.map((s) => (s.name === name ? { ...s, [key]: val } : s)),
        );
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Services &amp; Per-Service Ratings</h2>
            <p className="text-xs text-gray-500 mt-2">
                Select the print processes this vendor offers. Each selected service has its own capacity and quality ratings.
            </p>

            {/* Print process multi-select */}
            <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Print Processes Offered</p>
                {printCategories.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No print processes configured yet. Add them in Catalog Setup → Print Processes.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {printCategories.map((pc) => {
                            const active = selectedNames.has(pc.name);
                            return (
                                <button
                                    key={pc.id}
                                    type="button"
                                    onClick={() => toggleService(pc.name)}
                                    className={`px-3 py-1.5 text-sm rounded-full border font-medium transition-colors ${
                                        active
                                            ? "bg-brand-blue text-white border-brand-blue"
                                            : "bg-white text-gray-600 border-gray-300 hover:border-brand-blue hover:text-brand-blue"
                                    }`}
                                >
                                    {active ? "✓ " : ""}{pc.name}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Per-service detail cards */}
            {values.service_ratings.length > 0 && (
                <div className="mt-5 space-y-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Per-Service Details</p>
                    {values.service_ratings.map((sr) => (
                        <div key={sr.name} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <p className="text-sm font-semibold text-brand-blue mb-3">{sr.name}</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Overall Rating (0–5)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={5}
                                        step={0.1}
                                        value={sr.rating}
                                        onChange={(e) => updateServiceField(sr.name, "rating", Number(e.target.value))}
                                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quality</label>
                                    <select
                                        value={sr.quality}
                                        onChange={(e) => updateServiceField(sr.name, "quality", e.target.value)}
                                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    >
                                        {RATING_OPTIONS.map((o) => <option key={o} value={o}>{o || "— Not rated —"}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reliability</label>
                                    <select
                                        value={sr.reliability}
                                        onChange={(e) => updateServiceField(sr.name, "reliability", e.target.value)}
                                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    >
                                        {RATING_OPTIONS.map((o) => <option key={o} value={o}>{o || "— Not rated —"}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Min Order (KES)</label>
                                    <input
                                        type="text"
                                        value={sr.min_order}
                                        onChange={(e) => updateServiceField(sr.name, "min_order", e.target.value)}
                                        placeholder="e.g. 500"
                                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lead Time</label>
                                    <input
                                        type="text"
                                        value={sr.lead_time}
                                        onChange={(e) => updateServiceField(sr.name, "lead_time", e.target.value)}
                                        placeholder="e.g. 3 days"
                                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


export default function VendorForm({
    values,
    onValuesChange,
    onSubmit,
    onCancel,
    submitLabel,
    isSubmitting,
    onSendInvite,
    isSendingInvite = false,
}: VendorFormProps): ReactElement {
    const renderRequiredLabel = (text: string): ReactElement => (
        <span className="inline-flex items-center gap-1">
            <span>{text}</span>
            <span className="text-brand-red">*</span>
        </span>
    );

    const updateField = <K extends keyof VendorFormValues>(field: K, value: VendorFormValues[K]): void => {
        onValuesChange({
            ...values,
            [field]: value,
        });
    };

    const handleTextChange = (field: keyof VendorFormValues) => (event: ChangeEvent<HTMLInputElement>): void => {
        updateField(field, event.target.value as VendorFormValues[keyof VendorFormValues]);
    };

    const handleTextareaChange = (field: keyof VendorFormValues) => (event: ChangeEvent<HTMLTextAreaElement>): void => {
        updateField(field, event.target.value as VendorFormValues[keyof VendorFormValues]);
    };

    const handleCheckboxChange = (field: keyof VendorFormValues) => (event: ChangeEvent<HTMLInputElement>): void => {
        updateField(field, event.target.checked as VendorFormValues[keyof VendorFormValues]);
    };

    const handleNumberChange = (field: keyof VendorFormValues) => (event: ChangeEvent<HTMLInputElement>): void => {
        updateField(field, Number(event.target.value) as VendorFormValues[keyof VendorFormValues]);
    };

    return (
        <form
            className="space-y-6"
            onSubmit={(event: FormEvent<HTMLFormElement>): void => {
                event.preventDefault();
                onSubmit();
            }}
        >
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                <p className="text-xs text-gray-500 mt-2">Who the vendor is and how to reach them.</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            {renderRequiredLabel("Vendor Name")}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Business name as it should appear in lists.</p>
                        <input
                            type="text"
                            value={values.name}
                            onChange={handleTextChange("name")}
                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contact Person</label>
                        <p className="text-xs text-gray-500 mt-1">Main person we call or email.</p>
                        <input
                            type="text"
                            value={values.contact_person}
                            onChange={handleTextChange("contact_person")}
                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            {renderRequiredLabel("Email")}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Used for quotes, updates, and invoices.</p>
                        <input
                            type="email"
                            value={values.email}
                            onChange={handleTextChange("email")}
                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            {renderRequiredLabel("Phone Number")}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Direct phone number for quick contact.</p>
                        <input
                            type="tel"
                            value={values.phone}
                            onChange={handleTextChange("phone")}
                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            required
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Business Address</label>
                        <p className="text-xs text-gray-500 mt-1">Location used for deliveries or visits.</p>
                        <textarea
                            value={values.business_address}
                            onChange={handleTextareaChange("business_address")}
                            rows={3}
                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Business Details</h2>
                <p className="text-xs text-gray-500 mt-2">How the vendor is paid and recorded.</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tax PIN</label>
                        <p className="text-xs text-gray-500 mt-1">Optional tax identifier for invoices.</p>
                        <input
                            type="text"
                            value={values.tax_pin}
                            onChange={handleTextChange("tax_pin")}
                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment Terms</label>
                        <p className="text-xs text-gray-500 mt-1">Example: Net 7, Net 14, Prepaid.</p>
                        <input
                            type="text"
                            value={values.payment_terms}
                            onChange={handleTextChange("payment_terms")}
                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment Method</label>
                        <p className="text-xs text-gray-500 mt-1">Example: Bank transfer, Mobile money.</p>
                        <input
                            type="text"
                            value={values.payment_method}
                            onChange={handleTextChange("payment_method")}
                            placeholder="Bank transfer, Mobile money"
                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>
                </div>
            </div>

            <ServicesSection values={values} updateField={updateField} />

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">General Capacity</h2>
                <p className="text-xs text-gray-500 mt-2">Overall limits across all services.</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Max Concurrent Jobs</label>
                        <p className="text-xs text-gray-500 mt-1">How many jobs they can handle at once.</p>
                        <input
                            type="number"
                            min={1}
                            value={values.max_concurrent_jobs}
                            onChange={handleNumberChange("max_concurrent_jobs")}
                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-3 mt-6">
                        <input
                            type="checkbox"
                            checked={values.rush_capable}
                            onChange={handleCheckboxChange("rush_capable")}
                            className="h-4 w-4"
                        />
                        <div>
                            <div className="text-sm font-semibold text-gray-900">Rush capable</div>
                            <p className="text-xs text-gray-500">Can this vendor handle rush orders?</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Specialization</h2>
                <p className="text-xs text-gray-500 mt-2">What they do best or most often.</p>
                <textarea
                    value={values.specialization}
                    onChange={handleTextareaChange("specialization")}
                    rows={2}
                    className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Sustainability</h2>
                <p className="text-xs text-gray-500 mt-2">Environmental responsibility of this vendor.</p>
                <div className="mt-4">
                    <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            {renderRequiredLabel("Does this vendor have sustainable practices?")}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Select the level of sustainable practices this vendor follows.</p>
                        <select
                            value={values.sustainable_practices}
                            onChange={(e: ChangeEvent<HTMLSelectElement>): void =>
                                updateField("sustainable_practices", e.target.value as VendorSustainablePractices | "")
                            }
                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            required
                        >
                            <option value="">— Select an option —</option>
                            <option value="yes">Yes</option>
                            <option value="partly">Partly</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Status</h2>
                <p className="text-xs text-gray-500 mt-2">Control visibility and availability.</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={values.active}
                            onChange={handleCheckboxChange("active")}
                            className="h-4 w-4"
                        />
                        <div>
                            <div className="text-sm font-semibold text-gray-900">Active</div>
                            <p className="text-xs text-gray-500">Active vendors show up in lists.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={values.is_available}
                            onChange={handleCheckboxChange("is_available")}
                            className="h-4 w-4"
                        />
                        <div>
                            <div className="text-sm font-semibold text-gray-900">Available</div>
                            <p className="text-xs text-gray-500">Can accept new work right now.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={values.recommended}
                            onChange={handleCheckboxChange("recommended")}
                            className="h-4 w-4"
                        />
                        <div>
                            <div className="text-sm font-semibold text-gray-900">Recommended</div>
                            <p className="text-xs text-gray-500">Flag this vendor as a preferred choice.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={values.is_certified}
                            onChange={handleCheckboxChange("is_certified")}
                            className="h-4 w-4"
                        />
                        <div>
                            <div className="text-sm font-semibold text-gray-900">Certified</div>
                            <p className="text-xs text-gray-500">Vendor holds relevant industry certifications.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Internal Notes</h2>
                <p className="text-xs text-gray-500 mt-2">Private notes for your team.</p>
                <textarea
                    value={values.internal_notes}
                    onChange={handleTextareaChange("internal_notes")}
                    rows={4}
                    className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
            </div>

            <div className="flex flex-wrap justify-end gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
                >
                    Cancel
                </button>
                {onSendInvite ? (
                    <button
                        type="button"
                        onClick={onSendInvite}
                        disabled={isSendingInvite}
                        className="rounded-md border border-brand-blue px-4 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-blue/10 disabled:opacity-60"
                    >
                        {isSendingInvite ? "Sending..." : "Send Invite"}
                    </button>
                ) : null}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-60"
                >
                    {isSubmitting ? "Saving..." : submitLabel}
                </button>
            </div>
        </form>
    );
}

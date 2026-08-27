"use client";

import { useState, useRef, useEffect, type ReactElement } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import type { Client } from "@/types/clients";
import type { Lead } from "@/types/leads";

interface QuoteHeaderSectionProps {
    clients: Client[];
    leads: Lead[];
    clientsLoading: boolean;
    leadsLoading: boolean;
    clientsError: Error | null;
    leadsError: Error | null;
    clientType: "client" | "lead";
    selectedClientId: number | null;
    selectedLeadId: number | null;
    onCustomerChange: (type: "client" | "lead", id: number | null) => void;
    referenceNumber: string;
    onReferenceChange: (value: string) => void;
    projectName: string;
    onProjectNameChange: (value: string) => void;
    quoteDate: string;
    onQuoteDateChange: (value: string) => void;
    expiryDate: string;
    onExpiryDateChange: (value: string) => void;
    salesperson: string;
    quoteId?: string;
    productionCost: string;
    onProductionCostChange: (value: string) => void;
}

const fieldClass =
    "w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent placeholder:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed";

const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

export default function QuoteHeaderSection({
    clients,
    leads,
    clientsLoading,
    leadsLoading,
    clientsError,
    leadsError,
    clientType,
    selectedClientId,
    selectedLeadId,
    onCustomerChange,
    referenceNumber,
    onReferenceChange,
    projectName,
    onProjectNameChange,
    quoteDate,
    onQuoteDateChange,
    expiryDate,
    onExpiryDateChange,
    salesperson,
    quoteId,
    productionCost,
    onProductionCostChange,
}: QuoteHeaderSectionProps): ReactElement {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const isLoading = clientsLoading || leadsLoading;
    const hasError = !!clientsError || !!leadsError;

    // Resolve display label for the currently selected customer
    const selectedLabel = (() => {
        if (clientType === "client" && selectedClientId) {
            const c = clients.find((x) => x.id === selectedClientId);
            if (c) return `${c.company || c.name} (${c.client_id})`;
        }
        if (clientType === "lead" && selectedLeadId) {
            const l = leads.find((x) => x.id === selectedLeadId);
            if (l) {
                const name = l.preferred_client_type === "B2B" && l.company ? l.company : l.name;
                return `${name} (${l.lead_id})`;
            }
        }
        return "";
    })();

    // Split into independent words so e.g. "Somo Africa" matches a record whose
    // name has "Somo" but whose email domain has "africa" — each word just needs
    // to appear somewhere across the searchable fields, not as one contiguous phrase.
    const searchTerms = search.toLowerCase().trim().split(/\s+/).filter(Boolean);

    const filteredClients = clients.filter((c) => {
        const label = `${c.company || ""} ${c.name} ${c.client_id} ${c.email || ""} ${c.phone || ""}`.toLowerCase();
        return searchTerms.every((term) => label.includes(term));
    });

    const filteredLeads = leads.filter((l) => {
        const name = l.preferred_client_type === "B2B" && l.company ? l.company : l.name;
        const label = `${name} ${l.lead_id} ${l.email || ""} ${l.phone || ""}`.toLowerCase();
        return searchTerms.every((term) => label.includes(term));
    });

    const hasResults = filteredClients.length > 0 || filteredLeads.length > 0;

    const handleSelect = (type: "client" | "lead", id: number): void => {
        onCustomerChange(type, id);
        setOpen(false);
        setSearch("");
    };

    const handleClear = (): void => {
        onCustomerChange(clientType, null);
        setSearch("");
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent): void => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleOpenDropdown = (): void => {
        if (!isLoading && !hasError) {
            setOpen(true);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 bg-white rounded-lg border border-gray-200">
            {/* Left — Customer + Reference */}
            <div className="space-y-4">
                <div ref={containerRef} className="relative">
                    <label className={labelClass}>Customer *</label>

                    {/* Trigger button */}
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={handleOpenDropdown}
                        className={`${fieldClass} flex items-center justify-between gap-2 text-left ${!selectedLabel ? "text-gray-400" : "text-gray-900"}`}
                    >
                        <span className="truncate">
                            {isLoading
                                ? "Loading…"
                                : hasError
                                    ? "Error loading customers"
                                    : selectedLabel || "Select a customer"}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                            {selectedLabel && (
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e): void => { e.stopPropagation(); handleClear(); }}
                                    onKeyDown={(e): void => { if (e.key === "Enter") { e.stopPropagation(); handleClear(); } }}
                                    className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </span>
                            )}
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
                        </div>
                    </button>

                    {/* Dropdown */}
                    {open && (
                        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                            {/* Search input */}
                            <div className="p-2 border-b border-gray-100">
                                <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-md border border-gray-200 focus-within:border-brand-blue focus-within:ring-1 focus-within:ring-brand-blue">
                                    <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    <input
                                        autoFocus
                                        type="text"
                                        value={search}
                                        onChange={(e): void => setSearch(e.target.value)}
                                        placeholder="Search by name, company, or ID…"
                                        className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                                    />
                                    {search && (
                                        <button type="button" onClick={(): void => setSearch("")} className="shrink-0 text-gray-400 hover:text-gray-600">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Options list */}
                            <div className="max-h-60 overflow-y-auto py-1">
                                {!hasResults && (
                                    <p className="px-3 py-2 text-sm text-gray-400 text-center">No results found</p>
                                )}

                                {filteredClients.length > 0 && (
                                    <>
                                        <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Clients</p>
                                        {filteredClients.map((client) => (
                                            <button
                                                key={client.id}
                                                type="button"
                                                onClick={(): void => handleSelect("client", client.id)}
                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2 ${
                                                    clientType === "client" && selectedClientId === client.id
                                                        ? "bg-blue-50 text-brand-blue font-medium"
                                                        : "text-gray-800"
                                                }`}
                                            >
                                                <span className="truncate">{client.company || client.name}</span>
                                                <span className="text-xs text-gray-400 shrink-0">{client.client_id}</span>
                                            </button>
                                        ))}
                                    </>
                                )}

                                {filteredLeads.length > 0 && (
                                    <>
                                        <p className="px-3 py-1 mt-1 text-xs font-semibold text-gray-400 uppercase tracking-wide border-t border-gray-100 pt-2">Qualified Leads</p>
                                        {filteredLeads.map((lead) => {
                                            const name = lead.preferred_client_type === "B2B" && lead.company ? lead.company : lead.name;
                                            return (
                                                <button
                                                    key={lead.id}
                                                    type="button"
                                                    onClick={(): void => handleSelect("lead", lead.id)}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2 ${
                                                        clientType === "lead" && selectedLeadId === lead.id
                                                            ? "bg-blue-50 text-brand-blue font-medium"
                                                            : "text-gray-800"
                                                    }`}
                                                >
                                                    <span className="truncate">{name}</span>
                                                    <span className="text-xs text-gray-400 shrink-0">{lead.lead_id}</span>
                                                </button>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <label className={labelClass}>Reference / PO Number</label>
                    <input
                        type="text"
                        value={referenceNumber}
                        onChange={(e): void => onReferenceChange(e.target.value)}
                        placeholder="e.g. PO-12345"
                        className={fieldClass}
                    />
                </div>

                <div>
                    <label className={labelClass}>
                        Project Name
                        <span className="ml-1.5 text-xs font-normal text-gray-400 normal-case tracking-normal">internal only — not sent to client</span>
                    </label>
                    <input
                        type="text"
                        value={projectName}
                        onChange={(e): void => onProjectNameChange(e.target.value)}
                        placeholder="e.g. Acme Q2 Branding Campaign"
                        className={fieldClass}
                    />
                </div>
            </div>

            {/* Right — Quote ID + Dates + Salesperson */}
            <div className="space-y-4">
                <div>
                    <label className={labelClass}>Quote ID</label>
                    <input
                        type="text"
                        value={quoteId || "Auto-generated on save"}
                        readOnly
                        className={`${fieldClass} bg-gray-50 cursor-default font-mono text-xs tracking-wide`}
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Quote Date</label>
                        <input
                            type="date"
                            value={quoteDate}
                            onChange={(e): void => onQuoteDateChange(e.target.value)}
                            required
                            className={fieldClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Expiry Date</label>
                        <input
                            type="date"
                            value={expiryDate}
                            onChange={(e): void => onExpiryDateChange(e.target.value)}
                            className={fieldClass}
                        />
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Salesperson</label>
                    <input
                        type="text"
                        value={salesperson}
                        readOnly
                        className={`${fieldClass} bg-gray-50 cursor-default`}
                    />
                </div>

                <div>
                    <label className={labelClass}>
                        Estimated Production Cost (KES)
                        <span className="ml-1.5 text-xs font-normal text-gray-400 normal-case tracking-normal">optional — used to show margin in the quotes list</span>
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="1"
                        value={productionCost}
                        onChange={(e): void => onProductionCostChange(e.target.value)}
                        placeholder="e.g. 15000"
                        className={fieldClass}
                    />
                </div>
            </div>
        </div>
    );
}

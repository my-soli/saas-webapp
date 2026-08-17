"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { fetchTaxConfigurations } from "@/services/tax-configurations";

interface TaxRateSelectProps {
    value: string;
    onChange: (rate: string) => void;
}

// Lets an invoice line item pick from the rates configured under Tax Settings,
// or fall back to typing a custom percentage. Reused by both the invoice
// create and edit forms.
export default function TaxRateSelect({ value, onChange }: TaxRateSelectProps): ReactElement {
    const { data: configs = [] } = useQuery({ queryKey: ["tax-configurations-active"], queryFn: fetchTaxConfigurations });
    const activeConfigs = configs.filter((c) => c.is_active);
    const matched = activeConfigs.find((c) => Number(c.rate) === Number(value || 0));

    return (
        <div className="space-y-1">
            <select
                value={matched ? String(matched.id) : "custom"}
                onChange={(e) => {
                    if (e.target.value === "custom") return;
                    const cfg = activeConfigs.find((c) => String(c.id) === e.target.value);
                    if (cfg) onChange(cfg.rate);
                }}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs focus:ring-2 focus:ring-brand-blue focus:border-transparent bg-white"
            >
                <option value="custom">Custom</option>
                {activeConfigs.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({Number(c.rate).toFixed(2)}%)</option>
                ))}
            </select>
            {!matched && (
                <input type="number" min={0} step="0.01" value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Tax %"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm text-right focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
            )}
        </div>
    );
}

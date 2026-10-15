"use client";

import type { ReactElement, ReactNode } from "react";
import { InfoIcon, CheckIcon } from "lucide-react";
import { formatKES } from "@/lib/format";
import type { ProductSpecGroup, SpecOption, SpecOptionRange } from "@/types/products";
import type { SpecGroupSelectionState } from "../types";

function modifierLabel(mod: string | null | undefined): string | null {
    if (!mod) return null;
    const num = parseFloat(mod);
    if (!num) return null;
    return num > 0 ? `+${formatKES(num)}` : `−${formatKES(Math.abs(num))}`;
}

/** Shared selectable card used by every option-based spec group (quantity, single/multi-select, multiplier). */
function OptionCard({
    label,
    sublabel,
    selected,
    image,
    onClick,
}: {
    label: string;
    sublabel?: string | null;
    selected: boolean;
    image?: string | null;
    onClick: () => void;
}): ReactElement {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            className={`relative flex min-w-[84px] flex-1 basis-[84px] flex-col items-start gap-1 rounded-xl border-2 px-3.5 py-2.5 text-left transition-all sm:flex-none ${
                selected
                    ? "border-brand-blue bg-brand-blue/5"
                    : "border-gray-200 bg-white hover:border-gray-300"
            }`}
        >
            {selected && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-blue">
                    <CheckIcon className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                </span>
            )}
            {image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={image} alt="" className="h-9 w-9 rounded-lg object-cover" />
            )}
            <span className={`text-sm font-semibold leading-tight ${selected ? "text-brand-blue" : "text-gray-800"}`}>
                {label}
            </span>
            {sublabel && <span className="text-xs text-gray-400 leading-tight">{sublabel}</span>}
        </button>
    );
}

function OptionCardGrid({ children }: { children: ReactNode }): ReactElement {
    return <div className="flex flex-wrap gap-2">{children}</div>;
}

function QuantityTierSelector({
    group,
    value,
    onChange,
}: {
    group: ProductSpecGroup;
    value: number | null;
    onChange: (optionId: number | null) => void;
}): ReactElement {
    return (
        <OptionCardGrid>
            {group.options.map((opt: SpecOption) => (
                <OptionCard
                    key={opt.id}
                    label={opt.quantity_value != null ? `${opt.quantity_value} pcs` : opt.name}
                    sublabel={opt.selling_price ? `${formatKES(opt.selling_price)} each` : null}
                    selected={value === opt.id}
                    onClick={() => onChange(opt.id)}
                />
            ))}
        </OptionCardGrid>
    );
}

function SingleSelectModifier({
    group,
    value,
    onChange,
}: {
    group: ProductSpecGroup;
    value: number | null;
    onChange: (optionId: number | null) => void;
}): ReactElement {
    return (
        <OptionCardGrid>
            {group.options.map((opt: SpecOption) => (
                <OptionCard
                    key={opt.id}
                    label={opt.name}
                    sublabel={modifierLabel(opt.selling_price_modifier)}
                    image={opt.preview_image}
                    selected={value === opt.id}
                    onClick={() => onChange(opt.id)}
                />
            ))}
        </OptionCardGrid>
    );
}

function MultiSelectModifier({
    group,
    value,
    onChange,
}: {
    group: ProductSpecGroup;
    value: number[];
    onChange: (optionIds: number[]) => void;
}): ReactElement {
    const toggle = (id: number): void => {
        if (value.includes(id)) {
            onChange(value.filter((v) => v !== id));
        } else {
            onChange([...value, id]);
        }
    };

    return (
        <OptionCardGrid>
            {group.options.map((opt: SpecOption) => (
                <OptionCard
                    key={opt.id}
                    label={opt.name}
                    sublabel={modifierLabel(opt.selling_price_modifier)}
                    image={opt.preview_image}
                    selected={value.includes(opt.id)}
                    onClick={() => toggle(opt.id)}
                />
            ))}
        </OptionCardGrid>
    );
}

function NumericInputGroup({
    group,
    value,
    onChange,
}: {
    group: ProductSpecGroup;
    value: string;
    onChange: (val: string) => void;
}): ReactElement {
    const parsedValue = parseFloat(value);
    const matchedRange = group.ranges.find((r: SpecOptionRange) => {
        if (isNaN(parsedValue)) return false;
        const from = parseFloat(r.range_from);
        const to = r.range_to ? parseFloat(r.range_to) : Infinity;
        return parsedValue >= from && parsedValue <= to;
    });

    const lastRange = group.ranges[group.ranges.length - 1];
    const maxRangeTo = lastRange?.range_to ? parseFloat(lastRange.range_to) : Infinity;
    const isAboveMax =
        !matchedRange &&
        !isNaN(parsedValue) &&
        value.trim() !== "" &&
        parsedValue > maxRangeTo &&
        group.custom_quote_above_max;

    const firstRange = group.ranges[0];
    const minValue = firstRange ? parseFloat(firstRange.range_from) : 1;

    const decrement = (): void => {
        const current = isNaN(parsedValue) ? minValue : parsedValue;
        onChange(String(Math.max(minValue, current - 1)));
    };

    const increment = (): void => {
        const current = isNaN(parsedValue) ? minValue : parsedValue;
        onChange(String(current + 1));
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl border-2 border-gray-200 overflow-hidden focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20 transition-all">
                    <button
                        type="button"
                        onClick={decrement}
                        className="px-3 py-2.5 text-gray-500 hover:bg-gray-100 hover:text-brand-blue transition-colors text-lg font-bold select-none"
                        aria-label="Decrease"
                    >
                        −
                    </button>
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="0"
                        className="w-24 text-center py-2.5 text-sm font-semibold text-gray-900 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                        type="button"
                        onClick={increment}
                        className="px-3 py-2.5 text-gray-500 hover:bg-gray-100 hover:text-brand-blue transition-colors text-lg font-bold select-none"
                        aria-label="Increase"
                    >
                        +
                    </button>
                </div>
                {firstRange?.unit_label && (
                    <span className="text-sm text-gray-500 flex-shrink-0">{firstRange.unit_label}</span>
                )}
            </div>
            {isAboveMax && (
                <div className="rounded-xl border-2 border-brand-yellow bg-brand-yellow/10 p-4 flex flex-col gap-2">
                    <p className="text-sm font-semibold text-brand-blue">
                        This quantity exceeds our standard pricing ranges.
                    </p>
                    <p className="text-xs text-gray-600">
                        For orders of this size, please reach out and we&apos;ll prepare a custom quote tailored to your needs.
                    </p>
                    <a
                        href="https://wa.me/254700000000?text=Hi%2C%20I%20need%20a%20custom%20quote%20for%20a%20large%20order."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 self-start rounded-lg bg-brand-yellow px-4 py-2 text-xs font-bold text-brand-blue hover:bg-brand-yellow/90 transition-colors"
                    >
                        Request a Custom Quote
                    </a>
                </div>
            )}
        </div>
    );
}

function DimensionInputGroup({
    group,
    value,
    onChange,
}: {
    group: ProductSpecGroup;
    value: { width: string; height: string };
    onChange: (val: { width: string; height: string }) => void;
}): ReactElement {
    const unit = group.dim_unit ?? "mm";

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 max-w-xs">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Width ({unit})</label>
                    <input
                        type="number"
                        step="any"
                        placeholder={group.dim_width_min ?? "0"}
                        value={value.width}
                        onChange={(e) => onChange({ ...value, width: e.target.value })}
                        className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
                    />
                    {group.dim_width_min && group.dim_width_max && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                            {group.dim_width_min}–{group.dim_width_max} {unit}
                        </p>
                    )}
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Height ({unit})</label>
                    <input
                        type="number"
                        step="any"
                        placeholder={group.dim_height_min ?? "0"}
                        value={value.height}
                        onChange={(e) => onChange({ ...value, height: e.target.value })}
                        className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
                    />
                    {group.dim_height_min && group.dim_height_max && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                            {group.dim_height_min}–{group.dim_height_max} {unit}
                        </p>
                    )}
                </div>
            </div>
            {group.selling_rate_per_sqm && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                    <InfoIcon className="h-3.5 w-3.5" />
                    Rate: {formatKES(group.selling_rate_per_sqm)}/m²
                    {group.min_selling_price && ` · Min: ${formatKES(group.min_selling_price)}`}
                </p>
            )}
        </div>
    );
}

function MultiplierSelector({
    group,
    value,
    onChange,
}: {
    group: ProductSpecGroup;
    value: number | null;
    onChange: (optionId: number | null) => void;
}): ReactElement {
    return (
        <OptionCardGrid>
            {group.options.map((opt: SpecOption) => (
                <OptionCard
                    key={opt.id}
                    label={opt.name}
                    sublabel={opt.multiplier_value ? `×${opt.multiplier_value}` : null}
                    selected={value === opt.id}
                    onClick={() => onChange(opt.id)}
                />
            ))}
        </OptionCardGrid>
    );
}

function SpecGroupInput({
    group,
    state,
    onUpdate,
}: {
    group: ProductSpecGroup;
    state: SpecGroupSelectionState;
    onUpdate: (update: Partial<SpecGroupSelectionState>) => void;
}): ReactElement | null {
    switch (group.group_type) {
        case "quantity_tier":
            return (
                <QuantityTierSelector
                    group={group}
                    value={state.singleOption}
                    onChange={(id) => onUpdate({ singleOption: id })}
                />
            );
        case "single_select_modifier":
            return (
                <SingleSelectModifier
                    group={group}
                    value={state.singleOption}
                    onChange={(id) => onUpdate({ singleOption: id })}
                />
            );
        case "multi_select_modifier":
            return (
                <MultiSelectModifier
                    group={group}
                    value={state.multiOptions}
                    onChange={(ids) => onUpdate({ multiOptions: ids })}
                />
            );
        case "numeric_input":
            return (
                <NumericInputGroup
                    group={group}
                    value={state.numericValue}
                    onChange={(val) => onUpdate({ numericValue: val })}
                />
            );
        case "dimension_input":
            return (
                <DimensionInputGroup
                    group={group}
                    value={state.dimValue}
                    onChange={(val) => onUpdate({ dimValue: val })}
                />
            );
        case "multiplier":
            return (
                <MultiplierSelector
                    group={group}
                    value={state.singleOption}
                    onChange={(id) => onUpdate({ singleOption: id })}
                />
            );
        case "display_only":
            return (
                <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600 flex gap-2">
                    <InfoIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span>{group.help_text || group.display_label || group.name}</span>
                </div>
            );
        default:
            return null;
    }
}

interface SpecGroupSectionProps {
    group: ProductSpecGroup;
    stepNumber: number;
    state: SpecGroupSelectionState;
    onUpdate: (update: Partial<SpecGroupSelectionState>) => void;
}

export default function SpecGroupSection({ group, stepNumber, state, onUpdate }: SpecGroupSectionProps): ReactElement {
    return (
        <div className="py-4 space-y-2.5 border-b border-gray-100 last:border-b-0">
            <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-500">
                        {stepNumber}
                    </span>
                    {group.display_label || group.name}
                    {group.is_required && <span className="text-red-400 font-normal">*</span>}
                </label>
                {group.help_text && (
                    <span className="text-xs text-gray-400 text-right flex-shrink-0 max-w-[160px] leading-tight">{group.help_text}</span>
                )}
            </div>
            <SpecGroupInput group={group} state={state} onUpdate={onUpdate} />
        </div>
    );
}

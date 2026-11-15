"use client";

import type { ReactElement } from "react";
import { TagIcon } from "lucide-react";
import type { CatalogProduct } from "@/services/store";
import { formatKES } from "@/lib/format";

/** Quantity price breaks from the product's Quantity Tier spec group.
 *  A tier's selling_price is the total for that quantity; options picked
 *  below are added on top, so this is labelled as the base price. */
export default function PriceBreaks({ product }: { product: CatalogProduct }): ReactElement | null {
    const group = product.spec_groups.find((g) => g.is_active && g.group_type === "quantity_tier");
    if (!group) return null;
    const tiers = group.options
        .filter((o) => o.is_active && o.quantity_value && o.selling_price && parseFloat(o.selling_price) > 0)
        .sort((a, b) => (a.quantity_value ?? 0) - (b.quantity_value ?? 0));
    if (tiers.length < 2) return null;

    const firstUnit = parseFloat(tiers[0].selling_price as string) / (tiers[0].quantity_value as number);

    return (
        <div className="rounded-2xl border border-gray-100 p-4">
            <p className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <TagIcon className="h-4 w-4 text-brand-blue" />
                Order more, pay less per piece
            </p>
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-xs text-gray-400">
                        <th className="pb-1.5 text-left font-medium">Quantity</th>
                        <th className="pb-1.5 text-right font-medium">Base price</th>
                        <th className="pb-1.5 text-right font-medium">Per piece</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {tiers.map((t) => {
                        const qty = t.quantity_value as number;
                        const total = parseFloat(t.selling_price as string);
                        const unit = total / qty;
                        const saving = firstUnit > 0 ? Math.round((1 - unit / firstUnit) * 100) : 0;
                        return (
                            <tr key={t.id}>
                                <td className="py-1.5 text-gray-700">{qty.toLocaleString("en-KE")} pcs</td>
                                <td className="py-1.5 text-right text-gray-700">{formatKES(total)}</td>
                                <td className="py-1.5 text-right">
                                    <span className="font-semibold text-gray-900">{formatKES(unit)}</span>
                                    {saving > 0 && <span className="ml-1.5 text-[11px] font-semibold text-brand-green">−{saving}%</span>}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <p className="mt-2 text-[11px] text-gray-400">Base price before the options you choose below.</p>
        </div>
    );
}

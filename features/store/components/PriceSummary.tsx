"use client";

import type { ReactElement } from "react";
import { LoaderIcon, AlertCircleIcon, ShoppingCartIcon, ClockIcon } from "lucide-react";
import { formatKES } from "@/lib/format";
import type { PriceCalculationResult } from "@/services/store";

interface PriceSummaryProps {
    result: PriceCalculationResult | null;
    isPending: boolean;
    error: string | null;
    onOrder: () => void;
}

export default function PriceSummary({ result, isPending, error, onOrder }: PriceSummaryProps): ReactElement {
    const hasPrice = result && parseFloat(result.final_selling_price) > 0;

    return (
        <div className="pt-4 mt-1 space-y-4 border-t border-gray-100">
            {/* Price row */}
            {hasPrice && !isPending && (
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">{formatKES(result.final_selling_price)}</span>
                    <span className="text-sm text-gray-400">per piece</span>
                </div>
            )}
            {isPending && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <LoaderIcon className="h-4 w-4 animate-spin" />
                    Updating price…
                </div>
            )}
            {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600">
                    <AlertCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {/* CTAs */}
            <div className="space-y-2.5">
                <button
                    type="button"
                    onClick={onOrder}
                    disabled={!result?.valid || isPending}
                    className="w-full bg-brand-blue hover:bg-brand-blue/90 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                >
                    <ShoppingCartIcon className="h-4 w-4" />
                    Add to Cart
                </button>
                <button
                    type="button"
                    className="w-full border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                >
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                    Save for Later
                </button>
            </div>

            {/* Trust signals */}
            <p className="text-xs text-gray-400 text-center">
                Proofing available · Production starts on confirmation
            </p>
        </div>
    );
}

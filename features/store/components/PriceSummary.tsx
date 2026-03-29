"use client";

import type { ReactElement } from "react";
import { LoaderIcon, AlertCircleIcon, ShoppingCartIcon } from "lucide-react";
import { formatKES } from "@/lib/format";
import type { PriceCalculationResult } from "@/services/store";

interface PriceSummaryProps {
    result: PriceCalculationResult | null;
    isPending: boolean;
    error: string | null;
    onOrder: () => void;
}

export default function PriceSummary({ result, isPending, error, onOrder }: PriceSummaryProps): ReactElement {
    return (
        <div className="pt-6 border-t border-gray-200 space-y-5">
            <div>
                {isPending && (
                    <div className="flex items-center gap-2">
                        <LoaderIcon className="h-4 w-4 text-brand-yellow animate-spin" />
                        <span className="text-gray-500 text-sm">Calculating…</span>
                    </div>
                )}
                {!isPending && result && parseFloat(result.final_selling_price) > 0 && (
                    <div className="text-2xl font-bold text-gray-900">
                        {formatKES(result.final_selling_price)}{" "}
                        <span className="text-sm font-normal text-gray-500">per piece</span>
                    </div>
                )}
                {!isPending && (!result || parseFloat(result.final_selling_price) === 0) && !error && (
                    <p className="text-gray-400 text-sm">Make selections above to see price</p>
                )}
                {error && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircleIcon className="h-3.5 w-3.5" />
                        {error}
                    </p>
                )}
            </div>
            <div className="space-y-3">
                <button
                    type="button"
                    onClick={onOrder}
                    disabled={!result?.valid}
                    className="w-full bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                    <ShoppingCartIcon className="h-4 w-4" />
                    Add to Cart
                </button>
                <button
                    type="button"
                    className="w-full bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 font-semibold py-3 rounded-lg transition-colors"
                >
                    Save for Later
                </button>
            </div>
        </div>
    );
}

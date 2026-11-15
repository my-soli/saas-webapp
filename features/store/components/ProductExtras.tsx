"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { PackageIcon, PaletteIcon, ShieldCheckIcon, ArrowRightIcon } from "lucide-react";

/** "Need a bigger quantity?" prompt pointing at a custom quote. */
export function BulkQuoteCta({ onRequest }: { onRequest: () => void }): ReactElement {
    return (
        <div className="flex items-start gap-3 rounded-2xl bg-brand-blue/5 p-4">
            <PackageIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-blue" />
            <div className="text-sm">
                <p className="font-semibold text-gray-900">Ordering in bulk?</p>
                <p className="mt-0.5 text-gray-600">
                    For large quantities we&apos;ll price it specially for you.{" "}
                    <button type="button" onClick={onRequest} className="font-semibold text-brand-blue hover:underline">
                        Get a custom quote
                    </button>
                </p>
            </div>
        </div>
    );
}

/** Design-services banner shown under the product details. */
export function DesignServicesBanner(): ReactElement {
    return (
        <div className="flex flex-col items-start gap-4 rounded-2xl bg-gradient-to-r from-brand-blue to-brand-blue/80 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
                <PaletteIcon className="mt-0.5 h-6 w-6 flex-shrink-0" />
                <div>
                    <p className="text-lg font-bold">No design yet? Work with our designers</p>
                    <p className="mt-1 text-sm text-white/80">
                        Share your idea and our in-house team will create print-ready artwork for you.
                    </p>
                </div>
            </div>
            <Link
                href="/contact"
                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand-blue hover:bg-white/90 transition-colors"
            >
                Find out more
                <ArrowRightIcon className="h-4 w-4" />
            </Link>
        </div>
    );
}

/** Quality guarantee / reassurance strip. */
export function TrustBadge(): ReactElement {
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-gray-100 p-4">
            <ShieldCheckIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-green" />
            <div className="text-sm">
                <p className="font-semibold text-gray-900">Quality guaranteed</p>
                <p className="mt-0.5 text-gray-600">
                    Free digital proof before printing. If something&apos;s not right with your order, we&apos;ll make it right.{" "}
                    <Link href="/contact" className="font-semibold text-brand-blue hover:underline">Contact us</Link>
                </p>
            </div>
        </div>
    );
}

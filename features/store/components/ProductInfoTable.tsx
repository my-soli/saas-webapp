import type { ReactElement } from "react";
import type { CatalogProduct } from "@/services/store";

interface ProductInfoTableProps {
    product: CatalogProduct;
}

export default function ProductInfoTable({ product }: ProductInfoTableProps): ReactElement {
    const rows: Array<{ label: string; value: string | null | undefined }> = [
        { label: "Product Code", value: product.internal_code },
        { label: "Category", value: product.primary_category_name },
        { label: "Sub-category", value: product.sub_category_name },
        { label: "Type", value: product.product_type },
        { label: "Unit", value: product.unit_of_measure },
        { label: "Availability", value: product.stock_status?.replace(/_/g, " ") },
    ];

    return (
        <div>
            {rows
                .filter((r) => r.value)
                .map((r) => (
                    <div key={r.label} className="flex justify-between py-2 border-b border-gray-100 text-sm">
                        <span className="text-gray-500">{r.label}</span>
                        <span className="text-gray-900 font-medium capitalize">{r.value}</span>
                    </div>
                ))}
        </div>
    );
}

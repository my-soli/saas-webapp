import type {
    CreateProductPayload,
    CreateSpecGroupPayload,
    CreateSpecOptionPayload,
    CreateSpecOptionRangePayload,
    Product,
    ProductSpecGroup,
    ProductsQueryParams,
    ProductsResponse,
    SpecOption,
    SpecOptionRange,
} from "@/types/products";

// Works on both client (relative) and server (absolute)
const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

const buildQueryString = (params: ProductsQueryParams): string => {
    const searchParams = new URLSearchParams();
    searchParams.set("page", params.page.toString());
    searchParams.set("page_size", params.pageSize.toString());
    if (params.search.trim()) searchParams.set("search", params.search.trim());
    if (params.status !== "all") searchParams.set("status", params.status);
    if (params.pricingMode !== "all") searchParams.set("pricing_mode", params.pricingMode);
    if (params.printCategory) searchParams.set("print_category", params.printCategory);
    if (params.category) searchParams.set("category", params.category);
    return searchParams.toString();
};

export async function fetchProducts(params: ProductsQueryParams): Promise<ProductsResponse> {
    const qs = buildQueryString(params);
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-admin/?${qs}`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
    });
    if (!response.ok) throw new Error(`Failed to fetch products: ${response.status}`);
    return response.json() as Promise<ProductsResponse>;
}

export async function fetchProduct(productId: number): Promise<Product> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-admin/${productId}/`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
    });
    if (!response.ok) throw new Error(`Failed to fetch product: ${response.status}`);
    return response.json() as Promise<Product>;
}

export async function createProduct(payload: CreateProductPayload): Promise<Product> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-admin/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const err = await response.text().catch((_e: unknown): string => "Unknown error");
        throw new Error(`Failed to create product: ${response.status} ${err}`);
    }
    return response.json() as Promise<Product>;
}

export async function updateProduct(
    productId: number,
    payload: Partial<CreateProductPayload>,
): Promise<Product> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-admin/${productId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const err = await response.text().catch((_e: unknown): string => "Unknown error");
        throw new Error(`Failed to update product: ${response.status} ${err}`);
    }
    return response.json() as Promise<Product>;
}

export async function deleteProduct(productId: number): Promise<void> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-admin/${productId}/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!response.ok) throw new Error(`Failed to delete product: ${response.status}`);
}

export async function publishProduct(productId: number): Promise<void> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-admin/${productId}/publish/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!response.ok) {
        const err = await response.text().catch((_e: unknown): string => "Unknown error");
        throw new Error(`Failed to publish product: ${response.status} ${err}`);
    }
}

export async function archiveProduct(productId: number): Promise<void> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-admin/${productId}/archive/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!response.ok) throw new Error(`Failed to archive product: ${response.status}`);
}

export async function uploadProductImage(
    productId: number,
    file: File,
    altText: string,
): Promise<void> {
    const formData = new FormData();
    formData.append("product", String(productId));
    formData.append("image", file);
    formData.append("alt_text", altText);
    formData.append("is_primary", "true");
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-images/`, {
        method: "POST",
        credentials: "include",
        body: formData,
    });
    if (!response.ok) {
        const err = await response.text().catch((_e: unknown): string => "Unknown error");
        throw new Error(`Failed to upload image: ${response.status} ${err}`);
    }
}

export async function fetchSpecGroups(productId: number): Promise<ProductSpecGroup[]> {
    const response = await fetch(
        `${PROXY_BASE}/api/proxy/api/v1/product-spec-groups/?product=${productId}&page_size=200`,
        {
            credentials: "include",
            cache: "no-store",
        },
    );
    if (!response.ok) throw new Error(`Failed to fetch spec groups: ${response.status}`);
    const data = (await response.json()) as { results: ProductSpecGroup[] } | ProductSpecGroup[];
    return Array.isArray(data) ? data : data.results;
}

export async function createSpecGroup(payload: CreateSpecGroupPayload): Promise<ProductSpecGroup> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-spec-groups/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const err = await response.text().catch((_e: unknown): string => "Unknown error");
        throw new Error(`Failed to create spec group: ${response.status} ${err}`);
    }
    return response.json() as Promise<ProductSpecGroup>;
}

export async function updateSpecGroup(
    specGroupId: number,
    payload: Partial<CreateSpecGroupPayload>,
): Promise<ProductSpecGroup> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-spec-groups/${specGroupId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const err = await response.text().catch((_e: unknown): string => "Unknown error");
        throw new Error(`Failed to update spec group: ${response.status} ${err}`);
    }
    return response.json() as Promise<ProductSpecGroup>;
}

export async function deleteSpecGroup(specGroupId: number): Promise<void> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-spec-groups/${specGroupId}/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!response.ok) throw new Error(`Failed to delete spec group: ${response.status}`);
}

export async function createSpecOption(payload: CreateSpecOptionPayload): Promise<SpecOption> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/spec-options/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const err = await response.text().catch((_e: unknown): string => "Unknown error");
        throw new Error(`Failed to create spec option: ${response.status} ${err}`);
    }
    return response.json() as Promise<SpecOption>;
}

export async function updateSpecOption(
    specOptionId: number,
    payload: Partial<CreateSpecOptionPayload>,
): Promise<SpecOption> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/spec-options/${specOptionId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const err = await response.text().catch((_e: unknown): string => "Unknown error");
        throw new Error(`Failed to update spec option: ${response.status} ${err}`);
    }
    return response.json() as Promise<SpecOption>;
}

export async function deleteSpecOption(specOptionId: number): Promise<void> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/spec-options/${specOptionId}/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!response.ok) throw new Error(`Failed to delete spec option: ${response.status}`);
}

export async function uploadSpecOptionImage(
    specOptionId: number,
    file: File,
): Promise<void> {
    const formData = new FormData();
    formData.append("preview_image", file);
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/spec-options/${specOptionId}/`, {
        method: "PATCH",
        credentials: "include",
        body: formData,
    });
    if (!response.ok) {
        const err = await response.text().catch((_e: unknown): string => "Unknown error");
        throw new Error(`Failed to upload spec option image: ${response.status} ${err}`);
    }
}

export async function uploadSpecGroupHeaderImage(
    specGroupId: number,
    file: File,
): Promise<void> {
    const formData = new FormData();
    formData.append("header_image", file);
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-spec-groups/${specGroupId}/`, {
        method: "PATCH",
        credentials: "include",
        body: formData,
    });
    if (!response.ok) {
        const err = await response.text().catch((_e: unknown): string => "Unknown error");
        throw new Error(`Failed to upload spec group header image: ${response.status} ${err}`);
    }
}

export async function createSpecOptionRange(
    payload: CreateSpecOptionRangePayload,
): Promise<SpecOptionRange> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/spec-option-ranges/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const err = await response.text().catch((_e: unknown): string => "Unknown error");
        throw new Error(`Failed to create spec range: ${response.status} ${err}`);
    }
    return response.json() as Promise<SpecOptionRange>;
}

export async function updateSpecOptionRange(
    rangeId: number,
    payload: Partial<CreateSpecOptionRangePayload>,
): Promise<SpecOptionRange> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/spec-option-ranges/${rangeId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const err = await response.text().catch((_e: unknown): string => "Unknown error");
        throw new Error(`Failed to update spec range: ${response.status} ${err}`);
    }
    return response.json() as Promise<SpecOptionRange>;
}

export async function deleteSpecOptionRange(rangeId: number): Promise<void> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/spec-option-ranges/${rangeId}/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!response.ok) throw new Error(`Failed to delete spec range: ${response.status}`);
}

export async function reorderSpecGroups(
    items: Array<{ id: number; display_order: number }>,
): Promise<void> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-spec-groups/reorder/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(items),
    });
    if (!response.ok) throw new Error(`Failed to reorder spec groups: ${response.status}`);
}

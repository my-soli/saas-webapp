export interface Tenant {
    id: number;
    name: string;
    subdomain: string;
    is_active: boolean;
    logo: string | null;
    color_primary: string;
    color_secondary: string;
    contact_email: string;
    contact_phone: string;
    notes: string;
    member_count: number;
    created_at: string;
    updated_at: string;
}

export interface TenantsListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Tenant[];
}

export interface TenantsQueryParams {
    page?: number;
    search?: string;
    is_active?: boolean;
}

export interface CreateTenantPayload {
    name: string;
    subdomain: string;
    contact_email?: string;
    contact_phone?: string;
    notes?: string;
    admin_email?: string;
    admin_name?: string;
}

export interface UpdateTenantPayload {
    name?: string;
    subdomain?: string;
    is_active?: boolean;
    contact_email?: string;
    contact_phone?: string;
    notes?: string;
    color_primary?: string;
    color_secondary?: string;
}

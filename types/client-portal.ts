export type PreferredChannel = "Email" | "Phone" | "WhatsApp" | "In-Person";

export type PortalRole = "owner" | "admin" | "user" | "viewer";

export type PortalTier = "personal" | "subscriber";

export interface SubscriptionSummary {
    plan_name: string;
    status: "trial" | "active" | "past_due" | "cancelled" | "expired";
    billing_cycle: "monthly" | "annually";
    end_date: string;
    days_remaining: number;
    is_active: boolean;
}

export interface ClientPortalProfile {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company: string;
    industry: string;
    address: string;
    vat_tax_id: string;
    kra_pin: string;
    preferred_channel: PreferredChannel;
    delivery_instructions: string;
    role: PortalRole;
    client_id: string;
    portal_tier: PortalTier;
    subscription: SubscriptionSummary | null;
}

export interface UpdateClientPortalProfilePayload {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company?: string;
    industry?: string;
    address?: string;
    vat_tax_id?: string;
    kra_pin?: string;
    preferred_channel?: PreferredChannel;
    delivery_instructions?: string;
}

export interface ChangePasswordPayload {
    old_password: string;
    new_password: string;
}

export interface SystemSettings {
    site_title?: string;
    support_email?: string;
    currency?: string;
    timezone?: string;
    maintenance_mode?: boolean;
    email_on_order?: boolean;
    email_on_quote?: boolean;
    daily_digest?: boolean;
    allow_registration?: boolean;
    session_timeout?: number;
    tax_rate_ke?: number;
    tax_rate_export?: number;
    turnaround_standard?: number;
    turnaround_rush?: number;
    turnaround_expedited?: number;
    quote_validity_days?: number;
    otp_expiry_minutes?: number;
    default_invoice_terms?: string;
}

export interface SettingItem {
    key: string;
    value: string;
    description?: string;
    is_public: boolean;
}

export interface UpdateSettingsPayload {
    [key: string]: string | boolean | number;
}

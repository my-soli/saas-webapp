export interface SubscriptionPlan {
    id: number;
    name: string;
    slug: string;
    description: string;
    price_monthly: string;
    price_annually: string;
    max_users: number;
    api_access: boolean;
    white_label: boolean;
    features: string[];
    is_active: boolean;
    is_featured: boolean;
    sort_order: number;
}

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';
export type BillingCycle = 'monthly' | 'annually';
export type SubscriptionPaymentMethod = 'mpesa' | 'bank_transfer' | 'card';
export type SubscriptionPaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface SubscriptionPayment {
    id: number;
    amount: string;
    payment_method: SubscriptionPaymentMethod;
    status: SubscriptionPaymentStatus;
    reference_number: string;
    mpesa_transaction_id: string;
    period_start: string;
    period_end: string;
    notes: string;
    paid_at: string | null;
    created_at: string;
}

export interface ClientSubscription {
    id: number;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    billing_cycle: BillingCycle;
    start_date: string;
    end_date: string;
    trial_ends_at: string | null;
    auto_renew: boolean;
    cancelled_at: string | null;
    cancel_reason: string;
    is_active: boolean;
    days_remaining: number;
    payments: SubscriptionPayment[];
    created_at: string;
}

export interface CreateSubscriptionPayload {
    plan: number;
    billing_cycle: BillingCycle;
}

export interface RegisterPersonalPayload {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    phone: string;
    company?: string;
    portal_tier: 'personal';
}

export interface RegisterSubscriberPayload {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    phone: string;
    company: string;
    portal_tier: 'subscriber';
}

export type RegisterPayload = RegisterPersonalPayload | RegisterSubscriberPayload;

export interface RegisterResponse {
    user_id: number;
    client_id: string;
    portal_tier: 'personal' | 'subscriber';
    message: string;
}

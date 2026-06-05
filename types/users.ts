export interface ProductionUser {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    is_active?: boolean;
    is_superuser: boolean;
    groups: Array<{ id: number; name: string }>;
    date_joined?: string;
    last_login?: string | null;
}

export interface ProductionUsersResponse {
    success: boolean;
    users: ProductionUser[];
}

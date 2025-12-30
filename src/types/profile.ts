export interface Profile {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
    banner_gradient: string | null;
    about_me: string | null;
    custom_fields: CustomField[] | null;
    settings: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
}

export interface CustomField {
    label: string;
    value: string;
    icon?: string;
}

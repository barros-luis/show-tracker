export interface Profile {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
    banner_gradient: string | null;
    about_me: string | null;
    custom_fields: CustomField[] | null;
    settings: Record<string, unknown> | null;
    sections: ProfileSection[] | null;
    created_at: string;
    updated_at: string;
}

export interface CustomField {
    label: string;
    value: string;
    icon?: string;
}

export type SectionType = 'spotlight' | 'list' | 'custom_group';

export interface ProfileSection {
    id: string;
    type: SectionType;
    title?: string;
    order: number;
    content: SectionContent;
}

export type SectionContent =
    | { type: 'spotlight'; media: SpotlightMedia }
    | { type: 'list'; list_id: number }
    // For custom groups, we store minimal info to fetch or display
    | { type: 'custom_group'; items: SpotlightMedia[] };

// Helper type for stored media in sections (minimal subset)
export interface SpotlightMedia {
    id: string | number; // Allow string IDs from MediaItem
    sourceId: number;
    type: 'anime' | 'movie' | 'tv';
    title: string;
    posterUrl: string;
    backdropUrl?: string; // For spotlight
}

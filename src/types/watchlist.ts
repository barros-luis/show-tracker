export type MediaType = "anime" | "movie" | "tv";

// WatchStatus is now a string to support custom user-defined statuses
export type WatchStatus = string;

export interface WatchlistItem {
    id: number;
    user_id: string;
    mal_id: number | null;
    tmdb_id: number | null;
    media_type: MediaType;
    title: string;
    image_url: string;
    score: number | null;
    total_episodes: number | null;
    watched_episodes: number;
    status: WatchStatus;
    list_id: number | null;
    created_at: string;
    updated_at: string;
}

export interface UserList {
    id: number;
    user_id: string;
    name: string;
    icon: string | null;
    color: string;
    position: number;
    is_default: boolean;
    created_at: string;
}

export interface UserStatus {
    id: number;
    user_id: string;
    value: string;      // Internal key like "WATCHING"
    label: string;      // Display name like "Watching"
    color: string;      // Color name (blue, green, etc.)
    position: number;
    created_at: string;
}

export const STATUS_OPTIONS = [
    { value: "PLANNED", label: "Planned", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    { value: "WATCHING", label: "Watching", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    { value: "FINISHED", label: "Finished", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    { value: "ON_HOLD", label: "On Hold", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    { value: "REWATCHING", label: "Re-watching", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
    { value: "REWATCHED", label: "Re-watched", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
] as const;

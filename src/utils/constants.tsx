import { Film, Tv, Sparkles, Folder, Gamepad2, Book, Music, Star, Heart, Flame, Zap, Moon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Get icon component based on icon name
 * Used for list icons throughout the app
 */
export function getListIcon(iconName: string | null, size: number = 18): ReactNode {
    const icons: Record<string, ReactNode> = {
        folder: <Folder size={size} />,
        film: <Film size={size} />,
        tv: <Tv size={size} />,
        sparkles: <Sparkles size={size} />,
        gamepad: <Gamepad2 size={size} />,
        book: <Book size={size} />,
        music: <Music size={size} />,
        star: <Star size={size} />,
        heart: <Heart size={size} />,
        flame: <Flame size={size} />,
        zap: <Zap size={size} />,
        moon: <Moon size={size} />,
    };
    return icons[iconName || 'folder'] || <Folder size={size} />;
}

/**
 * Status options for watchlist items
 */
export const STATUS_OPTIONS = [
    { value: "PLANNED", label: "Planned", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    { value: "WATCHING", label: "Watching", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    { value: "FINISHED", label: "Finished", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    { value: "ON_HOLD", label: "On Hold", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    { value: "REWATCHING", label: "Re-watching", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
    { value: "REWATCHED", label: "Re-watched", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
] as const;

/**
 * Media type filter options
 */
export const MEDIA_TYPE_OPTIONS = [
    { value: 'anime', label: 'Anime', color: 'purple' },
    { value: 'movie', label: 'Movies', color: 'red' },
    { value: 'tv', label: 'Series', color: 'green' },
] as const;

/**
 * Color mappings for list colors
 */
export const COLOR_BG_MAP: Record<string, string> = {
    gray: "bg-gray-500/20 hover:bg-gray-500/30 border-gray-500/30",
    red: "bg-red-500/20 hover:bg-red-500/30 border-red-500/30",
    orange: "bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/30",
    yellow: "bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/30",
    green: "bg-green-500/20 hover:bg-green-500/30 border-green-500/30",
    cyan: "bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/30",
    blue: "bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30",
    purple: "bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/30",
    pink: "bg-pink-500/20 hover:bg-pink-500/30 border-pink-500/30",
};

export const COLOR_TEXT_MAP: Record<string, string> = {
    gray: "text-gray-400",
    red: "text-red-400",
    orange: "text-orange-400",
    yellow: "text-yellow-400",
    green: "text-green-400",
    cyan: "text-cyan-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    pink: "text-pink-400",
};

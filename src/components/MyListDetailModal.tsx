import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Calendar, Tv, Clock, Loader2, Trash2, ChevronDown, ChevronUp, Check, AlertTriangle } from "lucide-react";
import { getAnimeDetails, getAllAnimeEpisodes, getEpisodeDetails, type Anime, type AnimeEpisode } from "../api/jikan";
import { SupabaseClient } from "@supabase/supabase-js";

// Status options with display labels and colors
const STATUS_OPTIONS = [
    { value: "PLANNED", label: "Planned", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    { value: "WATCHING", label: "Watching", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    { value: "ON_HOLD", label: "On Hold", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    { value: "FINISHED", label: "Finished", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
] as const;

interface WatchlistItem {
    id: number;
    mal_id: number;
    title: string;
    image_url: string;
    total_episodes: number | null;
    watched_episodes: number;
    status: string;
}

interface MyListDetailModalProps {
    item: WatchlistItem | null;
    isOpen: boolean;
    onClose: () => void;
    onRemove: (item: WatchlistItem) => void;
    onEpisodeUpdate: (itemId: number, watchedCount: number) => void;
    onTotalEpisodesUpdate: (itemId: number, totalEpisodes: number) => void;
    onStatusUpdate: (itemId: number, status: string) => void;
    supabase: SupabaseClient;
    userId: string | null;
}

export function MyListDetailModal({
    item,
    isOpen,
    onClose,
    onRemove,
    onEpisodeUpdate,
    onTotalEpisodesUpdate,
    onStatusUpdate,
    supabase,
    userId
}: MyListDetailModalProps) {
    const [fullDetails, setFullDetails] = useState<Anime | null>(null);
    const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
    const [watchedEpisodes, setWatchedEpisodes] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [loadingEpisodes, setLoadingEpisodes] = useState(false);
    const [expandedEpisode, setExpandedEpisode] = useState<number | null>(null);
    const [episodeSynopsis, setEpisodeSynopsis] = useState<Record<number, string>>({});
    const [loadingSynopsis, setLoadingSynopsis] = useState<number | null>(null);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [currentStatus, setCurrentStatus] = useState<string>(item?.status || "PLANNED");
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    // Fetch anime details and episodes when modal opens
    useEffect(() => {
        if (isOpen && item) {
            setLoading(true);
            setLoadingEpisodes(true);

            // Fetch anime details
            getAnimeDetails(item.mal_id).then((details) => {
                setFullDetails(details);
                setLoading(false);
            });

            // Fetch all episodes
            getAllAnimeEpisodes(item.mal_id).then(async (eps) => {
                setEpisodes(eps);
                setLoadingEpisodes(false);

                // Update total_episodes if we got actual episode data and it's different
                if (eps.length > 0 && eps.length !== item.total_episodes) {
                    // Update database
                    await supabase
                        .from('watchlist')
                        .update({ total_episodes: eps.length })
                        .eq('id', item.id);
                    // Update parent state
                    onTotalEpisodesUpdate(item.id, eps.length);
                }
            });

            // Fetch watched episodes from database
            fetchWatchedEpisodes();
        } else {
            setFullDetails(null);
            setEpisodes([]);
            setWatchedEpisodes(new Set());
            setExpandedEpisode(null);
            setEpisodeSynopsis({});
            setShowRemoveConfirm(false);
            setShowStatusDropdown(false);
        }
        // Reset status when item changes
        if (item) {
            setCurrentStatus(item.status || "PLANNED");
        }
    }, [isOpen, item]);

    const fetchWatchedEpisodes = async () => {
        if (!item || !userId) return;

        const { data } = await supabase
            .from('watched_episodes')
            .select('episode_number')
            .eq('watchlist_id', item.id);

        if (data) {
            setWatchedEpisodes(new Set(data.map(d => d.episode_number)));
        }
    };

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (showRemoveConfirm) {
                    setShowRemoveConfirm(false);
                } else {
                    onClose();
                }
            }
        };
        if (isOpen) window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose, showRemoveConfirm]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    const toggleEpisodeWatched = async (episodeNumber: number) => {
        if (!item || !userId) return;

        const isWatched = watchedEpisodes.has(episodeNumber);

        // Optimistic update
        const newWatched = new Set(watchedEpisodes);
        if (isWatched) {
            newWatched.delete(episodeNumber);
        } else {
            newWatched.add(episodeNumber);
        }
        setWatchedEpisodes(newWatched);

        // Update database
        if (isWatched) {
            await supabase
                .from('watched_episodes')
                .delete()
                .eq('watchlist_id', item.id)
                .eq('episode_number', episodeNumber);
        } else {
            await supabase
                .from('watched_episodes')
                .insert({
                    user_id: userId,
                    watchlist_id: item.id,
                    mal_id: item.mal_id,
                    episode_number: episodeNumber
                });
        }

        // Update the watched_episodes count in the watchlist table
        const newCount = newWatched.size;
        await supabase
            .from('watchlist')
            .update({ watched_episodes: newCount })
            .eq('id', item.id);

        onEpisodeUpdate(item.id, newCount);
    };

    const toggleEpisodeExpand = async (episodeNumber: number) => {
        if (expandedEpisode === episodeNumber) {
            setExpandedEpisode(null);
            return;
        }

        setExpandedEpisode(episodeNumber);

        // Fetch synopsis if not already loaded
        if (!episodeSynopsis[episodeNumber]) {
            setLoadingSynopsis(episodeNumber);
            const details = await getEpisodeDetails(item!.mal_id, episodeNumber);
            if (details?.synopsis) {
                setEpisodeSynopsis(prev => ({ ...prev, [episodeNumber]: details.synopsis! }));
            } else {
                setEpisodeSynopsis(prev => ({ ...prev, [episodeNumber]: "No synopsis available." }));
            }
            setLoadingSynopsis(null);
        }
    };

    const handleRemove = () => {
        if (item) {
            onRemove(item);
            onClose();
        }
    };

    const displayData = fullDetails || (item ? {
        title: item.title,
        images: { jpg: { large_image_url: item.image_url, image_url: item.image_url } },
        episodes: item.total_episodes,
        score: null,
        year: null,
        status: null,
        source: null,
        season: null,
        popularity: null,
        duration: null
    } : null);

    const watchedCount = watchedEpisodes.size;
    const totalEpisodes = episodes.length || item?.total_episodes || 0;
    const progressPercent = totalEpisodes > 0 ? (watchedCount / totalEpisodes) * 100 : 0;

    return (
        <AnimatePresence>
            {isOpen && displayData && item && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px]"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div
                            className="w-full max-w-6xl max-h-[85vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 pointer-events-auto flex flex-col relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 z-20 w-10 h-10 bg-gray-800/80 hover:bg-gray-700 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all hover:scale-110 cursor-pointer border border-gray-700"
                            >
                                <X size={20} />
                            </button>

                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row h-full overflow-hidden">

                                    {/* LEFT COLUMN - Show Info (1/3) */}
                                    <div className="w-full md:w-1/3 flex flex-col bg-gray-900 border-r border-gray-800">
                                        {/* Anime Poster + Stats */}
                                        <div className="relative w-full bg-gray-900 flex-shrink-0 flex items-start justify-start pt-4 px-4 gap-4">
                                            <img
                                                src={item.image_url}
                                                alt={item.title}
                                                className="h-60 object-contain rounded-lg shadow-lg"
                                            />

                                            {/* Quick Stats - Minimal */}
                                            <div className="flex flex-col gap-3 py-2 text-sm">
                                                {fullDetails?.score && (
                                                    <div className="flex items-center gap-2">
                                                        <Star size={14} className="text-yellow-500" fill="currentColor" />
                                                        <span className="text-white font-semibold">{fullDetails.score}</span>
                                                        <span className="text-gray-500 text-xs">Rating</span>
                                                    </div>
                                                )}
                                                {fullDetails?.popularity && (
                                                    <div className="flex items-center gap-2">
                                                        <Tv size={14} className="text-purple-400" />
                                                        <span className="text-white font-semibold">#{fullDetails.popularity}</span>
                                                        <span className="text-gray-500 text-xs">Popularity</span>
                                                    </div>
                                                )}
                                                {fullDetails?.source && (
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-blue-400" />
                                                        <span className="text-white font-semibold">{fullDetails.source}</span>
                                                        <span className="text-gray-500 text-xs">Source</span>
                                                    </div>
                                                )}
                                                {fullDetails?.season && fullDetails?.year && (
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={14} className="text-green-400" />
                                                        <span className="text-white font-semibold capitalize">{fullDetails.season} {fullDetails.year}</span>
                                                        <span className="text-gray-500 text-xs">Season</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Info Section */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            <div>
                                                <h2 className="text-xl font-bold text-white leading-tight">
                                                    {item.title}
                                                </h2>
                                            </div>

                                            {/* Status Dropdown */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 cursor-pointer transition-all border ${STATUS_OPTIONS.find(s => s.value === currentStatus)?.color || "bg-gray-500/20 text-gray-400 border-gray-500/30"
                                                        }`}
                                                >
                                                    {STATUS_OPTIONS.find(s => s.value === currentStatus)?.label || currentStatus}
                                                    <ChevronDown size={12} className={`transition-transform ${showStatusDropdown ? "rotate-180" : ""}`} />
                                                </button>

                                                {/* Dropdown Menu */}
                                                <AnimatePresence>
                                                    {showStatusDropdown && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -5 }}
                                                            className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden min-w-[140px]"
                                                        >
                                                            {STATUS_OPTIONS.map((option) => (
                                                                <button
                                                                    key={option.value}
                                                                    onClick={async () => {
                                                                        setCurrentStatus(option.value);
                                                                        setShowStatusDropdown(false);
                                                                        // Update database
                                                                        await supabase
                                                                            .from('watchlist')
                                                                            .update({ status: option.value })
                                                                            .eq('id', item.id);
                                                                        // Update parent
                                                                        onStatusUpdate(item.id, option.value);
                                                                    }}
                                                                    className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${currentStatus === option.value
                                                                        ? "bg-blue-500/20 text-white"
                                                                        : "text-gray-300 hover:bg-gray-700"
                                                                        }`}
                                                                >
                                                                    {currentStatus === option.value && <Check size={12} />}
                                                                    {option.label}
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* Synopsis */}
                                            {fullDetails?.synopsis && (
                                                <div className="space-y-2">
                                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Synopsis</h3>
                                                    <p className="text-gray-300 text-xs leading-relaxed">
                                                        {fullDetails.synopsis}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Remove Button */}
                                        <div className="flex-shrink-0 p-4 border-t border-gray-800">
                                            {!showRemoveConfirm ? (
                                                <button
                                                    onClick={() => setShowRemoveConfirm(true)}
                                                    className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 hover:border-red-500/60"
                                                >
                                                    <Trash2 size={18} />
                                                    Remove from My List
                                                </button>
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-center text-yellow-400 text-sm flex items-center justify-center gap-2">
                                                        <AlertTriangle size={16} />
                                                        Are you sure?
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setShowRemoveConfirm(false)}
                                                            className="flex-1 py-2 rounded-lg font-bold text-sm bg-gray-700 hover:bg-gray-600 text-white cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={handleRemove}
                                                            className="flex-1 py-2 rounded-lg font-bold text-sm bg-red-600 hover:bg-red-500 text-white cursor-pointer"
                                                        >
                                                            Yes, Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* RIGHT COLUMN - Episode List (2/3) */}
                                    <div className="w-full md:w-2/3 flex flex-col bg-gray-100 dark:bg-gray-950 p-6">
                                        {/* Header with Progress */}
                                        <div className="mb-4">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <Tv size={20} className="text-blue-500" />
                                                Episodes
                                                <span className="text-gray-500 dark:text-gray-400 font-normal text-sm ml-2">
                                                    ({watchedCount} / {totalEpisodes} watched)
                                                </span>
                                            </h3>
                                            {/* Progress Bar */}
                                            <div className="mt-2 h-2 w-full bg-gray-300 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 transition-all duration-300"
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>

                                            {/* Quick Action Buttons */}
                                            {episodes.length > 0 && (
                                                <div className="mt-3 flex gap-2">
                                                    {/* Fill Gaps Button */}
                                                    <button
                                                        onClick={async () => {
                                                            if (!item || !userId) return;
                                                            const maxWatched = Math.max(...Array.from(watchedEpisodes), 0);
                                                            if (maxWatched === 0) return;

                                                            // Find all episodes from 1 to maxWatched that aren't checked
                                                            const episodesToAdd = episodes
                                                                .filter(ep => ep.mal_id <= maxWatched && !watchedEpisodes.has(ep.mal_id))
                                                                .map(ep => ep.mal_id);

                                                            if (episodesToAdd.length === 0) return;

                                                            // Update local state
                                                            const newWatched = new Set(watchedEpisodes);
                                                            episodesToAdd.forEach(ep => newWatched.add(ep));
                                                            setWatchedEpisodes(newWatched);

                                                            // Batch insert to database
                                                            const insertData = episodesToAdd.map(ep => ({
                                                                user_id: userId,
                                                                watchlist_id: item.id,
                                                                mal_id: item.mal_id,
                                                                episode_number: ep
                                                            }));
                                                            await supabase.from('watched_episodes').insert(insertData);

                                                            // Update count
                                                            await supabase.from('watchlist').update({ watched_episodes: newWatched.size }).eq('id', item.id);
                                                            onEpisodeUpdate(item.id, newWatched.size);
                                                        }}
                                                        disabled={watchedEpisodes.size === 0}
                                                        className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 hover:border-purple-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        <ChevronDown size={14} className="rotate-90" />
                                                        Fill Gaps
                                                    </button>

                                                    {/* Check All Button */}
                                                    <button
                                                        onClick={async () => {
                                                            if (!item || !userId) return;

                                                            // Find all unchecked episodes
                                                            const episodesToAdd = episodes
                                                                .filter(ep => !watchedEpisodes.has(ep.mal_id))
                                                                .map(ep => ep.mal_id);

                                                            if (episodesToAdd.length === 0) return;

                                                            // Update local state - all episodes watched
                                                            const newWatched = new Set(episodes.map(ep => ep.mal_id));
                                                            setWatchedEpisodes(newWatched);

                                                            // Batch insert to database
                                                            const insertData = episodesToAdd.map(ep => ({
                                                                user_id: userId,
                                                                watchlist_id: item.id,
                                                                mal_id: item.mal_id,
                                                                episode_number: ep
                                                            }));
                                                            await supabase.from('watched_episodes').insert(insertData);

                                                            // Update count
                                                            await supabase.from('watchlist').update({ watched_episodes: newWatched.size }).eq('id', item.id);
                                                            onEpisodeUpdate(item.id, newWatched.size);
                                                        }}
                                                        disabled={watchedEpisodes.size === episodes.length}
                                                        className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 hover:border-green-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        <Check size={14} />
                                                        Check All
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Episode List */}
                                        <div className="flex-1 overflow-y-auto space-y-2">
                                            {loadingEpisodes ? (
                                                <div className="flex items-center justify-center py-20">
                                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                                    <span className="ml-3 text-gray-500 dark:text-gray-400">Loading episodes...</span>
                                                </div>
                                            ) : episodes.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                                    <Tv size={48} className="mb-4 opacity-50" />
                                                    <p>No episode data available</p>
                                                    <p className="text-sm mt-1">This anime may not have episode info in the database</p>
                                                </div>
                                            ) : (
                                                episodes.map((episode) => (
                                                    <div
                                                        key={episode.mal_id}
                                                        className={`rounded-lg border transition-all ${watchedEpisodes.has(episode.mal_id)
                                                            ? "bg-blue-500/10 border-blue-500/30"
                                                            : "bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600"
                                                            }`}
                                                    >
                                                        <div className="flex items-center p-3 gap-3">
                                                            {/* Checkbox */}
                                                            <button
                                                                onClick={() => toggleEpisodeWatched(episode.mal_id)}
                                                                className={`w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-all ${watchedEpisodes.has(episode.mal_id)
                                                                    ? "bg-blue-500 text-white"
                                                                    : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-transparent hover:text-gray-400"
                                                                    }`}
                                                            >
                                                                <Check size={14} />
                                                            </button>

                                                            {/* Episode Number */}
                                                            <span className="text-gray-500 dark:text-gray-400 text-sm font-mono w-10">
                                                                {episode.mal_id}
                                                            </span>

                                                            {/* Episode Title - Clickable */}
                                                            <button
                                                                onClick={() => toggleEpisodeExpand(episode.mal_id)}
                                                                className="flex-1 text-left text-gray-800 dark:text-white text-sm hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-2"
                                                            >
                                                                <span className={watchedEpisodes.has(episode.mal_id) ? "line-through opacity-60" : ""}>
                                                                    {episode.title}
                                                                </span>
                                                                {expandedEpisode === episode.mal_id ? (
                                                                    <ChevronUp size={14} className="text-gray-400 dark:text-gray-500" />
                                                                ) : (
                                                                    <ChevronDown size={14} className="text-gray-400 dark:text-gray-500" />
                                                                )}
                                                            </button>

                                                            {/* Badges */}
                                                            <div className="flex gap-1">
                                                                {episode.filler && (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-500/20 text-orange-400">
                                                                        Filler
                                                                    </span>
                                                                )}
                                                                {episode.recap && (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-400">
                                                                        Recap
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Expanded Synopsis */}
                                                        <AnimatePresence>
                                                            {expandedEpisode === episode.mal_id && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: "auto", opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="px-4 pb-3 pt-1 border-t border-gray-200 dark:border-gray-700/50">
                                                                        {loadingSynopsis === episode.mal_id ? (
                                                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                                                                                <Loader2 size={14} className="animate-spin" />
                                                                                Loading synopsis...
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">
                                                                                {episodeSynopsis[episode.mal_id] || "No synopsis available."}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Remove Confirmation Overlay - accessible but invisible layer */}
                </>
            )}
        </AnimatePresence>
    );
}

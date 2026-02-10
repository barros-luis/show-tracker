import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Calendar, Tv, Clock, Loader2, Trash2, ChevronDown, ChevronUp, Check, AlertTriangle } from "lucide-react";
import { getAnimeDetails, getAllAnimeEpisodes, getEpisodeDetails, type Anime } from "../../api/jikan";
import { getTVDetails, getAllTVEpisodes, searchTVShows, getTVSeasonEpisodes, type TMDBTVShow } from "../../api/tmdb";
import { getFillerRecapMap, enrichWithJikan } from "../../api/animeService";
import { SupabaseClient } from "@supabase/supabase-js";
import type { UserList, UserStatus } from "../../types";

// Unified episode type for both anime and TV
interface UnifiedEpisode {
    id: number;  // mal_id for anime, episode id for TMDB
    number: number;
    title: string;
    synopsis?: string | null;
    filler?: boolean;
    recap?: boolean;
    season?: number;
}

// Episode cache helpers (7-day expiry)
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedEpisodes {
    episodes: UnifiedEpisode[];
    timestamp: number;
}

function getCacheKey(mediaType: string, id: number | null): string {
    return `ep_cache_${mediaType}_${id}`;
}

function getCachedEpisodes(mediaType: string, id: number | null): UnifiedEpisode[] | null {
    if (!id) return null;
    try {
        const cached = localStorage.getItem(getCacheKey(mediaType, id));
        if (!cached) return null;

        const data: CachedEpisodes = JSON.parse(cached);
        const isExpired = Date.now() - data.timestamp > CACHE_EXPIRY_MS;

        if (isExpired) {
            localStorage.removeItem(getCacheKey(mediaType, id));
            return null;
        }

        return data.episodes;
    } catch {
        return null;
    }
}

function setCachedEpisodes(mediaType: string, id: number | null, episodes: UnifiedEpisode[]): void {
    if (!id || episodes.length === 0) return;
    try {
        const data: CachedEpisodes = {
            episodes,
            timestamp: Date.now()
        };
        localStorage.setItem(getCacheKey(mediaType, id), JSON.stringify(data));
    } catch {
        // localStorage full or unavailable, ignore
    }
}

import { StatusDropdown, ListDropdown } from "./MyListDropdowns";
import { useTranslation } from "react-i18next";


interface WatchlistItem {
    id: number;
    mal_id: number | null;
    tmdb_id: number | null;
    media_type: 'anime' | 'movie' | 'tv';
    title: string;
    image_url: string;
    total_episodes: number | null;
    watched_episodes: number;
    status: string;
    list_id: number | null;
}

interface MyListDetailModalProps {
    item: WatchlistItem | null;
    isOpen: boolean;
    onClose: () => void;
    onRemove: (item: WatchlistItem) => void;
    onEpisodeUpdate: (itemId: number, watchedCount: number) => void;
    onTotalEpisodesUpdate: (itemId: number, totalEpisodes: number) => void;
    onStatusUpdate: (itemId: number, status: string) => void;
    onListChange: (itemId: number, listId: number | null) => void;
    userLists: UserList[];
    userStatuses: UserStatus[];
    supabase: SupabaseClient;
    userId: string | null;
}

export function DesktopMyListDetailModal({
    item,
    isOpen,
    onClose,
    onRemove,
    onEpisodeUpdate,
    onTotalEpisodesUpdate,
    onStatusUpdate,
    onListChange,
    userLists,
    userStatuses,
    supabase,
    userId
}: MyListDetailModalProps) {
    const { t } = useTranslation();
    const [fullDetails, setFullDetails] = useState<Anime | TMDBTVShow | null>(null);
    const [episodes, setEpisodes] = useState<UnifiedEpisode[]>([]);
    const [watchedEpisodes, setWatchedEpisodes] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [loadingEpisodes, setLoadingEpisodes] = useState(false);
    const [expandedEpisode, setExpandedEpisode] = useState<number | null>(null);
    const [episodeSynopsis, setEpisodeSynopsis] = useState<Record<number, string>>({});
    const [loadingSynopsis, setLoadingSynopsis] = useState<number | null>(null);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [currentStatus, setCurrentStatus] = useState<string>(item?.status || "PLANNED");
    const [currentListId, setCurrentListId] = useState<number | null>(item?.list_id ?? null);

    // Helper removed (moved to MyListDropdowns.tsx)



    // Sync status and list_id when item changes
    useEffect(() => {
        if (item) {
            setCurrentStatus(item.status || "PLANNED");
            setCurrentListId(item.list_id ?? null);
        }
    }, [item]);

    // Fetch details and episodes when modal opens
    useEffect(() => {
        if (isOpen && item) {
            setLoading(true);
            setLoadingEpisodes(true);

            if (item.media_type === 'anime' && item.tmdb_id) {
                // TMDB-sourced anime - fetch episodes from TMDB with filler overlay from Jikan
                (async () => {
                    try {
                        // Fetch details from TMDB
                        const tmdbDetails = await getTVDetails(item.tmdb_id!);

                        // Also try to get MAL enrichment for additional details
                        const jikanEnrichment = item.mal_id
                            ? null  // Already have mal_id, can fetch details directly
                            : await enrichWithJikan(item.tmdb_id!, item.title, tmdbDetails?.first_air_date ? new Date(tmdbDetails.first_air_date).getFullYear() : null);

                        // If we got enrichment, update mal_id in DB for future filler lookups
                        if (jikanEnrichment && !item.mal_id) {
                            await supabase
                                .from('watchlist')
                                .update({ mal_id: jikanEnrichment.mal_id })
                                .eq('id', item.id);
                        }

                        const effectiveMalId = item.mal_id || jikanEnrichment?.mal_id;

                        // Get Jikan details for display if we have mal_id
                        if (effectiveMalId) {
                            const animeDetails = await getAnimeDetails(effectiveMalId);
                            setFullDetails(animeDetails);
                        } else {
                            // Fall back to TMDB details
                            setFullDetails(tmdbDetails);
                        }
                        setLoading(false);

                        // Check cache first
                        const cachedEps = getCachedEpisodes('anime', item.tmdb_id);
                        if (cachedEps) {
                            console.log(`[Cache] Loaded ${cachedEps.length} anime episodes from cache (TMDB)`);
                            setEpisodes(cachedEps);
                            fetchWatchedEpisodes().then(() => setLoadingEpisodes(false));
                            return;
                        }

                        // Fetch all episodes from TMDB
                        const tmdbEps = await getAllTVEpisodes(item.tmdb_id!);

                        // Get filler/recap map from Jikan if we have mal_id
                        let fillerMap = new Map<number, { filler: boolean; recap: boolean }>();
                        if (effectiveMalId) {
                            try {
                                fillerMap = await getFillerRecapMap(effectiveMalId);
                                console.log(`[Filler] Loaded ${fillerMap.size} filler entries for MAL ID ${effectiveMalId}`);
                            } catch (err) {
                                console.error("Failed to fetch filler map:", err);
                            }
                        }

                        // Convert to unified episodes with filler overlay
                        const unifiedEps: UnifiedEpisode[] = tmdbEps.map((ep, idx) => {
                            const epNumber = idx + 1;
                            const fillerInfo = fillerMap.get(epNumber);
                            return {
                                id: ep.id,
                                number: epNumber,
                                title: `S${ep.season_number}E${ep.episode_number}: ${ep.name}`,
                                synopsis: ep.overview,
                                season: ep.season_number,
                                filler: fillerInfo?.filler || false,
                                recap: fillerInfo?.recap || false,
                            };
                        });

                        setEpisodes(unifiedEps);
                        setLoadingEpisodes(false);

                        // Cache episodes
                        setCachedEpisodes('anime', item.tmdb_id, unifiedEps);
                        console.log(`[Cache] Saved ${unifiedEps.length} anime episodes to cache (TMDB)`);

                        // Update total_episodes if different
                        if (unifiedEps.length > 0 && unifiedEps.length > (item.total_episodes || 0)) {
                            await supabase
                                .from('watchlist')
                                .update({ total_episodes: unifiedEps.length })
                                .eq('id', item.id);
                            onTotalEpisodesUpdate(item.id, unifiedEps.length);
                        }
                    } catch (error) {
                        console.error("Error fetching anime episodes via TMDB:", error);
                        setLoading(false);
                        setLoadingEpisodes(false);
                    }
                })();
            } else if (item.media_type === 'anime' && item.mal_id) {
                // Fetch anime details and episodes sequentially to handle Movies correctly
                (async () => {
                    try {
                        const details = await getAnimeDetails(item.mal_id!);
                        setFullDetails(details);
                        setLoading(false);

                        // Check cache first for episodes
                        const cachedEps = getCachedEpisodes('anime', item.mal_id);
                        if (cachedEps) {
                            console.log(`[Cache] Loaded ${cachedEps.length} episodes from cache`);
                            setEpisodes(cachedEps);
                            fetchWatchedEpisodes().then(() => setLoadingEpisodes(false));
                            return;
                        }

                        const eps = await getAllAnimeEpisodes(item.mal_id!);
                        let unifiedEps: UnifiedEpisode[] = eps.map(ep => ({
                            id: ep.mal_id,
                            number: ep.mal_id,  // For anime, mal_id IS the episode number
                            title: ep.title,
                            synopsis: ep.synopsis,
                            filler: ep.filler,
                            recap: ep.recap,
                        }));

                        // FIX: Handle Anime Movies that Jikan returns as 0 episodes
                        if (unifiedEps.length === 0 && (details?.type === 'Movie' || details?.episodes === 1)) {
                            unifiedEps = [{
                                id: 1,
                                number: 1,
                                title: details?.title || item.title,
                                synopsis: details?.synopsis || "Movie",
                            }];
                        }

                        // Fallback to TMDB for missing episodes (e.g. One Piece where Jikan is stale)
                        // ... (Logic kept same, just indented/moved if needed, but since we have unifiedEps let's keep it clean)
                        if (eps.length > 0) { // Only try patching if we actually got standard episodes but might be missing new ones
                            try {
                                const tmdbResults = await searchTVShows(item.title);
                                // Filter for Japanese animation
                                const candidate = tmdbResults.find(show =>
                                    show.origin_country?.includes('JP') &&
                                    show.first_air_date
                                ) || tmdbResults[0];

                                if (candidate) {
                                    const details = await getTVDetails(candidate.id);
                                    if (details?.last_episode_to_air) {
                                        const lastJikanEp = eps[eps.length - 1];
                                        const jikanDate = lastJikanEp.aired ? new Date(lastJikanEp.aired) : null;

                                        // Fetch current season episodes (where latest ep is)
                                        const seasonNum = details.last_episode_to_air.season_number;
                                        const seasonData = await getTVSeasonEpisodes(candidate.id, seasonNum);

                                        if (seasonData?.episodes && jikanDate) {
                                            const newEpisodes = seasonData.episodes.filter(ep => {
                                                if (!ep.air_date) return false;
                                                return new Date(ep.air_date) > jikanDate;
                                            });

                                            let nextNum = lastJikanEp.mal_id + 1;
                                            newEpisodes.forEach(ep => {
                                                // Avoid duplicates if any weirdness
                                                if (!unifiedEps.find(e => e.number === nextNum)) {
                                                    unifiedEps.push({
                                                        id: ep.id, // TMDB ID
                                                        number: nextNum++,
                                                        title: ep.name,
                                                        synopsis: ep.overview,
                                                        filler: false,
                                                        recap: false
                                                    });
                                                }
                                            });
                                        }
                                    }
                                }
                            } catch (err) {
                                console.error("Error patching anime episodes:", err);
                            }
                        }

                        setEpisodes(unifiedEps);
                        setLoadingEpisodes(false);

                        setCachedEpisodes('anime', item.mal_id, unifiedEps);

                        // Update total_episodes if different
                        if (unifiedEps.length > 0 && unifiedEps.length > (item.total_episodes || 0)) {
                            await supabase
                                .from('watchlist')
                                .update({ total_episodes: unifiedEps.length })
                                .eq('id', item.id);
                            onTotalEpisodesUpdate(item.id, unifiedEps.length);
                        }

                    } catch (error) {
                        console.error("Error fetching anime details/episodes:", error);
                        setLoading(false);
                        setLoadingEpisodes(false);
                    }
                })();
            } else if (item.media_type === 'tv' && item.tmdb_id) {
                // Fetch TV show details from TMDB
                getTVDetails(item.tmdb_id).then((details) => {
                    setFullDetails(details);
                    setLoading(false);
                });

                // Check cache first
                const cachedEps = getCachedEpisodes('tv', item.tmdb_id);
                if (cachedEps) {
                    console.log(`[Cache] Loaded ${cachedEps.length} TV episodes from cache`);
                    setEpisodes(cachedEps);
                    // Fetch watched status, then set loading false
                    fetchWatchedEpisodes().then(() => setLoadingEpisodes(false));
                    return;
                }

                // Fetch all TV episodes from TMDB
                getAllTVEpisodes(item.tmdb_id).then(async (eps) => {
                    const unifiedEps: UnifiedEpisode[] = eps.map((ep, idx) => ({
                        id: ep.id,
                        number: idx + 1,
                        title: `S${ep.season_number}E${ep.episode_number}: ${ep.name}`,
                        synopsis: ep.overview,
                        season: ep.season_number,
                    }));
                    setEpisodes(unifiedEps);
                    setLoadingEpisodes(false);

                    // Cache for fast subsequent loads
                    setCachedEpisodes('tv', item.tmdb_id, unifiedEps);
                    console.log(`[Cache] Saved ${unifiedEps.length} TV episodes to cache`);

                    if (eps.length > 0 && eps.length > (item.total_episodes || 0)) {
                        await supabase
                            .from('watchlist')
                            .update({ total_episodes: eps.length })
                            .eq('id', item.id);
                        onTotalEpisodesUpdate(item.id, eps.length);
                    }
                });
            } else if (item.media_type === 'movie') {
                // Movies don't have episode tracking, just mark as single item
                setFullDetails(null);
                setLoading(false);
                setEpisodes([{
                    id: 1,
                    number: 1,
                    title: 'Watch Movie',
                    synopsis: null,
                }]);
                setLoadingEpisodes(false);
            } else {
                setLoading(false);
                setLoadingEpisodes(false);
            }

            fetchWatchedEpisodes();
        } else {
            setFullDetails(null);
            setEpisodes([]);
            setWatchedEpisodes(new Set());
            setExpandedEpisode(null);
            setEpisodeSynopsis({});
            setShowRemoveConfirm(false);
            if (item) {
                setCurrentStatus(item.status || "PLANNED");
            }
        }
    }, [isOpen, item?.id]);

    const handleStatusChange = async (status: string) => {
        if (!item) return;
        setCurrentStatus(status);
        await supabase
            .from('watchlist')
            .update({ status: status })
            .eq('id', item.id);
        onStatusUpdate(item.id, status);
    };

    const handleListChange = async (listId: number | null) => {
        if (!item) return;
        setCurrentListId(listId);
        await supabase
            .from('watchlist')
            .update({ list_id: listId })
            .eq('id', item.id);
        onListChange(item.id, listId);
    };

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

    // Auto-scroll to first unwatched episode
    useEffect(() => {
        if (!loadingEpisodes && episodes.length > 0 && watchedEpisodes.size > 0 && isOpen) {
            const maxWatched = Math.max(...Array.from(watchedEpisodes));
            const targetEp = maxWatched + 1;

            setTimeout(() => {
                const element = document.getElementById(`episode-${targetEp}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    const lastWatchedElement = document.getElementById(`episode-${maxWatched}`);
                    if (lastWatchedElement) {
                        lastWatchedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }, 300);
        }
    }, [loadingEpisodes, isOpen, item?.id]); // Run when episodes load or modal opens

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

    // Realtime subscription for watched episodes
    useEffect(() => {
        if (!item?.id) return;

        const channel = supabase
            .channel(`watched_episodes_desktop_${item.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'watched_episodes',
                    filter: `watchlist_id=eq.${item.id}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setWatchedEpisodes(prev => {
                            const next = new Set(prev);
                            next.add(payload.new.episode_number);
                            return next;
                        });
                    } else if (payload.eventType === 'DELETE') {
                        setWatchedEpisodes(prev => {
                            const next = new Set(prev);
                            // As with mobile, we blindly rely on a re-fetch or manual management.
                            // But since the payload.old usually just has ID, and we don't store ID in our Set (we store episode number),
                            // we can't delete easily without a fetch.
                            // HOWEVER, we can just trigger a fetch.
                            return next;
                        });
                        fetchWatchedEpisodes();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [item?.id]);

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
                    tmdb_id: item.tmdb_id,
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

        // Fetch synopsis if not already loaded (only for anime with mal_id)
        if (!episodeSynopsis[episodeNumber]) {
            if (item?.media_type === 'anime' && item.mal_id) {
                setLoadingSynopsis(episodeNumber);
                const details = await getEpisodeDetails(item.mal_id, episodeNumber);
                if (details?.synopsis) {
                    setEpisodeSynopsis(prev => ({ ...prev, [episodeNumber]: details.synopsis! }));
                } else {
                    setEpisodeSynopsis(prev => ({ ...prev, [episodeNumber]: "No synopsis available." }));
                }
                setLoadingSynopsis(null);
            } else {
                // For TV shows, the synopsis is already in the episode data
                const episode = episodes.find(ep => ep.number === episodeNumber);
                if (episode?.synopsis) {
                    setEpisodeSynopsis(prev => ({ ...prev, [episodeNumber]: episode.synopsis! }));
                } else {
                    setEpisodeSynopsis(prev => ({ ...prev, [episodeNumber]: "No synopsis available." }));
                }
            }
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
    // Use the MAX of fetched episodes and saved total (API may be outdated)
    const totalEpisodes = Math.max(episodes.length, item?.total_episodes || 0);
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
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-[2px]"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div
                            className="w-full max-w-6xl max-h-[85vh] bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 pointer-events-auto flex flex-col relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 z-20 w-8 h-8 bg-gray-200/80 dark:bg-gray-800/80 hover:bg-gray-300 dark:hover:bg-gray-700 backdrop-blur-md rounded-full flex items-center justify-center text-gray-600 dark:text-white transition-all hover:scale-110 cursor-pointer border border-gray-300 dark:border-gray-700"
                            >
                                <X size={16} />
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
                                                {/* Rating - works for both anime and TV */}
                                                {(item.media_type === 'anime' && fullDetails && 'score' in fullDetails && fullDetails.score) ? (
                                                    <div className="flex items-center gap-2">
                                                        <Star size={14} className="text-yellow-500" fill="currentColor" />
                                                        <span className="text-white font-semibold">{fullDetails.score}</span>
                                                        <span className="text-gray-500 text-xs">{t('media_detail.rating')}</span>
                                                    </div>
                                                ) : (item.media_type === 'tv' && fullDetails && 'vote_average' in fullDetails && fullDetails.vote_average) ? (
                                                    <div className="flex items-center gap-2">
                                                        <Star size={14} className="text-yellow-500" fill="currentColor" />
                                                        <span className="text-white font-semibold">{Math.round(fullDetails.vote_average * 10) / 10}</span>
                                                        <span className="text-gray-500 text-xs">{t('media_detail.rating')}</span>
                                                    </div>
                                                ) : null}
                                                {fullDetails?.popularity && (
                                                    <div className="flex items-center gap-2">
                                                        <Tv size={14} className="text-purple-400" />
                                                        <span className="text-white font-semibold">#{Math.round(fullDetails.popularity)}</span>
                                                        <span className="text-gray-500 text-xs">{t('media_detail.popularity')}</span>
                                                    </div>
                                                )}
                                                {/* Source - anime only */}
                                                {item.media_type === 'anime' && fullDetails && 'source' in fullDetails && fullDetails.source && (
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-blue-400" />
                                                        <span className="text-white font-semibold">{fullDetails.source}</span>
                                                        <span className="text-gray-500 text-xs">{t('media_detail.source')}</span>
                                                    </div>
                                                )}
                                                {/* Season - anime only */}
                                                {item.media_type === 'anime' && fullDetails && 'season' in fullDetails && 'year' in fullDetails && fullDetails.season && fullDetails.year && (
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={14} className="text-green-400" />
                                                        <span className="text-white font-semibold capitalize">{fullDetails.season} {fullDetails.year}</span>
                                                        <span className="text-gray-500 text-xs">{t('media_detail.season')}</span>
                                                    </div>
                                                )}
                                                {/* Seasons count - TV only */}
                                                {item.media_type === 'tv' && fullDetails && 'number_of_seasons' in fullDetails && fullDetails.number_of_seasons && (
                                                    <div className="flex items-center gap-2">
                                                        <Tv size={14} className="text-green-400" />
                                                        <span className="text-white font-semibold">{t('media_detail.total_seasons', { count: fullDetails.number_of_seasons })}</span>
                                                        <span className="text-gray-500 text-xs">{t('media_detail.total_eps')}</span>
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
                                            <StatusDropdown
                                                currentStatus={currentStatus}
                                                onStatusChange={handleStatusChange}
                                                userStatuses={userStatuses}
                                            />

                                            {/* Move to List Dropdown */}
                                            <ListDropdown
                                                currentListId={currentListId}
                                                userLists={userLists}
                                                onListChange={handleListChange}
                                            />

                                            {/* Synopsis */}
                                            {((item.media_type === 'anime' && fullDetails && 'synopsis' in fullDetails && fullDetails.synopsis) ||
                                                (item.media_type === 'tv' && fullDetails && 'overview' in fullDetails && fullDetails.overview)) && (
                                                    <div className="space-y-2">
                                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('media_detail.synopsis')}</h3>
                                                        <p className="text-gray-300 text-xs leading-relaxed">
                                                            {item.media_type === 'anime' && 'synopsis' in fullDetails ? fullDetails.synopsis : 'overview' in fullDetails ? fullDetails.overview : ''}
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
                                                    {t('media_detail.remove_from_list')}
                                                </button>
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-center text-yellow-400 text-sm flex items-center justify-center gap-2">
                                                        <AlertTriangle size={16} />
                                                        {t('media_detail.are_you_sure')}
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleRemove}
                                                            className="flex-1 py-2 rounded-lg font-bold text-sm bg-red-600 hover:bg-red-500 text-white cursor-pointer"
                                                        >
                                                            {t('media_detail.confirm_remove')}
                                                        </button>
                                                        <button
                                                            onClick={() => setShowRemoveConfirm(false)}
                                                            className="flex-1 py-2 rounded-lg font-bold text-sm bg-gray-700 hover:bg-gray-600 text-white cursor-pointer"
                                                        >
                                                            {t('media_detail.cancel')}
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
                                                {t('episode_list.title')}
                                                <span className="text-gray-500 dark:text-gray-400 font-normal text-sm ml-2">
                                                    {t('episode_list.watched_count', { watched: watchedCount, total: totalEpisodes })}
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
                                                                .filter(ep => ep.number <= maxWatched && !watchedEpisodes.has(ep.number))
                                                                .map(ep => ep.number);

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
                                                                tmdb_id: item.tmdb_id,
                                                                episode_number: ep
                                                            }));
                                                            await supabase.from('watched_episodes').insert(insertData);

                                                            // Update count
                                                            await supabase.from('watchlist').update({ watched_episodes: newWatched.size }).eq('id', item.id);
                                                            onEpisodeUpdate(item.id, newWatched.size);
                                                        }}
                                                        disabled={watchedEpisodes.size === 0}
                                                        className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-purple-500/20 hover:bg-purple-500/30 text-purple-600 dark:text-purple-300 border border-purple-500/30 hover:border-purple-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        <ChevronDown size={14} className="rotate-90" />
                                                        {t('episode_list.fill_gaps')}
                                                    </button>

                                                    {/* Check All Button */}
                                                    <button
                                                        onClick={async () => {
                                                            if (!item || !userId) return;

                                                            // Find all unchecked episodes
                                                            const episodesToAdd = episodes
                                                                .filter(ep => !watchedEpisodes.has(ep.number))
                                                                .map(ep => ep.number);

                                                            if (episodesToAdd.length === 0) return;

                                                            // Update local state - all episodes watched
                                                            const newWatched = new Set(episodes.map(ep => ep.number));
                                                            setWatchedEpisodes(newWatched);

                                                            // Batch insert to database
                                                            const insertData = episodesToAdd.map(ep => ({
                                                                user_id: userId,
                                                                watchlist_id: item.id,
                                                                mal_id: item.mal_id,
                                                                tmdb_id: item.tmdb_id,
                                                                episode_number: ep
                                                            }));
                                                            await supabase.from('watched_episodes').insert(insertData);

                                                            // Update count
                                                            await supabase.from('watchlist').update({ watched_episodes: newWatched.size }).eq('id', item.id);
                                                            onEpisodeUpdate(item.id, newWatched.size);
                                                        }}
                                                        disabled={watchedEpisodes.size === episodes.length}
                                                        className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-green-500/20 hover:bg-green-500/30 text-green-600 dark:text-green-300 border border-green-500/30 hover:border-green-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        <Check size={14} />
                                                        {t('episode_list.check_all')}
                                                    </button>

                                                    {/* Uncheck All Button */}
                                                    <button
                                                        onClick={async () => {
                                                            if (!item || !userId) return;
                                                            if (watchedEpisodes.size === 0) return;

                                                            // Clear local state
                                                            setWatchedEpisodes(new Set());

                                                            // Delete all from database
                                                            await supabase.from('watched_episodes').delete().eq('watchlist_id', item.id);

                                                            // Update count
                                                            await supabase.from('watchlist').update({ watched_episodes: 0 }).eq('id', item.id);
                                                            onEpisodeUpdate(item.id, 0);
                                                        }}
                                                        disabled={watchedEpisodes.size === 0}
                                                        className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-300 border border-red-500/30 hover:border-red-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        <X size={14} />
                                                        {t('episode_list.mark_all_unwatched')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Episode List */}
                                        <div className="flex-1 overflow-y-auto space-y-2">
                                            {loadingEpisodes ? (
                                                <div className="flex items-center justify-center py-20">
                                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                                    <span className="ml-3 text-gray-500 dark:text-gray-400">{t('episode_list.loading')}</span>
                                                </div>
                                            ) : episodes.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                                    <Tv size={48} className="mb-4 opacity-50" />
                                                    <p>{t('episode_list.no_episodes')}</p>
                                                    <p className="text-sm mt-1">
                                                        {item?.media_type === 'tv'
                                                            ? 'This show may not have episode info yet'
                                                            : 'This anime may not have episode info in the database'}
                                                    </p>
                                                </div>
                                            ) : (
                                                episodes.map((episode) => (
                                                    <div
                                                        id={`episode-${episode.number}`}
                                                        key={episode.number}
                                                        className={`rounded-lg border transition-all ${watchedEpisodes.has(episode.number)
                                                            ? "bg-blue-500/10 border-blue-500/30"
                                                            : "bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600"
                                                            }`}
                                                    >
                                                        <div className="flex items-center p-3 gap-3">
                                                            {/* Checkbox */}
                                                            <button
                                                                onClick={() => toggleEpisodeWatched(episode.number)}
                                                                className={`w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-all ${watchedEpisodes.has(episode.number)
                                                                    ? "bg-blue-500 text-white"
                                                                    : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-transparent hover:text-gray-400"
                                                                    }`}
                                                            >
                                                                <Check size={14} />
                                                            </button>

                                                            {/* Episode Number */}
                                                            <span className="text-gray-500 dark:text-gray-400 text-sm font-mono w-10">
                                                                {episode.number}
                                                            </span>

                                                            {/* Episode Title - Clickable */}
                                                            <button
                                                                onClick={() => toggleEpisodeExpand(episode.number)}
                                                                className="flex-1 text-left text-gray-800 dark:text-white text-sm hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-2"
                                                            >
                                                                <span className={watchedEpisodes.has(episode.number) ? "line-through opacity-60" : ""}>
                                                                    {episode.title}
                                                                </span>
                                                                {expandedEpisode === episode.number ? (
                                                                    <ChevronUp size={14} className="text-gray-400 dark:text-gray-500" />
                                                                ) : (
                                                                    <ChevronDown size={14} className="text-gray-400 dark:text-gray-500" />
                                                                )}
                                                            </button>

                                                            {/* Badges */}
                                                            <div className="flex gap-1">
                                                                {episode.filler && (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-500/20 text-orange-600 dark:text-orange-400">
                                                                        Filler
                                                                    </span>
                                                                )}
                                                                {episode.recap && (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-600 dark:text-purple-400">
                                                                        Recap
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Expanded Synopsis */}
                                                        <AnimatePresence>
                                                            {expandedEpisode === episode.number && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: "auto", opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="px-4 pb-3 pt-1 border-t border-gray-200 dark:border-gray-700/50">
                                                                        {loadingSynopsis === episode.number ? (
                                                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                                                                                <Loader2 size={14} className="animate-spin" />
                                                                                {t('profile.loading')}
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">
                                                                                {episodeSynopsis[episode.number] || t('media_detail.no_synopsis')}
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

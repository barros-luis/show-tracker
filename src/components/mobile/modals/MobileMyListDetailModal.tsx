/**
* Mobile My List Detail Modal
* 
* Mobile-optimized modal with full feature set:
* - Episode tracking (list view)
* - Synopsis viewing
* - Progress management
* - Status updates
*/
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, AlertTriangle, ChevronDown, Check, LayoutGrid, Eye, EyeOff, Tv, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getAllTVEpisodes, searchTVShows, getTVDetails, getTVSeasonEpisodes } from "../../../api/tmdb";
import { getAllAnimeEpisodes, getEpisodeDetails } from "../../../api/jikan";
import { getListIcon } from "../../../utils/constants";
import { SupabaseClient } from "@supabase/supabase-js";

// Status options
const STATUS_OPTIONS = [
    { value: "PLANNED", label: "Planned", color: "bg-yellow-500/20 text-yellow-400" },
    { value: "WATCHING", label: "Watching", color: "bg-green-500/20 text-green-400" },
    { value: "ON_HOLD", label: "On Hold", color: "bg-orange-500/20 text-orange-400" },
    { value: "FINISHED", label: "Finished", color: "bg-blue-500/20 text-blue-400" },
    { value: "REWATCHING", label: "Re-watching", color: "bg-pink-500/20 text-pink-400" },
] as const;

interface UnifiedEpisode {
    id: number;
    number: number;
    title: string;
    synopsis?: string | null;
    season?: number;
}

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

interface MobileMyListDetailModalProps {
    item: WatchlistItem | null;
    isOpen: boolean;
    onClose: () => void;
    onRemove: (item: WatchlistItem) => void;
    onEpisodeUpdate: (itemId: number, watchedCount: number) => void;
    onTotalEpisodesUpdate: (itemId: number, totalEpisodes: number) => void;
    onStatusUpdate: (itemId: number, status: string) => void;
    onListChange: (itemId: number, listId: number | null) => void;
    userLists: any[];
    supabase: SupabaseClient;
    userId: string | null;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function MobileMyListDetailModal({
    item,
    isOpen,
    onClose,
    onRemove,
    onEpisodeUpdate,
    onTotalEpisodesUpdate,
    onStatusUpdate,
    onListChange,
    userLists,
    supabase,
    userId,
    showToast
}: MobileMyListDetailModalProps) {
    const { t } = useTranslation();
    const [episodes, setEpisodes] = useState<UnifiedEpisode[]>([]);
    const [watchedEpisodes, setWatchedEpisodes] = useState<Set<number>>(new Set());
    const [loadingEpisodes, setLoadingEpisodes] = useState(false);
    const [expandedEpisode, setExpandedEpisode] = useState<number | null>(null);
    const [episodeSynopsis, setEpisodeSynopsis] = useState<Record<number, string>>({});

    // UI States
    const [currentStatus, setCurrentStatus] = useState<string>("PLANNED");
    const [currentListId, setCurrentListId] = useState<number | null>(null);
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [showListPicker, setShowListPicker] = useState(false);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'episodes'>('episodes');

    // Sync state when item changes
    useEffect(() => {
        if (item) {
            setCurrentStatus(item.status || "PLANNED");
            setCurrentListId(item.list_id);
            setShowRemoveConfirm(false);
            setShowStatusPicker(false);
            setActiveTab('episodes');
            fetchEpisodeData();
            fetchWatchedData();
        } else {
            setEpisodes([]);
            setWatchedEpisodes(new Set());
        }
    }, [item, isOpen]);

    // Prevent body scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    // Realtime subscription for watched episodes
    useEffect(() => {
        if (!item?.id) return;

        const channel = supabase
            .channel(`watched_episodes_${item.id}`)
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
                            // payload.old might only contain id if replica identity is default, but we need episode_number.
                            // If we can't get episode_number from DELETE payload easily without full replica identity, 
                            // we might have to rely on the fact that we usually delete by episode_number. 
                            // However, standard delete payload only has PK. 
                            // Actually, let's check payload structure. Usually requires Replica Identity FULL to get all columns on delete.
                            // For now, let's assume we can re-fetch or use logic. 
                            // Safest bet without changing DB config is to just re-fetch watched status on ANY change event for this item.
                            return next;
                        });
                        // Triggers refetch to be safe/lazy
                        fetchWatchedData();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [item?.id]);

    const fetchWatchedData = async () => {
        if (!item || !userId) return;
        const { data } = await supabase
            .from('watched_episodes')
            .select('episode_number')
            .eq('watchlist_id', item.id);

        if (data) {
            setWatchedEpisodes(new Set(data.map(d => d.episode_number)));
        }
    };

    const fetchEpisodeData = async () => {
        if (!item) return;
        setLoadingEpisodes(true);

        const cacheKey = `episodes_${item.media_type}_${item.media_type === 'anime' ? item.mal_id : item.tmdb_id}`;

        // 1. Try Cache First
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                const isStale = Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000; // 7 days

                if (data && data.length > 0) {
                    setEpisodes(data);
                    // If not stale, we can stop loading early!
                    if (!isStale) {
                        setLoadingEpisodes(false);
                        // Still fetch watched data though
                        await fetchWatchedData();
                        return;
                    }
                }
            }
        } catch (e) {
            console.error("Cache read error", e);
        }

        try {
            let unifiedEps: UnifiedEpisode[] = [];

            if (item.media_type === 'anime' && item.mal_id) {
                // Fetch Anime Episodes
                const eps = await getAllAnimeEpisodes(item.mal_id);
                unifiedEps = eps.map(ep => ({
                    id: ep.mal_id,
                    number: ep.mal_id,
                    title: ep.title,
                    synopsis: ep.synopsis,
                }));

                // TMDB Fallback logic for missing anime episodes (Ported from Desktop)
                if (eps.length > 0) {
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
                                        // Avoid duplicates
                                        if (!unifiedEps.find(e => e.number === nextNum)) {
                                            unifiedEps.push({
                                                id: ep.id,
                                                number: nextNum++,
                                                title: `S${ep.season_number}E${ep.episode_number}: ${ep.name}`,
                                                synopsis: ep.overview,
                                                season: ep.season_number,
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

                // Update total count
                if (unifiedEps.length > (item.total_episodes || 0)) {
                    await supabase.from('watchlist').update({ total_episodes: unifiedEps.length }).eq('id', item.id);
                    onTotalEpisodesUpdate(item.id, unifiedEps.length);
                }

            } else if (item.media_type === 'tv' && item.tmdb_id) {
                // Fetch TV Episodes
                const eps = await getAllTVEpisodes(item.tmdb_id);
                unifiedEps = eps.map((ep, idx) => ({
                    id: ep.id,
                    number: idx + 1,
                    title: `S${ep.season_number}E${ep.episode_number}: ${ep.name}`,
                    synopsis: ep.overview,
                    season: ep.season_number,
                }));
                setEpisodes(unifiedEps);

                if (eps.length > (item.total_episodes || 0)) {
                    await supabase.from('watchlist').update({ total_episodes: eps.length }).eq('id', item.id);
                    onTotalEpisodesUpdate(item.id, eps.length);
                }
            } else if (item.media_type === 'movie') {
                unifiedEps = [{ id: 1, number: 1, title: item.title, synopsis: "Movie" }];
                setEpisodes(unifiedEps);
            }

            // Save to Cache
            if (unifiedEps.length > 0) {
                try {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        data: unifiedEps,
                        timestamp: Date.now()
                    }));
                } catch (e) {
                    console.error("Cache write error", e);
                }
            }

        } catch (err) {
            console.error("Failed to fetch episodes", err);
        } finally {
            await fetchWatchedData(); // Ensure this always runs
            setLoadingEpisodes(false);
        }
    };

    const toggleEpisodeWatched = async (episodeNumber: number) => {
        if (!item || !userId) return;
        const isWatched = watchedEpisodes.has(episodeNumber);
        const newWatched = new Set(watchedEpisodes);

        if (isWatched) newWatched.delete(episodeNumber);
        else newWatched.add(episodeNumber);

        setWatchedEpisodes(newWatched);

        // DB Update
        if (isWatched) {
            await supabase.from('watched_episodes').delete().eq('watchlist_id', item.id).eq('episode_number', episodeNumber);
        } else {
            await supabase.from('watched_episodes').insert({
                user_id: userId,
                watchlist_id: item.id,
                mal_id: item.mal_id,
                tmdb_id: item.tmdb_id,
                episode_number: episodeNumber
            });
        }

        const newCount = newWatched.size;
        await supabase.from('watchlist').update({ watched_episodes: newCount }).eq('id', item.id);
        onEpisodeUpdate(item.id, newCount);
    };

    const toggleEpisodeExpand = async (episodeNumber: number) => {
        if (expandedEpisode === episodeNumber) {
            setExpandedEpisode(null);
            return;
        }
        setExpandedEpisode(episodeNumber);

        // Fetch synopsis if missing (Anime only usually)
        if (!episodeSynopsis[episodeNumber] && item?.media_type === 'anime' && item.mal_id) {
            const details = await getEpisodeDetails(item.mal_id, episodeNumber);
            if (details?.synopsis) {
                setEpisodeSynopsis(prev => ({ ...prev, [episodeNumber]: details.synopsis! }));
            }
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!item) return;
        setCurrentStatus(newStatus);
        setShowStatusPicker(false);
        await supabase.from('watchlist').update({ status: newStatus }).eq('id', item.id);
        onStatusUpdate(item.id, newStatus);
    };

    const handleListChange = async (listId: number | null) => {
        if (!item) return;
        setCurrentListId(listId);
        setShowListPicker(false);
        await supabase.from('watchlist').update({ list_id: listId }).eq('id', item.id);
        onListChange(item.id, listId);
    };

    const handleRemove = () => {
        if (item) {
            onRemove(item);
            onClose();
        }
    };

    // Handle drag end - only from drag bar
    const handleDragEnd = (_e: any, info: any) => {
        if (info.offset.y > 80 || info.velocity.y > 300) {
            onClose();
        }
    };

    const watchedCount = watchedEpisodes.size;
    const totalCount = Math.max(episodes.length, item?.total_episodes || 0);
    const progressPercent = totalCount > 0 ? (watchedCount / totalCount) * 100 : 0;

    // Auto-scroll to first unwatched episode with retry strategy
    useEffect(() => {
        if (!loadingEpisodes && episodes.length > 0 && watchedEpisodes.size > 0 && isOpen) {
            // Find highest watched episode number
            const maxWatched = Math.max(...Array.from(watchedEpisodes));
            // Target first unwatched (next one)
            const targetEp = maxWatched + 1;

            const attemptScroll = (attempt: number) => {
                const element = document.getElementById(`mobile-episode-${targetEp}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    // If target not found (e.g. caught up), try maxWatched
                    const lastWatchedElement = document.getElementById(`mobile-episode-${maxWatched}`);
                    if (lastWatchedElement) {
                        lastWatchedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else if (attempt < 8) {
                        // Retry with increasing backoff (up to ~3.5s total)
                        const delay = [100, 200, 300, 500, 800, 1000, 1500, 2000][attempt];
                        setTimeout(() => attemptScroll(attempt + 1), delay);
                    }
                }
            };

            // Start attempts
            setTimeout(() => attemptScroll(0), 100);
        }
    }, [loadingEpisodes, episodes.length, item?.id, watchedEpisodes, isOpen]);

    return (
        <AnimatePresence>
            {isOpen && item && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px]"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 400 }} // Faster, snappier
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.5 }} // Less resistance (was 0.2)
                        onDragEnd={handleDragEnd}
                        className="fixed inset-x-0 bottom-0 z-50 h-[85vh] bg-gray-900 rounded-t-3xl overflow-hidden flex flex-col border-t border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
                    >
                        {/* Drag Handle */}
                        <div className="flex justify-center pt-4 pb-2 flex-shrink-0 bg-gray-900 z-10 cursor-grab active:cursor-grabbing">
                            <div className="w-12 h-1.5 bg-gray-700 rounded-full" />
                        </div>

                        {/* Top Controls Removed (X button) */}

                        {/* Header Content */}
                        <div className="px-5 pb-4 flex gap-4 flex-shrink-0 relative">
                            <img
                                src={item.image_url}
                                alt={item.title}
                                className="w-24 h-36 object-cover rounded-xl shadow-lg flex-shrink-0 border border-gray-800"
                            />
                            <div className="flex-1 min-w-0 pt-1">
                                <h2 className="text-xl font-bold text-white mb-2 line-clamp-2 leading-tight">
                                    {item.title}
                                </h2>

                                <div className="flex flex-wrap gap-2 mb-3">
                                    {/* Status Pill */}
                                    <button
                                        onClick={() => { setShowStatusPicker(!showStatusPicker); setShowListPicker(false); }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide border ${STATUS_OPTIONS.find(s => s.value === currentStatus)?.color
                                            } bg-opacity-10 border-opacity-20`}
                                    >
                                        {t(`status.${currentStatus.toLowerCase()}`)}
                                        <ChevronDown size={12} />
                                    </button>

                                    {/* List Pill */}
                                    <button
                                        onClick={() => { setShowListPicker(!showListPicker); setShowStatusPicker(false); }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide border border-gray-700 bg-gray-800 text-gray-300"
                                    >
                                        {(() => {
                                            const currentList = userLists.find(l => l.id === currentListId);
                                            return (
                                                <>
                                                    {getListIcon(currentList?.icon || 'folder', 12)}
                                                    <span className="truncate max-w-[80px]">{currentList?.name || t('list.uncategorized')}</span>
                                                </>
                                            )
                                        })()}
                                        <ChevronDown size={12} />
                                    </button>
                                </div>

                                {/* Progress Text */}
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Tv size={14} className="text-blue-400" />
                                    <span className="text-white font-bold">{watchedCount}</span>
                                    <span>/</span>
                                    <span>{totalCount || '?'}</span>
                                    <span>{t('episode_list.episodes')}</span>
                                </div>
                            </div>

                            <AnimatePresence>
                                {showStatusPicker && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        className="absolute top-14 left-0 right-0 mx-5 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-30 overflow-hidden"
                                    >
                                        {STATUS_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => handleStatusChange(opt.value)}
                                                className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 border-b border-gray-700/50 last:border-0 ${currentStatus === opt.value ? "bg-blue-500/10 text-blue-400" : "text-gray-300 active:bg-gray-700"
                                                    }`}
                                            >
                                                {currentStatus === opt.value && <Check size={14} />}
                                                <span className={currentStatus !== opt.value ? "ml-6" : ""}>{t(`status.${opt.value.toLowerCase()}`)}</span>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}

                                {showListPicker && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        className="absolute top-14 left-0 right-0 mx-5 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-30 overflow-hidden max-h-60 overflow-y-auto"
                                    >
                                        {/* Uncategorized Option */}
                                        <button
                                            onClick={() => handleListChange(null)}
                                            className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 border-b border-gray-700/50 ${currentListId === null ? "bg-blue-500/10 text-blue-400" : "text-gray-300 active:bg-gray-700"}`}
                                        >
                                            {currentListId === null && <Check size={14} />}
                                            <span className={currentListId !== null ? "ml-6 flex items-center gap-2" : "flex items-center gap-2"}>
                                                {getListIcon('folder', 14)} {t('list.uncategorized')}
                                            </span>
                                        </button>

                                        {userLists.map(list => (
                                            <button
                                                key={list.id}
                                                onClick={() => handleListChange(list.id)}
                                                className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 border-b border-gray-700/50 last:border-0 ${currentListId === list.id ? "bg-blue-500/10 text-blue-400" : "text-gray-300 active:bg-gray-700"}`}
                                            >
                                                {currentListId === list.id && <Check size={14} />}
                                                <span className={currentListId !== list.id ? "ml-6 flex items-center gap-2" : "flex items-center gap-2"}>
                                                    {getListIcon(list.icon, 14)} {list.name}
                                                </span>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Progress Bar */}
                        <div className="px-5 mb-4 flex-shrink-0">
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>

                        {/* Tabs / Filter (Simplified) */}
                        <div className="px-5 border-b border-gray-800 flex gap-6 text-sm font-medium mb-0 flex-shrink-0">
                            <button
                                onClick={() => setActiveTab('episodes')}
                                className={`pb-3 border-b-2 transition-colors ${activeTab === 'episodes' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400'
                                    }`}
                            >
                                {t('episode_list.title')}
                            </button>
                            <button
                                onClick={() => setActiveTab('info')}
                                className={`pb-3 border-b-2 transition-colors ${activeTab === 'info' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400'
                                    }`}
                            >
                                {t('episode_list.info_actions')}
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto min-h-0 bg-gray-900/50">
                            {activeTab === 'episodes' ? (
                                <div className="p-4 space-y-2">
                                    {loadingEpisodes ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
                                            <Loader2 className="w-8 h-8 mb-2 animate-spin" />
                                            <p>{t('episode_list.loading')}</p>
                                        </div>
                                    ) : episodes.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
                                            <p>{t('episode_list.no_episodes')}</p>
                                        </div>
                                    ) : (
                                        episodes.map(ep => {
                                            const isWatched = watchedEpisodes.has(ep.number);
                                            const isExpanded = expandedEpisode === ep.number;

                                            return (
                                                <div
                                                    id={`mobile-episode-${ep.number}`}
                                                    key={ep.number}
                                                    className={`rounded-xl border transition-all ${isWatched
                                                        ? "bg-blue-500/5 border-blue-500/20"
                                                        : "bg-gray-800/30 border-gray-800"
                                                        }`}
                                                >
                                                    <div className="flex items-center p-3 gap-3">
                                                        {/* Watched Toggle (Left) */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleEpisodeWatched(ep.number);
                                                            }}
                                                            className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all flex-shrink-0 ${isWatched
                                                                ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20"
                                                                : "bg-gray-800 text-gray-500 border-gray-700 hover:border-gray-500"
                                                                }`}
                                                        >
                                                            {isWatched ? <Check size={18} /> : <span>{ep.number}</span>}
                                                        </button>

                                                        {/* Title & Info */}
                                                        <div
                                                            className="flex-1 min-w-0 pointer-events-auto"
                                                            onClick={() => toggleEpisodeExpand(ep.number)}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <p className={`text-sm font-medium truncate ${isWatched ? "text-blue-100" : "text-gray-200"}`}>
                                                                    {ep.title}
                                                                </p>
                                                            </div>
                                                            {ep.season && (
                                                                <p className="text-xs text-gray-500">{t('episode_list.season', { season: ep.season })}</p>
                                                            )}
                                                        </div>

                                                        {/* Expand Arrow */}
                                                        <button
                                                            onClick={() => toggleEpisodeExpand(ep.number)}
                                                            className="text-gray-500 p-2"
                                                        >
                                                            <ChevronDown size={16} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                                        </button>
                                                    </div>

                                                    {/* Expanded Synopsis */}
                                                    <AnimatePresence>
                                                        {isExpanded && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: "auto", opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="p-3 pt-0 text-xs text-gray-400 border-t border-gray-700/50 mx-3 mt-1 pb-3 leading-relaxed">
                                                                    {episodeSynopsis[ep.number] || ep.synopsis || t('episode_list.no_synopsis')}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            ) : (
                                <div className="p-4 space-y-4">
                                    {/* Bulk Actions */}
                                    <div className="bg-gray-800/50 rounded-xl p-4">
                                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                            <LayoutGrid size={16} className="text-blue-500" />
                                            {t('episode_list.bulk_actions')}
                                        </h3>

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

                                                showToast(t('episode_list.filled_success', { count: episodesToAdd.length }), 'success');
                                            }}
                                            disabled={watchedEpisodes.size === 0}
                                            className="w-full mb-3 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronDown size={18} className="rotate-90" />
                                            {t('episode_list.fill_gaps_latest')}
                                        </button>

                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={async () => {
                                                    // Check All
                                                    const allIds = episodes.map(e => e.number);
                                                    const missing = allIds.filter(id => !watchedEpisodes.has(id));
                                                    if (missing.length === 0) return;

                                                    setWatchedEpisodes(new Set(allIds));

                                                    const inserts = missing.map(n => ({
                                                        user_id: userId,
                                                        watchlist_id: item.id,
                                                        mal_id: item.mal_id,
                                                        tmdb_id: item.tmdb_id,
                                                        episode_number: n
                                                    }));
                                                    await supabase.from('watched_episodes').insert(inserts);
                                                    await supabase.from('watchlist').update({ watched_episodes: allIds.length }).eq('id', item.id);
                                                    onEpisodeUpdate(item.id, allIds.length);
                                                }}
                                                className="flex flex-col items-center justify-center p-3 bg-gray-700 rounded-lg text-white"
                                            >
                                                <Eye size={20} className="mb-1 text-blue-400" />
                                                <span className="text-xs">{t('episode_list.mark_all_watched')}</span>
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    // Uncheck All
                                                    setWatchedEpisodes(new Set());
                                                    await supabase.from('watched_episodes').delete().eq('watchlist_id', item.id);
                                                    await supabase.from('watchlist').update({ watched_episodes: 0 }).eq('id', item.id);
                                                    onEpisodeUpdate(item.id, 0);
                                                }}
                                                className="flex flex-col items-center justify-center p-3 bg-gray-700 rounded-lg text-white"
                                            >
                                                <EyeOff size={20} className="mb-1 text-gray-400" />
                                                <span className="text-xs">{t('episode_list.mark_all_unwatched')}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Danger Zone */}
                                    <div className="bg-red-900/10 rounded-xl p-4 border border-red-500/20">
                                        <h3 className="text-sm font-bold text-red-200 mb-3 flex items-center gap-2">
                                            <AlertTriangle size={16} />
                                            {t('media_detail.danger_zone')}
                                        </h3>
                                        {!showRemoveConfirm ? (
                                            <button
                                                onClick={() => setShowRemoveConfirm(true)}
                                                className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 active:bg-red-500/20"
                                            >
                                                <Trash2 size={18} />
                                                {t('media_detail.remove_from_list')}
                                            </button>
                                        ) : (
                                            <div className="space-y-3">
                                                <p className="text-center text-red-300 text-sm flex items-center justify-center gap-2">
                                                    <AlertTriangle size={16} />
                                                    {t('media_detail.are_you_sure')}
                                                </p>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => setShowRemoveConfirm(false)}
                                                        className="flex-1 py-3 rounded-lg bg-gray-700 text-white font-medium"
                                                    >
                                                        {t('media_detail.cancel')}
                                                    </button>
                                                    <button
                                                        onClick={handleRemove}
                                                        className="flex-1 py-3 rounded-lg bg-red-600 text-white font-medium"
                                                    >
                                                        {t('media_detail.delete')}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

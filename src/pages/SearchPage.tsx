import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Film, Tv, Sparkles, X, ChevronDown, Filter } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { searchAnimeViaTMDB, searchAnimeViaJikan, findMalIdForTMDBAnime } from "../api/animeService";
import { searchMovies, searchTVShows, getTVDetails } from "../api/tmdb";
import { type MediaItem, animeToMediaItem, movieToMediaItem, tvToMediaItem, tmdbAnimeToMediaItem } from "../api/mediaTypes";
import { calculateRelevanceScore } from "../utils/searchUtils";
import { MediaCard } from "../components/cards/MediaCard";
import { ShowDetailModal } from "../components/modals/ShowDetailModalWrapper";
import { ListPickerModal } from "../components/modals/ListPickerModal";
import { useAuthContext } from "../context/AuthContext";
import type { UserList } from "../types";
import { RecommendationService, RecommendationResults } from "../services/RecommendationService";
import { RecommendationRow } from "../components/recommendations/RecommendationRow";

export function SearchPage() {
    const {
        session,
        supabase,
        userLists,
        userStatuses,
        showToast,
        myList, // Get watchlist for recommendations
        watchlistLoading
    } = useAuthContext();
    const { t, i18n } = useTranslation();

    // Search state
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchMediaTypeFilter, setSearchMediaTypeFilter] = useState<Set<string>>(new Set());

    // Recommendations state
    const [recommendations, setRecommendations] = useState<RecommendationResults | null>(null);
    const [recsLoading, setRecsLoading] = useState(false);

    // Modal state
    const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
    const [isListPickerOpen, setListPickerOpen] = useState(false);
    const [pendingMedia, setPendingMedia] = useState<MediaItem | null>(null);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);

    // MAL fallback search state
    const [isJikanFallback, setIsJikanFallback] = useState(false);
    const [showJikanFallbackButton, setShowJikanFallbackButton] = useState(false);

    // Setup Recommendations
    useEffect(() => {
        // Only fetch if logged in, query is empty, and watchlist is loaded
        if (query.trim() === "" && session && !watchlistLoading) {
            const fetchRecs = async () => {
                setRecsLoading(true);
                try {
                    const recs = await RecommendationService.getRecommendations(myList);
                    setRecommendations(recs);
                } catch (err) {
                    console.error("Failed to load recommendations", err);
                } finally {
                    setRecsLoading(false);
                }
            };
            fetchRecs();
        }
    }, [query, session, watchlistLoading]); // Depends on myList but handled by watchlistLoading check implicitly + simple equality check might fail if array ref changes often


    // Search effect with debounce - TMDB-first approach
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length >= 3) {
                setLoading(true);
                setShowJikanFallbackButton(false);
                try {
                    const savedSettings = localStorage.getItem('app_settings');
                    const adultContent = savedSettings ? JSON.parse(savedSettings).adultContent ?? false : false;

                    // Map app language to TMDB language
                    const tmdbLang = i18n.language.startsWith('pt') ? 'pt-PT' : 'en-US';

                    let animeItems: MediaItem[] = [];
                    let movieItems: MediaItem[] = [];
                    let tvItems: MediaItem[] = [];

                    if (isJikanFallback) {
                        // Jikan fallback mode - only search anime via Jikan
                        const animeData = await searchAnimeViaJikan(query, !adultContent);
                        animeItems = animeData.map(animeToMediaItem);
                    } else {
                        // TMDB-first mode (default)
                        const [animeData, movieData, tvData] = await Promise.all([
                            searchAnimeViaTMDB(query, adultContent, tmdbLang),
                            searchMovies(query, adultContent, tmdbLang),
                            searchTVShows(query, adultContent, tmdbLang),
                        ]);

                        // Convert TMDB anime results to MediaItem with type 'anime'
                        animeItems = animeData.map(tmdbAnimeToMediaItem);
                        movieItems = movieData.map(movieToMediaItem);

                        // Filter out Japanese animation from TV results (they're in animeItems now)
                        tvItems = tvData
                            .filter(tv => !(tv.genre_ids?.includes(16) && tv.origin_country?.includes('JP')))
                            .map(tvToMediaItem);
                    }

                    const allItems = [...animeItems, ...movieItems, ...tvItems];

                    // Sort by Relevance and then Popularity
                    const sorted = allItems
                        .filter(item => item.imageUrl)
                        .sort((a, b) => {
                            const relevanceA = calculateRelevanceScore(a.title, query);
                            const relevanceB = calculateRelevanceScore(b.title, query);

                            if (relevanceA !== relevanceB) {
                                return relevanceB - relevanceA; // Higher relevance first
                            }
                            return (b.popularity || 0) - (a.popularity || 0); // Then higher popularity
                        });

                    // Deduplicate by normalized title (mainly for edge cases)
                    const normalizeTitle = (title: string): string => {
                        return title
                            .toLowerCase()
                            .replace(/[^a-z0-9\s]/g, '')
                            .replace(/\s+/g, ' ')
                            .trim();
                    };

                    const seenTitles = new Set<string>();
                    const dedupedResults = sorted.filter(item => {
                        const normTitle = normalizeTitle(item.title);
                        if (seenTitles.has(normTitle)) return false;
                        seenTitles.add(normTitle);
                        return true;
                    });

                    setResults(dedupedResults);

                    // Show MAL fallback button if no results and not already in fallback mode
                    if (dedupedResults.length === 0 && !isJikanFallback) {
                        setShowJikanFallbackButton(true);
                    }
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
                setShowJikanFallbackButton(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [query, i18n.language, isJikanFallback]);

    // Close filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
                setShowFilterDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Add to watchlist
    async function addToWatchlist(media: MediaItem, listId: number | null = null, status: string = 'PLANNED') {
        if (!session?.user) return;

        // Check for duplicates
        let existing;
        if (media.type === 'anime') {
            const { data } = await supabase
                .from('watchlist')
                .select('id')
                .eq('user_id', session.user.id)
                .eq('mal_id', media.sourceId)
                .maybeSingle();
            existing = data;
        } else {
            const { data } = await supabase
                .from('watchlist')
                .select('id')
                .eq('user_id', session.user.id)
                .eq('tmdb_id', media.sourceId)
                .maybeSingle();
            existing = data;
        }

        if (existing) {
            showToast(t('list.duplicate_warning', { defaultValue: "You already added this to your list! 😅" }), "info");
            return;
        }

        const insertData: any = {
            user_id: session.user.id,
            title: media.title,
            image_url: media.largeImageUrl,
            score: media.score,
            total_episodes: media.episodes || (media.type === 'movie' ? 1 : 0),
            media_type: media.type,
            list_id: listId,
            status: status
        };

        if (media.type === 'anime') {
            // Check if this anime came from TMDB search (originalData has 'id' not 'mal_id')
            const isTMDBAnime = 'id' in media.originalData && !('mal_id' in media.originalData);

            if (isTMDBAnime) {
                // Anime from TMDB search - store tmdb_id as primary
                insertData.tmdb_id = media.sourceId;

                // Fetch TV details for accurate episode/season info
                try {
                    const tvDetails = await getTVDetails(media.sourceId);
                    if (tvDetails) {
                        if (tvDetails.number_of_seasons) {
                            insertData.seasons_count = tvDetails.number_of_seasons;
                        }
                        if (tvDetails.last_episode_to_air) {
                            insertData.last_episode_season = tvDetails.last_episode_to_air.season_number;
                            insertData.last_episode_number = tvDetails.last_episode_to_air.episode_number;
                        }
                        if (tvDetails.number_of_episodes) {
                            insertData.total_episodes = tvDetails.number_of_episodes;
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch anime TV details:", err);
                }

                // Also try to find mal_id for filler/recap data (async, non-blocking for user)
                // We'll store it separately if found
                findMalIdForTMDBAnime(media.title, media.year).then(async malId => {
                    if (malId) {
                        await supabase
                            .from('watchlist')
                            .update({ mal_id: malId })
                            .eq('user_id', session.user.id)
                            .eq('tmdb_id', media.sourceId);
                    }
                }).catch(err => console.error("Failed to find MAL ID:", err));
            } else {
                // Anime from Jikan fallback search - store mal_id as primary
                insertData.mal_id = media.sourceId;
            }
        } else {
            insertData.tmdb_id = media.sourceId;

            if (media.type === 'tv') {
                try {
                    const tvDetails = await getTVDetails(media.sourceId);
                    if (tvDetails) {
                        if (tvDetails.number_of_seasons) {
                            insertData.seasons_count = tvDetails.number_of_seasons;
                        }
                        if (tvDetails.last_episode_to_air) {
                            insertData.last_episode_season = tvDetails.last_episode_to_air.season_number;
                            insertData.last_episode_number = tvDetails.last_episode_to_air.episode_number;
                        }
                        if (tvDetails.number_of_episodes) {
                            insertData.total_episodes = tvDetails.number_of_episodes;
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch TV details:", err);
                }
            }
        }

        const { error } = await supabase.from('watchlist').insert(insertData);

        if (error) {
            console.error("Save Error:", error);
            showToast(`Failed to save: ${error.message}`, "error");
        } else {
            const list = userLists.find(l => l.id === listId);
            const listName = list ? ` to ${list.name}` : '';
            const emoji = media.type === 'movie' ? '🎬' : media.type === 'tv' ? '📺' : '✅';
            // Simple toast for now, can be improved later
            showToast(t('list.added', { title: media.title }) + `${listName}! ${emoji}`, "success");
            // setQuery(""); // Don't clear query immediately if they are adding multiple items
        }
    }

    const handleAddToListClick = (media: MediaItem) => {
        if (userLists.length > 0) {
            setPendingMedia(media);
            setListPickerOpen(true);
        } else {
            addToWatchlist(media, null, 'PLANNED');
        }
        setSelectedMedia(null);
    };

    const handleListSelected = (list: UserList | null, status: string) => {
        if (pendingMedia) {
            addToWatchlist(pendingMedia, list?.id || null, status);
            setPendingMedia(null);
        }
        setListPickerOpen(false);
    };

    // Filter results by media type
    const filteredResults = searchMediaTypeFilter.size === 0
        ? results
        : results.filter(media => searchMediaTypeFilter.has(media.type));

    return (
        <>
            <ShowDetailModal
                media={selectedMedia}
                isOpen={selectedMedia !== null}
                onClose={() => setSelectedMedia(null)}
                onAddToList={handleAddToListClick}
                isLoggedIn={!!session}
            />

            <ListPickerModal
                isOpen={isListPickerOpen}
                onClose={() => { setListPickerOpen(false); setPendingMedia(null); }}
                lists={userLists}
                userStatuses={userStatuses}
                onSelectList={handleListSelected}
                mediaTitle={pendingMedia?.title || ""}
            />

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Search Input */}
                <div className="relative max-w-xl mx-auto mb-6">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-500" />
                    </div>
                    <input
                        type="text"
                        placeholder={t('search.placeholder')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full bg-white dark:bg-gray-900 rounded-full py-4 pl-12 pr-14 text-lg text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-none border-none ring-2 ring-white/5 ring-inset"
                    />

                    {/* Clear Button */}
                    {query && (
                        <button
                            onClick={() => setQuery("")}
                            className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer"
                        >
                            <X size={20} />
                        </button>
                    )}

                    {/* Loading Spinner */}
                    {loading && (
                        <div className={`absolute inset-y-0 flex items-center ${query ? "right-12" : "right-4"}`}>
                            <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                        </div>
                    )}
                </div>

                {/* Recommendations when query is empty */}
                {query.trim() === "" && (
                    <div className="mt-8">
                        {recsLoading && !recommendations ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                            </div>
                        ) : recommendations ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <RecommendationRow
                                    title={t('recommendations.anime', { defaultValue: "Anime for You" })}
                                    items={recommendations.anime}
                                    onItemClick={(m) => setSelectedMedia(m)}
                                />
                                <RecommendationRow
                                    title={t('recommendations.shows', { defaultValue: "TV Shows You Might Like" })}
                                    items={recommendations.tv}
                                    onItemClick={(m) => setSelectedMedia(m)}
                                />
                                <RecommendationRow
                                    title={t('recommendations.movies', { defaultValue: "Movie Recommendations" })}
                                    items={recommendations.movies}
                                    onItemClick={(m) => setSelectedMedia(m)}
                                />
                            </motion.div>
                        ) : null}
                    </div>
                )}

                {/* Filter Dropdown - Only show when searching */}
                {query.trim().length >= 3 && (
                    <div className="flex justify-center mb-6 sm:mb-8">
                        <div className="relative" ref={filterDropdownRef}>
                            <button
                                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                                className="h-9 px-4 rounded-full text-sm font-medium bg-white/80 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer flex items-center gap-2 border border-gray-200 dark:border-gray-700"
                            >
                                <Filter size={14} />
                                {searchMediaTypeFilter.size === 0
                                    ? t('search.all_types')
                                    : searchMediaTypeFilter.size === 3
                                        ? t('search.all_types')
                                        : `${searchMediaTypeFilter.size} ${t('search.selected')}`}
                                <ChevronDown size={14} className={`transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {showFilterDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden min-w-[180px]"
                                    >
                                        {/* All Types Option */}
                                        <button
                                            onClick={() => {
                                                setSearchMediaTypeFilter(new Set());
                                            }}
                                            className={`w-full px-4 py-2.5 text-left text-sm font-medium cursor-pointer transition-colors flex items-center gap-3 ${searchMediaTypeFilter.size === 0
                                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${searchMediaTypeFilter.size === 0 ? 'bg-blue-500' : 'bg-transparent'}`} />
                                            {t('search.all_types')}
                                        </button>

                                        <div className="h-[1px] bg-gray-200 dark:bg-gray-700" />

                                        {/* Individual Type Options */}
                                        {[
                                            { value: 'anime', label: t('media_types.anime'), icon: <Sparkles size={14} />, color: 'purple' },
                                            { value: 'movie', label: t('media_types.movie'), icon: <Film size={14} />, color: 'red' },
                                            { value: 'tv', label: t('media_types.tv'), icon: <Tv size={14} />, color: 'green' },
                                        ].map(type => {
                                            const isActive = searchMediaTypeFilter.has(type.value);
                                            return (
                                                <button
                                                    key={type.value}
                                                    onClick={() => {
                                                        const newFilters = new Set(searchMediaTypeFilter);
                                                        if (isActive) {
                                                            newFilters.delete(type.value);
                                                        } else {
                                                            newFilters.add(type.value);
                                                        }
                                                        setSearchMediaTypeFilter(newFilters);
                                                    }}
                                                    className={`w-full px-4 py-2.5 text-left text-sm font-medium cursor-pointer transition-colors flex items-center gap-3 ${isActive
                                                        ? `bg-${type.color}-500/10 text-${type.color}-600 dark:text-${type.color}-400`
                                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                        }`}
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${isActive ? `bg-${type.color}-500` : 'bg-transparent'}`} />
                                                    <span className={isActive ? `text-${type.color}-500` : 'opacity-60'}>{type.icon}</span>
                                                    {type.label}
                                                </button>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {/* Results Grid - Only show when searching */}
                {query.trim().length >= 3 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredResults.map((media) => (
                            <MediaCard key={media.id} media={media} onClick={(m) => setSelectedMedia(m)} />
                        ))}
                    </div>
                )}

                {/* No Results + MAL Fallback Button */}
                {query.trim().length >= 3 && !loading && filteredResults.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            {isJikanFallback
                                ? t('search.no_results_fallback', { defaultValue: "No anime found on MAL either." })
                                : t('search.no_results', { defaultValue: "No results found." })}
                        </p>
                        {showJikanFallbackButton && (
                            <button
                                onClick={() => {
                                    setIsJikanFallback(true);
                                }}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-2 mx-auto"
                            >
                                <Sparkles size={18} />
                                {t('search.search_on_mal', { defaultValue: "Search on MAL instead" })}
                            </button>
                        )}
                        {isJikanFallback && (
                            <button
                                onClick={() => {
                                    setIsJikanFallback(false);
                                }}
                                className="mt-4 px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline cursor-pointer"
                            >
                                {t('search.back_to_tmdb', { defaultValue: "← Back to regular search" })}
                            </button>
                        )}
                    </div>
                )}
            </motion.div>
        </>
    );
}


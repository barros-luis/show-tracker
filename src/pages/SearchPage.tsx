import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Film, Tv, Sparkles, X, ChevronDown, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchAnime } from "../api/jikan";
import { searchMovies, searchTVShows, getTVDetails } from "../api/tmdb";
import { type MediaItem, animeToMediaItem, movieToMediaItem, tvToMediaItem } from "../api/mediaTypes";
import { calculateRelevanceScore } from "../utils/searchUtils";
import { MediaCard } from "../components/cards/MediaCard";
import { ShowDetailModal } from "../components/modals/ShowDetailModalWrapper";
import { ListPickerModal } from "../components/modals/ListPickerModal";
import { useAuthContext } from "../context/AuthContext";
import type { UserList } from "../types";

export function SearchPage() {
    const {
        session,
        supabase,
        userLists,
        showToast,
    } = useAuthContext();

    // Search state
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchMediaTypeFilter, setSearchMediaTypeFilter] = useState<Set<string>>(new Set());

    // Modal state
    const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
    const [isListPickerOpen, setListPickerOpen] = useState(false);
    const [pendingMedia, setPendingMedia] = useState<MediaItem | null>(null);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);

    // Search effect with debounce
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length >= 3) {
                setLoading(true);
                try {
                    const savedSettings = localStorage.getItem('app_settings');
                    const adultContent = savedSettings ? JSON.parse(savedSettings).adultContent ?? false : false;

                    const [animeData, movieData, tvData] = await Promise.all([
                        searchAnime(query, !adultContent),
                        searchMovies(query, adultContent),
                        searchTVShows(query, adultContent),
                    ]);

                    const animeItems = animeData.map(animeToMediaItem);
                    const movieItems = movieData.map(movieToMediaItem);
                    const tvItems = tvData.map(tvToMediaItem);

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
                            return (b.popularity || 0) - (a.popularity || 0); // Then higher popularit
                        });

                    const normalizeTitle = (title: string): string => {
                        return title
                            .toLowerCase()
                            .replace(/[^a-z0-9\s]/g, '')
                            .replace(/\s+/g, ' ')
                            .trim();
                    };

                    const seenIds = new Set<string>();
                    const dedupedResults: MediaItem[] = [];

                    // First pass: Group potential duplicates by normalized title
                    const titleMap = new Map<string, MediaItem[]>();

                    for (const item of sorted) {
                        const normTitle = normalizeTitle(item.title);
                        if (!titleMap.has(normTitle)) {
                            titleMap.set(normTitle, []);
                        }
                        titleMap.get(normTitle)?.push(item);
                    }

                    const enrichmentQueue: { jikanItem: MediaItem; tmdbItem: MediaItem }[] = [];

                    // Process groups
                    titleMap.forEach((items) => {
                        const hasJikanAnime = items.some(i => i.type === 'anime');

                        items.forEach(item => {
                            if (seenIds.has(item.id)) return;

                            if (item.type === 'tv' && item.isAnime && hasJikanAnime) {
                                const jikanItem = items.find(i => i.type === 'anime');
                                if (jikanItem) {
                                    // Queue for video enrichment (requires detail fetch)
                                    enrichmentQueue.push({ jikanItem, tmdbItem: item });

                                    // Sync Enrichment: Image (available in list result)
                                    if (item.largeImageUrl) {
                                        jikanItem.imageUrl = item.imageUrl;
                                        jikanItem.largeImageUrl = item.largeImageUrl;
                                    }
                                }
                                return; // Skip adding the TMDB item to results
                            }

                            seenIds.add(item.id);
                            dedupedResults.push(item);
                        });
                    });

                    // Execute Async Enrichment
                    if (enrichmentQueue.length > 0) {
                        try {
                            await Promise.all(enrichmentQueue.map(async ({ jikanItem, tmdbItem }) => {
                                const details = await getTVDetails(tmdbItem.sourceId);

                                if (details?.videos?.results) {
                                    const videos = details.videos.results;

                                    const trailer = videos.find(v => v.site === "YouTube" && v.type === "Trailer")?.key
                                        || videos.find(v => v.site === "YouTube")?.key;

                                    if (trailer && !jikanItem.trailerUrl) {
                                        const trailerUrl = `https://www.youtube.com/watch?v=${trailer}`;
                                        jikanItem.trailerUrl = trailerUrl;
                                    }
                                }
                            }));
                        } catch (e) {
                            console.error("Enrichment failed", e);
                        }
                    }


                    const finalResults = dedupedResults.sort((a, b) => {
                        const relevanceA = calculateRelevanceScore(a.title, query);
                        const relevanceB = calculateRelevanceScore(b.title, query);

                        if (relevanceA !== relevanceB) {
                            return relevanceB - relevanceA; // Higher relevance first
                        }
                        return (b.popularity || 0) - (a.popularity || 0); // Then higher popularity
                    });

                    setResults(finalResults);
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

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
            showToast("You already added this to your list! 😅", "info");
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
            insertData.mal_id = media.sourceId;
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
            showToast(`Added ${media.title}${listName}! ${emoji}`, "success");
            setQuery("");
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
                        placeholder="Search anime, movies, or TV shows..."
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

                {/* Filter Dropdown */}
                <div className="flex justify-center mb-6 sm:mb-8">
                    <div className="relative" ref={filterDropdownRef}>
                        <button
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                            className="h-9 px-4 rounded-full text-sm font-medium bg-white/80 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer flex items-center gap-2 border border-gray-200 dark:border-gray-700"
                        >
                            <Filter size={14} />
                            {searchMediaTypeFilter.size === 0
                                ? 'All Types'
                                : searchMediaTypeFilter.size === 3
                                    ? 'All Types'
                                    : `${searchMediaTypeFilter.size} Selected`}
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
                                        All Types
                                    </button>

                                    <div className="h-[1px] bg-gray-200 dark:bg-gray-700" />

                                    {/* Individual Type Options */}
                                    {[
                                        { value: 'anime', label: 'Animes', icon: <Sparkles size={14} />, color: 'purple' },
                                        { value: 'movie', label: 'Movies', icon: <Film size={14} />, color: 'red' },
                                        { value: 'tv', label: 'Series', icon: <Tv size={14} />, color: 'green' },
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

                {/* Results Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredResults.map((media) => (
                        <MediaCard key={media.id} media={media} onClick={(m) => setSelectedMedia(m)} />
                    ))}
                </div>
            </motion.div>
        </>
    );
}

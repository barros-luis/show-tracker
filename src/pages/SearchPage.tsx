import { useState, useEffect } from "react";
import { Search, Loader2, Film, Tv, Sparkles, X } from "lucide-react";
import { motion } from "framer-motion";
import { searchAnime } from "../api/jikan";
import { searchMovies, searchTVShows, getTVDetails } from "../api/tmdb";
import { type MediaItem, animeToMediaItem, movieToMediaItem, tvToMediaItem } from "../api/mediaTypes";
import { MediaCard } from "../components/cards/MediaCard";
import { ShowDetailModal } from "../components/modals/ShowDetailModal";
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

                    const allItems = [...animeItems, ...movieItems, ...tvItems]
                        .filter(item => item.imageUrl);

                    // Deduplicate
                    const normalizeTitle = (title: string): string => {
                        return title
                            .toLowerCase()
                            .replace(/[^a-z0-9\s]/g, '')
                            .replace(/\s+/g, ' ')
                            .trim();
                    };

                    const areSameTitleDifferentSource = (item1: MediaItem, item2: MediaItem): boolean => {
                        const differentSources = (item1.type === 'anime' && item2.type !== 'anime') ||
                            (item1.type !== 'anime' && item2.type === 'anime');
                        if (!differentSources) return false;

                        const norm1 = normalizeTitle(item1.title);
                        const norm2 = normalizeTitle(item2.title);

                        if (norm1 === norm2) return true;

                        if (norm1.includes(norm2) || norm2.includes(norm1)) {
                            const lengthRatio = Math.min(norm1.length, norm2.length) / Math.max(norm1.length, norm2.length);
                            if (lengthRatio >= 0.7) return true;
                        }

                        return false;
                    };

                    const deduplicated: MediaItem[] = [];
                    for (const item of allItems) {
                        const existingIdx = deduplicated.findIndex(existing =>
                            areSameTitleDifferentSource(item, existing)
                        );

                        if (existingIdx === -1) {
                            deduplicated.push(item);
                        } else {
                            const existing = deduplicated[existingIdx];
                            if (item.type === 'anime' && existing.type !== 'anime') {
                                deduplicated[existingIdx] = item;
                            }
                        }
                    }

                    const combined = deduplicated.sort((a, b) => (b.score || 0) - (a.score || 0));
                    setResults(combined);
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

    // Add to watchlist
    async function addToWatchlist(media: MediaItem, listId: number | null = null) {
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
            addToWatchlist(media, null);
        }
        setSelectedMedia(null);
    };

    const handleListSelected = (list: UserList | null) => {
        if (pendingMedia) {
            addToWatchlist(pendingMedia, list?.id || null);
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
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full py-4 pl-12 pr-6 text-lg text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-xl"
                    />
                    {loading && (
                        <div className="absolute inset-y-0 right-4 flex items-center">
                            <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                        </div>
                    )}
                </div>

                {/* Search Filters */}
                <div className="flex justify-center gap-2 mb-8">
                    <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
                        {[
                            { value: 'anime', label: 'Animes', icon: <Sparkles size={12} />, color: 'purple' },
                            { value: 'movie', label: 'Movies', icon: <Film size={12} />, color: 'red' },
                            { value: 'tv', label: 'Series', icon: <Tv size={12} />, color: 'green' },
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
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${isActive
                                        ? `bg-${type.color}-500 text-white`
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {type.icon} {type.label}
                                </button>
                            );
                        })}
                    </div>

                    {searchMediaTypeFilter.size > 0 && (
                        <button
                            onClick={() => setSearchMediaTypeFilter(new Set())}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all cursor-pointer flex items-center gap-1"
                        >
                            <X size={12} /> Clear
                        </button>
                    )}
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

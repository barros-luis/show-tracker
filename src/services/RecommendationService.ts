import {
    type MediaItem,
    movieToMediaItem,
    tvToMediaItem,
    animeToMediaItem
} from "../api/mediaTypes";
import {
    getTrendingMovies,
    getTrendingTVShows,
    getMovieRecommendations,
    getTVRecommendations
} from "../api/tmdb";
import {
    getTopAnime,
    getAnimeRecommendations
} from "../api/jikan";
import type { WatchlistItem } from "../types";

// Helper to shuffle array
function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

export interface RecommendationResults {
    anime: MediaItem[];
    movies: MediaItem[];
    tv: MediaItem[];
}

// Cache for recommendations
const cache = {
    data: null as RecommendationResults | null,
    timestamp: 0
};
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

export const RecommendationService = {
    /**
     * Get recommendations based on user's watchlist
     */
    async getRecommendations(watchlist: WatchlistItem[]): Promise<RecommendationResults> {
        // Check cache first
        const now = Date.now();
        if (cache.data && (now - cache.timestamp < CACHE_DURATION)) {
            // Simple check: if watchlist size changed significantly, maybe invalidate? 
            // For now, simple time-based cache is enough to solve the "quick navigation" issue.
            return cache.data;
        }

        // 1. Separate watchlist by type
        const animeList = watchlist.filter(item => item.media_type === 'anime');
        const movieList = watchlist.filter(item => item.media_type === 'movie');
        const tvList = watchlist.filter(item => item.media_type === 'tv');

        // 2. Fetch recommendations for each category in parallel, with fail-safety
        const [animeRecs, movieRecs, tvRecs] = await Promise.all([
            this.getCategoryRecommendations(animeList, 'anime').catch(err => {
                console.error("Failed to get anime recommendations:", err);
                return [];
            }),
            this.getCategoryRecommendations(movieList, 'movie').catch(err => {
                console.error("Failed to get movie recommendations:", err);
                return [];
            }),
            this.getCategoryRecommendations(tvList, 'tv').catch(err => {
                console.error("Failed to get tv recommendations:", err);
                return [];
            })
        ]);

        const results = {
            anime: animeRecs,
            movies: movieRecs,
            tv: tvRecs
        };

        // Update cache
        cache.data = results;
        cache.timestamp = now;

        return results;
    },

    /**
     * Generic function to get recommendations for a specific category
     */
    async getCategoryRecommendations(
        userItems: WatchlistItem[],
        type: 'anime' | 'movie' | 'tv'
    ): Promise<MediaItem[]> {
        let results: MediaItem[] = [];
        const MAX_SOURCE_ITEMS = 2; // Use at most 2 items from user list to generate recs
        const seenIds = new Set<string>();

        // Add user's existing items to seen set to avoid recommending what they already have
        // Note: ID format in MediaItem is `${type}-${sourceId}`
        userItems.forEach(item => {
            if (item.tmdb_id) seenIds.add(`${type}-${item.tmdb_id}`);
            if (item.mal_id) seenIds.add(`${type}-${item.mal_id}`);
        });

        try {
            if (userItems.length === 0) {
                // Scenario A: User has no items of this type -> Fetch Trending/Top
                results = await this.fetchTrending(type);
            } else {
                // Scenario B: User has items -> Fetch recommendations based on a few random items

                // Shuffle and pick random source items
                const sourceItems = shuffleArray(userItems).slice(0, MAX_SOURCE_ITEMS);

                const promises = sourceItems.map(async (item) => {
                    return this.fetchRecsForSingleItem(item, type);
                });

                const nestedResults = await Promise.all(promises);
                results = nestedResults.flat();

                // If we didn't get enough recommendations (e.g. niche shows), fill with trending
                if (results.length < 5) {
                    const trending = await this.fetchTrending(type);
                    results = [...results, ...trending];
                }
            }
        } catch (error) {
            console.error(`Error generating ${type} recommendations:`, error);
            // Fallback to trending on error
            results = await this.fetchTrending(type);
        }

        // 3. Deduplicate and Filter
        const uniqueResults = results.filter(item => {
            if (seenIds.has(item.id)) return false;
            seenIds.add(item.id);
            return true;
        });

        // 4. Shuffle again to mix sources and limit to ~15
        return shuffleArray(uniqueResults).slice(0, 15);
    },

    async fetchTrending(type: 'anime' | 'movie' | 'tv'): Promise<MediaItem[]> {
        if (type === 'anime') {
            const data = await getTopAnime('bypopularity');
            return data.map(animeToMediaItem);
        } else if (type === 'movie') {
            const data = await getTrendingMovies('week');
            return data.map(movieToMediaItem);
        } else {
            const data = await getTrendingTVShows('week');
            return data.map(tvToMediaItem);
        }
    },

    async fetchRecsForSingleItem(item: WatchlistItem, type: 'anime' | 'movie' | 'tv'): Promise<MediaItem[]> {
        if (type === 'anime') {
            if (!item.mal_id) return []; // Can't fetch without MAL ID
            const data = await getAnimeRecommendations(item.mal_id);
            return data.map(animeToMediaItem);
        } else if (type === 'movie') {
            if (!item.tmdb_id) return [];
            const data = await getMovieRecommendations(item.tmdb_id);
            return data.map(movieToMediaItem);
        } else {
            if (!item.tmdb_id) return [];
            const data = await getTVRecommendations(item.tmdb_id);
            return data.map(tvToMediaItem);
        }
    }
};

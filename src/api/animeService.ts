/**
 * Anime Service - TMDB-first approach with Jikan enrichment
 * 
 * This service provides:
 * 1. TMDB-based anime search (Japanese animation TV shows)
 * 2. Jikan enrichment for MAL metadata (ratings, source, etc.)
 * 3. Filler/Recap mapping from Jikan episodes
 */

import { searchTVShows, type TMDBTVShow } from './tmdb';
import { searchAnime as searchJikanAnime, getAnimeDetails, getAllAnimeEpisodes, type Anime, type AnimeEpisode } from './jikan';

// Cache for Jikan enrichment data (avoid repeated API calls)
const jikanEnrichmentCache = new Map<string, JikanEnrichment>();
const fillerMapCache = new Map<number, Map<number, FillerInfo>>();

export interface JikanEnrichment {
    mal_id: number;
    score: number | null;
    source: string | null;
    season: string | null;
    year: number | null;
    popularity: number | null;
    studios: string[];
    genres: string[];
    themes: string[];
    demographics: string[];
    trailer_url: string | null;
}

export interface FillerInfo {
    filler: boolean;
    recap: boolean;
}

/**
 * Search for anime using TMDB
 * Filters for Japanese animation TV shows
 */
export async function searchAnimeViaTMDB(
    query: string,
    includeAdult: boolean = false,
    lang: string = 'en-US'
): Promise<TMDBTVShow[]> {
    if (query.length < 2) return [];

    try {
        const results = await searchTVShows(query, includeAdult, lang);

        // Filter for Japanese animation
        // genre_id 16 = Animation, origin_country JP = Japan
        const animeResults = results.filter(show => {
            const isAnimation = show.genre_ids?.includes(16);
            const isJapanese = show.origin_country?.includes('JP');
            return isAnimation && isJapanese;
        });

        return animeResults;
    } catch (error) {
        console.error('Error searching anime via TMDB:', error);
        return [];
    }
}

/**
 * Enrich a TMDB anime with Jikan (MAL) metadata
 * Uses title matching to find the corresponding MAL entry
 */
export async function enrichWithJikan(
    tmdbId: number,
    title: string,
    year?: number | null
): Promise<JikanEnrichment | null> {
    // Check cache first
    const cacheKey = `tmdb-${tmdbId}`;
    if (jikanEnrichmentCache.has(cacheKey)) {
        return jikanEnrichmentCache.get(cacheKey)!;
    }

    try {
        // Search Jikan for the anime by title
        const jikanResults = await searchJikanAnime(title, true);

        if (jikanResults.length === 0) {
            return null;
        }

        // Find best match (prefer same year if available)
        let bestMatch = jikanResults[0];

        if (year) {
            const yearMatch = jikanResults.find(anime => {
                const animeYear = anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null);
                return animeYear && Math.abs(animeYear - year) <= 1;
            });
            if (yearMatch) {
                bestMatch = yearMatch;
            }
        }

        // Get full details for the best match
        const details = await getAnimeDetails(bestMatch.mal_id);
        if (!details) {
            return null;
        }

        const enrichment: JikanEnrichment = {
            mal_id: details.mal_id,
            score: details.score,
            source: details.source || null,
            season: details.season || null,
            year: details.year || (details.aired?.from ? new Date(details.aired.from).getFullYear() : null),
            popularity: details.popularity || null,
            studios: details.studios?.map(s => s.name) || [],
            genres: details.genres?.map(g => g.name) || [],
            themes: details.themes?.map(t => t.name) || [],
            demographics: details.demographics?.map(d => d.name) || [],
            trailer_url: details.trailer?.embed_url || details.trailer?.url || null,
        };

        // Cache the result
        jikanEnrichmentCache.set(cacheKey, enrichment);

        return enrichment;
    } catch (error) {
        console.error('Error enriching with Jikan:', error);
        return null;
    }
}

/**
 * Get filler/recap mapping for episodes
 * Maps TMDB episode numbers to Jikan filler/recap flags
 */
export async function getFillerRecapMap(
    malId: number
): Promise<Map<number, FillerInfo>> {
    // Check cache first
    if (fillerMapCache.has(malId)) {
        return fillerMapCache.get(malId)!;
    }

    const fillerMap = new Map<number, FillerInfo>();

    try {
        // Fetch all episodes from Jikan
        const jikanEpisodes = await getAllAnimeEpisodes(malId);

        // Map episode numbers to filler/recap info
        // Jikan episode mal_id is the episode number
        for (const ep of jikanEpisodes) {
            fillerMap.set(ep.mal_id, {
                filler: ep.filler || false,
                recap: ep.recap || false,
            });
        }

        // Cache the result
        fillerMapCache.set(malId, fillerMap);

        return fillerMap;
    } catch (error) {
        console.error('Error fetching filler map:', error);
        return fillerMap;
    }
}

/**
 * Find MAL ID for a TMDB anime
 * Useful for getting filler data for anime added via TMDB search
 */
export async function findMalIdForTMDBAnime(
    title: string,
    year?: number | null
): Promise<number | null> {
    try {
        const jikanResults = await searchJikanAnime(title, true);

        if (jikanResults.length === 0) {
            return null;
        }

        // Find best match
        let bestMatch = jikanResults[0];

        if (year) {
            const yearMatch = jikanResults.find(anime => {
                const animeYear = anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null);
                return animeYear && Math.abs(animeYear - year) <= 1;
            });
            if (yearMatch) {
                bestMatch = yearMatch;
            }
        }

        return bestMatch.mal_id;
    } catch (error) {
        console.error('Error finding MAL ID:', error);
        return null;
    }
}

/**
 * Search anime using Jikan (fallback when TMDB returns nothing)
 * Re-exports the existing Jikan search for convenience
 */
export { searchJikanAnime as searchAnimeViaJikan };
export type { Anime, AnimeEpisode };

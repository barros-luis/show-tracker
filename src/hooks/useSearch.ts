import { useState, useEffect, useCallback } from "react";
import { searchAnimeViaTMDB } from "../api/animeService";
import { searchMovies, searchTVShows } from "../api/tmdb";
import {
    type MediaItem,
    movieToMediaItem,
    tvToMediaItem,
    tmdbAnimeToMediaItem,
} from "../api/mediaTypes";

interface UseSearchOptions {
    debounceMs?: number;
    minQueryLength?: number;
    adultContent?: boolean;
    lang?: string;
}

export function useSearch(options: UseSearchOptions = {}) {
    const { debounceMs = 500, minQueryLength = 3, adultContent = false, lang = 'en-US' } = options;

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [mediaTypeFilter, setMediaTypeFilter] = useState<Set<string>>(new Set());

    const search = useCallback(async (searchQuery: string, includeAdult: boolean) => {
        if (searchQuery.trim().length < minQueryLength) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            // TMDB-first search: anime from TMDB + movies + TV (excluding JP animation)
            const [animeData, movieData, tvData] = await Promise.all([
                searchAnimeViaTMDB(searchQuery, includeAdult, lang),
                searchMovies(searchQuery, includeAdult, lang),
                searchTVShows(searchQuery, includeAdult, lang),
            ]);

            // Convert TMDB anime to MediaItem with type 'anime'
            const animeItems = animeData.map(tmdbAnimeToMediaItem);
            const movieItems = movieData.map(movieToMediaItem);

            // Filter out Japanese animation from TV results (they're in animeItems now)
            const tvItems = tvData
                .filter(tv => !(tv.genre_ids?.includes(16) && tv.origin_country?.includes('JP')))
                .map(tvToMediaItem);

            // Combine all results and filter out items without images
            const allItems = [...animeItems, ...movieItems, ...tvItems].filter(
                (item) => item.imageUrl
            );

            // Deduplicate by normalized title
            const normalizeTitle = (title: string): string => {
                return title
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, "")
                    .replace(/\s+/g, " ")
                    .trim();
            };

            const seenTitles = new Set<string>();
            const deduped = allItems.filter((item) => {
                const normalized = normalizeTitle(item.title);
                if (seenTitles.has(normalized)) return false;
                seenTitles.add(normalized);
                return true;
            });

            setResults(deduped);
        } catch (error) {
            console.error("Search failed:", error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [minQueryLength, lang]);

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            search(query, adultContent);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [query, adultContent, debounceMs, search]);

    // Get filtered results based on media type filter
    const filteredResults = mediaTypeFilter.size === 0
        ? results
        : results.filter((item) => mediaTypeFilter.has(item.type));

    return {
        query,
        setQuery,
        results: filteredResults,
        allResults: results,
        loading,
        mediaTypeFilter,
        setMediaTypeFilter,
    };
}


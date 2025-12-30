import { useState, useEffect, useCallback } from "react";
import { searchAnime } from "../api/jikan";
import { searchMovies, searchTVShows } from "../api/tmdb";
import {
    type MediaItem,
    animeToMediaItem,
    movieToMediaItem,
    tvToMediaItem,
} from "../api/mediaTypes";

interface UseSearchOptions {
    debounceMs?: number;
    minQueryLength?: number;
    adultContent?: boolean;
}

export function useSearch(options: UseSearchOptions = {}) {
    const { debounceMs = 500, minQueryLength = 3, adultContent = false } = options;

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
            // Search all sources in parallel
            const [animeData, movieData, tvData] = await Promise.all([
                searchAnime(searchQuery, !includeAdult),
                searchMovies(searchQuery, includeAdult),
                searchTVShows(searchQuery, includeAdult),
            ]);

            // Convert to unified MediaItem format
            const animeItems = animeData.map(animeToMediaItem);
            const movieItems = movieData.map(movieToMediaItem);
            const tvItems = tvData.map(tvToMediaItem);

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
                // Always keep non-anime items (movies, TV)
                if (item.type !== "anime") return true;

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
    }, [minQueryLength]);

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

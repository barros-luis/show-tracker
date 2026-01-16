// Unified Media Item - works for anime, movies, and TV shows
// This normalizes data from Jikan (anime) and TMDB (movies/TV)

import { type Anime } from './jikan';
import { TMDBMovie, TMDBTVShow, getTMDBImageUrl, getTrailerFromVideos } from "./tmdb";

export type MediaType = 'anime' | 'movie' | 'tv';

export interface MediaItem {
    id: string;
    sourceId: number;
    type: 'anime' | 'movie' | 'tv';
    title: string;
    description: string;
    imageUrl: string;
    largeImageUrl: string;
    year: number | null;
    score: number | null;
    episodes: number | null;
    status: string | null;
    genres: string[];
    popularity: number;
    isAnime: boolean;
    trailerUrl: string | null;
    originalData: Anime | TMDBMovie | TMDBTVShow;
}

// Convert Jikan Anime to MediaItem
export function animeToMediaItem(anime: Anime): MediaItem {
    return {
        id: `anime-${anime.mal_id}`,
        sourceId: anime.mal_id,
        type: 'anime',
        title: anime.title,
        description: anime.synopsis || "",
        imageUrl: anime.images.jpg.image_url,
        largeImageUrl: anime.images.jpg.large_image_url,
        year: anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null),
        score: anime.score,
        status: anime.status || null,
        genres: anime.genres.map(g => g.name),
        episodes: anime.episodes,
        popularity: anime.members || 0,
        isAnime: true,
        trailerUrl: anime.trailer?.embed_url || anime.trailer?.url || null,
        originalData: anime,
    };
}

// Helper to detect if TMDB item is likely anime
// Genre 16 = Animation, Origin Country 'JP' = Japan
function isTmdbAnime(genres: number[] | undefined, country: string[] | undefined): boolean {
    if (!genres || !genres.includes(16)) return false;
    // For movies, country might not be available in search results, but if it is, check it.
    // If not available, we rely solely on Genre 16 which is risky (Disney movies are Animation).
    // So strictly requiring JP country is safer to avoid falsely flagging Disney movies as Anime.
    if (country && country.includes('JP')) return true;
    return false;
}

// Convert TMDB Movie to MediaItem
export function movieToMediaItem(movie: TMDBMovie): MediaItem {
    // Movies usually don't have country in list result, would need details.
    // Heuristic: If it has Animation genre (16) and original_language is 'ja'
    const isLikelyAnime = (movie.genre_ids?.includes(16) && (movie.original_title !== movie.title || movie.overview?.includes('anime') || false)) || false; // Simple check

    return {
        id: `movie-${movie.id}`,
        sourceId: movie.id,
        type: 'movie',
        title: movie.title,
        description: movie.overview || "",
        imageUrl: getTMDBImageUrl(movie.poster_path, 'w300'),
        largeImageUrl: getTMDBImageUrl(movie.poster_path, 'original'),
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
        score: movie.vote_average,
        episodes: null,
        status: movie.status || null,
        genres: movie.genres?.map(g => g.name) || [],
        popularity: (movie.vote_count || 0) * 10, // Scale vote count roughly to MAL members
        isAnime: isLikelyAnime, // We might need to refine this for movies
        trailerUrl: movie.videos ? (getTrailerFromVideos(movie.videos.results) ? `https://www.youtube.com/embed/${getTrailerFromVideos(movie.videos.results)}` : null) : null,
        originalData: movie,
    };
}

// Convert TMDB TV Show to MediaItem
export function tvToMediaItem(tv: TMDBTVShow): MediaItem {
    const isAnime = isTmdbAnime(tv.genre_ids, tv.origin_country);

    return {
        id: `tv-${tv.id}`,
        sourceId: tv.id,
        type: 'tv',
        title: tv.name,
        description: tv.overview || "",
        imageUrl: getTMDBImageUrl(tv.poster_path, 'w300'),
        largeImageUrl: getTMDBImageUrl(tv.poster_path, 'original'),
        year: tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : null,
        score: tv.vote_average,
        episodes: tv.number_of_episodes,
        status: tv.status || null,
        genres: tv.genres?.map(g => g.name) || [],
        popularity: (tv.vote_count || 0) * 10,
        isAnime: isAnime,
        trailerUrl: tv.videos ? (getTrailerFromVideos(tv.videos.results) ? `https://www.youtube.com/embed/${getTrailerFromVideos(tv.videos.results)}` : null) : null,
        originalData: tv,
    };
}

// Convert TMDB TV Show (that is Japanese Animation) to MediaItem with type 'anime'
// This ensures the UI displays it correctly with anime badges and uses anime-specific features
export function tmdbAnimeToMediaItem(tv: TMDBTVShow): MediaItem {
    return {
        id: `anime-${tv.id}`,  // Use anime- prefix for consistency with existing watchlist
        sourceId: tv.id,
        type: 'anime',  // Mark as anime type for UI treatment
        title: tv.name,
        description: tv.overview || "",
        imageUrl: getTMDBImageUrl(tv.poster_path, 'w300'),
        largeImageUrl: getTMDBImageUrl(tv.poster_path, 'original'),
        year: tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : null,
        score: tv.vote_average,
        episodes: tv.number_of_episodes,
        status: tv.status || null,
        genres: tv.genres?.map(g => g.name) || [],
        popularity: (tv.vote_count || 0) * 10,
        isAnime: true,
        trailerUrl: tv.videos ? (getTrailerFromVideos(tv.videos.results) ? `https://www.youtube.com/embed/${getTrailerFromVideos(tv.videos.results)}` : null) : null,
        originalData: tv,
    };
}


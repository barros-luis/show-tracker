// Unified Media Item - works for anime, movies, and TV shows
// This normalizes data from Jikan (anime) and TMDB (movies/TV)

import { type Anime } from './jikan';
import { type TMDBMovie, type TMDBTVShow, getTMDBImageUrl } from './tmdb';

export type MediaType = 'anime' | 'movie' | 'tv';

export interface MediaItem {
    // Unique identifiers
    id: string;                    // Unique ID: "anime-123", "movie-456", "tv-789"
    sourceId: number;              // mal_id for anime, tmdb_id for movies/TV
    type: MediaType;

    // Display info
    title: string;
    imageUrl: string;
    largeImageUrl: string;
    year: number | null;
    score: number | null;
    synopsis: string | null;

    // Episodes (for anime and TV)
    episodes: number | null;

    // Original data (for detail modal)
    originalData: Anime | TMDBMovie | TMDBTVShow;
}

// Convert Jikan Anime to MediaItem
export function animeToMediaItem(anime: Anime): MediaItem {
    return {
        id: `anime-${anime.mal_id}`,
        sourceId: anime.mal_id,
        type: 'anime',
        title: anime.title,
        imageUrl: anime.images.jpg.image_url,
        largeImageUrl: anime.images.jpg.large_image_url,
        year: anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null),
        score: anime.score,
        synopsis: anime.synopsis,
        episodes: anime.episodes,
        originalData: anime,
    };
}

// Convert TMDB Movie to MediaItem
export function movieToMediaItem(movie: TMDBMovie): MediaItem {
    return {
        id: `movie-${movie.id}`,
        sourceId: movie.id,
        type: 'movie',
        title: movie.title,
        imageUrl: getTMDBImageUrl(movie.poster_path, 'w300'),
        largeImageUrl: getTMDBImageUrl(movie.poster_path, 'w500'),
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
        score: movie.vote_average ? Math.round(movie.vote_average * 10) / 10 : null,
        synopsis: movie.overview,
        episodes: null, // Movies don't have episodes
        originalData: movie,
    };
}

// Convert TMDB TV Show to MediaItem
export function tvToMediaItem(tv: TMDBTVShow): MediaItem {
    return {
        id: `tv-${tv.id}`,
        sourceId: tv.id,
        type: 'tv',
        title: tv.name,
        imageUrl: getTMDBImageUrl(tv.poster_path, 'w300'),
        largeImageUrl: getTMDBImageUrl(tv.poster_path, 'w500'),
        year: tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : null,
        score: tv.vote_average ? Math.round(tv.vote_average * 10) / 10 : null,
        synopsis: tv.overview,
        episodes: tv.number_of_episodes,
        originalData: tv,
    };
}

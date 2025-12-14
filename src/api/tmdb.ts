// TMDB API - Movies and TV Shows
const BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = "7e053d0b819118c8888349b6c1ce5f40";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

// Helper to build URLs
function buildUrl(endpoint: string, params: Record<string, string> = {}): string {
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.set("api_key", API_KEY);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });
    return url.toString();
}

// Get full image URL
export function getTMDBImageUrl(path: string | null, size: "w200" | "w300" | "w500" | "original" = "w500"): string {
    if (!path) return "";
    return `${IMAGE_BASE}/${size}${path}`;
}

// Interfaces
export interface TMDBGenre {
    id: number;
    name: string;
}

export interface TMDBVideo {
    key: string;
    site: string;
    type: string;
    name: string;
}

export interface TMDBMovie {
    id: number;
    title: string;
    original_title: string;
    poster_path: string | null;
    backdrop_path: string | null;
    overview: string | null;
    release_date: string | null;
    vote_average: number;
    vote_count: number;
    popularity: number;
    runtime: number | null;
    genres?: TMDBGenre[];
    videos?: { results: TMDBVideo[] };
    status?: string;
}

export interface TMDBTVShow {
    id: number;
    name: string;
    original_name: string;
    poster_path: string | null;
    backdrop_path: string | null;
    overview: string | null;
    first_air_date: string | null;
    vote_average: number;
    vote_count: number;
    popularity: number;
    number_of_episodes: number | null;
    number_of_seasons: number | null;
    episode_run_time?: number[];
    genres?: TMDBGenre[];
    videos?: { results: TMDBVideo[] };
    status?: string;
    networks?: { id: number; name: string; logo_path: string | null }[];
}

export interface TMDBEpisode {
    id: number;
    episode_number: number;
    season_number: number;
    name: string;
    overview: string | null;
    air_date: string | null;
    vote_average: number;
    still_path: string | null;
    runtime: number | null;
}

export interface TMDBSeason {
    id: number;
    season_number: number;
    name: string;
    episode_count: number;
    air_date: string | null;
    poster_path: string | null;
    overview: string | null;
    episodes?: TMDBEpisode[];
}

// Search Movies
export async function searchMovies(query: string): Promise<TMDBMovie[]> {
    if (query.length < 2) return [];

    try {
        const response = await fetch(buildUrl("/search/movie", { query, language: "en-US" }));
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error("Error searching movies:", error);
        return [];
    }
}

// Search TV Shows
export async function searchTVShows(query: string): Promise<TMDBTVShow[]> {
    if (query.length < 2) return [];

    try {
        const response = await fetch(buildUrl("/search/tv", { query, language: "en-US" }));
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error("Error searching TV shows:", error);
        return [];
    }
}

// Get Movie Details (with videos)
export async function getMovieDetails(id: number): Promise<TMDBMovie | null> {
    try {
        const response = await fetch(buildUrl(`/movie/${id}`, { append_to_response: "videos", language: "en-US" }));
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching movie details:", error);
        return null;
    }
}

// Get TV Show Details (with videos)
export async function getTVDetails(id: number): Promise<TMDBTVShow | null> {
    try {
        const response = await fetch(buildUrl(`/tv/${id}`, { append_to_response: "videos", language: "en-US" }));
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching TV details:", error);
        return null;
    }
}

// Get TV Season with Episodes
export async function getTVSeasonEpisodes(tvId: number, seasonNumber: number): Promise<TMDBSeason | null> {
    try {
        const response = await fetch(buildUrl(`/tv/${tvId}/season/${seasonNumber}`, { language: "en-US" }));
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching season details:", error);
        return null;
    }
}

// Get All Episodes for a TV Show (all seasons)
export async function getAllTVEpisodes(tvId: number): Promise<TMDBEpisode[]> {
    try {
        // First get the show details to know the number of seasons
        const show = await getTVDetails(tvId);
        if (!show || !show.number_of_seasons) return [];

        const allEpisodes: TMDBEpisode[] = [];

        // Fetch each season's episodes
        for (let season = 1; season <= show.number_of_seasons; season++) {
            const seasonData = await getTVSeasonEpisodes(tvId, season);
            if (seasonData?.episodes) {
                allEpisodes.push(...seasonData.episodes);
            }
            // Small delay between requests to be nice to the API
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return allEpisodes;
    } catch (error) {
        console.error("Error fetching all episodes:", error);
        return [];
    }
}

// Get YouTube trailer from videos
export function getTrailerFromVideos(videos: TMDBVideo[] | undefined): string | null {
    if (!videos || videos.length === 0) return null;

    // Try to find official trailer first
    const trailer = videos.find(v => v.site === "YouTube" && v.type === "Trailer");
    if (trailer) return trailer.key;

    // Fall back to any YouTube video
    const anyYoutube = videos.find(v => v.site === "YouTube");
    return anyYoutube?.key || null;
}

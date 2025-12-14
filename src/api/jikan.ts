const BASE_URL = "https://api.jikan.moe/v4";

export interface AnimeStudio {
  mal_id: number;
  name: string;
  url: string;
}

export interface AnimeGenre {
  mal_id: number;
  name: string;
}

export interface AnimeTrailer {
  youtube_id: string | null;
  url: string | null;
  embed_url: string | null;
}

export interface Anime {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
  };
  score: number;
  year: number;
  synopsis: string | null;
  episodes: number | null;
  status: string | null;
  type: string | null;
  source: string | null;
  duration: string | null;
  rating: string | null;
  rank: number | null;
  popularity: number | null;
  aired: {
    from: string | null;
    to: string | null;
    string: string | null;
  } | null;
  season: string | null;
  studios: AnimeStudio[];
  producers: AnimeStudio[];
  genres: AnimeGenre[];
  themes: AnimeGenre[];
  demographics: AnimeGenre[];
  trailer: AnimeTrailer | null;
}

// Search Anime by query
export async function searchAnime(query: string): Promise<Anime[]> {
  if (query.length < 3) return [];

  const response = await fetch(`${BASE_URL}/anime?q=${query}&limit=12`);
  const data = await response.json();
  return data.data || [];
}

// Get full anime details by ID
export async function getAnimeDetails(malId: number): Promise<Anime | null> {
  try {
    const response = await fetch(`${BASE_URL}/anime/${malId}`);
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error("Error fetching anime details:", error);
    return null;
  }
}

// Episode interface
export interface AnimeEpisode {
  mal_id: number;
  title: string;
  title_japanese: string | null;
  title_romanji: string | null;
  aired: string | null;
  score: number | null;
  filler: boolean;
  recap: boolean;
  synopsis?: string | null;
}

// Get episodes for an anime (paginated, 100 per page)
export async function getAnimeEpisodes(malId: number, page: number = 1): Promise<{
  episodes: AnimeEpisode[];
  hasNextPage: boolean;
  lastPage: number;
}> {
  try {
    const response = await fetch(`${BASE_URL}/anime/${malId}/episodes?page=${page}`);
    const data = await response.json();
    return {
      episodes: data.data || [],
      hasNextPage: data.pagination?.has_next_page || false,
      lastPage: data.pagination?.last_visible_page || 1,
    };
  } catch (error) {
    console.error("Error fetching episodes:", error);
    return { episodes: [], hasNextPage: false, lastPage: 1 };
  }
}

// Get all episodes (handles pagination automatically)
export async function getAllAnimeEpisodes(malId: number): Promise<AnimeEpisode[]> {
  const allEpisodes: AnimeEpisode[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await getAnimeEpisodes(malId, page);
    allEpisodes.push(...result.episodes);
    hasMore = result.hasNextPage;
    page++;

    // Rate limiting - Jikan allows 3 requests per second
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }

  return allEpisodes;
}

// Get single episode details (includes synopsis)
export async function getEpisodeDetails(malId: number, episodeNumber: number): Promise<AnimeEpisode | null> {
  try {
    const response = await fetch(`${BASE_URL}/anime/${malId}/episodes/${episodeNumber}`);
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error("Error fetching episode details:", error);
    return null;
  }
}
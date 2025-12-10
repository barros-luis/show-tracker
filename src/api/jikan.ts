const BASE_URL = "https://api.jikan.moe/v4";

export interface Anime {
  mal_id: number;
  title: string;
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
  };
  score: number;
  year: number;
  synopsis: string;
  episodes: number | null;
}

// Search Anime by query
export async function searchAnime(query: string): Promise<Anime[]> {
  if (query.length < 3) return [];
  
  const response = await fetch(`${BASE_URL}/anime?q=${query}&limit=12`);
  const data = await response.json();
  return data.data || [];
}
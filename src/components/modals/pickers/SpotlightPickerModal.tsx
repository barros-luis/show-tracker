import React, { useState, useEffect } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MediaItem } from '../../../api/mediaTypes';
import { searchAnimeViaTMDB } from '../../../api/animeService';
import { searchMovies, searchTVShows } from '../../../api/tmdb';
import { tmdbAnimeToMediaItem, movieToMediaItem, tvToMediaItem } from '../../../api/mediaTypes';
import { MediaCard } from '../../cards/MediaCard';

interface SpotlightPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (media: MediaItem) => void;
}

export const SpotlightPickerModal: React.FC<SpotlightPickerModalProps> = ({ isOpen, onClose, onSelect }) => {
    const { t, i18n } = useTranslation();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(false);


    // Search logic (Simplified version of SearchPage)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length >= 3) {
                setLoading(true);
                try {
                    const tmdbLang = i18n.language.startsWith('pt') ? 'pt-PT' : 'en-US';

                    // Parallel search
                    const [animeData, movieData, tvData] = await Promise.all([
                        searchAnimeViaTMDB(query, false, tmdbLang),
                        searchMovies(query, false, tmdbLang),
                        searchTVShows(query, false, tmdbLang),
                    ]);

                    const animeItems = animeData.map(tmdbAnimeToMediaItem);
                    const movieItems = movieData.map(movieToMediaItem);
                    const tvItems = tvData
                        .filter(tv => !(tv.genre_ids?.includes(16) && tv.origin_country?.includes('JP')))
                        .map(tvToMediaItem);

                    // Combine and sort by popularity
                    const allItems = [...animeItems, ...movieItems, ...tvItems]
                        .filter(item => item.imageUrl)
                        .sort((a, b) => b.popularity - a.popularity)
                        .slice(0, 20); // Limit results

                    setResults(allItems);
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
    }, [query, i18n.language]);

    const handleSelect = async (media: MediaItem) => {
        setLoading(true);
        try {
            // Enhanced selection logic: If no backdrop, try to fetch details to get one
            let finalMedia = media;

            // Check if we need to fetch more details (missing backdrop or incomplete data)
            if (!media.originalData || !(media.originalData as any).backdrop_path) {
                console.log("Fetching enhanced details for:", media.title);

                let details: any = null;
                const tmdbLang = i18n.language.startsWith('pt') ? 'pt-PT' : 'en-US';

                if (media.type === 'movie') {
                    details = await import('../../../api/tmdb').then(m => m.getMovieDetails(media.sourceId, tmdbLang));
                } else if (media.type === 'tv' || media.type === 'anime') {
                    details = await import('../../../api/tmdb').then(m => m.getTVDetails(media.sourceId, tmdbLang));
                }

                if (details && details.backdrop_path) {
                    // Update the media item with the new backdrop
                    finalMedia = {
                        ...media,
                        originalData: { ...media.originalData, ...details }, // Merge details
                        // We don't strictly need to update imageUrl here as ProfilePage constructs values from originalData,
                        // but let's be safe and ensure originalData has the backdrop_path
                    };
                }
            }

            onSelect(finalMedia);
        } catch (error) {
            console.error("Error enhancing media selection:", error);
            // Fallback to original selection on error
            onSelect(media);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[80vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4">
                    <Search className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search for your favorite show..."
                        autoFocus
                        className="flex-1 bg-transparent text-xl font-bold text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-black/20">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {results.map(media => (
                                <div key={media.id} onClick={() => handleSelect(media)} className="cursor-pointer">
                                    <MediaCard media={media} onClick={() => handleSelect(media)} />
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && results.length === 0 && query.length >= 3 && (
                        <div className="text-center py-20 text-gray-400">
                            No results found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Calendar, Tv, Clock, Loader2, Plus, Play, Film, Monitor } from "lucide-react";
import { getAnimeDetails, type Anime } from "../../api/jikan";
import { getMovieDetails, getTVDetails, getTrailerFromVideos, type TMDBMovie, type TMDBTVShow } from "../../api/tmdb";
import { type MediaItem } from "../../api/mediaTypes";
import { useTranslation } from "react-i18next";
import { translateText } from "../../api/translation";

interface ShowDetailModalProps {
    media: MediaItem | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToList: (media: MediaItem) => void;
    isLoggedIn: boolean;
}


export function DesktopShowDetailModal({ media, isOpen, onClose, onAddToList, isLoggedIn }: ShowDetailModalProps) {
    const { t, i18n } = useTranslation();
    const [fullDetails, setFullDetails] = useState<Anime | TMDBTVShow | TMDBMovie | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Fetch full details when modal opens
    useEffect(() => {
        if (isOpen && media) {
            setLoadingDetails(true);

            // Fetch based on media type
            if (media.type === 'anime') {
                // Check if this anime came from TMDB search (originalData has 'id' not 'mal_id')
                const isTMDBAnime = media.originalData && 'id' in media.originalData && !('mal_id' in media.originalData);

                if (isTMDBAnime) {
                    // TMDB-sourced anime - fetch from TMDB
                    getTVDetails(media.sourceId, i18n.language).then((details) => {
                        setFullDetails(details);
                        setLoadingDetails(false);
                    });
                } else {
                    // MAL-sourced anime (Jikan fallback) - fetch from Jikan
                    getAnimeDetails(media.sourceId).then(async (details) => {
                        // Translate synopsis if language is Portuguese
                        if (details && details.synopsis && i18n.language.startsWith('pt')) {
                            const translated = await translateText(details.synopsis, 'pt-pt');
                            details.synopsis = translated;
                        }
                        setFullDetails(details);
                        setLoadingDetails(false);
                    });
                }
            } else if (media.type === 'movie') {
                getMovieDetails(media.sourceId, i18n.language).then((details) => {
                    setFullDetails(details);
                    setLoadingDetails(false);
                });
            } else if (media.type === 'tv') {
                getTVDetails(media.sourceId, i18n.language).then((details) => {
                    setFullDetails(details);
                    setLoadingDetails(false);
                });
            }
        } else {
            setFullDetails(null);
        }
    }, [isOpen, media, i18n.language]);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    // Helper to extract YouTube ID based on media type
    const getYoutubeId = (): string | null => {
        if (media?.trailerUrl) {
            const match = media.trailerUrl.match(/embed\/([a-zA-Z0-9_-]+)/);
            if (match) return match[1];
            const vMatch = media.trailerUrl.match(/v=([a-zA-Z0-9_-]+)/);
            if (vMatch) return vMatch[1];
        }

        if (!fullDetails) return null;

        if (media?.type === 'anime') {
            // Check if this is TMDB-sourced anime (has 'videos' property, no 'mal_id')
            const isTMDBAnime = 'videos' in fullDetails && !('mal_id' in fullDetails);

            if (isTMDBAnime) {
                // TMDB-sourced anime - use TMDB video extraction
                const tmdb = fullDetails as TMDBTVShow;
                return getTrailerFromVideos(tmdb.videos?.results);
            } else {
                // Jikan-sourced anime - use original trailer logic (avoids spoilers)
                const anime = fullDetails as Anime;
                if (anime.trailer?.youtube_id) return anime.trailer.youtube_id;
                if (anime.trailer?.embed_url) {
                    const match = anime.trailer.embed_url.match(/embed\/([a-zA-Z0-9_-]+)/);
                    return match ? match[1] : null;
                }
            }
        } else {
            // TMDB movie or TV
            const tmdb = fullDetails as TMDBMovie | TMDBTVShow;
            return getTrailerFromVideos(tmdb.videos?.results);
        }
        return null;
    };
    const youtubeId = getYoutubeId();
    const hasTrailer = !!youtubeId;

    const getStatusLabel = (status: string | null) => {
        if (!status) return t('media_detail.status.unknown');
        if (status === 'Currently Airing' || status === 'Returning Series') return t('media_detail.status.currently_airing');
        if (status === 'Finished Airing' || status === 'Ended' || status === 'Finished') return t('media_detail.status.finished_airing');
        if (status === 'Released') return t('media_detail.status.released');
        return status;
    };

    // Get display data based on media type
    const getDisplayData = () => {
        if (!media) return null;

        if (fullDetails) {
            if (media.type === 'anime') {
                // Check if fullDetails is from TMDB (has 'name' property) or Jikan (has 'title' property)
                const isTMDBData = 'name' in fullDetails && !('mal_id' in fullDetails);

                if (isTMDBData) {
                    // TMDB-sourced anime data
                    const tv = fullDetails as TMDBTVShow;
                    return {
                        title: tv.name,
                        imageUrl: media.largeImageUrl,
                        year: tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : null,
                        score: tv.vote_average ? Math.round(tv.vote_average * 10) / 10 : null,
                        synopsis: tv.overview,
                        episodes: tv.number_of_episodes,
                        status: getStatusLabel(tv.status || 'Unknown'),
                        type: t('media_types.anime'),
                        source: null,
                        season: tv.number_of_seasons ? t('media_detail.total_seasons', { count: tv.number_of_seasons }) : null,
                        genres: tv.genres?.map(g => g.name) || [],
                        duration: tv.episode_run_time?.[0] ? t('media_detail.min_per_ep', { count: tv.episode_run_time[0] }) : null,
                        popularity: tv.popularity,
                        rating: null,
                        studios: tv.networks?.map(n => n.name) || [],
                    };
                } else {
                    // Jikan-sourced anime data
                    const anime = fullDetails as Anime;
                    return {
                        title: anime.title,
                        imageUrl: media.largeImageUrl || anime.images.jpg.large_image_url,
                        year: anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null),
                        score: anime.score,
                        synopsis: anime.synopsis,
                        episodes: anime.episodes,
                        status: getStatusLabel(anime.status),
                        type: anime.type,
                        source: anime.source,
                        season: anime.season,
                        genres: anime.genres?.map(g => g.name) || [],
                        duration: anime.duration,
                        popularity: anime.popularity,
                        rating: anime.rating,
                        studios: anime.studios?.map(s => s.name) || [],
                    };
                }
            } else if (media.type === 'movie') {
                const movie = fullDetails as TMDBMovie;
                return {
                    title: movie.title,
                    imageUrl: media.largeImageUrl,
                    year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
                    score: movie.vote_average ? Math.round(movie.vote_average * 10) / 10 : null,
                    synopsis: movie.overview,
                    episodes: null,
                    status: getStatusLabel(movie.status || 'Released'),
                    type: t('media_types.movie'),
                    source: null,
                    season: null,
                    genres: movie.genres?.map(g => g.name) || [], // Keep for fallback, but will use fullDetails.genres directly
                    duration: movie.runtime ? t('media_detail.min_short', { count: movie.runtime }) : null,
                    popularity: movie.popularity,
                    rating: null,
                    studios: [],
                };
            } else {
                const tv = fullDetails as TMDBTVShow;
                return {
                    title: tv.name,
                    imageUrl: media.largeImageUrl,
                    year: tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : null,
                    score: tv.vote_average ? Math.round(tv.vote_average * 10) / 10 : null,
                    synopsis: tv.overview,
                    episodes: tv.number_of_episodes,
                    status: getStatusLabel(tv.status || 'Unknown'),
                    type: t('media_types.tv'),
                    source: null,
                    season: tv.number_of_seasons ? t('media_detail.total_seasons', { count: tv.number_of_seasons }) : null,
                    genres: tv.genres?.map(g => g.name) || [], // Keep for fallback, but will use fullDetails.genres directly
                    duration: tv.episode_run_time?.[0] ? t('media_detail.min_per_ep', { count: tv.episode_run_time[0] }) : null,
                    popularity: tv.popularity,
                    rating: null,
                    studios: tv.networks?.map(n => n.name) || [],
                };
            }
        }

        // Fallback to media item data
        return {
            title: media.title,
            imageUrl: media.largeImageUrl,
            year: media.year,
            score: media.score,
            synopsis: media.description,
            episodes: media.episodes,
            status: null,
            type: media.type === 'anime' ? t('media_types.anime') : media.type === 'movie' ? t('media_types.movie') : t('media_types.tv'),
            source: null,
            season: null,
            genres: [],
            duration: null,
            popularity: null,
            rating: null,
            studios: [],
        };
    };

    const displayData = getDisplayData();

    // Get media type icon
    const MediaTypeIcon = media?.type === 'movie' ? Film : media?.type === 'tv' ? Monitor : Tv;

    return (
        <AnimatePresence>
            {isOpen && displayData && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-[2px]"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div
                            className="w-full max-w-6xl max-h-[85vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 pointer-events-auto flex flex-col relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 z-20 w-10 h-10 bg-gray-200/80 dark:bg-gray-800/80 hover:bg-gray-300 dark:hover:bg-gray-700 backdrop-blur-md rounded-full flex items-center justify-center text-gray-600 dark:text-white transition-all hover:scale-110 cursor-pointer border border-gray-300 dark:border-gray-700"
                            >
                                <X size={20} />
                            </button>

                            {loadingDetails ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row h-full overflow-hidden">

                                    {/* LEFT COLUMN - Show Info (1/3) */}
                                    <div className="w-full md:w-1/3 flex flex-col bg-gray-900 border-r border-gray-800">
                                        {/* Anime Poster + Stats Row */}
                                        <div className="relative w-full bg-gray-900 flex-shrink-0 flex items-start justify-start pt-4 px-4 gap-4">
                                            {/* Poster */}
                                            <img
                                                src={displayData.imageUrl}
                                                alt={displayData.title}
                                                className="h-60 object-contain rounded-lg shadow-lg"
                                            />

                                            {/* Quick Stats - Minimal */}
                                            <div className="flex flex-col gap-3 py-2 text-sm">
                                                {displayData.score && (
                                                    <div className="flex items-center gap-2">
                                                        <Star size={14} className="text-yellow-500" fill="currentColor" />
                                                        <span className="text-white font-semibold">{displayData.score}</span>
                                                        <span className="text-gray-500 text-xs">{t('media_detail.rating')}</span>
                                                    </div>
                                                )}
                                                {displayData.popularity && (
                                                    <div className="flex items-center gap-2">
                                                        <MediaTypeIcon size={14} className="text-purple-400" />
                                                        <span className="text-white font-semibold">#{displayData.popularity}</span>
                                                        <span className="text-gray-500 text-xs">{t('media_detail.popularity')}</span>
                                                    </div>
                                                )}
                                                {displayData.source && (
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-blue-400" />
                                                        <span className="text-white font-semibold">{displayData.source}</span>
                                                        <span className="text-gray-500 text-xs">{t('media_detail.source')}</span>
                                                    </div>
                                                )}
                                                {displayData.season && displayData.year && (
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={14} className="text-green-400" />
                                                        <span className="text-white font-semibold capitalize">{displayData.season} {displayData.year}</span>
                                                        <span className="text-gray-500 text-xs">{t('media_detail.season')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Info Section - Scrollable */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            {/* Title */}
                                            <div>
                                                <h2 className="text-xl font-bold text-white leading-tight">
                                                    {displayData.title}
                                                </h2>
                                            </div>

                                            {/* Quick Stats */}
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                {displayData.score && (
                                                    <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 px-2 py-1 rounded-full font-semibold">
                                                        <Star size={12} fill="currentColor" />
                                                        {displayData.score}
                                                    </div>
                                                )}
                                                {displayData.year && (
                                                    <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full">
                                                        <Calendar size={12} />
                                                        {displayData.year}
                                                    </div>
                                                )}
                                                {displayData.episodes && (
                                                    <div className="flex items-center gap-1 bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 px-2 py-1 rounded-full">
                                                        <Tv size={12} />
                                                        {t('media_detail.eps_short', { count: displayData.episodes })}
                                                    </div>
                                                )}
                                                {displayData.duration && (
                                                    <div className="flex items-center gap-1 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                                                        <Clock size={12} />
                                                        {displayData.duration}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status */}
                                            {displayData.status && (
                                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${displayData.status === t('media_detail.status.currently_airing')
                                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                    : displayData.status === t('media_detail.status.finished_airing')
                                                        ? "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                                                        : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                                    }`}>
                                                    {displayData.status}
                                                </span>
                                            )}

                                            {/* Genres */}
                                            {fullDetails && 'genres' in fullDetails && fullDetails.genres && fullDetails.genres.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {fullDetails.genres.map((genre) => (
                                                        <span
                                                            key={genre.name}
                                                            className="px-2 py-0.5 bg-blue-600/20 text-blue-300 rounded-full text-xs font-medium"
                                                        >
                                                            {t(`genres.${genre.name}`, genre.name)}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Synopsis */}
                                            {displayData.synopsis && (
                                                <div className="space-y-2">
                                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('media_detail.synopsis')}</h3>
                                                    <p className="text-gray-300 text-xs leading-relaxed">
                                                        {displayData.synopsis}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Studio/Network */}
                                            {displayData.studios && displayData.studios.length > 0 && (
                                                <div className="space-y-1">
                                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                        {media?.type === 'tv' ? t('media_detail.network') : t('media_detail.studio')}
                                                    </h4>
                                                    <p className="text-white text-sm font-medium">
                                                        {displayData.studios.join(", ")}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Save Button - Fixed at bottom */}
                                        <div className="flex-shrink-0 p-4 border-t border-gray-800">
                                            <button
                                                onClick={() => {
                                                    if (media) {
                                                        onAddToList(media);
                                                    }
                                                }}
                                                disabled={!isLoggedIn}
                                                className={`btn-animated w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${isLoggedIn
                                                    ? "btn-glow bg-blue-500 hover:bg-blue-600 !text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98]"
                                                    : "bg-gray-700 text-gray-400 cursor-not-allowed"
                                                    }`}
                                            >
                                                <Plus size={18} />
                                                {isLoggedIn ? t('media_detail.add_to_list') : t('media_detail.sign_in_to_add')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* RIGHT COLUMN - Trailer (2/3) */}
                                    <div className="w-full md:w-2/3 flex flex-col bg-gray-100 dark:bg-gray-950 p-6">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <Play size={20} className="text-blue-500" fill="currentColor" />
                                            {t('media_detail.trailer')}
                                        </h3>

                                        {hasTrailer && youtubeId ? (
                                            <div className="flex-1 relative rounded-xl overflow-hidden bg-black">
                                                <iframe
                                                    src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
                                                    title={`${displayData.title} Trailer`}
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                    className="absolute inset-0 w-full h-full"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center bg-gray-200/50 dark:bg-gray-800/30 rounded-xl border border-gray-300 dark:border-gray-700/50">
                                                <div className="w-16 h-16 bg-gray-300 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
                                                    <Play size={28} className="text-gray-400 dark:text-gray-500" />
                                                </div>
                                                <p className="text-gray-500 dark:text-gray-500 text-lg font-medium">{t('media_detail.no_trailer')}</p>
                                                <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">{t('media_detail.check_back')}</p>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Calendar, Tv, Clock, Loader2, Plus, Play, Film, Monitor } from "lucide-react";
import { getAnimeDetails, type Anime } from "../api/jikan";
import { getMovieDetails, getTVDetails, getTrailerFromVideos, type TMDBMovie, type TMDBTVShow } from "../api/tmdb";
import { type MediaItem } from "../api/mediaTypes";

interface ShowDetailModalProps {
    media: MediaItem | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToList: (media: MediaItem) => void;
    isLoggedIn: boolean;
}

// Type for full details (can be any of the three)
type FullDetails = Anime | TMDBMovie | TMDBTVShow | null;

export function ShowDetailModal({ media, isOpen, onClose, onAddToList, isLoggedIn }: ShowDetailModalProps) {
    const [fullDetails, setFullDetails] = useState<FullDetails>(null);
    const [loading, setLoading] = useState(false);

    // Fetch full details when modal opens
    useEffect(() => {
        if (isOpen && media) {
            setLoading(true);

            // Fetch based on media type
            if (media.type === 'anime') {
                getAnimeDetails(media.sourceId).then((details) => {
                    setFullDetails(details);
                    setLoading(false);
                });
            } else if (media.type === 'movie') {
                getMovieDetails(media.sourceId).then((details) => {
                    setFullDetails(details);
                    setLoading(false);
                });
            } else if (media.type === 'tv') {
                getTVDetails(media.sourceId).then((details) => {
                    setFullDetails(details);
                    setLoading(false);
                });
            }
        } else {
            setFullDetails(null);
        }
    }, [isOpen, media]);

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
        if (!fullDetails) return null;

        if (media?.type === 'anime') {
            const anime = fullDetails as Anime;
            if (anime.trailer?.youtube_id) return anime.trailer.youtube_id;
            if (anime.trailer?.embed_url) {
                const match = anime.trailer.embed_url.match(/embed\/([a-zA-Z0-9_-]+)/);
                return match ? match[1] : null;
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

    // Get display data based on media type
    const getDisplayData = () => {
        if (!media) return null;

        if (fullDetails) {
            if (media.type === 'anime') {
                const anime = fullDetails as Anime;
                return {
                    title: anime.title,
                    imageUrl: anime.images.jpg.large_image_url,
                    year: anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null),
                    score: anime.score,
                    synopsis: anime.synopsis,
                    episodes: anime.episodes,
                    status: anime.status,
                    type: anime.type,
                    source: anime.source,
                    season: anime.season,
                    genres: anime.genres?.map(g => g.name) || [],
                    duration: anime.duration,
                    popularity: anime.popularity,
                    rating: anime.rating,
                    studios: anime.studios?.map(s => s.name) || [],
                };
            } else if (media.type === 'movie') {
                const movie = fullDetails as TMDBMovie;
                return {
                    title: movie.title,
                    imageUrl: media.largeImageUrl,
                    year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
                    score: movie.vote_average ? Math.round(movie.vote_average * 10) / 10 : null,
                    synopsis: movie.overview,
                    episodes: null,
                    status: movie.status || 'Released',
                    type: 'Movie',
                    source: null,
                    season: null,
                    genres: movie.genres?.map(g => g.name) || [],
                    duration: movie.runtime ? `${movie.runtime} min` : null,
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
                    status: tv.status || 'Unknown',
                    type: 'TV Series',
                    source: null,
                    season: tv.number_of_seasons ? `${tv.number_of_seasons} Season${tv.number_of_seasons > 1 ? 's' : ''}` : null,
                    genres: tv.genres?.map(g => g.name) || [],
                    duration: tv.episode_run_time?.[0] ? `${tv.episode_run_time[0]} min per ep` : null,
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
            synopsis: media.synopsis,
            episodes: media.episodes,
            status: null,
            type: media.type === 'anime' ? 'Anime' : media.type === 'movie' ? 'Movie' : 'TV Series',
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
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px]"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div
                            className="w-full max-w-6xl max-h-[85vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 pointer-events-auto flex flex-col relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button - Inside modal */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 z-20 w-10 h-10 bg-gray-800/80 hover:bg-gray-700 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all hover:scale-110 cursor-pointer border border-gray-700"
                            >
                                <X size={20} />
                            </button>

                            {loading ? (
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
                                                        <span className="text-gray-500 text-xs">Rating</span>
                                                    </div>
                                                )}
                                                {displayData.popularity && (
                                                    <div className="flex items-center gap-2">
                                                        <MediaTypeIcon size={14} className="text-purple-400" />
                                                        <span className="text-white font-semibold">#{displayData.popularity}</span>
                                                        <span className="text-gray-500 text-xs">Popularity</span>
                                                    </div>
                                                )}
                                                {displayData.source && (
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-blue-400" />
                                                        <span className="text-white font-semibold">{displayData.source}</span>
                                                        <span className="text-gray-500 text-xs">Source</span>
                                                    </div>
                                                )}
                                                {displayData.season && displayData.year && (
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={14} className="text-green-400" />
                                                        <span className="text-white font-semibold capitalize">{displayData.season} {displayData.year}</span>
                                                        <span className="text-gray-500 text-xs">Season</span>
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
                                                    <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-full font-semibold">
                                                        <Star size={12} fill="currentColor" />
                                                        {displayData.score}
                                                    </div>
                                                )}
                                                {displayData.year && (
                                                    <div className="flex items-center gap-1 bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full">
                                                        <Calendar size={12} />
                                                        {displayData.year}
                                                    </div>
                                                )}
                                                {displayData.episodes && (
                                                    <div className="flex items-center gap-1 bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full">
                                                        <Tv size={12} />
                                                        {displayData.episodes} eps
                                                    </div>
                                                )}
                                                {displayData.duration && (
                                                    <div className="flex items-center gap-1 bg-green-500/10 text-green-400 px-2 py-1 rounded-full">
                                                        <Clock size={12} />
                                                        {displayData.duration}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status */}
                                            {displayData.status && (
                                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${displayData.status === "Currently Airing"
                                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                    : displayData.status === "Finished Airing"
                                                        ? "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                                                        : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                                    }`}>
                                                    {displayData.status}
                                                </span>
                                            )}

                                            {/* Genres */}
                                            {displayData.genres && displayData.genres.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {displayData.genres.map((genre, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="px-2 py-0.5 bg-blue-600/20 text-blue-300 rounded-full text-xs font-medium"
                                                        >
                                                            {genre}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Synopsis */}
                                            {displayData.synopsis && (
                                                <div className="space-y-2">
                                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Synopsis</h3>
                                                    <p className="text-gray-300 text-xs leading-relaxed">
                                                        {displayData.synopsis}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Studio/Network */}
                                            {displayData.studios && displayData.studios.length > 0 && (
                                                <div className="space-y-1">
                                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                        {media?.type === 'tv' ? 'Network' : 'Studio'}
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
                                                    ? "btn-glow bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98]"
                                                    : "bg-gray-700 text-gray-400 cursor-not-allowed"
                                                    }`}
                                            >
                                                <Plus size={18} />
                                                {isLoggedIn ? "Add to My List" : "Sign in to Add"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* RIGHT COLUMN - Trailer (2/3) */}
                                    <div className="w-full md:w-2/3 flex flex-col bg-gray-100 dark:bg-gray-950 p-6">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <Play size={20} className="text-blue-500" fill="currentColor" />
                                            Trailer
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
                                                <p className="text-gray-500 dark:text-gray-500 text-lg font-medium">No trailer available</p>
                                                <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">Check back later!</p>
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

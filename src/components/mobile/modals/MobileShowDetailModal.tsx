/**
 * Mobile-optimized Show Detail Modal
 * 
 * A full-screen bottom sheet modal for mobile devices with:
 * - Single column scrollable layout
 * - Large touch-friendly buttons
 * - Optimized for small screens
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Calendar, Tv, Clock, Loader2, Plus, Play, Film, Monitor, ChevronDown, ChevronUp } from "lucide-react";
import { getAnimeDetails, type Anime } from "../../../api/jikan";
import { getMovieDetails, getTVDetails, getTrailerFromVideos, type TMDBMovie, type TMDBTVShow } from "../../../api/tmdb";
import { type MediaItem } from "../../../api/mediaTypes";

interface MobileShowDetailModalProps {
    media: MediaItem | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToList: (media: MediaItem) => void;
    isLoggedIn: boolean;
}

type FullDetails = Anime | TMDBMovie | TMDBTVShow | null;

export function MobileShowDetailModal({
    media,
    isOpen,
    onClose,
    onAddToList,
    isLoggedIn
}: MobileShowDetailModalProps) {
    const [fullDetails, setFullDetails] = useState<FullDetails>(null);
    const [loading, setLoading] = useState(false);
    const [showTrailer, setShowTrailer] = useState(false);

    // Fetch full details when modal opens
    useEffect(() => {
        if (isOpen && media) {
            setLoading(true);
            setShowTrailer(false);

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

    // Helper to extract YouTube ID
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
            const tmdb = fullDetails as TMDBMovie | TMDBTVShow;
            return getTrailerFromVideos(tmdb.videos?.results);
        }
        return null;
    };

    const youtubeId = getYoutubeId();
    const hasTrailer = !!youtubeId;

    // Get display data
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
                    genres: anime.genres?.map(g => g.name) || [],
                    duration: anime.duration,
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
                    genres: movie.genres?.map(g => g.name) || [],
                    duration: movie.runtime ? `${movie.runtime} min` : null,
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
                    status: tv.status === 'Returning Series' ? 'Currently Airing' : tv.status,
                    genres: tv.genres?.map(g => g.name) || [],
                    duration: tv.episode_run_time?.[0] ? `${tv.episode_run_time[0]} min/ep` : null,
                };
            }
        }

        // Fallback to basic media data
        return {
            title: media.title,
            imageUrl: media.largeImageUrl,
            year: media.year,
            score: media.score,
            synopsis: media.synopsis,
            episodes: media.episodes,
            status: null,
            genres: [],
            duration: null,
        };
    };

    const displayData = getDisplayData();
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
                        className="fixed inset-0 z-50 bg-black/80"
                        onClick={onClose}
                    />

                    {/* Modal - Bottom Sheet Style */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] bg-gray-900 rounded-t-3xl overflow-hidden shadow-2xl"
                    >
                        {/* Drag Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-4 w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white z-10"
                        >
                            <X size={20} />
                        </button>

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                            </div>
                        ) : (
                            <div className="overflow-y-auto max-h-[calc(90vh-120px)] pb-24">
                                {/* Header: Poster + Title + Quick Stats */}
                                <div className="px-4 pb-4">
                                    <div className="flex gap-4">
                                        {/* Poster */}
                                        <img
                                            src={displayData.imageUrl}
                                            alt={displayData.title}
                                            className="w-28 h-40 object-cover rounded-xl shadow-lg flex-shrink-0"
                                        />

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-xl font-bold text-white mb-2 line-clamp-2">
                                                {displayData.title}
                                            </h2>

                                            {/* Quick Stats */}
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                {displayData.score && (
                                                    <span className="flex items-center gap-1 bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-full">
                                                        <Star size={12} fill="currentColor" />
                                                        {displayData.score}
                                                    </span>
                                                )}
                                                {displayData.year && (
                                                    <span className="flex items-center gap-1 bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                                                        <Calendar size={12} />
                                                        {displayData.year}
                                                    </span>
                                                )}
                                                {displayData.episodes && (
                                                    <span className="flex items-center gap-1 bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
                                                        <MediaTypeIcon size={12} />
                                                        {displayData.episodes} eps
                                                    </span>
                                                )}
                                                {displayData.duration && (
                                                    <span className="flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                                                        <Clock size={12} />
                                                        {displayData.duration}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Status */}
                                            {displayData.status && (
                                                <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-bold ${displayData.status === "Currently Airing"
                                                        ? "bg-green-500/20 text-green-400"
                                                        : "bg-gray-500/20 text-gray-400"
                                                    }`}>
                                                    {displayData.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Genres */}
                                {displayData.genres.length > 0 && (
                                    <div className="px-4 pb-4">
                                        <div className="flex flex-wrap gap-2">
                                            {displayData.genres.map((genre, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-xs"
                                                >
                                                    {genre}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Synopsis */}
                                {displayData.synopsis && (
                                    <div className="px-4 pb-4">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">
                                            Synopsis
                                        </h3>
                                        <p className="text-gray-300 text-sm leading-relaxed">
                                            {displayData.synopsis}
                                        </p>
                                    </div>
                                )}

                                {/* Trailer Section - Collapsible */}
                                {hasTrailer && (
                                    <div className="px-4 pb-4">
                                        <button
                                            onClick={() => setShowTrailer(!showTrailer)}
                                            className="w-full flex items-center justify-between py-3 px-4 bg-gray-800 rounded-xl text-white"
                                        >
                                            <span className="flex items-center gap-2 font-medium">
                                                <Play size={18} className="text-blue-500" fill="currentColor" />
                                                Watch Trailer
                                            </span>
                                            {showTrailer ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </button>

                                        <AnimatePresence>
                                            {showTrailer && youtubeId && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="aspect-video mt-3 rounded-xl overflow-hidden bg-black">
                                                        <iframe
                                                            src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
                                                            title="Trailer"
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                            allowFullScreen
                                                            className="w-full h-full"
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Fixed Bottom Button */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent pt-8">
                            <button
                                onClick={() => media && onAddToList(media)}
                                disabled={!isLoggedIn}
                                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 ${isLoggedIn
                                        ? "bg-blue-600 text-white active:bg-blue-700 shadow-lg shadow-blue-500/25"
                                        : "bg-gray-700 text-gray-400"
                                    }`}
                            >
                                <Plus size={20} />
                                {isLoggedIn ? "Add to My List" : "Sign in to Add"}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

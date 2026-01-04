/**
 * Mobile-optimized Show Detail Modal
 * 
 * A bottom sheet modal for mobile devices with:
 * - Fixed consistent height (85% of viewport)
 * - Swipe to dismiss via drag bar only
 * - Proper scroll containment in content area
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Calendar, Tv, Clock, Loader2, Plus, Play, Film, Monitor, ChevronDown, ChevronUp } from "lucide-react";
import { getAnimeDetails, type Anime } from "../../../api/jikan";
import { getMovieDetails, getTVDetails, getTrailerFromVideos, type TMDBMovie, type TMDBTVShow } from "../../../api/tmdb";
import { type MediaItem } from "../../../api/mediaTypes";
import { useTranslation } from "react-i18next";
import { translateText } from "../../../api/translation";

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
    const { t, i18n } = useTranslation();
    const [fullDetails, setFullDetails] = useState<FullDetails>(null);
    const [loading, setLoading] = useState(false);
    const [showTrailer, setShowTrailer] = useState(false);
    const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch full details    // Fetch details
    useEffect(() => {
        if (!isOpen || !media) {
            setFullDetails(null);
            setTrailerUrl(null); // Reset trailer
            return;
        }

        setLoading(true);
        setShowTrailer(false);
        // Reset scroll position when opening
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }

        const fetchDetails = async () => {
            try {
                // Map app language to TMDB language (en-US or pt-PT)
                const tmdbLang = i18n.language.startsWith('pt') ? 'pt-PT' : 'en-US';

                if (media.type === 'anime') {
                    const details = await getAnimeDetails(media.sourceId);

                    // Translate synopsis if language is Portuguese
                    if (details && details.synopsis && i18n.language.startsWith('pt')) {
                        const translatedSynopsis = await translateText(details.synopsis, 'pt-pt');
                        details.synopsis = translatedSynopsis;
                    }

                    setFullDetails(details);
                    if (details?.trailer?.youtube_id) {
                        setTrailerUrl(details.trailer.youtube_id);
                    } else if (details?.trailer?.embed_url) {
                        const match = details.trailer.embed_url.match(/embed\/([a-zA-Z0-9_-]+)/);
                        setTrailerUrl(match ? match[1] : null);
                    } else {
                        setTrailerUrl(null);
                    }
                } else if (media.type === 'tv') {
                    const details = await getTVDetails(media.sourceId, tmdbLang);
                    setFullDetails(details);
                    const trailer = getTrailerFromVideos(details?.videos?.results);
                    setTrailerUrl(trailer);
                } else { // movie
                    const details = await getMovieDetails(media.sourceId, tmdbLang);
                    setFullDetails(details);
                    const trailer = getTrailerFromVideos(details?.videos?.results);
                    setTrailerUrl(trailer);
                }
            } catch (error) {
                console.error("Error fetching details:", error);
                setFullDetails(null);
                setTrailerUrl(null);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [isOpen, media, i18n.language]);

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

    const hasTrailer = !!trailerUrl;

    const getStatusLabel = (status: string | null) => {
        if (!status) return t('media_detail.status.unknown');
        if (status === 'Currently Airing' || status === 'Returning Series') return t('media_detail.status.currently_airing');
        if (status === 'Finished Airing' || status === 'Ended' || status === 'Finished') return t('media_detail.status.finished_airing');
        if (status === 'Released') return t('media_detail.status.released');
        return status;
    };

    // Get display data
    const getDisplayData = () => {
        if (!media) return null;

        if (fullDetails) {
            if (media.type === 'anime') {
                const anime = fullDetails as Anime;
                return {
                    title: anime.title,
                    imageUrl: media.largeImageUrl || anime.images.jpg.large_image_url, // Prefer enriched image
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
                    genres: movie.genres?.map(g => g.name) || [],
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
                    genres: tv.genres?.map(g => g.name) || [],
                    duration: tv.episode_run_time?.[0] ? t('media_detail.min_per_ep', { count: tv.episode_run_time[0] }) : null,
                    popularity: tv.popularity,
                    rating: null,
                    studios: tv.networks?.map(n => n.name) || [],
                };
            }
        }

        // Fallback to basic media data
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
    const MediaTypeIcon = media?.type === 'movie' ? Film : media?.type === 'tv' ? Monitor : Tv;

    // Handle drag end - only from drag bar
    const handleDragEnd = (_e: any, info: any) => {
        if (info.offset.y > 80 || info.velocity.y > 300) {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && displayData && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 bg-black/80"
                        style={{ zIndex: 1001 }}
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 400 }} // Faster
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.5 }} // Less resistance
                        onDragEnd={handleDragEnd}
                        style={{
                            position: 'fixed',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: '80vh', // FIXED height - all modals same position
                            zIndex: 1001,
                        }}
                        className="bg-gray-900 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Drag Handle */}
                        <div
                            className="flex-shrink-0 py-3 bg-gray-900 cursor-grab active:cursor-grabbing"
                            style={{ touchAction: 'none' }}
                        >
                            <div className="w-12 h-1.5 bg-gray-500 rounded-full mx-auto" />
                        </div>

                        {loading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                            </div>
                        ) : (
                            <>
                                {/* Scrollable Content */}
                                <div
                                    ref={scrollRef}
                                    className="flex-1 overflow-y-auto overflow-x-hidden"
                                    style={{
                                        WebkitOverflowScrolling: 'touch',
                                        overscrollBehavior: 'contain',
                                    }}
                                >
                                    {/* Header: Poster + Info */}
                                    <div className="px-4 pb-4">
                                        <div className="flex gap-4">
                                            <img
                                                src={displayData.imageUrl}
                                                alt={displayData.title}
                                                className="w-24 h-36 object-cover rounded-xl shadow-lg flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h2 className="text-lg font-bold text-white mb-2 line-clamp-2">
                                                    {displayData.title}
                                                </h2>
                                                <div className="flex flex-wrap gap-1.5 text-xs">
                                                    {displayData.score && (
                                                        <span className="flex items-center gap-1 bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-full">
                                                            <Star size={10} fill="currentColor" />
                                                            {displayData.score}
                                                        </span>
                                                    )}
                                                    {displayData.year && (
                                                        <span className="flex items-center gap-1 bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                                                            <Calendar size={10} />
                                                            {displayData.year}
                                                        </span>
                                                    )}
                                                    {displayData.episodes && (
                                                        <span className="flex items-center gap-1 bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
                                                            <MediaTypeIcon size={10} />
                                                            {t('media_detail.eps_short', { count: displayData.episodes })}
                                                        </span>
                                                    )}
                                                    {displayData.duration && (
                                                        <span className="flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                                                            <Clock size={10} />
                                                            {displayData.duration}
                                                        </span>
                                                    )}
                                                </div>
                                                {displayData.status && (
                                                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${displayData.status === t('media_detail.status.currently_airing')
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
                                        <div className="px-4 pb-3">
                                            <div className="flex flex-wrap gap-1.5">
                                                {displayData.genres.slice(0, 4).map((genre, idx) => (
                                                    <span key={idx} className="px-2.5 py-1 bg-blue-600/20 text-blue-300 rounded-full text-xs">
                                                        {t(`genres.${genre}`, genre)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Synopsis */}
                                    {displayData.synopsis && (
                                        <div className="px-4 pb-4">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                                {t('media_detail.synopsis')}
                                            </h3>
                                            <p className="text-gray-300 text-sm leading-relaxed">
                                                {displayData.synopsis}
                                            </p>
                                        </div>
                                    )}

                                    {/* Trailer */}
                                    {hasTrailer && (
                                        <div className="px-4 pb-4">
                                            <button
                                                onClick={() => setShowTrailer(!showTrailer)}
                                                className="w-full flex items-center justify-between py-2.5 px-3 bg-gray-800 rounded-xl text-white text-sm"
                                            >
                                                <span className="flex items-center gap-2 font-medium">
                                                    <Play size={16} className="text-blue-500" fill="currentColor" />
                                                    {t('media_detail.watch_trailer')}
                                                </span>
                                                {showTrailer ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </button>

                                            {showTrailer && trailerUrl && (
                                                <div className="mt-2">
                                                    <div className="aspect-video rounded-xl overflow-hidden bg-black">
                                                        <iframe
                                                            src={`https://www.youtube.com/embed/${trailerUrl}?rel=0&modestbranding=1`}
                                                            title="Trailer"
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                            allowFullScreen
                                                            className="w-full h-full"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Add to My List Button */}
                                    <div className="px-4 pt-2 pb-8">
                                        <button
                                            onClick={() => media && onAddToList(media)}
                                            disabled={!isLoggedIn}
                                            className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 ${isLoggedIn
                                                ? "bg-blue-600 !text-white active:bg-blue-700 shadow-lg shadow-blue-500/30"
                                                : "bg-gray-700 text-gray-400"
                                                }`}
                                        >
                                            <Plus size={20} />
                                            {isLoggedIn ? t('media_detail.add_to_list') : t('media_detail.sign_in_to_add')}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

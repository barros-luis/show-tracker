import { motion } from "framer-motion";
import { Star, Film, Monitor, Tv } from "lucide-react";
import type { MediaItem } from "../api/mediaTypes";

interface MediaCardProps {
    media: MediaItem;
    onClick: (media: MediaItem) => void;
}

export function MediaCard({ media, onClick }: MediaCardProps) {
    // Get icon based on media type
    const TypeIcon = media.type === 'movie' ? Film : media.type === 'tv' ? Monitor : Tv;
    const typeLabel = media.type === 'movie' ? 'Movie' : media.type === 'tv' ? 'TV' : 'Anime';
    const typeColor = media.type === 'movie' ? 'text-red-400' : media.type === 'tv' ? 'text-green-400' : 'text-blue-400';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="media-card group relative cursor-pointer overflow-hidden rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg"
            onClick={() => onClick(media)}
        >
            {/* Image Container with Aspect Ratio */}
            <div className="aspect-[2/3] w-full overflow-hidden">
                {media.imageUrl ? (
                    <img
                        src={media.imageUrl}
                        alt={media.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                    />
                ) : (
                    <div className="h-full w-full bg-gray-800 flex items-center justify-center">
                        <TypeIcon size={48} className="text-gray-600" />
                    </div>
                )}

                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 transition-opacity group-hover:opacity-80 pointer-events-none" />
            </div>

            {/* Media Type Badge */}
            <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm ${typeColor}`}>
                <TypeIcon size={10} />
                <span className="text-[10px] font-bold uppercase">{typeLabel}</span>
            </div>

            {/* Content Overlay */}
            <div className="absolute bottom-0 w-full p-4">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-blue-400">
                        {media.year || "Unknown"}
                    </span>
                    <div className="flex items-center gap-1 text-yellow-500">
                        <Star size={12} fill="currentColor" />
                        <span className="text-xs font-bold">{media.score || "N/A"}</span>
                    </div>
                </div>

                <h3 className="line-clamp-2 text-sm font-bold leading-tight drop-shadow-lg" style={{ color: 'white' }}>
                    {media.title}
                </h3>
            </div>
        </motion.div>
    );
}

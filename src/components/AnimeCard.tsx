import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { Anime } from "../api/jikan";

interface AnimeCardProps {
  anime: Anime;
  onClick: (anime: Anime) => void;
}

export function AnimeCard({ anime, onClick }: AnimeCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="anime-card group relative cursor-pointer overflow-hidden rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg"
      onClick={() => onClick(anime)}
    >
      {/* Image Container with Aspect Ratio */}
      <div className="aspect-[2/3] w-full overflow-hidden">
        <img
          src={anime.images.jpg.large_image_url}
          alt={anime.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 transition-opacity group-hover:opacity-80 pointer-events-none" />
      </div>

      {/* Content Overlay */}
      <div className="absolute bottom-0 w-full p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-blue-400">
            {anime.year || "Unknown"}
          </span>
          <div className="flex items-center gap-1 text-yellow-500">
            <Star size={12} fill="currentColor" />
            <span className="text-xs font-bold">{anime.score || "N/A"}</span>
          </div>
        </div>

        <h3 className="line-clamp-2 text-sm font-bold text-white leading-tight drop-shadow-lg">
          {anime.title}
        </h3>
      </div>
    </motion.div>
  );
}
import React from 'react';
import { Star } from 'lucide-react';
import { SpotlightMedia } from '../../../types/profile';

interface SpotlightSectionProps {
    media: SpotlightMedia;
}

export const SpotlightSection: React.FC<SpotlightSectionProps> = ({ media }) => {

    return (
        <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl mb-10 group bg-gray-900 border border-gray-800">
            {/* Background Image (Backdrop) */}
            <div className="absolute inset-0 bg-gray-900">
                {media.backdropUrl ? (
                    <img
                        src={media.backdropUrl}
                        alt={media.title}
                        className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[20s]"
                    />
                ) : (
                    <img
                        src={media.posterUrl}
                        alt={media.title}
                        className="w-full h-full object-cover opacity-60 blur-md group-hover:scale-105 transition-transform duration-[20s]"
                    />
                )}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/40 to-transparent" />
            </div>

            {/* Content Content */}
            <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-end md:items-center gap-6 mt-32 md:mt-48">

                {/* Poster (Hidden on SUPER small screens, visible on mobile/desktop) */}
                <div className="hidden min-[400px]:block w-24 md:w-32 rounded-xl overflow-hidden shadow-lg border-2 border-white/20 shrink-0">
                    <img src={media.posterUrl} alt={media.title} className="w-full h-full object-cover" />
                </div>

                {/* Text Info */}
                <div className="flex-1 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-white/20 backdrop-blur-md rounded-md text-xs font-bold uppercase tracking-wider shadow-sm">
                            {media.type === 'tv' ? 'TV Show' : media.type}
                        </span>
                        <div className="flex items-center gap-1 text-yellow-400 bg-black/30 px-2 py-1 rounded-md backdrop-blur-md">
                            <Star size={12} fill="currentColor" />
                            <span className="text-xs font-bold">Favorite</span>
                        </div>
                    </div>

                    <h2 className="text-3xl md:text-5xl font-black leading-tight mb-2 drop-shadow-lg tracking-tight">
                        {media.title}
                    </h2>

                    <p className="text-gray-200 text-sm md:text-lg font-medium line-clamp-2 max-w-2xl mb-2 opacity-90">
                        The absolute favorite. An experience worthy of the spotlight.
                    </p>
                </div>
            </div>
        </div>
    );
};

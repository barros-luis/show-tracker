import React from 'react';
import { WatchlistItem } from '../../../types/watchlist';

interface ListSectionProps {
    listId: number;
    title?: string;
    items: WatchlistItem[];
}

export const ListSection: React.FC<ListSectionProps> = ({ listId, title, items }) => {
    // Filter items belonging to this list
    const listItems = items.filter(item => item.list_id === listId);

    if (listItems.length === 0) return null;

    return (
        <div className="mb-10 animate-fade-in relative group/section">
            <h3 className="text-2xl font-semibold tracking-wide mb-5 text-white/90 px-2 relative z-10">
                {title || "Featured List"}
            </h3>

            <div className="relative">
                <div className="relative bg-gradient-to-br from-white/10 to-transparent backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-3 overflow-x-auto scrollbar-hide z-10">
                    <div className="flex gap-3">
                        {listItems.map((item) => (
                            <div
                                key={item.id}
                                className="relative group shrink-0 w-24 md:w-28 aspect-[2/3] rounded-lg overflow-hidden shadow-md border border-black/10 dark:border-white/20"
                            >
                                <img
                                    src={item.image_url}
                                    alt={item.title}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end p-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 ease-out">
                                    <span className="text-white text-[10px] font-medium line-clamp-2 leading-tight drop-shadow-md">{item.title}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

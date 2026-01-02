import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WatchlistItem } from '../../types/watchlist';
import { motion, AnimatePresence } from 'framer-motion';

interface ScrollableRowProps {
    items: WatchlistItem[];
    onItemClick: (item: WatchlistItem) => void;
}

export const ScrollableRow: React.FC<ScrollableRowProps> = ({
    items,
    onItemClick
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [hasScroll, setHasScroll] = useState(false);

    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [hasMoved, setHasMoved] = useState(false);

    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setCanScrollLeft(scrollLeft > 0);
            // Use a small buffer (1px) for float calculation variances
            setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
            setHasScroll(scrollWidth > clientWidth);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        // Also check after a short timeout to allow for image loading/layout shifts
        const timeout = setTimeout(checkScroll, 100);
        return () => {
            window.removeEventListener('resize', checkScroll);
            clearTimeout(timeout);
        };
    }, [items]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 600; // Scroll roughly 3-4 items
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
            // checkScroll will be triggered by onScroll event
        }
    };

    // Drag to verify logic
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        setHasMoved(false);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll-fast multiplier

        // If moved more than a few pixels, count it as a drag (to prevent click)
        if (Math.abs(walk) > 5) {
            setHasMoved(true);
        }

        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleItemClick = (item: WatchlistItem) => {
        if (!hasMoved) {
            onItemClick(item);
        }
    };

    return (
        <div className="relative group">
            {/* Left Arrow */}
            <AnimatePresence>
                {hasScroll && canScrollLeft && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => scroll('left')}
                        className="absolute left-0 top-0 bottom-0 z-[60] w-20 bg-gradient-to-r from-blue-50/90 via-blue-50/40 to-transparent dark:from-gray-950/90 dark:via-gray-950/40 flex items-center justify-start pl-2 text-black dark:text-white opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                    >
                        <ChevronLeft size={32} className="drop-shadow-lg pointer-events-none" />
                    </motion.button>
                )}
            </AnimatePresence>

            <div
                ref={scrollContainerRef}
                onScroll={checkScroll}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className={`flex gap-4 overflow-x-auto scrollbar-hide p-4 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    // Disable smooth scrolling during drag to prevent jitter
                    scrollBehavior: isDragging ? 'auto' : 'smooth'
                }}
            >
                {items.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={`flex-shrink-0 w-36 md:w-48 group/card relative hover:z-50 ${!isDragging ? 'cursor-pointer' : ''}`}
                    >
                        <div className={`relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg transition-transform duration-300 ${!isDragging ? 'hover:scale-105' : ''}`}>
                            <img
                                src={item.image_url}
                                alt={item.title}
                                className="h-full w-full object-cover pointer-events-none" // prevent image drag ghost
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity">
                                <div className="absolute bottom-0 left-0 right-0 p-2">
                                    <p className="text-xs md:text-sm font-medium line-clamp-2" style={{ color: 'white' }}>{item.title}</p>
                                    <p className="text-blue-400 text-[10px] md:text-xs font-mono">EP {item.watched_episodes}/{item.total_episodes || '?'}</p>
                                </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900/80">
                                <div
                                    className="h-full bg-blue-500"
                                    style={{ width: `${Math.min(100, (item.watched_episodes / (item.total_episodes || 1)) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Right Arrow */}
            <AnimatePresence>
                {hasScroll && canScrollRight && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => scroll('right')}
                        className="absolute right-0 top-0 bottom-0 z-[60] w-20 bg-gradient-to-l from-blue-50/90 via-blue-50/40 to-transparent dark:from-gray-950/90 dark:via-gray-950/40 flex items-center justify-end pr-2 text-black dark:text-white opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                    >
                        <ChevronRight size={32} className="drop-shadow-lg pointer-events-none" />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
};

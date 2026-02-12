import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaItem } from '../../api/mediaTypes';
import { MediaCard } from '../cards/MediaCard';

interface RecommendationRowProps {
    title: string;
    items: MediaItem[];
    onItemClick: (item: MediaItem) => void;
}

export const RecommendationRow: React.FC<RecommendationRowProps> = ({
    title,
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

    // Drag to scroll logic
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

    if (items.length === 0) return null;

    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 px-1 text-gray-900 dark:text-gray-100">{title}</h2>

            <div className="relative group">
                {/* Left Edge Gradient - Always visible when can scroll */}
                {hasScroll && canScrollLeft && (
                    <div className="absolute left-0 top-0 bottom-0 z-10 w-12 sm:w-16 bg-gradient-to-r from-blue-50/77 via-blue-50/37 to-transparent dark:from-gray-950/77 dark:via-gray-950/37 pointer-events-none" />
                )}

                {/* Left Arrow - Desktop Only */}
                <AnimatePresence>
                    {hasScroll && canScrollLeft && (
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => scroll('left')}
                            className="hidden sm:flex absolute left-0 top-0 bottom-0 z-20 w-16 items-center justify-start pl-2 text-black dark:text-white opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                        >
                            <ChevronLeft size={28} className="drop-shadow-lg pointer-events-none" />
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
                    className={`flex gap-4 overflow-x-auto scrollbar-hide px-1 py-4 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch',
                        scrollBehavior: isDragging ? 'auto' : 'smooth'
                    }}
                >
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className={`flex-shrink-0 w-36 md:w-48 ${!isDragging ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                                if (!hasMoved) onItemClick(item);
                            }}
                        >
                            <MediaCard
                                media={item}
                                onClick={() => { }} // Handle click in wrapper
                            />
                        </div>
                    ))}
                </div>

                {/* Right Edge Gradient - Always visible when can scroll */}
                {hasScroll && canScrollRight && (
                    <div className="absolute right-0 top-0 bottom-0 z-10 w-12 sm:w-16 bg-gradient-to-l from-blue-50/75 via-blue-50/35 to-transparent dark:from-gray-950/75 dark:via-gray-950/35 pointer-events-none" />
                )}

                {/* Right Arrow - Desktop Only */}
                <AnimatePresence>
                    {hasScroll && canScrollRight && (
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => scroll('right')}
                            className="hidden sm:flex absolute right-0 top-0 bottom-0 z-20 w-16 items-center justify-end pr-2 text-black dark:text-white opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                        >
                            <ChevronRight size={28} className="drop-shadow-lg pointer-events-none" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

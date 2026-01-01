import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Tv, Sparkles, ChevronLeft, ChevronRight, ChevronDown, Edit2, X, Folder } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MyListDetailModal } from "../components/modals/MyListDetailModalWrapper";
import { ListManageModal } from "../components/modals/ListManageModal";
import { useAuthContext } from "../context/AuthContext";
import { getListIcon } from "../utils/constants";

export function MyListPage() {
    const navigate = useNavigate();
    const [, setSearchParams] = useSearchParams();
    const {
        session,
        supabase,
        myList,
        fetchMyList,
        removeFromList,
        updateEpisodeCount,
        updateTotalEpisodes,
        updateStatus,
        updateListId,
        userLists,
        updateUserLists,
        showToast,
        watchlistLoading,
    } = useAuthContext();

    console.log("[MyListPage] Render. Session:", !!session, "Loading:", watchlistLoading, "Items:", myList.length);

    // Redirect to search if not logged in
    useEffect(() => {
        if (!session) {
            navigate("/");
        }
    }, [session, navigate]);

    // Refresh data when page loads
    useEffect(() => {
        fetchMyList();
    }, [fetchMyList]);

    // Filter state
    const [mediaTypeFilters, setMediaTypeFilters] = useState<Set<string>>(new Set());
    const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const statusDropdownRef = useRef<HTMLDivElement>(null);

    // Modal state
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isListManageModalOpen, setListManageModalOpen] = useState(false);

    // Helpers to sync URL
    const openModal = (item: any) => {
        setSelectedItem(item);
        setSearchParams({ view: 'modal' });
    };

    const closeModal = () => {
        setSelectedItem(null);
        setSearchParams({});
    };

    // Close status dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setShowStatusDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleRemove = async (item: any) => {
        await removeFromList(item.id);
        showToast(`${item.title} removed from your list`, 'success');
        closeModal();
    };

    if (!session) return null;

    if (watchlistLoading && myList.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <>
            <MyListDetailModal
                item={selectedItem}
                isOpen={selectedItem !== null}
                onClose={closeModal}
                onRemove={handleRemove}
                onEpisodeUpdate={updateEpisodeCount}
                onTotalEpisodesUpdate={updateTotalEpisodes}
                onStatusUpdate={(itemId, status) => updateStatus(itemId, status as any)}
                onListChange={updateListId}
                userLists={userLists}
                supabase={supabase}
                userId={session?.user?.id || null}
                showToast={showToast}
            />

            <ListManageModal
                isOpen={isListManageModalOpen}
                onClose={() => setListManageModalOpen(false)}
                lists={userLists}
                onListsChange={updateUserLists}
                supabase={supabase}
                userId={session?.user?.id || ""}
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
            >
                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Media Type Filters */}
                    <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
                        {[
                            { value: 'anime', label: 'Anime', icon: <Sparkles size={12} />, color: 'purple' },
                            { value: 'movie', label: 'Movies', icon: <Film size={12} />, color: 'red' },
                            { value: 'tv', label: 'Series', icon: <Tv size={12} />, color: 'green' },
                        ].map(type => {
                            const isActive = mediaTypeFilters.has(type.value);
                            return (
                                <button
                                    key={type.value}
                                    onClick={() => {
                                        const newFilters = new Set(mediaTypeFilters);
                                        if (isActive) {
                                            newFilters.delete(type.value);
                                        } else {
                                            newFilters.add(type.value);
                                        }
                                        setMediaTypeFilters(newFilters);
                                    }}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${isActive
                                        ? `bg-${type.color}-500 text-white`
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {type.icon} {type.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Status Filters */}
                    <div className="relative" ref={statusDropdownRef}>
                        <button
                            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                        >
                            {statusFilters.size === 0
                                ? 'All Statuses'
                                : statusFilters.size === 1
                                    ? Array.from(statusFilters)[0].split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
                                    : `${statusFilters.size} statuses`}
                            <ChevronDown size={12} className={`transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showStatusDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden min-w-[160px]"
                                >
                                    <button
                                        onClick={() => {
                                            setStatusFilters(new Set());
                                            setShowStatusDropdown(false);
                                        }}
                                        className={`w-full px-3 py-2 text-left text-xs font-medium cursor-pointer transition-colors ${statusFilters.size === 0
                                            ? 'bg-blue-500/20 text-white'
                                            : 'text-gray-300 hover:bg-gray-700'
                                            }`}
                                    >
                                        All Statuses
                                    </button>

                                    {[
                                        { value: 'WATCHING', label: 'Watching' },
                                        { value: 'PLANNED', label: 'Planned' },
                                        { value: 'FINISHED', label: 'Finished' },
                                        { value: 'ON_HOLD', label: 'On Hold' },
                                        { value: 'REWATCHING', label: 'Re-watching' },
                                        { value: 'REWATCHED', label: 'Re-watched' },
                                    ].map(option => {
                                        const isActive = statusFilters.has(option.value);
                                        return (
                                            <button
                                                key={option.value}
                                                onClick={() => {
                                                    const newFilters = new Set(statusFilters);
                                                    if (isActive) {
                                                        newFilters.delete(option.value);
                                                    } else {
                                                        newFilters.add(option.value);
                                                    }
                                                    setStatusFilters(newFilters);
                                                }}
                                                className={`w-full px-3 py-2 text-left text-xs font-medium cursor-pointer transition-colors flex items-center gap-2 ${isActive
                                                    ? 'bg-blue-500/20 text-white'
                                                    : 'text-gray-300 hover:bg-gray-700'
                                                    }`}
                                            >
                                                <div className={`w-3 h-3 rounded border ${isActive ? 'bg-blue-500 border-blue-500' : 'border-gray-500'}`}>
                                                    {isActive && <span className="text-white text-[8px] flex items-center justify-center">✓</span>}
                                                </div>
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Clear Filters */}
                    {(mediaTypeFilters.size > 0 || statusFilters.size > 0) && (
                        <button
                            onClick={() => {
                                setMediaTypeFilters(new Set());
                                setStatusFilters(new Set());
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                            <X size={12} /> Clear Filters
                        </button>
                    )}

                    {/* Edit Lists Button */}
                    <button
                        onClick={() => setListManageModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
                    >
                        <Edit2 size={12} /> Edit Lists
                    </button>
                </div>

                {/* List Rows */}
                {userLists
                    .sort((a, b) => a.position - b.position)
                    .map(list => {
                        const listItems = myList.filter((item: any) => {
                            if (item.list_id !== list.id) return false;
                            if (mediaTypeFilters.size > 0 && !mediaTypeFilters.has(item.media_type)) return false;
                            if (statusFilters.size > 0 && !statusFilters.has(item.status)) return false;
                            return true;
                        });

                        if (listItems.length === 0) return null;

                        return (
                            <div key={list.id} className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className={`text-${list.color}-400`}>{getListIcon(list.icon, 20)}</span>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{list.name}</h2>
                                    <span className="text-gray-500 text-sm">({listItems.length})</span>
                                </div>

                                <div className="relative group">
                                    <div
                                        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
                                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                    >
                                        {listItems.map((item: any) => (
                                            <div
                                                key={item.id}
                                                onClick={() => openModal(item)}
                                                className="flex-shrink-0 w-36 cursor-pointer group/card"
                                            >
                                                <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform duration-300">
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.title}
                                                        className="h-full w-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                        <div className="absolute bottom-0 left-0 right-0 p-2">
                                                            <p className="text-xs font-medium line-clamp-2" style={{ color: 'white' }}>{item.title}</p>
                                                            <p className="text-blue-400 text-[10px] font-mono">EP {item.watched_episodes}/{item.total_episodes || '?'}</p>
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

                                    <button
                                        onClick={(e) => {
                                            const container = (e.target as HTMLElement).parentElement?.querySelector('.overflow-x-auto');
                                            container?.scrollBy({ left: -300, behavior: 'smooth' });
                                        }}
                                        className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-black/70 rounded-full flex items-center justify-center text-gray-800 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-gray-100 dark:hover:bg-black shadow-lg"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            const container = (e.target as HTMLElement).parentElement?.querySelector('.overflow-x-auto');
                                            container?.scrollBy({ left: 300, behavior: 'smooth' });
                                        }}
                                        className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-black/70 rounded-full flex items-center justify-center text-gray-800 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-gray-100 dark:hover:bg-black shadow-lg"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                {/* Uncategorized Items */}
                {(() => {
                    const uncategorizedItems = myList.filter((item: any) => {
                        if (item.list_id !== null) return false;
                        if (mediaTypeFilters.size > 0 && !mediaTypeFilters.has(item.media_type)) return false;
                        if (statusFilters.size > 0 && !statusFilters.has(item.status)) return false;
                        return true;
                    });

                    if (uncategorizedItems.length === 0) return null;

                    return (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400"><Folder size={20} /></span>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Uncategorized</h2>
                                <span className="text-gray-500 text-sm">({uncategorizedItems.length})</span>
                            </div>
                            <div className="relative group">
                                <div
                                    className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    {uncategorizedItems.map((item: any) => (
                                        <div
                                            key={item.id}
                                            onClick={() => openModal(item)}
                                            className="flex-shrink-0 w-36 cursor-pointer group/card"
                                        >
                                            <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform duration-300">
                                                <img
                                                    src={item.image_url}
                                                    alt={item.title}
                                                    className="h-full w-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent">
                                                    <div className="absolute bottom-0 left-0 right-0 p-2">
                                                        <p className="text-xs font-medium line-clamp-2 drop-shadow-lg" style={{ color: 'white' }}>{item.title}</p>
                                                        <p className="text-blue-400 text-[10px] font-mono drop-shadow-lg">EP {item.watched_episodes}/{item.total_episodes || '?'}</p>
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
                            </div>
                        </div>
                    );
                })()}

                {/* Empty State */}
                {myList.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-gray-500 text-xl">Your list is empty.</p>
                        <button onClick={() => navigate("/")} className="text-blue-400 mt-2 hover:underline cursor-pointer">
                            Go search for something!
                        </button>
                    </div>
                )}
            </motion.div>
        </>
    );
}

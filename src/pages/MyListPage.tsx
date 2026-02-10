import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Tv, Sparkles, ChevronDown, Edit2, X, Folder, Filter, Pencil } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MyListDetailModal } from "../components/modals/MyListDetailModalWrapper";
import { ListManageModal } from "../components/modals/ListManageModal";
import { StatusManageModal } from "../components/modals/StatusManageModal";
import { useAuthContext } from "../context/AuthContext";
import { getListIcon } from "../utils/constants";
import { ScrollableRow } from "../components/common/ScrollableRow";

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
        userStatuses,
        updateUserStatuses,
        showToast,
        watchlistLoading,
        touchWatchlistItem,
    } = useAuthContext();
    const { t } = useTranslation();

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
    const [listFilters, setListFilters] = useState<Set<number | null>>(new Set());
    const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
    const [showMediaTypeDropdown, setShowMediaTypeDropdown] = useState(false);
    const [showListDropdown, setShowListDropdown] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const mediaTypeDropdownRef = useRef<HTMLDivElement>(null);
    const listDropdownRef = useRef<HTMLDivElement>(null);
    const statusDropdownRef = useRef<HTMLDivElement>(null);

    // Modal state
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isListManageModalOpen, setListManageModalOpen] = useState(false);
    const [isStatusManageModalOpen, setStatusManageModalOpen] = useState(false);

    // Helpers to sync URL
    const openModal = (item: any) => {
        setSelectedItem(item);
        setSearchParams({ view: 'modal' });
        // Update updated_at timestamp so it moves to top
        touchWatchlistItem(item.id);
    };

    // Keep selectedItem in sync with myList updates (Realtime)
    useEffect(() => {
        if (selectedItem) {
            const updatedItem = myList.find((item: any) => item.id === selectedItem.id);
            if (updatedItem) {
                setSelectedItem(updatedItem);
            }
        }
    }, [myList, selectedItem?.id]); // Only re-run if myList changes or we switch items

    const closeModal = () => {
        setSelectedItem(null);
        setSearchParams({});
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setShowStatusDropdown(false);
            }
            if (mediaTypeDropdownRef.current && !mediaTypeDropdownRef.current.contains(event.target as Node)) {
                setShowMediaTypeDropdown(false);
            }
            if (listDropdownRef.current && !listDropdownRef.current.contains(event.target as Node)) {
                setShowListDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleRemove = async (item: any) => {
        await removeFromList(item.id);
        showToast(t('list.removed', { title: item.title }), 'success');
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
                userStatuses={userStatuses}
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
                showToast={showToast}
            />

            <StatusManageModal
                isOpen={isStatusManageModalOpen}
                onClose={() => setStatusManageModalOpen(false)}
                statuses={userStatuses}
                onStatusesChange={updateUserStatuses}
                supabase={supabase}
                userId={session?.user?.id || ""}
                showToast={showToast}
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
            >
                {/* Filter Bar - All items in one row */}
                <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3 mb-6">
                    {/* Media Type Filter Dropdown */}
                    <div className="relative" ref={mediaTypeDropdownRef}>
                        <button
                            onClick={() => setShowMediaTypeDropdown(!showMediaTypeDropdown)}
                            className="h-7 sm:h-9 px-3 sm:px-4 rounded-full text-[11px] sm:text-sm font-medium bg-white/80 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 border border-gray-200 dark:border-transparent whitespace-nowrap"
                        >
                            <Filter size={12} />
                            {mediaTypeFilters.size === 0
                                ? t('search.all_types')
                                : mediaTypeFilters.size === 3
                                    ? t('search.all_types')
                                    : `${mediaTypeFilters.size} ${t('search.selected')}`}
                            <ChevronDown size={12} className={`transition-transform ${showMediaTypeDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showMediaTypeDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden min-w-[150px]"
                                >
                                    <button
                                        onClick={() => setMediaTypeFilters(new Set())}
                                        className={`w-full px-3 py-2 text-left text-xs font-medium cursor-pointer transition-colors flex items-center gap-2 ${mediaTypeFilters.size === 0
                                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${mediaTypeFilters.size === 0 ? 'bg-blue-500' : 'bg-transparent'}`} />
                                        {t('search.all_types')}
                                    </button>

                                    <div className="h-[1px] bg-gray-200 dark:bg-gray-700" />

                                    {[
                                        { value: 'anime', label: t('media_types.anime'), icon: <Sparkles size={12} />, color: 'purple' },
                                        { value: 'movie', label: t('media_types.movie'), icon: <Film size={12} />, color: 'red' },
                                        { value: 'tv', label: t('media_types.tv'), icon: <Tv size={12} />, color: 'green' },
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
                                                className={`w-full px-3 py-2 text-left text-xs font-medium cursor-pointer transition-colors flex items-center gap-2 ${isActive
                                                    ? `bg-${type.color}-500/10 text-${type.color}-600 dark:text-${type.color}-400`
                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                <div className={`w-2 h-2 rounded-full ${isActive ? `bg-${type.color}-500` : 'bg-transparent'}`} />
                                                <span className={isActive ? `text-${type.color}-500` : 'opacity-60'}>{type.icon}</span>
                                                {type.label}
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* List Filter Dropdown */}
                    <div className="relative" ref={listDropdownRef}>
                        <button
                            onClick={() => setShowListDropdown(!showListDropdown)}
                            className="h-7 sm:h-9 px-3 sm:px-4 rounded-full text-[11px] sm:text-sm font-medium bg-white/80 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 border border-gray-200 dark:border-transparent whitespace-nowrap"
                        >
                            <Folder size={12} />
                            {listFilters.size === 0
                                ? t('list.all_lists')
                                : listFilters.size === 1
                                    ? (Array.from(listFilters)[0] === null
                                        ? t('list.uncategorized')
                                        : userLists.find(l => l.id === Array.from(listFilters)[0])?.name || t('list.all_lists'))
                                    : `${listFilters.size} ${t('search.selected')}`}
                            <ChevronDown size={12} className={`transition-transform ${showListDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showListDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden min-w-[160px]"
                                >
                                    {/* All Lists Option */}
                                    <button
                                        onClick={() => {
                                            setListFilters(new Set());
                                            setShowListDropdown(false);
                                        }}
                                        className={`w-full px-3 py-2 text-left text-xs font-medium cursor-pointer transition-colors flex items-center gap-2 ${listFilters.size === 0
                                            ? 'bg-blue-500/20 text-blue-600 dark:text-white'
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${listFilters.size === 0 ? 'bg-blue-500' : 'bg-transparent'}`} />
                                        {t('list.all_lists')}
                                    </button>

                                    {/* User Lists */}
                                    {userLists
                                        .sort((a, b) => a.position - b.position)
                                        .map(list => {
                                            const isActive = listFilters.has(list.id);
                                            return (
                                                <button
                                                    key={list.id}
                                                    onClick={() => {
                                                        const newFilters = new Set(listFilters);
                                                        if (isActive) {
                                                            newFilters.delete(list.id);
                                                        } else {
                                                            newFilters.add(list.id);
                                                        }
                                                        setListFilters(newFilters);
                                                    }}
                                                    className={`w-full px-3 py-2 text-left text-xs font-medium cursor-pointer transition-colors flex items-center gap-2 ${isActive
                                                        ? 'bg-blue-500/20 text-blue-600 dark:text-white'
                                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                        }`}
                                                >
                                                    <span className={`text-${list.color}-400`}>{getListIcon(list.icon, 12)}</span>
                                                    {list.name}
                                                </button>
                                            );
                                        })}

                                    {/* Uncategorized Option */}
                                    <button
                                        onClick={() => {
                                            const newFilters = new Set(listFilters);
                                            if (listFilters.has(null)) {
                                                newFilters.delete(null);
                                            } else {
                                                newFilters.add(null);
                                            }
                                            setListFilters(newFilters);
                                        }}
                                        className={`w-full px-3 py-2 text-left text-xs font-medium cursor-pointer transition-colors flex items-center gap-2 ${listFilters.has(null)
                                            ? 'bg-blue-500/20 text-blue-600 dark:text-white'
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <Folder size={12} className="text-gray-400" />
                                        {t('list.uncategorized')}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Status Filters Dropdown + Edit Button */}
                    <div className="flex items-center gap-1.5">
                        <div className="relative" ref={statusDropdownRef}>
                            <button
                                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                className="h-7 sm:h-9 px-3 sm:px-4 rounded-full text-[11px] sm:text-sm font-medium bg-white/80 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 border border-gray-200 dark:border-transparent whitespace-nowrap"
                            >
                                {statusFilters.size === 0
                                    ? t('status.all')
                                    : statusFilters.size === 1
                                        ? userStatuses.find(s => s.value === Array.from(statusFilters)[0])?.label || Array.from(statusFilters)[0]
                                        : `${statusFilters.size} ${t('search.selected')}`}
                                <ChevronDown size={12} className={`transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {showStatusDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden min-w-[160px]"
                                    >
                                        <button
                                            onClick={() => {
                                                setStatusFilters(new Set());
                                                setShowStatusDropdown(false);
                                            }}
                                            className={`w-full px-3 py-2 text-left text-xs font-medium cursor-pointer transition-colors ${statusFilters.size === 0
                                                ? 'bg-blue-500/20 text-blue-600 dark:text-white'
                                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            {t('status.all')}
                                        </button>

                                        {userStatuses
                                            .sort((a, b) => a.position - b.position)
                                            .map(status => {
                                                const isActive = statusFilters.has(status.value);
                                                return (
                                                    <button
                                                        key={status.value}
                                                        onClick={() => {
                                                            const newFilters = new Set(statusFilters);
                                                            if (isActive) {
                                                                newFilters.delete(status.value);
                                                            } else {
                                                                newFilters.add(status.value);
                                                            }
                                                            setStatusFilters(newFilters);
                                                        }}
                                                        className={`w-full px-3 py-2 text-left text-xs font-medium cursor-pointer transition-colors flex items-center gap-2 ${isActive
                                                            ? 'bg-blue-500/20 text-blue-600 dark:text-white'
                                                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                            }`}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full bg-${status.color}-500 ${isActive ? '' : 'opacity-60'}`} />
                                                        {status.label}
                                                    </button>
                                                );
                                            })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Edit Statuses Icon - Outside dropdown but in same row */}
                        <button
                            onClick={() => setStatusManageModalOpen(true)}
                            className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-gray-200/80 dark:bg-gray-700/50 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-all cursor-pointer border border-gray-300 dark:border-transparent"
                            title={t('list.edit_statuses')}
                        >
                            <Pencil size={12} />
                        </button>
                    </div>

                    {/* Clear Filters (same row as Types and Statuses) */}
                    {(mediaTypeFilters.size > 0 || listFilters.size > 0 || statusFilters.size > 0) && (
                        <button
                            onClick={() => {
                                setMediaTypeFilters(new Set());
                                setListFilters(new Set());
                                setStatusFilters(new Set());
                            }}
                            className="h-7 px-3 rounded-full text-[11px] sm:text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                        >
                            <X size={12} /> {t('search.clear')}
                        </button>
                    )}
                </div>

                {/* Row 2: Edit Lists Button Only */}
                <div className="flex items-center">
                    <button
                        onClick={() => setListManageModalOpen(true)}
                        className="h-7 sm:h-9 px-3 sm:px-4 rounded-full text-[11px] sm:text-sm font-medium bg-blue-500 hover:bg-blue-600 !text-white dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 whitespace-nowrap btn-animated"
                    >
                        <Edit2 size={12} /> {t('list.edit_lists')}
                    </button>
                </div>

                {/* List Rows */}
                {userLists
                    .sort((a, b) => a.position - b.position)
                    .map(list => {
                        const listItems = myList.filter((item: any) => {
                            if (item.list_id !== list.id) return false;
                            if (listFilters.size > 0 && !listFilters.has(item.list_id)) return false;
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

                                <ScrollableRow items={listItems} onItemClick={openModal} />
                            </div>
                        );
                    })}

                {/* Uncategorized Items */}
                {(() => {
                    const uncategorizedItems = myList.filter((item: any) => {
                        if (item.list_id !== null) return false;
                        if (listFilters.size > 0 && !listFilters.has(null)) return false;
                        if (mediaTypeFilters.size > 0 && !mediaTypeFilters.has(item.media_type)) return false;
                        if (statusFilters.size > 0 && !statusFilters.has(item.status)) return false;
                        return true;
                    });

                    if (uncategorizedItems.length === 0) return null;

                    return (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400"><Folder size={20} /></span>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('list.uncategorized')}</h2>
                                <span className="text-gray-500 text-sm">({uncategorizedItems.length})</span>
                            </div>
                            <ScrollableRow items={uncategorizedItems} onItemClick={openModal} />
                        </div>
                    );
                })()}

                {/* Empty State */}
                {myList.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-gray-500 text-xl">{t('list.empty_title')}</p>
                        <button onClick={() => navigate("/")} className="text-blue-400 mt-2 hover:underline cursor-pointer">
                            {t('list.empty_action')}
                        </button>
                    </div>
                )}
            </motion.div >
        </>
    );
}
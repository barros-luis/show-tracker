import React, { useState } from 'react';
import { Search, Loader2, X, Plus, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MediaItem } from '../../../api/mediaTypes';
import { searchAnimeViaTMDB } from '../../../api/animeService';
import { searchMovies, searchTVShows } from '../../../api/tmdb';
import { tmdbAnimeToMediaItem, movieToMediaItem, tvToMediaItem } from '../../../api/mediaTypes';
import { MediaCard } from '../../cards/MediaCard';

interface CustomGroupPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (selectedItems: MediaItem[]) => void;
    watchlist?: any[]; // WatchlistItem[]
    title?: string;
}

export const CustomGroupPickerModal: React.FC<CustomGroupPickerModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    watchlist = [],
    title = "Create Collection"
}) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<MediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'anime' | 'movie' | 'tv' | 'list'>('anime');

    // Selection State
    const [selectedItems, setSelectedItems] = useState<MediaItem[]>([]);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // For 'list' tab, we can search even with empty query (to show all)
        if (!query.trim() && activeTab !== 'list') return;

        setIsLoading(true);
        setResults([]);
        try {
            let media: MediaItem[] = [];
            if (activeTab === 'anime') {
                const animeResults = await searchAnimeViaTMDB(query);
                media = animeResults.map(tmdbAnimeToMediaItem);
            } else if (activeTab === 'movie') {
                const movieResults = await searchMovies(query);
                media = movieResults.map(movieToMediaItem);
            } else if (activeTab === 'tv') {
                const tvResults = await searchTVShows(query);
                media = tvResults.map(tvToMediaItem);
            } else if (activeTab === 'list') {
                // Filter watchlist locally
                const filtered = watchlist.filter(item =>
                    item.title.toLowerCase().includes(query.toLowerCase())
                );

                // Map WatchlistItem to MediaItem
                media = filtered.map(item => ({
                    id: item.mal_id || item.tmdb_id || item.id, // Fallback ID
                    sourceId: item.mal_id || item.tmdb_id || 0,
                    type: item.media_type,
                    title: item.title,
                    imageUrl: item.image_url,
                    largeImageUrl: item.image_url, // WatchlistItem might not have separate large image
                    description: "", // WatchlistItem doesn't have description
                    year: null,
                    score: item.score || 0
                } as MediaItem));
            }
            setResults(media);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-search when switching to list tab
    React.useEffect(() => {
        if (activeTab === 'list' && isOpen) {
            handleSearch();
        }
    }, [activeTab, isOpen]);

    const toggleSelection = (item: MediaItem) => {
        if (selectedItems.find(i => i.id === item.id)) {
            setSelectedItems(selectedItems.filter(i => i.id !== item.id));
        } else {
            setSelectedItems([...selectedItems, item]);
        }
    };

    const handleDone = () => {
        onSelect(selectedItems);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                        <p className="text-sm text-gray-500">{selectedItems.length} items selected</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDone}
                            disabled={selectedItems.length === 0}
                            className="px-6 py-2 bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
                        >
                            Done
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Search & Results */}
                    <div className="flex-1 flex flex-col border-r border-gray-100 dark:border-gray-800 overflow-hidden">

                        {/* Search Bar & Tabs */}
                        <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                            {/* Tabs */}
                            <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-xl">
                                {(['anime', 'movie', 'tv', 'list'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        {tab === 'list' ? 'My List' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={handleSearch} className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={`Search for ${activeTab}...`}
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    autoFocus
                                />
                            </form>
                        </div>

                        {/* Search Results */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {isLoading ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="animate-spin text-blue-500" size={32} />
                                </div>
                            ) : results.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {results.map((item) => {
                                        const isSelected = selectedItems.some(i => i.id === item.id);
                                        return (
                                            <div key={item.id} className="relative group cursor-pointer" onClick={() => toggleSelection(item)}>
                                                <div className={`transition-all duration-200 ${isSelected ? 'ring-4 ring-blue-500 rounded-xl scale-95' : 'hover:scale-105'}`}>
                                                    <MediaCard
                                                        media={item}
                                                        onClick={() => { }} // We handle click on parent
                                                    />
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full shadow-lg z-10">
                                                        <Check size={16} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-gray-400">
                                    {query ? 'No results found' : 'Search to add items to your collection'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Selected Items */}
                    <div className="w-80 flex flex-col bg-gray-50 dark:bg-gray-800/50">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="font-bold text-gray-900 dark:text-white">Selected ({selectedItems.length})</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {selectedItems.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 text-sm">
                                    No items selected
                                </div>
                            ) : (
                                selectedItems.map((item) => (
                                    <div key={item.id} className="flex gap-3 items-center p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 group">
                                        <img src={item.imageUrl} alt={item.title} className="w-10 h-14 object-cover rounded-md bg-gray-200" />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">{item.title}</h4>
                                            <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                                        </div>
                                        <button
                                            onClick={() => toggleSelection(item)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

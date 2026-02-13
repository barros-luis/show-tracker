import React from 'react';
import { X, Trash2, Star, List, Grid, ChevronUp, ChevronDown } from 'lucide-react';
import { ProfileSection, SectionType } from '../../types/profile';
import { SpotlightPickerModal } from './pickers/SpotlightPickerModal';
import { ListSectionPickerModal } from './pickers/ListSectionPickerModal';
import { CustomGroupPickerModal } from './pickers/CustomGroupPickerModal';
import { MediaItem } from '../../api/mediaTypes';
import { UserList } from '../../types/watchlist';

interface SectionManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    sections: ProfileSection[];
    onUpdateSections: (sections: ProfileSection[]) => void;
    onAddSection: (type: SectionType, data?: any) => void;
    userLists?: UserList[]; // To pass to ListPicker
    watchlist?: any[]; // WatchlistItem[] but avoiding circular deps if needed, or import it
}

export const SectionManagerModal: React.FC<SectionManagerModalProps> = ({
    isOpen,
    onClose,
    sections,
    onUpdateSections,
    onAddSection,
    userLists = [],
    watchlist = []
}) => {
    const [isSpotlightPickerOpen, setSpotlightPickerOpen] = React.useState(false);
    const [isListPickerOpen, setListPickerOpen] = React.useState(false);
    const [isCustomGroupPickerOpen, setCustomGroupPickerOpen] = React.useState(false);

    if (!isOpen) return null;

    const handleRemove = (id: string) => {
        const updated = sections.filter(s => s.id !== id);
        onUpdateSections(updated);
    };

    const handleSpotlightSelect = (media: MediaItem) => {
        onAddSection('spotlight', media);
        setSpotlightPickerOpen(false);
    };

    const handleListSelect = (listId: number) => {
        const list = userLists.find(l => l.id === listId);
        if (list) {
            onAddSection('list', { listId, title: list.name });
        }
        setListPickerOpen(false);
    };

    const handleCustomGroupSelect = (items: MediaItem[]) => {
        onAddSection('custom_group', items);
        setCustomGroupPickerOpen(false);
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Customize Profile</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">

                        {/* Add New Section Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            <button
                                onClick={() => setSpotlightPickerOpen(true)}
                                className="p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all flex flex-col items-center gap-2 group"
                            >
                                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full group-hover:scale-110 transition-transform">
                                    <Star size={24} />
                                </div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">Spotlight</span>
                                <span className="text-xs text-gray-500 text-center">Highlight your #1 favorite show</span>
                            </button>

                            <button
                                onClick={() => setListPickerOpen(true)}
                                className="p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all flex flex-col items-center gap-2 group"
                            >
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full group-hover:scale-110 transition-transform">
                                    <List size={24} />
                                </div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">Featured List</span>
                                <span className="text-xs text-gray-500 text-center">Showcase one of your lists</span>
                            </button>

                            <button
                                onClick={() => setCustomGroupPickerOpen(true)}
                                className="p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all flex flex-col items-center gap-2 group"
                            >
                                <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full group-hover:scale-110 transition-transform">
                                    <Grid size={24} />
                                </div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">Collection</span>
                                <span className="text-xs text-gray-500 text-center">Hand-pick a group of shows</span>
                            </button>
                        </div>

                        <div className="h-px bg-gray-100 dark:bg-gray-800 mb-8" />

                        {/* Current Sections List */}
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Current Sections</h3>

                        {sections.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                <p>No sections added yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sections.map((section, index) => (
                                    <div key={section.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">

                                        {/* Reorder Controls */}
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => {
                                                    if (index === 0) return;
                                                    const newSections = [...sections];
                                                    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
                                                    // Update order based on new index
                                                    const reorderedSections = newSections.map((s, i) => ({ ...s, order: i }));
                                                    onUpdateSections(reorderedSections);
                                                }}
                                                disabled={index === 0}
                                                className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                                            >
                                                <ChevronUp size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (index === sections.length - 1) return;
                                                    const newSections = [...sections];
                                                    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
                                                    // Update order based on new index
                                                    const reorderedSections = newSections.map((s, i) => ({ ...s, order: i }));
                                                    onUpdateSections(reorderedSections);
                                                }}
                                                disabled={index === sections.length - 1}
                                                className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                                            >
                                                <ChevronDown size={16} />
                                            </button>
                                        </div>

                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-700">
                                            {section.type === 'spotlight' && <Star size={20} className="text-purple-500" />}
                                            {section.type === 'list' && <List size={20} className="text-blue-500" />}
                                            {section.type === 'custom_group' && <Grid size={20} className="text-green-500" />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-900 dark:text-white truncate">
                                                {section.title || (section.type === 'spotlight' ? 'Spotlight' : section.type === 'list' ? 'Featured List' : 'Collection')}
                                            </h4>
                                            <p className="text-xs text-gray-500 capitalize">{section.type.replace('_', ' ')}</p>
                                        </div>

                                        <button
                                            onClick={() => handleRemove(section.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-700/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>

            {/* Sub Modals */}
            <SpotlightPickerModal
                isOpen={isSpotlightPickerOpen}
                onClose={() => setSpotlightPickerOpen(false)}
                onSelect={handleSpotlightSelect}
            />
            <ListSectionPickerModal
                isOpen={isListPickerOpen}
                onClose={() => setListPickerOpen(false)}
                userLists={userLists}
                onSelect={handleListSelect}
            />
            <CustomGroupPickerModal
                isOpen={isCustomGroupPickerOpen}
                onClose={() => setCustomGroupPickerOpen(false)}
                watchlist={watchlist}
                onSelect={handleCustomGroupSelect}
            />
        </>
    );
};

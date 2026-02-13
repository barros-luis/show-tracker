import React from 'react';
import { ProfileSection, SpotlightMedia } from '../../types/profile';
import { WatchlistItem } from '../../types/watchlist';
import { SpotlightSection } from './sections/SpotlightSection';
import { ListSection } from './sections/ListSection';
import { CustomGroupSection } from './sections/CustomGroupSection';

interface ProfileSectionsRendererProps {
    sections: ProfileSection[] | null;
    watchlist: WatchlistItem[];
}

export const ProfileSectionsRenderer: React.FC<ProfileSectionsRendererProps> = ({ sections, watchlist }) => {
    if (!sections || sections.length === 0) return null;

    // Sort by order
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);

    return (
        <div className="mt-16 animate-fade-in relative">
            {/* Showcase Header */}
            <div className="flex items-center gap-3 mb-8 px-4">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M12 3c7.2 0 9 1.8 9 9s-1.8 9-9 9-9-1.8-9-9 1.8-9 9-9z" />
                        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                        <path d="M16 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                        <path d="M8 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                        <path d="M16 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                    </svg>
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Showcase</h2>
            </div>

            {/* Showcase Container */}
            <div className="relative bg-gray-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 overflow-hidden min-h-[300px]">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none translate-y-1/3 -translate-x-1/4" />

                <div className="relative z-10 space-y-12">
                    {sortedSections.map(section => {
                        switch (section.type) {
                            case 'spotlight':
                                const spotlightContent = section.content as { type: 'spotlight', media: SpotlightMedia };
                                return (
                                    <SpotlightSection
                                        key={section.id}
                                        media={spotlightContent.media}
                                    />
                                );

                            case 'list':
                                const listContent = section.content as { type: 'list', list_id: number };
                                return (
                                    <ListSection
                                        key={section.id}
                                        listId={listContent.list_id}
                                        title={section.title}
                                        items={watchlist} // Pass full watchlist, component filters it
                                    />
                                );

                            case 'custom_group':
                                const groupContent = section.content as { type: 'custom_group', items: SpotlightMedia[] };
                                return (
                                    <CustomGroupSection
                                        key={section.id}
                                        title={section.title}
                                        items={groupContent.items}
                                    />
                                );

                            default:
                                return null;
                        }
                    })}
                </div>
            </div>
        </div>
    );
};

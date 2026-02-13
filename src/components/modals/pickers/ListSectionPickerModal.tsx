import React from 'react';
import { X, List } from 'lucide-react';
import { UserList } from '../../../types';

interface ListSectionPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    userLists: UserList[];
    onSelect: (listId: number) => void;
}

export const ListSectionPickerModal: React.FC<ListSectionPickerModalProps> = ({ isOpen, onClose, userLists, onSelect }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">

                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Select a List</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="overflow-y-auto p-4 flex flex-col gap-2">
                    {userLists.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            You don't have any custom lists yet.
                        </div>
                    ) : (
                        userLists.map(list => (
                            <button
                                key={list.id}
                                onClick={() => onSelect(list.id)}
                                className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left group border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                            >
                                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <List size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 dark:text-white">{list.name}</h3>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div >
    );
};

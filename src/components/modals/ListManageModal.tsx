import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, ChevronUp, ChevronDown, Check, Film, Tv, Sparkles, Folder, Gamepad2, Book, Music, Star, Heart, Flame, Zap, Moon } from "lucide-react";
import { SupabaseClient } from "@supabase/supabase-js";

export interface UserList {
    id: number;
    user_id: string;
    name: string;
    icon: string | null;
    color: string;
    is_default: boolean;
    position: number;
    created_at: string;
}

const COLOR_OPTIONS = [
    { value: "gray", bg: "bg-gray-500", text: "text-gray-400" },
    { value: "red", bg: "bg-red-500", text: "text-red-400" },
    { value: "orange", bg: "bg-orange-500", text: "text-orange-400" },
    { value: "yellow", bg: "bg-yellow-500", text: "text-yellow-400" },
    { value: "green", bg: "bg-green-500", text: "text-green-400" },
    { value: "cyan", bg: "bg-cyan-500", text: "text-cyan-400" },
    { value: "blue", bg: "bg-blue-500", text: "text-blue-400" },
    { value: "purple", bg: "bg-purple-500", text: "text-purple-400" },
    { value: "pink", bg: "bg-pink-500", text: "text-pink-400" },
];

// Icon options with lucide icon names
const ICON_OPTIONS = [
    { value: "folder", label: "Folder", Icon: Folder },
    { value: "film", label: "Film", Icon: Film },
    { value: "tv", label: "TV", Icon: Tv },
    { value: "sparkles", label: "Anime", Icon: Sparkles },
    { value: "gamepad", label: "Games", Icon: Gamepad2 },
    { value: "book", label: "Book", Icon: Book },
    { value: "music", label: "Music", Icon: Music },
    { value: "star", label: "Star", Icon: Star },
    { value: "heart", label: "Heart", Icon: Heart },
    { value: "flame", label: "Flame", Icon: Flame },
    { value: "zap", label: "Zap", Icon: Zap },
    { value: "moon", label: "Moon", Icon: Moon },
];

interface ListManageModalProps {
    isOpen: boolean;
    onClose: () => void;
    lists: UserList[];
    onListsChange: (lists: UserList[]) => void;
    supabase: SupabaseClient;
    userId: string;
    showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
}

export function ListManageModal({
    isOpen,
    onClose,
    lists,
    onListsChange,
    supabase,
    userId,
    showToast
}: ListManageModalProps) {
    const [editingList, setEditingList] = useState<UserList | null>(null);
    const [newListName, setNewListName] = useState("");
    const [newListIcon, setNewListIcon] = useState<string | null>(null);
    const [newListColor, setNewListColor] = useState("blue");
    const [showNewForm, setShowNewForm] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState<number | "new" | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState<number | "new" | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<UserList | null>(null);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);

    // Prevent body scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    const createList = async () => {
        if (!newListName.trim()) return;

        const { data, error } = await supabase
            .from('lists')
            .insert({
                user_id: userId,
                name: newListName.trim(),
                icon: newListIcon,
                color: newListColor,
                position: lists.length,
            })
            .select()
            .single();

        if (data && !error) {
            onListsChange([...lists, data]);
            setNewListName("");
            setNewListIcon(null);
            setNewListColor("blue");
            setShowNewForm(false);
            showToast("New list created successfully! It will show up once you add shows to it.", "success", 7000);
        }
    };

    const updateList = async (list: UserList) => {
        const { error } = await supabase
            .from('lists')
            .update({ name: list.name, icon: list.icon, color: list.color })
            .eq('id', list.id);

        if (!error) {
            onListsChange(lists.map(l => l.id === list.id ? list : l));
            setEditingList(null);
        }
    };

    const deleteList = async (listId: number) => {
        // Move items to null (uncategorized) and delete list
        await supabase.from('watchlist').update({ list_id: null }).eq('list_id', listId);
        await supabase.from('lists').delete().eq('id', listId);
        onListsChange(lists.filter(l => l.id !== listId));
    };

    const moveList = async (index: number, direction: 'up' | 'down') => {
        const sortedLists = [...lists].sort((a, b) => a.position - b.position);
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        if (newIndex < 0 || newIndex >= sortedLists.length) return;

        // Swap positions
        const temp = sortedLists[index].position;
        sortedLists[index].position = sortedLists[newIndex].position;
        sortedLists[newIndex].position = temp;

        // Update in database
        await supabase
            .from('lists')
            .update({ position: sortedLists[index].position })
            .eq('id', sortedLists[index].id);
        await supabase
            .from('lists')
            .update({ position: sortedLists[newIndex].position })
            .eq('id', sortedLists[newIndex].id);

        onListsChange([...sortedLists]);
    };

    const getColorClasses = (colorName: string) => {
        return COLOR_OPTIONS.find(c => c.value === colorName) || COLOR_OPTIONS[0];
    };

    // Render icon from string name
    const getIconComponent = (iconName: string | null, size: number = 18) => {
        const iconOption = ICON_OPTIONS.find(i => i.value === iconName);
        if (iconOption) {
            const IconComponent = iconOption.Icon;
            return <IconComponent size={size} />;
        }
        return <Folder size={size} />;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 w-full max-w-sm max-h-[60vh] flex flex-col relative"> {/* Reduced height and width */}
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
                                <h2 className="text-lg font-bold text-white">Manage Lists</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                                >
                                    <X size={20} className="text-gray-400" />
                                </button>
                            </div>

                            {/* List Items */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                                {lists
                                    .sort((a, b) => a.position - b.position)
                                    .map((list, index, sortedArr) => (
                                        <div
                                            key={list.id}
                                            className="relative flex items-center gap-3 p-3 rounded-xl border transition-all bg-gray-800/50 border-gray-700/50 hover:bg-gray-800"
                                        >
                                            {/* Reorder Buttons */}
                                            <div className="flex flex-col gap-0.5">
                                                <button
                                                    onClick={() => moveList(index, 'up')}
                                                    disabled={index === 0}
                                                    className={`p-0.5 rounded transition-colors cursor-pointer ${index === 0
                                                        ? 'text-gray-700 cursor-not-allowed'
                                                        : 'text-gray-500 hover:text-white hover:bg-gray-700'
                                                        }`}
                                                >
                                                    <ChevronUp size={14} />
                                                </button>
                                                <button
                                                    onClick={() => moveList(index, 'down')}
                                                    disabled={index === sortedArr.length - 1}
                                                    className={`p-0.5 rounded transition-colors cursor-pointer ${index === sortedArr.length - 1
                                                        ? 'text-gray-700 cursor-not-allowed'
                                                        : 'text-gray-500 hover:text-white hover:bg-gray-700'
                                                        }`}
                                                >
                                                    <ChevronDown size={14} />
                                                </button>
                                            </div>

                                            {/* Icon/Color */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowEmojiPicker(showEmojiPicker === list.id ? null : list.id)}
                                                    className={`w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-all ${getColorClasses(list.color).bg}/20 hover:scale-110 ${getColorClasses(list.color).text}`}
                                                >
                                                    {getIconComponent(list.icon, 18)}
                                                </button>

                                                {/* Icon Picker - Absolute Popup */}
                                                {showEmojiPicker === list.id && (
                                                    <div className="absolute top-12 left-0 z-[70] bg-gray-800 rounded-lg p-2 border border-gray-700 shadow-xl grid grid-cols-4 gap-1 min-w-[160px]">
                                                        {ICON_OPTIONS.map(iconOpt => (
                                                            <button
                                                                key={iconOpt.value}
                                                                onClick={() => {
                                                                    const updated = { ...list, icon: iconOpt.value };
                                                                    updateList(updated);
                                                                    setShowEmojiPicker(null);
                                                                }}
                                                                className={`p-2 hover:bg-gray-700 rounded cursor-pointer flex items-center justify-center ${list.icon === iconOpt.value ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400'}`}
                                                                title={iconOpt.label}
                                                            >
                                                                <iconOpt.Icon size={16} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Name */}
                                            {editingList?.id === list.id ? (
                                                <input
                                                    type="text"
                                                    value={editingList.name}
                                                    onChange={(e) => setEditingList({ ...editingList, name: e.target.value })}
                                                    onBlur={() => updateList(editingList)}
                                                    onKeyDown={(e) => e.key === "Enter" && updateList(editingList)}
                                                    autoFocus
                                                    className="flex-1 bg-gray-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => setEditingList(list)}
                                                    className="flex-1 text-white text-sm cursor-text hover:text-blue-400"
                                                >
                                                    {list.name}
                                                </span>
                                            )}

                                            {/* Color Picker Container */}
                                            <div className="relative static"> {/* static to prevent clipping contexts if possible, but we need relative for positioning */}
                                                <button
                                                    onClick={() => setShowColorPicker(showColorPicker === list.id ? null : list.id)}
                                                    className={`w-6 h-6 rounded-full ${getColorClasses(list.color).bg} cursor-pointer hover:scale-110 transition-transform`}
                                                />

                                                {/* Color Picker Popup */}
                                                {showColorPicker === list.id && (
                                                    <div className="absolute top-8 right-0 z-[70] bg-gray-800 rounded-lg p-2 border border-gray-700 shadow-xl grid grid-cols-5 gap-2 w-[180px]">
                                                        {COLOR_OPTIONS.map(color => (
                                                            <button
                                                                key={color.value}
                                                                onClick={() => {
                                                                    const updated = { ...list, color: color.value };
                                                                    updateList(updated);
                                                                    setShowColorPicker(null);
                                                                }}
                                                                className={`w-7 h-7 rounded-full ${color.bg} cursor-pointer hover:scale-110 transition-transform ${list.color === color.value ? "ring-2 ring-white ring-offset-2 ring-offset-gray-800" : ""
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Delete */}
                                            <button
                                                onClick={() => setConfirmDelete(list)}
                                                className="p-2 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}

                                {/* New List Form */}
                                {showNewForm ? (
                                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 space-y-3">
                                        {/* Row 1: Icon + Input */}
                                        <div className="flex items-center gap-2">
                                            {/* Icon Selector */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowEmojiPicker(showEmojiPicker === "new" ? null : "new")}
                                                    className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center cursor-pointer ${getColorClasses(newListColor).bg}/20 ${getColorClasses(newListColor).text}`}
                                                >
                                                    {getIconComponent(newListIcon, 18)}
                                                </button>

                                                {showEmojiPicker === "new" && (
                                                    <div className="absolute top-12 left-0 z-[70] bg-gray-800 rounded-lg p-2 border border-gray-700 shadow-xl grid grid-cols-4 gap-1 min-w-[160px]">
                                                        {ICON_OPTIONS.map(iconOpt => (
                                                            <button
                                                                key={iconOpt.value}
                                                                onClick={() => { setNewListIcon(iconOpt.value); setShowEmojiPicker(null); }}
                                                                className={`p-2 hover:bg-gray-700 rounded-lg cursor-pointer flex items-center justify-center transition-colors ${newListIcon === iconOpt.value ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400'}`}
                                                                title={iconOpt.label}
                                                            >
                                                                <iconOpt.Icon size={16} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Input */}
                                            <input
                                                type="text"
                                                value={newListName}
                                                onChange={(e) => setNewListName(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && createList()}
                                                placeholder="List name..."
                                                autoFocus
                                                className="flex-1 min-w-0 bg-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        {/* Row 2: Color + Actions */}
                                        <div className="flex items-center justify-between gap-2">
                                            {/* Color picker */}
                                            <div className="relative flex items-center gap-2">
                                                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Color:</span>
                                                <button
                                                    onClick={() => setShowColorPicker(showColorPicker === "new" ? null : "new")}
                                                    className={`w-6 h-6 rounded-full ${getColorClasses(newListColor).bg} cursor-pointer hover:scale-110 transition-transform ring-2 ring-gray-800`}
                                                />

                                                {showColorPicker === "new" && (
                                                    <div className="absolute bottom-8 left-0 z-[70] bg-gray-800 rounded-lg p-2 border border-gray-700 shadow-xl grid grid-cols-5 gap-2 w-[180px]">
                                                        {COLOR_OPTIONS.map(color => (
                                                            <button
                                                                key={color.value}
                                                                onClick={() => { setNewListColor(color.value); setShowColorPicker(null); }}
                                                                className={`w-7 h-7 rounded-full ${color.bg} cursor-pointer hover:scale-110 transition-transform ${newListColor === color.value ? "ring-2 ring-white ring-offset-2 ring-offset-gray-800" : ""
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => { setShowNewForm(false); setNewListName(""); }}
                                                    className="p-2 hover:bg-gray-700/50 rounded-lg text-gray-400 transition-colors cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={createList}
                                                    disabled={!newListName.trim()}
                                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg !text-white font-medium transition-colors cursor-pointer flex items-center gap-2 btn-animated"
                                                >
                                                    <Check size={16} />
                                                    Create
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowNewForm(true)}
                                        className="flex items-center gap-2 w-full p-3 rounded-xl border border-dashed border-gray-700 hover:border-blue-500 hover:bg-blue-500/5 text-gray-500 hover:text-blue-400 transition-all cursor-pointer justify-center"
                                    >
                                        <Plus size={18} />
                                        Create new list
                                    </button>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-gray-800 text-center">
                                <p className="text-gray-500 text-xs">
                                    Use arrows to reorder • Click name to edit • Items in deleted lists become uncategorized
                                </p>
                            </div>
                        </div>

                        {/* Click Outside Backdrop for Pickers (Inside Stacking Context) */}
                        {(showColorPicker !== null || showEmojiPicker !== null) && (
                            <div
                                className="fixed inset-0 z-[60] bg-transparent"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowColorPicker(null);
                                    setShowEmojiPicker(null);
                                }}
                            />
                        )}
                    </motion.div>

                    {/* Delete Confirmation Dialog */}
                    {confirmDelete && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center"
                        >
                            <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDelete(null)} />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative bg-gray-900 rounded-xl p-6 border border-gray-700 shadow-2xl max-w-sm mx-4"
                            >
                                <h3 className="text-lg font-bold text-white mb-2">Delete "{confirmDelete.name}"?</h3>
                                <p className="text-gray-400 text-sm mb-6">
                                    Items in this list will be moved to Uncategorized. This action cannot be undone.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setConfirmDelete(null)}
                                        className="flex-1 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors cursor-pointer font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            deleteList(confirmDelete.id);
                                            setConfirmDelete(null);
                                        }}
                                        className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer font-medium"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </>
            )}
        </AnimatePresence>
    );
}

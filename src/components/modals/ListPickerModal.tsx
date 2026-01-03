import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Folder, Film, Tv, Sparkles, Gamepad2, Book, Music, Star, Heart, Flame, Zap, Moon, ChevronDown, Check } from "lucide-react";
import type { UserList } from "./ListManageModal";

interface ListPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    lists: UserList[];
    onSelectList: (list: UserList | null, status: string) => void;
    mediaTitle: string;
}

const COLOR_BG_MAP: Record<string, string> = {
    gray: "bg-gray-500/20 hover:bg-gray-500/30 border-gray-500/30",
    red: "bg-red-500/20 hover:bg-red-500/30 border-red-500/30",
    orange: "bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/30",
    yellow: "bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/30",
    green: "bg-green-500/20 hover:bg-green-500/30 border-green-500/30",
    cyan: "bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/30",
    blue: "bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30",
    purple: "bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/30",
    pink: "bg-pink-500/20 hover:bg-pink-500/30 border-pink-500/30",
};

const COLOR_TEXT_MAP: Record<string, string> = {
    gray: "text-gray-400",
    red: "text-red-400",
    orange: "text-orange-400",
    yellow: "text-yellow-400",
    green: "text-green-400",
    cyan: "text-cyan-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    pink: "text-pink-400",
};

const QUERY_STATUS_OPTIONS = [
    { value: "PLANNED", label: "Planned", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    { value: "WATCHING", label: "Watching", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    { value: "ON_HOLD", label: "On Hold", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    { value: "FINISHED", label: "Finished", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    { value: "REWATCHING", label: "Re-watching", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
] as const;

export function ListPickerModal({
    isOpen,
    onClose,
    lists,
    onSelectList,
    mediaTitle
}: ListPickerModalProps) {
    const [selectedStatus, setSelectedStatus] = useState<string>("PLANNED");
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setSelectedStatus("PLANNED");
            setShowStatusDropdown(false);
        }
    }, [isOpen]);

    const getColorClasses = (colorName: string) => {
        return COLOR_BG_MAP[colorName] || COLOR_BG_MAP.gray;
    };

    const getIconComponent = (iconName: string | null, size: number = 18) => {
        const icons: Record<string, React.ReactNode> = {
            folder: <Folder size={size} />,
            film: <Film size={size} />,
            tv: <Tv size={size} />,
            sparkles: <Sparkles size={size} />,
            gamepad: <Gamepad2 size={size} />,
            book: <Book size={size} />,
            music: <Music size={size} />,
            star: <Star size={size} />,
            heart: <Heart size={size} />,
            flame: <Flame size={size} />,
            zap: <Zap size={size} />,
            moon: <Moon size={size} />,
        };
        return icons[iconName || 'folder'] || <Folder size={size} />;
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
                        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    >
                        <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 w-full max-w-sm overflow-hidden">
                            {/* Header */}
                            <div className="p-4 border-b border-gray-800">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-white">Add to List</h2>
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                                    >
                                        <X size={20} className="text-gray-400" />
                                    </button>
                                </div>
                                <p className="text-gray-400 text-sm mt-1 truncate">
                                    {mediaTitle}
                                </p>
                            </div>

                            {/* Status Selector */}
                            <div className="p-4 bg-gray-900 border-b border-gray-800">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Initial Status</label>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${QUERY_STATUS_OPTIONS.find(s => s.value === selectedStatus)?.color || "border-gray-700 bg-gray-800 text-gray-300"}`}
                                    >
                                        <span className="font-medium">
                                            {QUERY_STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label}
                                        </span>
                                        <ChevronDown size={16} className={`transition-transform ${showStatusDropdown ? "rotate-180" : ""}`} />
                                    </button>

                                    <AnimatePresence>
                                        {showStatusDropdown && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden"
                                            >
                                                {QUERY_STATUS_OPTIONS.map((status) => (
                                                    <button
                                                        key={status.value}
                                                        onClick={() => {
                                                            setSelectedStatus(status.value);
                                                            setShowStatusDropdown(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-700 transition-colors flex items-center justify-between cursor-pointer ${status.value === selectedStatus ? "text-blue-400 bg-blue-500/10" : "text-gray-300"}`}
                                                    >
                                                        {status.label}
                                                        {status.value === selectedStatus && <Check size={16} />}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* List Options */}
                            <div className="p-3 space-y-1.5 max-h-[40vh] overflow-y-auto">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Select List</label>
                                {lists
                                    .sort((a, b) => a.position - b.position)
                                    .map((list) => (
                                        <button
                                            key={list.id}
                                            onClick={() => onSelectList(list, selectedStatus)}
                                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${getColorClasses(list.color)}`}
                                        >
                                            <span className={COLOR_TEXT_MAP[list.color] || 'text-gray-400'}>
                                                {getIconComponent(list.icon, 16)}
                                            </span>
                                            <span className="text-white font-medium text-sm">
                                                {list.name}
                                            </span>
                                        </button>
                                    ))}

                                {lists.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>No lists yet</p>
                                        <p className="text-sm mt-1">Create lists from the My List page</p>
                                    </div>
                                )}
                            </div>

                            {/* Quick Add without list */}
                            <div className="p-3 border-t border-gray-800">
                                <button
                                    onClick={() => onSelectList(null, selectedStatus)}
                                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white transition-all cursor-pointer text-sm"
                                >
                                    <Plus size={16} />
                                    Add without list (Uncategorized)
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Check, FolderOpen, Folder, Film, Tv, Sparkles, Gamepad2, Book, Music, Star, Heart, Flame, Zap, Moon } from "lucide-react";
import type { UserList } from "./ListManageModal";

// Status options with display labels and colors
const STATUS_OPTIONS = [
    { value: "PLANNED", label: "Planned", color: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30" },
    { value: "WATCHING", label: "Watching", color: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30" },
    { value: "ON_HOLD", label: "On Hold", color: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30" },
    { value: "FINISHED", label: "Finished", color: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30" },
    { value: "REWATCHING", label: "Re-watching", color: "bg-pink-500/20 text-pink-600 dark:text-pink-400 border-pink-500/30" },
    { value: "REWATCHED", label: "Re-watched", color: "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30" },
] as const;

interface StatusDropdownProps {
    currentStatus: string;
    onStatusChange: (status: string) => void;
}

export function StatusDropdown({ currentStatus, onStatusChange }: StatusDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 cursor-pointer transition-all border ${STATUS_OPTIONS.find(s => s.value === currentStatus)?.color || "bg-gray-500/20 text-gray-400 border-gray-500/30"
                    }`}
            >
                {STATUS_OPTIONS.find(s => s.value === currentStatus)?.label || currentStatus}
                <ChevronDown size={12} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "tween", duration: 0.08 }}
                    className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden min-w-[140px]"
                >
                    {STATUS_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => {
                                onStatusChange(option.value);
                                setIsOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${currentStatus === option.value
                                ? "bg-blue-500/20 text-blue-600 dark:text-white"
                                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                        >
                            {currentStatus === option.value && <Check size={12} />}
                            {option.label}
                        </button>
                    ))}
                </motion.div>
            )}
        </div>
    );
}

interface ListDropdownProps {
    currentListId: number | null;
    userLists: UserList[];
    onListChange: (listId: number | null) => void;
}

export function ListDropdown({ currentListId, userLists, onListChange }: ListDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getListIcon = (iconName: string | null, size: number = 12) => {
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
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition-all bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600/30"
            >
                <FolderOpen size={12} />
                {currentListId
                    ? userLists.find(l => l.id === currentListId)?.name || "Move to List"
                    : "Uncategorized"
                }
                <ChevronDown size={12} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "tween", duration: 0.08 }}
                    className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden min-w-[160px]"
                >
                    {/* Uncategorized option */}
                    <button
                        onClick={() => {
                            onListChange(null);
                            setIsOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${currentListId === null
                            ? "bg-blue-500/20 text-blue-600 dark:text-white"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                    >
                        {currentListId === null && <Check size={12} />}
                        <Folder size={12} /> Uncategorized
                    </button>

                    {userLists.map((list) => (
                        <button
                            key={list.id}
                            onClick={() => {
                                onListChange(list.id);
                                setIsOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${currentListId === list.id
                                ? "bg-blue-500/20 text-blue-600 dark:text-white"
                                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                        >
                            {currentListId === list.id && <Check size={12} />}
                            {getListIcon(list.icon, 12)} {list.name}
                        </button>
                    ))}
                </motion.div>
            )}
        </div>
    );
}

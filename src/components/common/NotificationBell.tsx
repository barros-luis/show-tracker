import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SupabaseClient } from '@supabase/supabase-js';
import {
    type AppNotification,
    markNotificationRead,
    markAllNotificationsRead,
    clearAllNotifications
} from '../../api/NotificationService';

interface NotificationBellProps {
    supabase: SupabaseClient;
    userId: string | null;
    notifications: AppNotification[];
    onNotificationsChange: (notifications: AppNotification[]) => void;
    dropdownClassName?: string;
}

export function NotificationBell({
    supabase,
    userId,
    notifications,
    onNotificationsChange,
    dropdownClassName
}: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = async (notification: AppNotification) => {
        // Toggle expand
        if (expandedId === notification.id) {
            setExpandedId(null);
        } else {
            setExpandedId(notification.id);
        }

        // Mark as read
        if (!notification.read) {
            onNotificationsChange(
                notifications.map(n => n.id === notification.id ? { ...n, read: true } : n)
            );
            try {
                await markNotificationRead(supabase, notification.id);
            } catch (err) {
                console.error("Failed to mark read:", err);
            }
        }
    };

    const handleMarkAllRead = async () => {
        if (!userId) return;
        // Optimistic
        onNotificationsChange(notifications.map(n => ({ ...n, read: true })));
        try {
            await markAllNotificationsRead(supabase, userId);
        } catch (err) {
            console.error("Failed to mark all read:", err);
        }
    };

    const handleClearAll = async () => {
        if (!userId) return;
        // Optimistic
        onNotificationsChange([]);
        setIsOpen(false);
        try {
            await clearAllNotifications(supabase, userId);
        } catch (err) {
            console.error("Failed to clear notifications:", err);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    if (!userId) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
                <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                        style={{ transformOrigin: 'top right' }}
                        className={`bg-white dark:bg-[#0f1729] border border-gray-200 dark:border-white/10 z-50 overflow-hidden outline-none rounded-xl shadow-lg ${dropdownClassName || "absolute right-0 top-full mt-2 w-80"}`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-800/50 border-b border-gray-200 dark:border-white/5">
                            <span className="font-semibold text-gray-900 dark:text-white">Notifications</span>
                            <div className="flex gap-1">
                                {notifications.length > 0 && (
                                    <>
                                        <button
                                            onClick={handleMarkAllRead}
                                            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                                            title="Mark all as read"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={handleClearAll}
                                            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                                            title="Clear all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Notification List */}
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
                                    <Bell className="w-8 h-8 mb-2 opacity-30" />
                                    <span className="text-sm">No notifications</span>
                                </div>
                            ) : (
                                notifications.map(notification => {
                                    const isExpanded = expandedId === notification.id;
                                    return (
                                        <div
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className={`flex items-start gap-3 p-4 border-b border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-gray-800/30 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50 dark:bg-blue-500/5' : ''
                                                }`}
                                        >
                                            {/* Image */}
                                            {notification.image_url && (
                                                <img
                                                    src={notification.image_url}
                                                    alt=""
                                                    className="w-10 h-14 object-cover rounded-md flex-shrink-0"
                                                />
                                            )}

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium ${isExpanded ? '' : 'truncate'} ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                                                    }`}>
                                                    {notification.title}
                                                </p>
                                                <p className={`text-xs text-gray-500 dark:text-gray-400 mt-0.5 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-xs text-gray-500">
                                                        {formatTime(notification.created_at)}
                                                    </p>
                                                    {notification.message && notification.message.length > 60 && (
                                                        <ChevronDown
                                                            className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Unread indicator */}
                                            {!notification.read && (
                                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


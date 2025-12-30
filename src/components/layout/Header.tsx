import { motion } from "framer-motion";
import { Search, List, Settings, LogIn, Edit2 } from "lucide-react";
import { NotificationBell } from "../common/NotificationBell";
import { UserMenu } from "../user/UserMenu";
import type { AppNotification } from "../../api/NotificationService";
import { SupabaseClient } from "@supabase/supabase-js";

export type ViewType = "search" | "list" | "profile" | "settings";

interface HeaderProps {
    view: ViewType;
    setView: (view: ViewType) => void;
    session: any;
    profile: any;
    supabase: SupabaseClient;
    notifications: AppNotification[];
    onNotificationsChange: (notifications: AppNotification[]) => void;
    onOpenAuthModal: () => void;
    onLogout: () => void;
}

export function Header({
    view,
    setView,
    session,
    profile,
    supabase,
    notifications,
    onNotificationsChange,
    onOpenAuthModal,
    onLogout,
}: HeaderProps) {
    return (
        <header className="mb-8 flex items-center justify-between relative z-10">
            {/* Left: Logo */}
            <div className="w-1/3 text-left">
                {/* Light mode logo (dark text) */}
                <img
                    src="/ast-logo-dark.png"
                    alt="AShow Tracker"
                    className="h-24 object-contain cursor-pointer hover:opacity-90 transition-opacity dark:hidden"
                    onClick={() => setView('search')}
                />
                {/* Dark mode logo (light text) */}
                <img
                    src="/logo.png"
                    alt="AShow Tracker"
                    className="h-24 object-contain cursor-pointer hover:opacity-90 transition-opacity hidden dark:block"
                    onClick={() => setView('search')}
                />
            </div>

            {/* Center: View Toggle */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-100 dark:bg-slate-900/50 backdrop-blur-md p-1.5 rounded-full flex items-center shadow-inner border border-white/5">

                {/* Animated Background Pill */}
                <div className="absolute inset-0 p-1.5">
                    <motion.div
                        className="h-full w-1/2 bg-white dark:bg-gray-800 rounded-full shadow-md"
                        initial={false}
                        animate={{
                            x: view === "search" ? "0%" : "100%"
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                </div>

                {/* Buttons */}
                <button
                    onClick={() => setView("search")}
                    className={`relative px-4 py-2 flex items-center gap-2 text-sm font-semibold rounded-full transition-colors cursor-pointer ${view === "search"
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-400 hover:text-gray-700 dark:hover:text-white"
                        }`}
                >
                    <Search size={16} /> Search
                </button>
                <button
                    onClick={() => {
                        if (!session) {
                            onOpenAuthModal();
                            return;
                        }
                        setView("list");
                    }}
                    className={`relative px-4 py-2 flex items-center gap-2 text-sm font-semibold rounded-full transition-colors cursor-pointer ${view === "list"
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-400 hover:text-gray-700 dark:hover:text-white"
                        }`}
                >
                    <List size={16} /> My List
                </button>
            </div>

            {/* Right: User Actions */}
            <div className="w-1/3 flex items-center justify-end gap-2">
                {session ? (
                    <>
                        {/* Notifications Bell */}
                        <NotificationBell
                            supabase={supabase}
                            userId={session?.user?.id || null}
                            notifications={notifications}
                            onNotificationsChange={onNotificationsChange}
                        />

                        {/* Settings Button */}
                        <button
                            onClick={() => setView("settings")}
                            className={`p-2 rounded-full transition-colors cursor-pointer ${view === "settings"
                                ? "bg-blue-600 text-white"
                                : "hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-white"
                                }`}
                            title="Settings"
                        >
                            <Settings size={20} />
                        </button>

                        {/* User Menu */}
                        <UserMenu
                            session={session}
                            profile={profile}
                            onOpenProfile={() => setView("profile")}
                            onOpenSettings={() => setView("settings")}
                            onLogout={onLogout}
                        />

                        {/* Edit Profile Shortcut */}
                        <button
                            onClick={() => setView("settings")}
                            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-2"
                            title="Edit Profile"
                        >
                            <Edit2 size={16} />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={onOpenAuthModal}
                        className="px-4 py-2 rounded-full bg-blue-500 text-white font-bold hover:bg-blue-600 shadow-lg cursor-pointer flex items-center gap-2"
                    >
                        <LogIn size={16} />
                        Sign In
                    </button>
                )}
            </div>
        </header>
    );
}

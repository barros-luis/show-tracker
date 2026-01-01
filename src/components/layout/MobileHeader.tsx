import { useNavigate, useLocation } from "react-router-dom";
import { Search, List, User, Settings, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SupabaseClient } from "@supabase/supabase-js";
import { NotificationBell } from "../common/NotificationBell";
import type { AppNotification } from "../../api/NotificationService";

interface MobileHeaderProps {
    isLoggedIn: boolean;
    profileAvatar?: string | null;
    notificationCount?: number;
    onAuthClick: () => void;
    // Props for NotificationBell
    supabase: SupabaseClient;
    userId: string | null;
    notifications: AppNotification[];
    onNotificationsChange: (notifications: AppNotification[]) => void;
}

/**
 * Mobile header component with logo, page title, and user actions.
 * Designed to be minimal and beautiful on mobile devices.
 */
export function MobileHeader({
    isLoggedIn,
    profileAvatar,
    onAuthClick,
    supabase,
    userId,
    notifications,
    onNotificationsChange,
}: MobileHeaderProps) {
    const navigate = useNavigate();
    const location = useLocation();

    // Get current page info
    const getPageInfo = () => {
        switch (location.pathname) {
            case "/":
                return { icon: Search, title: "Search" };
            case "/list":
                return { icon: List, title: "My List" };
            case "/profile":
                return { icon: User, title: "Profile" };
            case "/settings":
                return { icon: Settings, title: "Settings" };
            default:
                return { icon: Search, title: "AShowTracker" };
        }
    };

    const pageInfo = getPageInfo();
    const PageIcon = pageInfo.icon;

    return (
        <header
            className="mobile-header"
            style={{
                paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
                height: 'auto',
                minHeight: '42px'
            }}
        >
            {/* Logo/Brand - using actual logo image */}
            <motion.div
                className="mobile-header-brand"
                onClick={() => navigate("/")}
                whileTap={{ scale: 0.95 }}
            >
                <img
                    src="/logo.png"
                    alt="AST"
                    className="h-14 w-auto ml-2" /* Bigger logo, moved right */
                />
            </motion.div>

            {/* Page Title with Icon */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={location.pathname}
                    className="mobile-header-title absolute left-1/2 -translate-x-1/2" /* Perfectly centered */
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                >
                    <PageIcon size={18} className="mobile-header-title-icon" />
                    <span>{pageInfo.title}</span>
                </motion.div>
            </AnimatePresence>

            {/* Right Actions */}
            <div className="mobile-header-actions mr-2 flex items-center gap-2"> {/* Moved left by adding margin */}
                {isLoggedIn ? (
                    <>
                        <NotificationBell
                            supabase={supabase}
                            userId={userId}
                            notifications={notifications}
                            onNotificationsChange={onNotificationsChange}
                            dropdownClassName="absolute -right-14 top-full mt-3 w-[90vw] max-w-[340px]"
                        />

                        <motion.button
                            className="mobile-header-avatar relative"
                            onClick={() => navigate("/profile")}
                            whileTap={{ scale: 0.9 }}
                            style={{
                                width: '40px', /* Bigger profile */
                                height: '40px',
                                minWidth: '40px',
                                minHeight: '40px',
                                padding: 0,
                                background: 'transparent',
                                border: 'none'
                            }}
                        >
                            {/* Avatar Image Container - Clips the image */}
                            <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 relative z-0">
                                {profileAvatar ? (
                                    <img
                                        src={profileAvatar}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement?.classList.add('fallback-avatar');
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <User size={20} className="text-gray-400" />
                                    </div>
                                )}
                            </div>
                        </motion.button>
                    </>
                ) : (
                    <motion.button
                        className="mobile-header-signin"
                        onClick={onAuthClick}
                        whileTap={{ scale: 0.95 }}
                    >
                        <LogIn size={18} />
                        <span>Sign In</span>
                    </motion.button>
                )}
            </div>
        </header>
    );
}

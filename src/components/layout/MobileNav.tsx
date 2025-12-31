import { useNavigate, useLocation } from "react-router-dom";
import { Search, List, User, Settings } from "lucide-react";
import { motion } from "framer-motion";

interface MobileNavProps {
    isLoggedIn: boolean;
    onAuthClick: () => void;
}

/**
 * Beautiful bottom navigation bar for mobile devices.
 * Features a floating pill design with smooth animations and haptic-like feedback.
 */
export function MobileNav({ isLoggedIn, onAuthClick }: MobileNavProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { path: "/", icon: Search, label: "Search" },
        { path: "/list", icon: List, label: "My List", requiresAuth: true },
        { path: "/profile", icon: User, label: "Profile", requiresAuth: true },
        { path: "/settings", icon: Settings, label: "Settings", requiresAuth: true },
    ];

    const handleTabClick = (tab: typeof tabs[0]) => {
        if (tab.requiresAuth && !isLoggedIn) {
            onAuthClick();
            return;
        }
        navigate(tab.path);
    };

    return (
        <nav className="mobile-nav-container">
            {/* Glassmorphism background */}
            <div className="mobile-nav-backdrop" />

            {/* Navigation content */}
            <div className="mobile-nav-content">
                {tabs.map((tab) => {
                    const isActive = location.pathname === tab.path;
                    const Icon = tab.icon;

                    return (
                        <motion.button
                            key={tab.path}
                            onClick={() => handleTabClick(tab)}
                            className="mobile-nav-item"
                            whileTap={{ scale: 0.9 }}
                        >
                            {/* Active indicator pill */}
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="mobile-nav-active-indicator"
                                    initial={false}
                                    transition={{
                                        type: "spring",
                                        stiffness: 500,
                                        damping: 35,
                                    }}
                                />
                            )}

                            {/* Icon container with glow effect */}
                            <motion.div
                                className={`mobile-nav-icon-wrapper ${isActive ? 'active' : ''}`}
                                animate={{
                                    y: isActive ? -2 : 0,
                                }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            >
                                <Icon
                                    size={22}
                                    className={`mobile-nav-icon ${isActive ? 'active' : ''}`}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />

                                {/* Glow effect for active state */}
                                {isActive && (
                                    <div className="mobile-nav-icon-glow" />
                                )}
                            </motion.div>

                            {/* Label */}
                            <motion.span
                                className={`mobile-nav-label ${isActive ? 'active' : ''}`}
                                animate={{
                                    opacity: isActive ? 1 : 0.6,
                                    y: isActive ? 0 : 2,
                                }}
                            >
                                {tab.label}
                            </motion.span>
                        </motion.button>
                    );
                })}
            </div>
        </nav>
    );
}

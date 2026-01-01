import { useNavigate, useLocation } from "react-router-dom";
import { Search, List, User, Settings } from "lucide-react";
import { motion } from "framer-motion";

interface MobileNavProps {
    isLoggedIn: boolean;
    onAuthClick: () => void;
}

export function MobileNav({ isLoggedIn, onAuthClick }: MobileNavProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { path: "/", icon: Search },
        { path: "/list", icon: List, requiresAuth: true },
        { path: "/profile", icon: User, requiresAuth: true },
        { path: "/settings", icon: Settings, requiresAuth: true },
    ];

    const handleTabClick = (tab: typeof tabs[0]) => {
        if (tab.requiresAuth && !isLoggedIn) {
            onAuthClick();
            return;
        }
        navigate(tab.path);
    };

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-[1000]"
            style={{
                paddingBottom: 'env(safe-area-inset-bottom)',
                background: 'linear-gradient(to bottom, transparent 0%, transparent 25%, rgba(0,0,0,0.8) 60%, #000000 100%)',
                paddingTop: '45px'
            }}
        >
            <div className="flex justify-around items-center h-14 px-6">
                {tabs.map((tab) => {
                    const isActive = location.pathname === tab.path;
                    const Icon = tab.icon;

                    return (
                        <motion.button
                            key={tab.path}
                            onClick={() => handleTabClick(tab)}
                            className="flex items-center justify-center w-14 h-14"
                            whileTap={{ scale: 0.85 }}
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <Icon
                                size={26}
                                className={isActive ? "text-blue-500" : "text-gray-500"}
                                strokeWidth={isActive ? 2.2 : 1.5}
                            />
                        </motion.button>
                    );
                })}
            </div>
        </nav>
    );
}

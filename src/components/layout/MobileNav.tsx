import { useNavigate, useLocation } from "react-router-dom";
import { Search, List, User, Settings } from "lucide-react";

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
                background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 25%, rgba(0,0,0,0.8) 65%, #000000 100%)',
                paddingTop: '15px'
            }}
        >
            <div className="flex justify-around items-end h-14 px-2 pb-2">
                {tabs.map((tab) => {
                    const isActive = location.pathname === tab.path;
                    const Icon = tab.icon;
                    // Map paths to labels
                    const getLabel = (path: string) => {
                        if (path === "/") return "Search";
                        if (path === "/list") return "My List";
                        if (path === "/profile") return "Profile";
                        if (path === "/settings") return "Settings";
                        return "";
                    };

                    return (
                        <button
                            key={tab.path}
                            onClick={() => handleTabClick(tab)}
                            className="flex flex-col items-center justify-end w-16 gap-1"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <Icon
                                size={22}
                                className={`${isActive
                                    ? "text-blue-400 drop-shadow-[0_0_12px_rgba(96,165,250,0.6)]"
                                    : "text-stone-400"
                                    } transition-all duration-300`}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            <span className={`text-[10px] font-medium tracking-wide transition-all duration-300 ${isActive ? "text-blue-400 opacity-100 transform scale-100" : "text-stone-500 opacity-80 transform scale-95"
                                }`}>
                                {getLabel(tab.path)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

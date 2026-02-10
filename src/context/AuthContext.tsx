import { createContext, useContext, ReactNode, useCallback, useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useToast, ToastType } from "../hooks/useToast";
import { useDeepLink } from "../hooks/useDeepLink";
import { useWatchlist } from "../hooks/useWatchlist";
import { useUserLists } from "../hooks/useUserLists";
import { useUserStatuses } from "../hooks/useUserStatuses";
import { supabase } from "../services/supabase";
import { invoke } from "@tauri-apps/api/core";
import { type AppNotification, checkForNewReleases, fetchNotifications } from "../api/NotificationService";
import type { Profile, WatchlistItem, UserList, UserStatus, WatchStatus } from "../types";
import pkg from "../../package.json";

interface AuthContextType {
    // Supabase client
    supabase: typeof supabase;

    // Auth state
    session: any;
    profile: Profile | null;
    loading: boolean;
    authError: string | null;
    refreshProfile: () => Promise<void>;

    // Toast
    toast: { message: string; type: ToastType; duration?: number } | null;
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    hideToast: () => void;

    // Watchlist
    myList: WatchlistItem[];
    watchlistLoading: boolean;
    fetchMyList: () => void;
    removeFromList: (itemId: number) => Promise<void>;
    updateEpisodeCount: (itemId: number, count: number) => void;
    updateTotalEpisodes: (itemId: number, total: number) => void;
    updateStatus: (itemId: number, status: WatchStatus) => void;
    updateListId: (itemId: number, listId: number | null) => void;
    touchWatchlistItem: (itemId: number) => Promise<void>;

    // User Lists
    userLists: UserList[];
    fetchUserLists: () => void;
    updateUserLists: (lists: UserList[]) => void;

    // User Statuses
    userStatuses: UserStatus[];
    fetchUserStatuses: () => void;
    updateUserStatuses: (statuses: UserStatus[]) => void;

    // Notifications
    notifications: AppNotification[];
    setNotifications: (notifications: AppNotification[]) => void;

    // Update
    updateAvailable: string | null;
    handleInstallUpdate: () => Promise<void>;

    // Auth Modal
    isAuthModalOpen: boolean;
    setAuthModalOpen: (open: boolean) => void;


}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

import { useTranslation } from "react-i18next";

export function AuthProvider({ children }: AuthProviderProps) {
    const { session, profile, loading, error: authError, refreshProfile } = useAuth();
    const { toast, showToast, hideToast } = useToast();
    const { i18n } = useTranslation();

    // Sync language from profile
    useEffect(() => {
        if (profile?.settings && typeof profile.settings === 'object') {
            const savedLang = (profile.settings as any).language;
            if (savedLang && i18n.language !== savedLang) {
                console.log("Syncing language from profile:", savedLang);
                i18n.changeLanguage(savedLang);
            }
        }
    }, [profile]);


    const userId = session?.user?.id;
    const {
        items: myList,
        loading: watchlistLoading,
        fetchItems: fetchMyList,
        removeItem: removeFromList,
        updateEpisodeCount,
        updateTotalEpisodes,
        updateStatus,
        updateListId,
        touchWatchlistItem,
    } = useWatchlist(userId);

    const { lists: userLists, fetchLists: fetchUserLists, updateLists: updateUserLists } = useUserLists(userId, session?.user?.created_at);
    const { statuses: userStatuses, fetchStatuses: fetchUserStatuses, updateStatuses: updateUserStatuses } = useUserStatuses(userId, session?.user?.created_at);

    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
    const [mobileUpdateUrl, setMobileUpdateUrl] = useState<string | null>(null);



    const [isAuthModalOpen, setAuthModalOpen] = useState(false);

    useEffect(() => {
        const checkForUpdates = async () => {
            const ua = navigator.userAgent.toLowerCase();
            const isMobile = /android|iphone|ipad|ipod/i.test(ua);

            if (isMobile) {
                try {
                    const response = await fetch('https://api.github.com/repos/barros-luis/show-tracker/releases/latest');
                    if (response.ok) {
                        const data = await response.json();
                        const latestVersion = data.tag_name.replace('v', '');
                        const currentVersion = pkg.version;

                        const v1 = latestVersion.split('.').map(Number);
                        const v2 = currentVersion.split('.').map(Number);

                        let hasNewUpdate = false;
                        for (let i = 0; i < 3; i++) {
                            const num1 = v1[i] || 0;
                            const num2 = v2[i] || 0;
                            if (num1 > num2) {
                                hasNewUpdate = true;
                                break;
                            }
                            if (num1 < num2) break;
                        }

                        if (hasNewUpdate) {
                            setUpdateAvailable(latestVersion);
                            showToast("Hey, new update available! Please go to Settings to update the app", "info", 8000);

                            if (data.assets && Array.isArray(data.assets)) {
                                const apkAsset = data.assets.find((asset: any) => asset.name.endsWith('.apk'));
                                if (apkAsset) {
                                    setMobileUpdateUrl(apkAsset.browser_download_url);
                                }
                            }
                        }
                    }
                } catch (err) {
                    // console.log('Mobile update check failed:', err);
                }
                return;
            }

            try {
                const newVersion = await invoke<string | null>('check_for_update');
                if (newVersion) {
                    setUpdateAvailable(newVersion);
                }
            } catch (err) {
                console.log('Update check failed:', err);
            }
        };
        checkForUpdates();
    }, []);

    const handleInstallUpdate = async () => {
        const ua = navigator.userAgent.toLowerCase();
        const isMobile = /android|iphone|ipad|ipod/i.test(ua);

        if (isMobile) {
            import('@tauri-apps/plugin-opener').then(({ openUrl }) => {
                if (mobileUpdateUrl) {
                    openUrl(mobileUpdateUrl);
                } else {
                    showToast("New update available! Please visit our website to download the latest version.", "info", 5000);
                }
            });
        } else {
            await invoke('install_update');
        }
    };

    const isCheckingRef = useRef(false);
    const lastCheckRef = useRef<number>(0);

    useEffect(() => {
        if (!session?.user?.id) return;

        const checkNotifications = async () => {
            if (isCheckingRef.current) return;

            const savedSettings = localStorage.getItem('app_settings');
            const settings = savedSettings ? JSON.parse(savedSettings) : {};
            const notifyInApp = settings.notifyInApp ?? true;
            const notifyOS = settings.notifyOS ?? true;

            if (!notifyInApp && !notifyOS) return;

            isCheckingRef.current = true;
            try {
                const currentNotifs = await fetchNotifications(supabase, session.user.id);
                setNotifications(currentNotifs);

                const newNotifs = await checkForNewReleases(
                    supabase,
                    session.user.id,
                    myList as any[],
                    { notifyInApp, notifyOS }
                );

                if (newNotifs.length > 0) {
                    setNotifications(prev => {
                        const existingIds = new Set(prev.map(n => n.id));
                        const uniqueNew = newNotifs.filter(n => !existingIds.has(n.id));
                        return [...uniqueNew, ...prev];
                    });
                }
            } catch (err) {
                console.error('Notification check failed:', err);
            } finally {
                lastCheckRef.current = Date.now();
                isCheckingRef.current = false;
            }
        };

        // Initial check after startup
        const startupTimeout = setTimeout(checkNotifications, 3000);

        // Periodic interval check
        const savedSettings = localStorage.getItem('app_settings');
        const settings = savedSettings ? JSON.parse(savedSettings) : {};
        const checkIntervalHours = settings.notifyCheckInterval ?? 1;
        const intervalId = setInterval(checkNotifications, checkIntervalHours * 60 * 60 * 1000);

        // Also check when app comes into focus (if more than 5 min since last check)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                const fiveMinutes = 5 * 60 * 1000;
                if (now - lastCheckRef.current > fiveMinutes) {
                    checkNotifications();
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearTimeout(startupTimeout);
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [session?.user?.id, myList.length]);

    // Handle profile refresh for deep links
    const handleRefreshProfile = useCallback(async () => {
        await refreshProfile();
    }, [refreshProfile]);

    // Setup deep links
    useDeepLink({
        onSuccess: () => {
            showToast("Logged in successfully! You can close the browser tab.", "success");
            setAuthModalOpen(false);
        },
        onError: (error) => showToast(error, "error"),
        refreshProfile: handleRefreshProfile,
        refreshList: fetchMyList,
    });

    return (
        <AuthContext.Provider
            value={{
                supabase,
                session,
                profile,
                loading,
                authError,
                refreshProfile,
                toast,
                showToast,
                hideToast,
                myList,
                watchlistLoading,
                fetchMyList,
                removeFromList,
                updateEpisodeCount,
                updateTotalEpisodes,
                updateStatus,
                updateListId,
                touchWatchlistItem,
                userLists,
                fetchUserLists,
                updateUserLists,
                userStatuses,
                fetchUserStatuses,
                updateUserStatuses,
                notifications,
                setNotifications,
                updateAvailable,
                handleInstallUpdate,
                isAuthModalOpen,
                setAuthModalOpen,

            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuthContext must be used within an AuthProvider");
    }
    return context;
}

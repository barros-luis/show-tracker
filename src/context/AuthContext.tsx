import { createContext, useContext, ReactNode, useCallback, useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useToast, ToastType } from "../hooks/useToast";
import { useDeepLink } from "../hooks/useDeepLink";
import { useWatchlist } from "../hooks/useWatchlist";
import { useUserLists } from "../hooks/useUserLists";
import { supabase } from "../services/supabase";
import { invoke } from "@tauri-apps/api/core";
import { type AppNotification, checkForNewReleases, fetchNotifications } from "../api/NotificationService";
import type { Profile, WatchlistItem, UserList, WatchStatus } from "../types";
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
    toast: { message: string; type: ToastType } | null;
    showToast: (message: string, type?: ToastType) => void;
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

    // User Lists
    userLists: UserList[];
    fetchUserLists: () => void;
    updateUserLists: (lists: UserList[]) => void;

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

export function AuthProvider({ children }: AuthProviderProps) {
    const { session, profile, loading, error: authError, refreshProfile } = useAuth();
    const { toast, showToast, hideToast } = useToast();

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
    } = useWatchlist(userId);

    const { lists: userLists, fetchLists: fetchUserLists, updateLists: updateUserLists } = useUserLists(userId);

    // Notifications state
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    // Update state
    const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);

    // Auth modal state
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);

    // Check for updates on mount
    useEffect(() => {
        const checkForUpdates = async () => {
            const ua = navigator.userAgent.toLowerCase();
            const isMobile = /android|iphone|ipad|ipod/i.test(ua);

            if (isMobile) {
                try {
                    const response = await fetch('https://github.com/barros-luis/show-tracker/releases/latest/download/latest.json');
                    if (response.ok) {
                        const data = await response.json();
                        const latestVersion = data.version;
                        const currentVersion = pkg.version;

                        // Simple version comparison
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
                            showToast(`New update available: v${latestVersion}`, "info");
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
        await invoke('install_update');
    };

    const isCheckingRef = useRef(false);

    // Check for new releases (notifications)
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
                // Fetch current first to ensure we have latest state
                const currentNotifs = await fetchNotifications(supabase, session.user.id);
                setNotifications(currentNotifs);

                // Then check for new stuff
                const newNotifs = await checkForNewReleases(
                    supabase,
                    session.user.id,
                    myList as any[],
                    { notifyInApp, notifyOS }
                );

                if (newNotifs.length > 0) {
                    setNotifications(prev => {
                        // Dedup before setting state just in case
                        const existingIds = new Set(prev.map(n => n.id));
                        const uniqueNew = newNotifs.filter(n => !existingIds.has(n.id));
                        return [...uniqueNew, ...prev];
                    });
                }
            } catch (err) {
                console.error('Notification check failed:', err);
            } finally {
                isCheckingRef.current = false;
            }
        };

        const startupTimeout = setTimeout(checkNotifications, 3000);

        const savedSettings = localStorage.getItem('app_settings');
        const settings = savedSettings ? JSON.parse(savedSettings) : {};
        const checkIntervalHours = settings.notifyCheckInterval ?? 2;
        const intervalId = setInterval(checkNotifications, checkIntervalHours * 60 * 60 * 1000);

        return () => {
            clearTimeout(startupTimeout);
            clearInterval(intervalId);
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
                userLists,
                fetchUserLists,
                updateUserLists,
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

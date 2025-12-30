import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../services/supabase';

type Theme = 'light' | 'dark';

interface Settings {
    theme: Theme;
    mouseAura: boolean;
    adultContent: boolean;
    zoomLevel: number;
    closeToTray: boolean;
    launchAtStartup: boolean;
    notifyInApp: boolean;
    notifyOS: boolean;
    notifyCheckInterval: number; // hours
    [key: string]: any; // Allow extensibility for future settings
}

interface SettingsContextType {
    settings: Settings;
    updateSetting: (key: string, value: any) => void;
}

const defaultSettings: Settings = {
    theme: 'dark', // Default to dark style
    mouseAura: true, // Default enabled
    adultContent: true, // Default unfiltered
    zoomLevel: 100, // Default 100%
    closeToTray: true, // Default: minimize to tray instead of closing
    launchAtStartup: false, // Default: disabled - user must explicitly enable
    notifyInApp: true, // Default: enabled - show in-app notifications
    notifyOS: true, // Default: enabled - show OS notifications
    notifyCheckInterval: 2, // Default: check every 2 hours
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children, session }: { children: ReactNode, session: any }) {
    const [settings, setSettings] = useState<Settings>(() => {
        // 1. Initial Load: Try LocalStorage first
        const saved = localStorage.getItem('app_settings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    });

    // 2. Sync with Supabase on mount/auth change
    useEffect(() => {
        if (session?.user?.id) {
            const fetchSettings = async () => {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('settings')
                    .eq('id', session.user.id)
                    .single();

                if (data?.settings && !error) {
                    // Merge remote settings with local defaults
                    const merged = { ...defaultSettings, ...data.settings };
                    setSettings(merged);
                    localStorage.setItem('app_settings', JSON.stringify(merged));
                }
            };
            fetchSettings();
        }
    }, [session?.user?.id]);

    // 3. Apply Theme Side-effect
    useEffect(() => {
        const root = window.document.documentElement;
        const body = window.document.body;

        if (settings.theme === 'dark') {
            root.classList.add('dark');
            body.classList.add('dark');
        } else {
            root.classList.remove('dark');
            body.classList.remove('dark');
        }
    }, [settings.theme]);

    // 3b. Apply Zoom Level
    useEffect(() => {
        const root = window.document.documentElement;
        root.style.fontSize = `${settings.zoomLevel}%`;
    }, [settings.zoomLevel]);

    // 3c. Sync Close to Tray setting with Rust
    useEffect(() => {
        // Dynamic import to avoid issues in non-Tauri environments
        import('@tauri-apps/api/core').then(({ invoke }) => {
            invoke('set_close_to_tray', { enabled: settings.closeToTray }).catch(() => {
                // Silently fail if not in Tauri environment
            });
        }).catch(() => { });
    }, [settings.closeToTray]);

    // 3d. Sync Launch at Startup setting with Rust
    useEffect(() => {
        import('@tauri-apps/api/core').then(({ invoke }) => {
            const command = settings.launchAtStartup ? 'enable_autostart' : 'disable_autostart';
            invoke(command).catch(() => {
                // Silently fail if not in Tauri environment
            });
        }).catch(() => { });
    }, [settings.launchAtStartup]);

    // 4. Update Function
    const updateSetting = async (key: string, value: any) => {
        const newSettings = { ...settings, [key]: value };

        // Optimistic Update
        setSettings(newSettings);
        localStorage.setItem('app_settings', JSON.stringify(newSettings));

        // Sync to DB (if logged in)
        if (session?.user?.id) {
            const { error } = await supabase
                .from('profiles')
                .update({ settings: newSettings })
                .eq('id', session.user.id);

            if (error) console.error("Failed to sync settings:", error);
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSetting }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}

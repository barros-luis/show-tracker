import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase (reusing client if possible, or new instance)
// Ideally this should be passed in or imported from a shared config
// For now duplicating initialization to keep context self-contained or importing if I find where it is best
// Looking at App.tsx, it's initialized there. I should probably move the Supabase client to a separate file to import it.
// BUT for now, I will accept the Supabase client as a prop or just re-init it since it's lightweight.
// Actually, let's just re-init to match App.tsx provided context.

const supabaseUrl = "https://xbosdjujcvfqujtdamun.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3NkanVqY3ZmcXVqdGRhbXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMzUzNjksImV4cCI6MjA4MDkxMTM2OX0.BrKUQ_VGTfCbNW2dST3LHPz0UUbC9ZNn98mbb5FAVig";
const supabase = createClient(supabaseUrl, supabaseKey);

type Theme = 'light' | 'dark';

interface Settings {
    theme: Theme;
    [key: string]: any; // Allow extensibility for future settings
}

interface SettingsContextType {
    settings: Settings;
    updateSetting: (key: string, value: any) => void;
}

const defaultSettings: Settings = {
    theme: 'dark' // Default to dark as per current app style
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

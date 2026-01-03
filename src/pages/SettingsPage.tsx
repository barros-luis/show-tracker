import { useState, useEffect } from 'react';
import { User, Sun, Moon, Settings as SettingsIcon, Shield, Info, ExternalLink } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { EditProfileForm } from '../components/forms/EditProfileForm';
import { AccountSettings } from '../components/forms/AccountSettings';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { MobileSettingsPage } from '../components/mobile';

type SettingsTab = 'profile' | 'appearance' | 'general' | 'account' | 'about';

interface SettingsPageProps {
    session: any;
    profile: any;
    supabase: any;
    onProfileUpdate: () => Promise<void>;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

// Platform detection hook
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => {
            const ua = navigator.userAgent.toLowerCase();
            setIsMobile(/android|iphone|ipad|ipod/i.test(ua) || window.innerWidth < 768);
        };
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    return isMobile;
}

export function SettingsPage(props: SettingsPageProps) {
    const isMobile = useIsMobile();

    // Render mobile version on mobile devices
    if (isMobile) {
        return <MobileSettingsPage {...props} />;
    }

    // Desktop version below
    return <DesktopSettingsPage {...props} />;
}

function DesktopSettingsPage({ session, profile, supabase, onProfileUpdate, showToast }: SettingsPageProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const { settings, updateSetting } = useSettings();

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'appearance', label: 'Appearance', icon: Sun },
        { id: 'general', label: 'General', icon: SettingsIcon },
        { id: 'account', label: 'Account', icon: Shield },
        { id: 'about', label: 'About', icon: Info },
    ];

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-100 dark:border-white/5 rounded-xl overflow-hidden shadow-md">
            {/* SIDEBAR */}
            <aside className="w-64 bg-white/80 dark:bg-gray-900/80 border-r border-gray-100 dark:border-white/5 flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-white/5">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                        Settings
                    </h2>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as SettingsTab)}
                                className={`cursor-pointer w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? 'bg-blue-500 !text-white shadow-md shadow-blue-500/20'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? '!text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* CONTENT AREA */}
            <main className="flex-1 overflow-y-auto bg-gray-50/30 dark:bg-gray-900/30 p-8">
                <div className="max-w-3xl mx-auto">

                    {/* HEADER */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 capitalize">{activeTab}</h1>
                        <p className="text-gray-500 dark:text-gray-400">Manage your {activeTab} settings and preferences.</p>
                    </div>

                    {/* TAB CONTENT */}
                    {activeTab === 'profile' && (
                        <EditProfileForm
                            session={session}
                            profile={profile}
                            supabase={supabase}
                            onProfileUpdate={onProfileUpdate}
                            showToast={showToast}
                        />
                    )}

                    {activeTab !== 'profile' && (
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-xl p-6 shadow-sm">

                            {activeTab === 'appearance' && (
                                <div className="space-y-8">
                                    {/* THEME TOGGLE */}
                                    <section>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Theme Preference</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => updateSetting('theme', 'light')}
                                                className={`cursor-pointer relative flex items-center justify-between p-4 rounded-xl border-2 transition-all ${settings.theme === 'light'
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                                                    : 'border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 bg-white dark:bg-gray-800'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-yellow-100 dark:bg-white text-yellow-600 dark:text-yellow-500 rounded-full">
                                                        <Sun className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className={`font-medium ${settings.theme === 'light' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>Light Mode</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Clean & bright</p>
                                                    </div>
                                                </div>
                                                {settings.theme === 'light' && <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />}
                                            </button>

                                            <button
                                                onClick={() => updateSetting('theme', 'dark')}
                                                className={`cursor-pointer relative flex items-center justify-between p-4 rounded-xl border-2 transition-all ${settings.theme === 'dark'
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                                                    : 'border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 bg-white dark:bg-gray-800'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-blue-300 rounded-full">
                                                        <Moon className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className={`font-medium ${settings.theme === 'dark' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>Dark Mode</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Easy on the eyes</p>
                                                    </div>
                                                </div>
                                                {settings.theme === 'dark' && <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />}
                                            </button>
                                        </div>
                                    </section>

                                    {/* MOUSE AURA TOGGLE */}
                                    <section>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Mouse Aura Effect</h3>
                                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">Enable Mouse Glow</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Show a glowing aura following your cursor</p>
                                            </div>
                                            <button
                                                onClick={() => updateSetting('mouseAura', !settings.mouseAura)}
                                                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${settings.mouseAura ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                                                    }`}
                                            >
                                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.mouseAura ? 'translate-x-6' : 'translate-x-0.5'
                                                    }`} />
                                            </button>
                                        </div>
                                    </section>

                                    {/* ZOOM LEVEL */}
                                    <section>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Zoom Level</h3>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-900 dark:text-white font-medium">{settings.zoomLevel}%</span>
                                                <button
                                                    onClick={() => updateSetting('zoomLevel', 100)}
                                                    className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 cursor-pointer"
                                                >
                                                    Reset to 100%
                                                </button>
                                            </div>
                                            <input
                                                type="range"
                                                min="50"
                                                max="150"
                                                step="5"
                                                value={settings.zoomLevel}
                                                onChange={(e) => updateSetting('zoomLevel', parseInt(e.target.value))}
                                                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                            />
                                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-500">
                                                <span>50%</span>
                                                <span>100%</span>
                                                <span>150%</span>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'general' && (
                                <div className="space-y-8">
                                    {/* ADULT CONTENT FILTER */}
                                    <section>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Content Filter</h3>
                                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">Show Adult Content</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Include 18+ content in search results</p>
                                            </div>
                                            <button
                                                onClick={() => updateSetting('adultContent', !settings.adultContent)}
                                                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${settings.adultContent ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                                                    }`}
                                            >
                                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.adultContent ? 'translate-x-6' : 'translate-x-0.5'
                                                    }`} />
                                            </button>
                                        </div>
                                        {settings.adultContent && (
                                            <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                                                ⚠️ Adult content will be shown in search results.
                                            </p>
                                        )}
                                    </section>

                                    {/* CLOSE TO TRAY */}
                                    <section>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Window Behavior</h3>
                                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">Close to System Tray</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Minimize to tray instead of quitting when closing the window</p>
                                            </div>
                                            <button
                                                onClick={() => updateSetting('closeToTray', !settings.closeToTray)}
                                                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${settings.closeToTray ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                                                    }`}
                                            >
                                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.closeToTray ? 'translate-x-6' : 'translate-x-0.5'
                                                    }`} />
                                            </button>
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                                            {settings.closeToTray ? 'The app will stay running in your system tray' : 'The app will fully close when you click X'}
                                        </p>
                                    </section>

                                    {/* LAUNCH AT STARTUP */}
                                    <section>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Startup</h3>
                                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">Launch at Startup</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Automatically start the app when you log in to your computer</p>
                                            </div>
                                            <button
                                                onClick={() => updateSetting('launchAtStartup', !settings.launchAtStartup)}
                                                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${settings.launchAtStartup ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                                                    }`}
                                            >
                                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.launchAtStartup ? 'translate-x-6' : 'translate-x-0.5'
                                                    }`} />
                                            </button>
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                                            {settings.launchAtStartup ? 'The app will start automatically when you log in' : 'The app will only start when you open it manually'}
                                        </p>
                                    </section>

                                    {/* NOTIFICATIONS */}
                                    <section>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Notifications</h3>
                                        <div className="space-y-4">
                                            {/* In-App Notifications */}
                                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">In-App Notifications</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Show notifications in the app's bell icon</p>
                                                </div>
                                                <button
                                                    onClick={() => updateSetting('notifyInApp', !settings.notifyInApp)}
                                                    className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${settings.notifyInApp ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                                                        }`}
                                                >
                                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.notifyInApp ? 'translate-x-6' : 'translate-x-0.5'
                                                        }`} />
                                                </button>
                                            </div>

                                            {/* OS Notifications */}
                                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">System Notifications</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Send notifications to your operating system</p>
                                                </div>
                                                <button
                                                    onClick={() => updateSetting('notifyOS', !settings.notifyOS)}
                                                    className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${settings.notifyOS ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                                                        }`}
                                                >
                                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.notifyOS ? 'translate-x-6' : 'translate-x-0.5'
                                                        }`} />
                                                </button>
                                            </div>

                                            {/* Check Interval */}
                                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">Check Interval</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">How often to check for new episodes</p>
                                                </div>
                                                <select
                                                    value={settings.notifyCheckInterval}
                                                    onChange={(e) => updateSetting('notifyCheckInterval', parseInt(e.target.value))}
                                                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                                >
                                                    <option value={1}>Every 1 hour</option>
                                                    <option value={2}>Every 2 hours</option>
                                                    <option value={4}>Every 4 hours</option>
                                                    <option value={6}>Every 6 hours</option>
                                                    <option value={12}>Every 12 hours</option>
                                                </select>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )}
                            {activeTab === 'account' && (
                                <AccountSettings />
                            )}
                            {activeTab === 'about' && (
                                <div className="space-y-8">
                                    {/* App Info */}
                                    <section>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">About AShow Tracker</h3>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                            AShow Tracker helps you keep track of your favorite anime, movies, and TV shows.
                                            Mark episodes as watched, track your progress, and never lose your place again.
                                        </p>
                                    </section>

                                    {/* Data Sources */}
                                    <section>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Data Sources</h3>
                                        <div className="space-y-4">
                                            {/* TMDB Attribution */}
                                            <div className="bg-gray-50/50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                                                <div className="flex items-center gap-4 mb-3">
                                                    <img
                                                        src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
                                                        alt="TMDB Logo"
                                                        className="h-5"
                                                    />
                                                </div>
                                                <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                                                    This product uses the TMDB API but is not endorsed or certified by TMDB.
                                                    Movie and TV show data, trailers, and images are provided by The Movie Database.
                                                </p>
                                                <a
                                                    href="https://www.themoviedb.org"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 text-xs mt-2 transition-colors"
                                                >
                                                    Visit TMDB <ExternalLink size={12} />
                                                </a>
                                            </div>

                                            {/* Jikan Attribution */}
                                            <div className="bg-gray-50/50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                                                <div className="flex items-center gap-4 mb-3">
                                                    <span className="text-gray-900 dark:text-white font-bold text-lg">Jikan API</span>
                                                    <span className="text-gray-500 text-xs">(MyAnimeList)</span>
                                                </div>
                                                <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                                                    Anime data is provided by the Jikan API, an unofficial MyAnimeList API.
                                                    This includes anime information, episode lists, and related metadata.
                                                </p>
                                                <a
                                                    href="https://jikan.moe"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 text-xs mt-2 transition-colors"
                                                >
                                                    Visit Jikan <ExternalLink size={12} />
                                                </a>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Version */}
                                    <section className="pt-4 border-t border-gray-100 dark:border-white/5">
                                        <p className="text-gray-500 text-xs text-center">
                                            AShow Tracker v1.2.1 • Made with ❤️
                                        </p>
                                    </section>
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

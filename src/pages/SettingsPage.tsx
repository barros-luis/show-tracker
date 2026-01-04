import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import pkg from "../../package.json";
import { User, Sun, Moon, Settings as SettingsIcon, Shield, Info, ExternalLink, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { EditProfileForm } from '../components/forms/EditProfileForm';
import { AccountSettings } from '../components/forms/AccountSettings';

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
    const { t, i18n } = useTranslation();

    // Language dropdown state
    const [langDropdownOpen, setLangDropdownOpen] = useState(false);
    const languages = [
        { code: 'en', label: 'English', flagCode: 'GB' },
        { code: 'pt', label: 'Português', flagCode: 'PT' },
    ];
    const currentLang = languages.find(l => i18n.language.startsWith(l.code)) || languages[0];

    const tabs = [
        { id: 'profile', label: t('settings.tabs.profile'), icon: User },
        { id: 'appearance', label: t('settings.tabs.appearance'), icon: Sun },
        { id: 'general', label: t('settings.tabs.general'), icon: SettingsIcon },
        { id: 'account', label: t('settings.tabs.account'), icon: Shield },
        { id: 'about', label: t('settings.tabs.about'), icon: Info },
    ];

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-100 dark:border-white/5 rounded-xl overflow-hidden shadow-md">
            {/* SIDEBAR */}
            <aside className="w-64 bg-white/80 dark:bg-gray-900/80 border-r border-gray-100 dark:border-white/5 flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-white/5">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                        {t('settings.title')}
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
                                className={`cursor - pointer w - full flex items - center gap - 3 px - 4 py - 3 rounded - lg text - sm font - medium transition - all ${isActive
                                        ? 'bg-blue-500 !text-white shadow-md shadow-blue-500/20'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                    } `}
                            >
                                <Icon className={`w - 4 h - 4 ${isActive ? '!text-white' : 'text-gray-500 dark:text-gray-400'} `} />
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
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 capitalize">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">{t('settings.manage_desc')}</p>
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
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.appearance.theme_title')}</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => updateSetting('theme', 'light')}
                                                className={`cursor - pointer relative flex items - center justify - between p - 4 rounded - xl border - 2 transition - all ${settings.theme === 'light'
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                                                        : 'border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 bg-white dark:bg-gray-800'
                                                    } `}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-yellow-100 dark:bg-white text-yellow-600 dark:text-yellow-500 rounded-full">
                                                        <Sun className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className={`font - medium ${settings.theme === 'light' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-900 dark:text-white'} `}>{t('settings.appearance.light')}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.appearance.light_desc')}</p>
                                                    </div>
                                                </div>
                                                {settings.theme === 'light' && <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />}
                                            </button>

                                            <button
                                                onClick={() => updateSetting('theme', 'dark')}
                                                className={`cursor - pointer relative flex items - center justify - between p - 4 rounded - xl border - 2 transition - all ${settings.theme === 'dark'
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                                                        : 'border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 bg-white dark:bg-gray-800'
                                                    } `}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-blue-300 rounded-full">
                                                        <Moon className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className={`font - medium ${settings.theme === 'dark' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-900 dark:text-white'} `}>{t('settings.appearance.dark')}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.appearance.dark_desc')}</p>
                                                    </div>
                                                </div>
                                                {settings.theme === 'dark' && <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />}
                                            </button>
                                        </div>
                                    </section>

                                    {/* MOUSE AURA TOGGLE */}
                                    <section>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.appearance.mouse_aura_title')}</h3>
                                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{t('settings.appearance.mouse_aura_label')}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.appearance.mouse_aura_desc')}</p>
                                            </div>
                                            <button
                                                onClick={() => updateSetting('mouseAura', !settings.mouseAura)}
                                                className={`relative w - 12 h - 6 rounded - full transition - colors cursor - pointer ${settings.mouseAura ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                                                    } `}
                                            >
                                                <div className={`absolute top - 0.5 w - 5 h - 5 bg - white rounded - full transition - transform ${settings.mouseAura ? 'translate-x-6' : 'translate-x-0.5'
                                                    } `} />
                                            </button>
                                        </div>
                                    </section>

                                    {/* ZOOM LEVEL */}
                                    <section>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.appearance.zoom_title')}</h3>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-900 dark:text-white font-medium">{settings.zoomLevel}%</span>
                                                <button
                                                    onClick={() => updateSetting('zoomLevel', 100)}
                                                    className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 cursor-pointer"
                                                >
                                                    {t('settings.appearance.zoom_reset')}
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
                                    {/* LANGUAGE SELECTOR - Custom Dropdown */}
                                    <section>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.general.language_title')}</h3>
                                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{t('settings.general.language_title')}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.general.language_desc')}</p>
                                            </div>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                                                    className="flex items-center gap-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px] justify-between cursor-pointer hover:border-blue-400 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <img
                                                            src={`https://flagcdn.com/w20/${currentLang.flagCode.toLowerCase()}.png`}
                                                            alt={currentLang.label}
                                                            className="w-5 h-4 object-cover rounded-sm"
                                                        />
                                                        <span>{currentLang.label}</span>
                                                    </div >
                                                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${langDropdownOpen ? 'rotate-90' : ''}`} />
                                                </button >

                                                <AnimatePresence>
                                                    {langDropdownOpen && (
                                                        <>
                                                            {/* Backdrop to close dropdown */}
                                                            <div
                                                                className="fixed inset-0 z-40"
                                                                onClick={() => setLangDropdownOpen(false)}
                                                            />
                                                            <motion.div
                                                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                transition={{ duration: 0.15 }}
                                                                className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50"
                                                            >
                                                                {languages.map((lang) => (
                                                                    <button
                                                                        key={lang.code}
                                                                        onClick={async () => {
                                                                            i18n.changeLanguage(lang.code);
                                                                            setLangDropdownOpen(false);

                                                                            // Save to Supabase
                                                                            if (session?.user?.id && profile) {
                                                                                const currentSettings = (profile.settings as Record<string, unknown>) || {};
                                                                                const newSettings = { ...currentSettings, language: lang.code };

                                                                                try {
                                                                                    await supabase
                                                                                        .from('profiles')
                                                                                        .update({ settings: newSettings })
                                                                                        .eq('id', session.user.id);
                                                                                    onProfileUpdate();
                                                                                } catch (err) {
                                                                                    console.error("Failed to save language preference:", err);
                                                                                }
                                                                            }
                                                                        }}
                                                                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors cursor-pointer ${currentLang.code === lang.code
                                                                            ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                                            }`}
                                                                    >
                                                                        <img
                                                                            src={`https://flagcdn.com/w20/${lang.flagCode.toLowerCase()}.png`}
                                                                            alt={lang.label}
                                                                            className="w-5 h-4 object-cover rounded-sm"
                                                                        />
                                                                        <span className="font-medium">{lang.label}</span>
                                                                        {currentLang.code === lang.code && (
                                                                            <div className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                                                        )}
                                                                    </button>
                                                                ))}
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </AnimatePresence>
                                            </div >
                                        </div >
                                    </section >

                                    {/* ADULT CONTENT FILTER */}
                                    < section >
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.general.content_filter_title')}</h3>
                                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{t('settings.general.adult_content_label')}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.general.adult_content_desc')}</p>
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
                                        {
                                            settings.adultContent && (
                                                <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                                                    {t('settings.general.adult_warning')}
                                                </p>
                                            )
                                        }
                                    </section >

                                    {/* CLOSE TO TRAY */}
                                    < section >
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.general.window_behavior_title')}</h3>
                                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{t('settings.general.close_to_tray_label')}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.general.close_to_tray_desc')}</p>
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
                                            {settings.closeToTray ? t('settings.general.tray_hint_on') : t('settings.general.tray_hint_off')}
                                        </p>
                                    </section >

                                    {/* LAUNCH AT STARTUP */}
                                    < section >
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.general.startup_title')}</h3>
                                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{t('settings.general.launch_startup_label')}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.general.launch_startup_desc')}</p>
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
                                            {settings.launchAtStartup ? t('settings.general.startup_hint_on') : t('settings.general.startup_hint_off')}
                                        </p>
                                    </section >

                                    {/* NOTIFICATIONS */}
                                    < section >
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.general.notifications_title')}</h3>
                                        <div className="space-y-4">
                                            {/* In-App Notifications */}
                                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{t('settings.general.notify_in_app_label')}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.general.notify_in_app_desc')}</p>
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
                                                    <p className="font-medium text-gray-900 dark:text-white">{t('settings.general.notify_os_label')}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.general.notify_os_desc')}</p>
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
                                                    <p className="font-medium text-gray-900 dark:text-white">{t('settings.general.check_interval_label')}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.general.check_interval_desc')}</p>
                                                </div>
                                                <select
                                                    value={settings.notifyCheckInterval}
                                                    onChange={(e) => updateSetting('notifyCheckInterval', parseInt(e.target.value))}
                                                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                                >
                                                    <option value={1}>{t('settings.general.hours_1')}</option>
                                                    <option value={2}>{t('settings.general.hours_2')}</option>
                                                    <option value={4}>{t('settings.general.hours_4')}</option>
                                                    <option value={6}>{t('settings.general.hours_6')}</option>
                                                    <option value={12}>{t('settings.general.hours_12')}</option>
                                                </select>
                                            </div>
                                        </div>
                                    </section >
                                </div >
                            )}
                            {
                                activeTab === 'account' && (
                                    <AccountSettings />
                                )
                            }
                            {
                                activeTab === 'about' && (
                                    <div className="space-y-8">
                                        {/* App Info */}
                                        <section>
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.about.app_title')}</h3>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                                {t('settings.about.app_desc')}
                                            </p>
                                        </section>

                                        {/* Data Sources */}
                                        <section>
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.about.data_sources_title')}</h3>
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
                                                        {t('settings.about.tmdb_disclaimer')}
                                                    </p>
                                                    <a
                                                        href="https://www.themoviedb.org"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 text-xs mt-2 transition-colors"
                                                    >
                                                        {t('settings.about.visit_tmdb')} <ExternalLink size={12} />
                                                    </a>
                                                </div>

                                                {/* Jikan Attribution */}
                                                <div className="bg-gray-50/50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                                                    <div className="flex items-center gap-4 mb-3">
                                                        <span className="text-gray-900 dark:text-white font-bold text-lg">{t('settings.about.jikan_title')}</span>
                                                        <span className="text-gray-500 text-xs">{t('settings.about.jikan_sub')}</span>
                                                    </div>
                                                    <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                                                        {t('settings.about.jikan_disclaimer')}
                                                    </p>
                                                    <a
                                                        href="https://jikan.moe"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 text-xs mt-2 transition-colors"
                                                    >
                                                        {t('settings.about.visit_jikan')} <ExternalLink size={12} />
                                                    </a>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Privacy Policy */}
                                        <section>
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.about.privacy_policy')}</h3>
                                            <div className="bg-gray-50/50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                                                <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                                                    {t('settings.about.privacy_policy_desc')}
                                                </p>
                                                <a
                                                    href="https://ashow-tracker.pages.dev/privacy.html"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 text-xs mt-2 transition-colors"
                                                >
                                                    {t('settings.about.privacy_policy')} <ExternalLink size={12} />
                                                </a>
                                            </div>
                                        </section>

                                        {/* Terms and Conditions */}
                                        <section>
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.about.terms_and_conditions')}</h3>
                                            <div className="bg-gray-50/50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                                                <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                                                    {t('settings.about.terms_and_conditions_desc')}
                                                </p>
                                                <a
                                                    href="https://ashow-tracker.pages.dev/terms.html"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 text-xs mt-2 transition-colors"
                                                >
                                                    {t('settings.about.terms_and_conditions')} <ExternalLink size={12} />
                                                </a>
                                            </div>
                                        </section>

                                        {/* Version */}
                                        <section className="pt-4 border-t border-gray-100 dark:border-white/5">
                                            <p className="text-gray-500 text-xs text-center">
                                                AShow Tracker v{pkg.version} • {t('settings.about.made_with')}
                                            </p>
                                        </section>
                                    </div>
                                )
                            }

                        </div >
                    )}
                </div >
            </main >
        </div >
    );
}

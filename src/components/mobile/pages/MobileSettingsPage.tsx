/**
 * Mobile Settings Page
 * 
 * A mobile-optimized settings page with:
 * - Full-width accordion sections
 * - Large touch targets for toggles
 * - Platform-aware feature hiding (desktop-only features)
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Sun, Settings as SettingsIcon,
    ChevronRight, Bell, Camera, Save, Shuffle, LogOut, Shield, Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../../context/SettingsContext';
import { AccountSettings } from '../../../components/forms/AccountSettings';


interface MobileSettingsPageProps {
    session: any;
    profile: any;
    supabase: any;
    onProfileUpdate: () => Promise<void>;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type SectionId = 'profile' | 'appearance' | 'notifications' | 'content' | 'account' | 'about';

// Toggle Switch Component
function Toggle({ enabled, onToggle, color = 'blue' }: {
    enabled: boolean;
    onToggle: () => void;
    color?: 'blue' | 'red';
}) {
    const colorClass = color === 'red'
        ? (enabled ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600')
        : (enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600');

    return (
        <div
            onClick={onToggle}
            className={`relative rounded-full transition-colors flex-shrink-0 cursor-pointer ${colorClass}`}
            style={{
                width: '50px',
                height: '30px',
                minWidth: '50px',
                minHeight: '30px',
                flexShrink: 0
            }}
        >
            <div
                className={`absolute bg-white rounded-full shadow-sm transition-transform`}
                style={{
                    width: '24px',
                    height: '24px',
                    top: '3px',
                    left: '3px',
                    transform: enabled ? 'translateX(20px)' : 'translateX(0)'
                }}
            />
        </div>
    );
}

// Setting Row Component
function SettingRow({
    label,
    description,
    children
}: {
    label: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-white/5 last:border-0">
            <div className="flex-1 pr-4">
                <p className="text-gray-900 dark:text-white font-medium">{label}</p>
                {description && (
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{description}</p>
                )}
            </div>
            {children}
        </div>
    );
}

// Expandable Section
function Section({
    title,
    icon: Icon,
    isOpen,
    onToggle,
    children
}: {
    title: string;
    icon: React.ElementType;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white/50 dark:bg-gray-900/50 border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden mb-3 shadow-sm">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center">
                        <Icon size={20} className="text-blue-500 dark:text-blue-400" />
                    </div>
                    <span className="text-gray-900 dark:text-white font-semibold">{title}</span>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronRight size={20} className="text-gray-500" />
                </motion.div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function MobileSettingsPage({
    session,
    profile,
    showToast,
    supabase,
    onProfileUpdate
}: MobileSettingsPageProps) {
    const { settings, updateSetting } = useSettings();
    const { t, i18n } = useTranslation();
    const [openSection, setOpenSection] = useState<SectionId | null>(null);

    // Profile Edit State
    const [loading, setLoading] = useState(false);
    const [nickname, setNickname] = useState(profile?.nickname || "");
    const [aboutMe, setAboutMe] = useState(profile?.about_me || "");
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
    const [bannerGradient, setBannerGradient] = useState(profile?.banner_gradient || 'bg-gradient-to-r from-blue-600 to-indigo-600');

    // File Input Ref - Unused as we use label wrapping for trigger
    // const fileInputRef = useState<HTMLInputElement | null>(null);

    const toggleSection = (id: SectionId) => {
        setOpenSection(prev => prev === id ? null : id);
    };

    // Language dropdown state
    const [langDropdownOpen, setLangDropdownOpen] = useState(false);
    const languages = [
        { code: 'en', label: 'English', flag: '🇬🇧' },
        { code: 'pt', label: 'Português', flag: '🇵🇹' },
    ];
    const currentLang = languages.find(l => i18n.language.startsWith(l.code)) || languages[0];

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            const updates = {
                id: session.user.id,
                nickname,
                about_me: aboutMe,
                banner_gradient: bannerGradient,
                avatar_url: avatarUrl,
                updated_at: new Date(),
            };

            const { error } = await supabase.from("profiles").upsert(updates);
            if (error) throw error;

            await onProfileUpdate();
            showToast("Profile saved! ✅", "success");
        } catch (error: any) {
            console.error("Error updating profile:", error);
            showToast("Failed to save: " + (error.message || "Unknown error"), "error");
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;

        try {
            setLoading(true);
            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
            setAvatarUrl(data.publicUrl);
            showToast("Avatar uploaded! Don't forget to save.", "info");
        } catch (error: any) {
            showToast("Upload failed: " + error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const GRADIENTS = [
        'bg-gradient-to-r from-pink-500 to-violet-600',
        'bg-gradient-to-r from-cyan-500 to-blue-600',
        'bg-gradient-to-r from-emerald-500 to-teal-600',
        'bg-gradient-to-r from-purple-500 to-indigo-600',
        'bg-gradient-to-r from-orange-500 to-red-600',
        'bg-gradient-to-r from-gray-800 to-black',
    ];

    const shuffleGradient = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent closing section
        const random = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
        setBannerGradient(random);
    };

    return (
        <div className="min-h-screen px-4 py-6 pb-24">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <SettingsIcon className="text-blue-500 dark:text-blue-400" size={24} />
                    {t('settings.title')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    {t('settings.manage_desc')}
                </p>
            </div>

            {/* Account & Profile Section */}
            {session && (
                <Section
                    title={t('settings.tabs.profile')}
                    icon={User}
                    isOpen={openSection === 'profile'}
                    onToggle={() => toggleSection('profile')}
                >
                    <div className="space-y-6 pt-2">
                        {/* Visual Identity Editor */}
                        <div className={`h-40 ${bannerGradient} rounded-xl relative flex items-center justify-center transition-colors duration-500`}>
                            <button
                                onClick={shuffleGradient}
                                className="absolute top-3 right-3 p-2 bg-black/30 text-white rounded-full backdrop-blur-md border border-white/10 shadow-lg cursor-pointer"
                                title="Shuffle Banner"
                            >
                                <Shuffle size={16} />
                            </button>

                            <div className="relative group">
                                <div className="h-24 w-24 rounded-full border-4 border-white dark:border-gray-900 shadow-xl overflow-hidden bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl font-bold text-gray-500 dark:text-white">{nickname?.[0]?.toUpperCase() || 'U'}</span>
                                    )}
                                </div>
                                <label className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Camera size={24} className="text-white" />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                                </label>
                            </div>
                        </div>

                        {/* Fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">{t('profile_form.display_name')}</label>
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder={t('profile_form.display_name_placeholder')}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">{t('profile_form.about_me_label')}</label>
                                <textarea
                                    value={aboutMe}
                                    onChange={(e) => setAboutMe(e.target.value)}
                                    className="w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[160px]"
                                    placeholder={t('profile_form.about_me_placeholder')}
                                />
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSaveProfile}
                            disabled={loading}
                            className="w-full py-3 bg-blue-500 hover:bg-blue-600 !text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? t('profile_form.saving') : <><Save size={18} /> {t('profile_form.save')}</>}
                        </button>
                    </div>
                </Section>
            )}

            {/* Appearance Section */}
            <Section
                title={t('settings.tabs.appearance')}
                icon={Sun}
                isOpen={openSection === 'appearance'}
                onToggle={() => toggleSection('appearance')}
            >
                {/* Language Selector - Custom Dropdown */}
                <SettingRow label={t('settings.general.language_title')} description={t('settings.general.language_desc')}>
                    <div className="relative">
                        <button
                            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                            className="flex items-center gap-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded-xl px-4 py-2.5 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px] justify-between shadow-sm"
                        >
                            <div className="flex items-center gap-2">
                                <Globe size={16} className="text-blue-500" />
                                <span>{currentLang.flag} {currentLang.label}</span>
                            </div>
                            <ChevronRight size={16} className={`text-gray-400 transition-transform ${langDropdownOpen ? 'rotate-90' : ''}`} />
                        </button>

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
                                        className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50 min-w-[180px]"
                                    >
                                        {languages.map((lang) => (
                                            <button
                                                key={lang.code}
                                                onClick={() => {
                                                    i18n.changeLanguage(lang.code);
                                                    setLangDropdownOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${currentLang.code === lang.code
                                                    ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                <span className="text-xl">{lang.flag}</span>
                                                <span className="font-medium">{lang.label}</span>
                                                {currentLang.code === lang.code && (
                                                    <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />
                                                )}
                                            </button>
                                        ))}
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </SettingRow>

                <SettingRow label={t('settings.appearance.dark')} description={t('settings.appearance.dark_desc')}>
                    <Toggle
                        enabled={settings.theme === 'dark'}
                        onToggle={() => updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')}
                    />
                </SettingRow>
            </Section>

            {/* Notifications Section */}
            <Section
                title={t('settings.general.notifications_title')}
                icon={Bell}
                isOpen={openSection === 'notifications'}
                onToggle={() => toggleSection('notifications')}
            >
                <SettingRow label={t('settings.general.notify_in_app_label')} description={t('settings.general.notify_in_app_desc')}>
                    <Toggle
                        enabled={settings.notifyInApp}
                        onToggle={() => updateSetting('notifyInApp', !settings.notifyInApp)}
                    />
                </SettingRow>

                <SettingRow label={t('settings.general.notify_os_label')} description={t('settings.general.notify_os_desc')}>
                    <Toggle
                        enabled={settings.notifyOS}
                        onToggle={() => updateSetting('notifyOS', !settings.notifyOS)}
                    />
                </SettingRow>
            </Section>

            {/* Content Section */}
            <Section
                title={t('settings.general.content_filter_title')}
                icon={User}
                isOpen={openSection === 'content'}
                onToggle={() => toggleSection('content')}
            >
                <SettingRow label={t('settings.general.adult_content_label')} description={t('settings.general.adult_content_desc')}>
                    <Toggle
                        enabled={settings.adultContent}
                        onToggle={() => updateSetting('adultContent', !settings.adultContent)}
                        color="red"
                    />
                </SettingRow>
                {settings.adultContent && (
                    <p className="text-red-500 dark:text-red-400 text-xs mt-2">
                        {t('settings.general.adult_warning')}
                    </p>
                )}
            </Section>

            {/* Account Management Section */}
            {session && (
                <Section
                    title={t('settings.tabs.account')}
                    icon={Shield}
                    isOpen={openSection === 'account'}
                    onToggle={() => toggleSection('account')}
                >
                    <div className="pt-2">
                        <AccountSettings />
                    </div>
                </Section>
            )}

            {/* About Section */}
            <Section
                title={t('settings.tabs.about')}
                icon={SettingsIcon}
                isOpen={openSection === 'about'}
                onToggle={() => toggleSection('about')}
            >
                <div className="space-y-4 text-sm">
                    <p className="text-gray-500 dark:text-gray-400">
                        {t('settings.about.app_desc')}
                    </p>

                    <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-3">
                        <p className="text-gray-500 dark:text-gray-500 text-xs mb-1">{t('settings.about.data_sources_title')}:</p>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-900 dark:text-white font-medium">TMDB</span>
                            <span className="text-gray-400 dark:text-gray-600">•</span>
                            <span className="text-gray-900 dark:text-white font-medium">Jikan/MAL</span>
                        </div>
                    </div>

                    {/* Privacy Policy */}
                    <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-3">
                        <p className="text-gray-500 dark:text-gray-500 text-xs mb-1">{t('settings.about.privacy_policy')}</p>
                        <a
                            href="https://ashow-tracker.pages.dev/privacy.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 text-sm font-medium"
                        >
                            {t('settings.about.privacy_policy_desc')}
                        </a>
                    </div>

                    {/* Terms and Conditions */}
                    <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-3">
                        <p className="text-gray-500 dark:text-gray-500 text-xs mb-1">{t('settings.about.terms_and_conditions')}</p>
                        <a
                            href="https://ashow-tracker.pages.dev/terms.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 text-sm font-medium"
                        >
                            {t('settings.about.terms_and_conditions_desc')}
                        </a>
                    </div>

                    <p className="text-center text-gray-500 dark:text-gray-600 text-xs pt-2">
                        AShow Tracker v1.2.1 • {t('settings.about.made_with')}
                    </p>
                </div>
            </Section>
            {/* Sign Out Button */}
            {session && (
                <div className="mt-8 mb-4">
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.reload(); // Force reload to clear state
                        }}
                        className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        <LogOut size={18} /> {t('user_menu.sign_out')}
                    </button>
                </div>
            )}
        </div>
    );
}

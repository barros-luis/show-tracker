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
    ChevronRight, Bell
} from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

interface MobileSettingsPageProps {
    session: any;
    profile: any;
    supabase: any;
    onProfileUpdate: () => Promise<void>;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type SectionId = 'appearance' | 'notifications' | 'content' | 'about';

// Toggle Switch Component
function Toggle({ enabled, onToggle, color = 'blue' }: {
    enabled: boolean;
    onToggle: () => void;
    color?: 'blue' | 'red';
}) {
    const colorClass = color === 'red'
        ? (enabled ? 'bg-red-500' : 'bg-gray-600')
        : (enabled ? 'bg-blue-500' : 'bg-gray-600');

    return (
        <button
            onClick={onToggle}
            className={`relative w-14 h-8 rounded-full transition-colors ${colorClass}`}
        >
            <div
                className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
            />
        </button>
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
        <div className="flex items-center justify-between py-4 border-b border-gray-800 last:border-0">
            <div className="flex-1 pr-4">
                <p className="text-white font-medium">{label}</p>
                {description && (
                    <p className="text-gray-500 text-sm mt-0.5">{description}</p>
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
        <div className="bg-gray-900/50 rounded-2xl overflow-hidden mb-3">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                        <Icon size={20} className="text-blue-400" />
                    </div>
                    <span className="text-white font-semibold">{title}</span>
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
    showToast
}: MobileSettingsPageProps) {
    const { settings, updateSetting } = useSettings();
    const [openSection, setOpenSection] = useState<SectionId | null>('appearance');

    const toggleSection = (id: SectionId) => {
        setOpenSection(prev => prev === id ? null : id);
    };

    const handleTestNotification = async () => {
        showToast("Checking permissions...", "info");
        try {
            let permissionGranted = await isPermissionGranted();
            if (!permissionGranted) {
                const permission = await requestPermission();
                permissionGranted = permission === 'granted';
            }

            if (permissionGranted) {
                await sendNotification({
                    title: 'Test Notification',
                    body: 'Notifications are working! 🎉',
                });
                showToast("Notification sent!", "success");
            } else {
                showToast("Permission denied", "error");
            }
        } catch (error) {
            showToast("Error: " + String(error), "error");
        }
    };

    return (
        <div className="min-h-screen px-4 py-6 pb-24">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <SettingsIcon className="text-blue-400" size={24} />
                    Settings
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    Customize your experience
                </p>
            </div>

            {/* Profile Quick View */}
            {session && profile && (
                <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-2xl p-4 mb-6 border border-blue-500/20">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gray-700 rounded-full flex items-center justify-center text-xl font-bold text-white overflow-hidden">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                profile.nickname?.[0]?.toUpperCase() || 'U'
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-white font-semibold">{profile.nickname || 'User'}</p>
                            <p className="text-gray-400 text-sm">{session.user.email}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Appearance Section */}
            <Section
                title="Appearance"
                icon={Sun}
                isOpen={openSection === 'appearance'}
                onToggle={() => toggleSection('appearance')}
            >
                <SettingRow label="Dark Mode" description="Use dark theme">
                    <Toggle
                        enabled={settings.theme === 'dark'}
                        onToggle={() => updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')}
                    />
                </SettingRow>

                <SettingRow label="Mouse Aura" description="Cursor glow effect (desktop)">
                    <Toggle
                        enabled={settings.mouseAura}
                        onToggle={() => updateSetting('mouseAura', !settings.mouseAura)}
                    />
                </SettingRow>
            </Section>

            {/* Notifications Section */}
            <Section
                title="Notifications"
                icon={Bell}
                isOpen={openSection === 'notifications'}
                onToggle={() => toggleSection('notifications')}
            >
                <SettingRow label="In-App Notifications" description="Show in notification bell">
                    <Toggle
                        enabled={settings.notifyInApp}
                        onToggle={() => updateSetting('notifyInApp', !settings.notifyInApp)}
                    />
                </SettingRow>

                <SettingRow label="System Notifications" description="Push notifications">
                    <Toggle
                        enabled={settings.notifyOS}
                        onToggle={() => updateSetting('notifyOS', !settings.notifyOS)}
                    />
                </SettingRow>

                <button
                    onClick={handleTestNotification}
                    className="w-full mt-3 py-3 bg-blue-600 text-white rounded-xl font-medium"
                >
                    Test Notification
                </button>
            </Section>

            {/* Content Section */}
            <Section
                title="Content"
                icon={User}
                isOpen={openSection === 'content'}
                onToggle={() => toggleSection('content')}
            >
                <SettingRow label="Adult Content" description="Include 18+ in search">
                    <Toggle
                        enabled={settings.adultContent}
                        onToggle={() => updateSetting('adultContent', !settings.adultContent)}
                        color="red"
                    />
                </SettingRow>
                {settings.adultContent && (
                    <p className="text-red-400 text-xs mt-2">
                        ⚠️ Adult content will be shown in search results.
                    </p>
                )}
            </Section>

            {/* About Section */}
            <Section
                title="About"
                icon={SettingsIcon}
                isOpen={openSection === 'about'}
                onToggle={() => toggleSection('about')}
            >
                <div className="space-y-4 text-sm">
                    <p className="text-gray-400">
                        AShow Tracker helps you track your favorite anime, movies, and TV shows.
                    </p>

                    <div className="bg-gray-800/50 rounded-xl p-3">
                        <p className="text-gray-500 text-xs mb-1">Data provided by:</p>
                        <div className="flex items-center gap-4">
                            <span className="text-white font-medium">TMDB</span>
                            <span className="text-gray-600">•</span>
                            <span className="text-white font-medium">Jikan/MAL</span>
                        </div>
                    </div>

                    <p className="text-center text-gray-600 text-xs pt-2">
                        AShow Tracker v1.0.0 • Made with ❤️
                    </p>
                </div>
            </Section>
        </div>
    );
}

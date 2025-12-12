import { useState } from 'react';
import { User, Sun, Moon, Settings as SettingsIcon, Shield } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { EditProfileForm } from './EditProfileForm';

type SettingsTab = 'profile' | 'appearance' | 'general' | 'account';

interface SettingsPageProps {
    session: any;
    profile: any;
    supabase: any;
    onProfileUpdate: () => Promise<void>;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function SettingsPage({ session, profile, supabase, onProfileUpdate, showToast }: SettingsPageProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const { settings, updateSetting } = useSettings();

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'appearance', label: 'Appearance', icon: Sun },
        { id: 'general', label: 'General', icon: SettingsIcon },
        { id: 'account', label: 'Account', icon: Shield },
    ];

    return (
        <div className="flex h-[calc(100vh-140px)] bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
            {/* SIDEBAR */}
            <aside className="w-64 bg-gray-900/80 border-r border-gray-800 flex flex-col">
                <div className="p-6 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5 text-blue-400" />
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
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* CONTENT AREA */}
            <main className="flex-1 overflow-y-auto bg-gray-900/30 p-8">
                <div className="max-w-3xl mx-auto">

                    {/* HEADER */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2 capitalize">{activeTab}</h1>
                        <p className="text-gray-400">Manage your {activeTab} settings and preferences.</p>
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
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">

                            {activeTab === 'appearance' && (
                                <div className="space-y-8">
                                    {/* THEME TOGGLE */}
                                    <section>
                                        <h3 className="text-lg font-medium text-white mb-4">Theme Preference</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => updateSetting('theme', 'light')}
                                                className={`relative flex items-center justify-between p-4 rounded-xl border-2 transition-all ${settings.theme === 'light'
                                                    ? 'border-blue-500 bg-blue-500/10'
                                                    : 'border-gray-700 hover:border-gray-600 bg-gray-800'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white text-yellow-500 rounded-full">
                                                        <Sun className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className={`font-medium ${settings.theme === 'light' ? 'text-blue-400' : 'text-white'}`}>Light Mode</p>
                                                        <p className="text-xs text-gray-400">Clean & bright</p>
                                                    </div>
                                                </div>
                                                {settings.theme === 'light' && <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />}
                                            </button>

                                            <button
                                                onClick={() => updateSetting('theme', 'dark')}
                                                className={`relative flex items-center justify-between p-4 rounded-xl border-2 transition-all ${settings.theme === 'dark'
                                                    ? 'border-blue-500 bg-blue-500/10'
                                                    : 'border-gray-700 hover:border-gray-600 bg-gray-800'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-gray-700 text-blue-300 rounded-full">
                                                        <Moon className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className={`font-medium ${settings.theme === 'dark' ? 'text-blue-400' : 'text-white'}`}>Dark Mode</p>
                                                        <p className="text-xs text-gray-400">Easy on the eyes</p>
                                                    </div>
                                                </div>
                                                {settings.theme === 'dark' && <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />}
                                            </button>
                                        </div>
                                    </section>

                                    {/* PLACEHOLDER FOR FUTURE SETTINGS */}
                                    <section className="opacity-50 pointer-events-none">
                                        <h3 className="text-lg font-medium text-white mb-4">Zoom Level (Coming Soon)</h3>
                                        <input type="range" className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                    </section>
                                </div>
                            )}

                            {activeTab === 'general' && (
                                <div className="text-center py-12 text-gray-500">
                                    <SettingsIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>General settings coming soon...</p>
                                </div>
                            )}
                            {activeTab === 'account' && (
                                <div className="text-center py-12 text-gray-500">
                                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>Account management coming soon...</p>
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

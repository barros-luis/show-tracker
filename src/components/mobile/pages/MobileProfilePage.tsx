/**
 * Mobile Profile Page
 * 
 * A mobile-optimized profile view with:
 * - Compact header with avatar
 * - Stacked sections for about and stats
 * - Bottom padding for navigation
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Github, Globe, Linkedin, Twitter, MapPin, Mail,
    Heart, Star, Zap, Code, Coffee,
    Gamepad2, Clapperboard, Music, Smile, Tv, Film, Sparkles
} from 'lucide-react';

interface MobileProfilePageProps {
    session: any;
    profile: any;
}

// Icon Mapping
const ICON_MAP: Record<string, any> = {
    Globe, Github, Twitter, Linkedin, Mail, MapPin,
    Heart, Star, Zap, Code, Coffee,
    Gamepad2, Clapperboard, Music, Smile
};

export function MobileProfilePage({ session, profile }: MobileProfilePageProps) {
    const [displayProfile, setDisplayProfile] = useState<any>(null);
    const [loadingTimeout, setLoadingTimeout] = useState(false);

    useEffect(() => {
        if (profile) setDisplayProfile(profile);

        const timeout = setTimeout(() => {
            if (!profile) setLoadingTimeout(true);
        }, 5000);

        return () => clearTimeout(timeout);
    }, [profile]);

    const handleLogout = () => {
        Object.keys(localStorage)
            .filter(k => k.startsWith('sb-') || k.includes('supabase'))
            .forEach(k => localStorage.removeItem(k));
        window.location.reload();
    };

    // Not logged in
    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
                <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Smile size={40} className="text-gray-500" />
                </div>
                <p className="text-gray-400 text-center">Please sign in to view your profile</p>
            </div>
        );
    }

    // Loading
    if (!displayProfile) {
        if (loadingTimeout) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
                    <p className="text-gray-400 text-lg mb-2">Unable to load profile</p>
                    <p className="text-gray-500 text-sm mb-6 text-center">This might be a session issue.</p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-5 py-3 bg-blue-600 text-white rounded-xl font-medium"
                        >
                            Retry
                        </button>
                        <button
                            onClick={handleLogout}
                            className="px-5 py-3 bg-red-600 text-white rounded-xl font-medium"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            );
        }
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const nickname = displayProfile.nickname || "Anonymous";
    const aboutMe = displayProfile.about_me || "";
    const customFields = displayProfile.custom_fields || [];
    const avatarUrl = displayProfile.avatar_url;
    const bannerGradient = displayProfile.banner_gradient || 'bg-gradient-to-r from-purple-500 to-indigo-600';

    return (
        <div className="min-h-screen pb-24">
            {/* Banner + Avatar */}
            <div className={`h-32 ${bannerGradient} relative`}>
                <div className="absolute -bottom-12 left-4">
                    <div className="w-24 h-24 rounded-full border-4 border-gray-900 overflow-hidden bg-gray-800">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={nickname} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white">
                                {nickname[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Name + Stats */}
            <div className="pt-16 px-4">
                <h1 className="text-2xl font-bold text-white">{nickname}</h1>
                {session?.user?.email && (
                    <p className="text-gray-500 text-sm">{session.user.email}</p>
                )}
            </div>

            {/* About Section */}
            {aboutMe && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-4 mt-6 p-4 bg-gray-800/50 rounded-2xl"
                >
                    <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        <span>👋</span> About Me
                    </h2>
                    <p className="text-gray-300 text-sm leading-relaxed">{aboutMe}</p>
                </motion.div>
            )}

            {/* Custom Fields */}
            {customFields.length > 0 && (
                <div className="mx-4 mt-4 space-y-3">
                    {customFields.map((field: any, idx: number) => {
                        const IconComponent = ICON_MAP[field.icon] || Globe;
                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-xl"
                            >
                                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                    <IconComponent size={18} className="text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">{field.label}</p>
                                    <p className="text-white font-medium">{field.value}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Quick Stats */}
            <div className="mx-4 mt-6 grid grid-cols-3 gap-3">
                <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <Sparkles className="mx-auto mb-2 text-yellow-400" size={20} />
                    <p className="text-xl font-bold text-white">0</p>
                    <p className="text-xs text-gray-500">Anime</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <Tv className="mx-auto mb-2 text-blue-400" size={20} />
                    <p className="text-xl font-bold text-white">0</p>
                    <p className="text-xs text-gray-500">TV Shows</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <Film className="mx-auto mb-2 text-purple-400" size={20} />
                    <p className="text-xl font-bold text-white">0</p>
                    <p className="text-xs text-gray-500">Movies</p>
                </div>
            </div>
        </div>
    );
}

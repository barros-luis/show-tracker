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
    Gamepad2, Clapperboard, Music, Smile
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

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
    const [displayProfile, setDisplayProfile] = useState<any>(profile || null);
    const [loadingTimeout, setLoadingTimeout] = useState(false);

    useEffect(() => {
        if (profile) {
            setDisplayProfile(profile);
            return;
        }

        const timeout = setTimeout(() => {
            if (!profile) setLoadingTimeout(true);
        }, 20000);

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
        <div className="min-h-screen pb-24 -mx-4 -mt-4">
            {/* Banner + Avatar - full width, extends to screen edges */}
            <div className={`h-40 ${bannerGradient} relative`}>
                <div className="absolute -bottom-12 left-6">
                    <div className="w-24 h-24 rounded-full border-4 border-gray-900 dark:border-gray-900 overflow-hidden bg-white dark:bg-gray-800 shadow-xl">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={nickname} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white bg-gradient-to-br from-blue-500 to-purple-600">
                                {nickname[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Name + Email - with padding restored */}
            <div className="pt-16 px-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{nickname}</h1>
                {session?.user?.email && (
                    <p className="text-gray-500 text-sm">{session.user.email}</p>
                )}
            </div>

            {/* About Section */}
            {aboutMe && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-6 mt-6 p-4 bg-white/80 dark:bg-gray-800/50 rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-transparent backdrop-blur-sm"
                >
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <span>👋</span> About Me
                    </h2>
                    <div className="prose prose-sm max-w-none prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:text-sm prose-p:leading-relaxed prose-a:text-blue-500 prose-strong:text-gray-900 dark:prose-strong:text-white prose-ul:text-gray-700 dark:prose-ul:text-gray-300 prose-ol:text-gray-700 dark:prose-ol:text-gray-300">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                            components={{
                                h1: ({ children }) => <h3 className="text-base font-bold mb-2 text-gray-900 dark:text-white">{children}</h3>,
                                h2: ({ children }) => <h4 className="text-sm font-bold mb-2 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1">{children}</h4>,
                                h3: ({ children }) => <h5 className="text-sm font-semibold mb-1 text-gray-900 dark:text-white">{children}</h5>,
                                p: ({ children }) => <p className="mb-3 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-0.5">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-0.5">{children}</ol>,
                                li: ({ children }) => <li className="text-gray-700 dark:text-gray-300 text-sm">{children}</li>,
                                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{children}</a>,
                                strong: ({ children }) => <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                                code: ({ children }) => <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs font-mono text-pink-500 dark:text-pink-400">{children}</code>,
                                blockquote: ({ children }) => <blockquote className="border-l-2 border-blue-500 pl-3 my-3 italic text-gray-500 dark:text-gray-400 text-sm bg-gray-50 dark:bg-white/5 py-1 rounded-r-lg">{children}</blockquote>,
                                hr: () => <hr className="border-gray-200 dark:border-white/10 my-4" />,
                                // Table components for mobile
                                table: ({ children }) => <div className="overflow-x-auto my-3 rounded-lg border border-gray-200 dark:border-gray-700"><table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">{children}</table></div>,
                                thead: ({ children }) => <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">{children}</thead>,
                                tbody: ({ children }) => <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-transparent">{children}</tbody>,
                                tr: ({ children }) => <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">{children}</tr>,
                                th: ({ children }) => <th className="px-3 py-2 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{children}</th>,
                                td: ({ children }) => <td className="px-3 py-2 align-top">{children}</td>,
                                // Image component for mobile
                                img: ({ src, alt }) => (
                                    <div className="my-3 relative group inline-block w-full">
                                        <img
                                            src={src}
                                            alt={alt}
                                            className="rounded-lg shadow-sm w-full h-auto object-cover border border-gray-200 dark:border-gray-700"
                                            loading="lazy"
                                        />
                                        {alt && <span className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-center text-xs">{alt}</span>}
                                    </div>
                                ),
                            }}
                        >
                            {aboutMe}
                        </ReactMarkdown>
                    </div>
                </motion.div>
            )}

            {/* Custom Fields */}
            {customFields.length > 0 && (
                <div className="mx-6 mt-4 space-y-3">
                    {customFields.map((field: any, idx: number) => {
                        const IconComponent = ICON_MAP[field.icon] || Globe;
                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800/30 rounded-xl shadow-sm border border-gray-100 dark:border-transparent"
                            >
                                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
                                    <IconComponent size={18} className="text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">{field.label}</p>
                                    <p className="text-gray-900 dark:text-white font-medium">{field.value}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}


        </div>
    );
}

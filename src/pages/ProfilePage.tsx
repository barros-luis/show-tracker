import { useEffect, useState } from "react";
import {
    Github, Globe, Linkedin, Twitter, AlertCircle,
    Zap, Heart, Star, Code, Coffee, MapPin, Mail,
    Gamepad2, Clapperboard, Music, Smile
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { MobileProfilePage } from "../components/mobile";

interface ProfilePageProps {
    session: any;
    profile: any;
}

// Icon Mapping (Read Only)
const ICON_MAP: Record<string, any> = {
    Globe, Github, Twitter, Linkedin, Mail, MapPin,
    Heart, Star, Zap, Code, Coffee,
    Gamepad2, Clapperboard, Music, Smile
};

import { usePlatform } from "../hooks/usePlatform";
import { useTranslation } from "react-i18next";

export function ProfilePage(props: ProfilePageProps) {
    const { isMobile } = usePlatform();

    // Render mobile version on mobile devices
    if (isMobile) {
        return <MobileProfilePage {...props} />;
    }

    // Desktop version below
    return <DesktopProfilePage {...props} />;
}

function DesktopProfilePage({ session, profile }: ProfilePageProps) {
    const [displayProfile, setDisplayProfile] = useState<any>(profile || null);
    const [loadingTimeout, setLoadingTimeout] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        if (profile) {
            setDisplayProfile(profile);
            return; // No need for timeout if we have profile
        }

        // Set timeout to stop infinite loading - match the 20s from useAuth
        const timeout = setTimeout(() => {
            if (!profile) setLoadingTimeout(true);
        }, 20000);

        return () => clearTimeout(timeout);
    }, [profile]);

    // Not logged in
    if (!session) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-400 text-lg mb-4">{t('profile.sign_in_required')}</p>
            </div>
        );
    }

    // Loading with timeout fallback
    if (!displayProfile) {
        const handleLogout = () => {
            // Clear all supabase-related localStorage
            Object.keys(localStorage)
                .filter(k => k.startsWith('sb-') || k.includes('supabase'))
                .forEach(k => localStorage.removeItem(k));
            window.location.reload();
        };

        if (loadingTimeout) {
            return (
                <div className="text-center py-20">
                    <p className="text-gray-400 text-lg mb-4">{t('profile.unable_to_load')}</p>
                    <p className="text-gray-500 text-sm mb-6">{t('profile.session_issue')}</p>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                        >
                            {t('profile.retry')}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500"
                        >
                            {t('profile.logout')}
                        </button>
                    </div>
                </div>
            );
        }
        return <div className="text-white p-10 text-center">{t('profile.loading')}</div>;
    }

    const nickname = displayProfile.nickname || t('profile.anonymous');
    const aboutMe = displayProfile.about_me || "";
    const customFields = displayProfile.custom_fields || [];
    const avatarUrl = displayProfile.avatar_url;

    // Use the saved gradient directly, or fallback to default
    const bannerGradientClass = displayProfile.banner_gradient || 'bg-gradient-to-r from-purple-500 to-indigo-600';

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl animate-fade-in text-left">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: PROFILE CARD */}
                <div className="lg:col-span-1">
                    <div className="sticky top-8">
                        <div className="relative rounded-3xl overflow-hidden shadow-sm dark:shadow-none border border-gray-100 dark:border-none dark:ring-2 dark:ring-white/5 dark:ring-inset bg-white dark:bg-gray-900/40 backdrop-blur-xl min-h-[500px] flex flex-col">

                            {/* Header Gradient */}
                            <div className={`h-48 ${bannerGradientClass} relative flex items-center justify-center`}>
                                <div className="h-40 w-40 rounded-full border-4 border-black/20 shadow-2xl overflow-hidden bg-gray-800 relative z-10 transition-transform hover:scale-105 duration-300">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-4xl font-bold text-white bg-gradient-to-br from-gray-700 to-gray-900">
                                            {nickname[0]?.toUpperCase() || "U"}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="mb-8 text-center lg:text-left">
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1 drop-shadow-sm">{nickname}</h1>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{session.user.email}</p>
                                </div>

                                {/* Custom Fields */}
                                <div className="space-y-4">
                                    {customFields.map((field: any, index: number) => {
                                        const IconComponent = ICON_MAP[field.icon || "Globe"] || Globe;
                                        return (
                                            <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                <div className="text-gray-400 shrink-0">
                                                    <IconComponent size={20} />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{field.label}</span>
                                                    <span className={`text-[15px] font-bold truncate bg-clip-text text-transparent brightness-110 dark:brightness-150 ${bannerGradientClass}`}>{field.value}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: ABOUT ME */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-900/40 backdrop-blur-md rounded-3xl p-8 min-h-[400px] relative shadow-sm dark:shadow-none border border-gray-100 dark:border-none dark:ring-2 dark:ring-white/5 dark:ring-inset flex flex-col">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3 shrink-0 border-b border-gray-100 dark:border-white/10 pb-4">
                            {t('profile.about_me')} <span className="text-blue-500 text-4xl">!</span>
                        </h2>

                        <div className="prose prose-lg max-w-none flex-1 prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-white prose-hr:border-gray-200 dark:prose-hr:border-white/10 prose-hr:my-4 prose-a:text-blue-500 prose-a:no-underline hover:prose-a:underline prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-ul:text-gray-600 dark:prose-ul:text-gray-300 prose-ol:text-gray-600 dark:prose-ol:text-gray-300 prose-li:text-gray-600 dark:prose-li:text-gray-300">
                            {aboutMe ? (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkBreaks]}
                                    components={{
                                        // Custom styling for markdown elements
                                        h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{children}</h1>,
                                        h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-6 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">{children}</h2>,
                                        h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-4 text-gray-900 dark:text-white">{children}</h3>,
                                        p: ({ children }) => <p className="mb-4 leading-relaxed text-lg font-light tracking-wide text-gray-600 dark:text-gray-300">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
                                        li: ({ children }) => <li className="text-gray-600 dark:text-gray-300 pl-1">{children}</li>,
                                        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{children}</a>,
                                        strong: ({ children }) => <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>,
                                        em: ({ children }) => <em className="italic">{children}</em>,
                                        code: ({ children }) => <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-pink-500 dark:text-pink-400">{children}</code>,
                                        blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 py-2 rounded-r-lg">{children}</blockquote>,
                                        hr: () => <hr className="border-gray-200 dark:border-white/10 my-6" />,
                                        // Table components
                                        table: ({ children }) => <div className="overflow-x-auto my-4 rounded-xl border border-gray-200 dark:border-gray-700"><table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">{children}</table></div>,
                                        thead: ({ children }) => <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">{children}</thead>,
                                        tbody: ({ children }) => <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-transparent">{children}</tbody>,
                                        tr: ({ children }) => <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">{children}</tr>,
                                        th: ({ children }) => <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{children}</th>,
                                        td: ({ children }) => <td className="px-4 py-3 align-top">{children}</td>,
                                        // Image component
                                        img: ({ src, alt }) => (
                                            <div className="my-4 relative group inline-block">
                                                <img
                                                    src={src}
                                                    alt={alt}
                                                    className="rounded-xl shadow-md max-w-full h-auto object-cover border border-gray-200 dark:border-gray-700 hover:scale-[1.02] transition-transform duration-300"
                                                    loading="lazy"
                                                />
                                                {alt && <span className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm text-white text-xs py-1 px-2 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity text-center truncate">{alt}</span>}
                                            </div>
                                        ),
                                    }}
                                >
                                    {aboutMe}
                                </ReactMarkdown>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-600 min-h-[300px]">
                                    <AlertCircle size={48} className="mb-4 opacity-30" />
                                    <p className="text-lg font-medium opacity-50">{t('profile.low_profile')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

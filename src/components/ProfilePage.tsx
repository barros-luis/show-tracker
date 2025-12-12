import { useEffect, useState } from "react";
import {
    Github, Globe, Linkedin, Twitter, AlertCircle,
    Zap, Heart, Star, Code, Coffee, MapPin, Mail,
    Gamepad2, Clapperboard, Music, Smile
} from "lucide-react";

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



export function ProfilePage({ session, profile }: ProfilePageProps) {
    const [displayProfile, setDisplayProfile] = useState<any>(null);

    useEffect(() => {
        if (profile) setDisplayProfile(profile);
    }, [profile]);

    if (!displayProfile) return <div className="text-white p-10">Loading profile...</div>;

    const nickname = displayProfile.nickname || "Anonymous";
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
                        <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-gray-900/40 backdrop-blur-xl min-h-[500px] flex flex-col">

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
                                    <h1 className="text-3xl font-bold text-white mb-1 drop-shadow-sm">{nickname}</h1>
                                    <p className="text-gray-400 text-sm font-medium">{session.user.email}</p>
                                </div>

                                {/* Custom Fields */}
                                <div className="space-y-4">
                                    {customFields.map((field: any, index: number) => {
                                        const IconComponent = ICON_MAP[field.icon || "Globe"] || Globe;
                                        return (
                                            <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                                <div className="text-gray-400 shrink-0">
                                                    <IconComponent size={20} />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{field.label}</span>
                                                    <span className="text-sm font-semibold text-white/90 truncate">{field.value}</span>
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
                    <div className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 min-h-[400px] relative shadow-xl flex flex-col">
                        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3 shrink-0 border-b border-white/5 pb-4">
                            About Me <span className="text-blue-500 text-4xl">!</span>
                        </h2>

                        <div className="prose prose-invert max-w-none flex-1">
                            {aboutMe ? (
                                <div className="whitespace-pre-wrap text-gray-300 leading-relaxed text-lg font-light tracking-wide">
                                    {aboutMe}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-600 min-h-[300px]">
                                    <AlertCircle size={48} className="mb-4 opacity-30" />
                                    <p className="text-lg font-medium opacity-50">This user keeps a low profile.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

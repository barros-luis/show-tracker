import { useState, useEffect, useRef } from "react";
import {
    Plus, Trash2, Edit2, Save, Camera, Shuffle,
    Github, Globe, Linkedin, Twitter, AlertCircle,
    Zap, Heart, Star, Code, Coffee, MapPin, Mail,
    Gamepad2, Clapperboard, Music, Smile
} from "lucide-react";
import { ImageCropper } from "./ImageCropper";

interface ProfilePageProps {
    session: any;
    profile: any;
    supabase: any;
    onProfileUpdate: () => Promise<void>;
}

interface CustomField {
    label: string;
    value: string;
    icon?: string;
}

// Icon Mapping for selection
const ICON_MAP: Record<string, any> = {
    Globe, Github, Twitter, Linkedin, Mail, MapPin,
    Heart, Star, Zap, Code, Coffee,
    Gamepad2, Clapperboard, Music, Smile
};

const GRADIENTS = [
    { bg: 'bg-gradient-to-tr from-indigo-900 via-purple-700 to-blue-600', text: 'text-indigo-100', accent: 'text-indigo-200' }, // Default Purpose
    { bg: 'bg-gradient-to-tr from-rose-700 via-pink-600 to-red-500', text: 'text-rose-100', accent: 'text-rose-200' }, // Red/Pink
    { bg: 'bg-gradient-to-tr from-emerald-800 via-green-600 to-teal-500', text: 'text-emerald-100', accent: 'text-emerald-200' }, // Green/Teal
    { bg: 'bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-400', text: 'text-amber-100', accent: 'text-amber-200' }, // Orange/Yellow
    { bg: 'bg-gradient-to-tr from-slate-900 via-gray-700 to-zinc-600', text: 'text-gray-100', accent: 'text-gray-300' }, // Monochrome
    { bg: 'bg-gradient-to-tr from-cyan-700 via-blue-600 to-indigo-500', text: 'text-cyan-100', accent: 'text-cyan-200' }, // Ocean
    { bg: 'bg-gradient-to-tr from-fuchsia-800 via-purple-600 to-pink-500', text: 'text-fuchsia-100', accent: 'text-fuchsia-200' }, // Neon
    { bg: 'bg-gradient-to-tr from-yellow-600 via-red-500 to-pink-500', text: 'text-orange-100', accent: 'text-orange-200' }, // Sunset
];

export function ProfilePage({ session, profile, supabase, onProfileUpdate }: ProfilePageProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [nickname, setNickname] = useState("");
    const [aboutMe, setAboutMe] = useState("");
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [bannerGradient, setBannerGradient] = useState(GRADIENTS[0]);
    const [avatarUrl, setAvatarUrl] = useState("");

    // Cropper State
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    // Helper to reset state to props
    const resetForm = () => {
        if (profile) {
            setNickname(profile.nickname || "");
            setAboutMe(profile.about_me || "");

            // Handle legacy string gradients or new object structure
            if (profile.banner_gradient) {
                // If it's a string (legacy), try to find match or default
                const found = GRADIENTS.find(g => g.bg === profile.banner_gradient) || GRADIENTS.find(g => typeof profile.banner_gradient === 'object' && g.bg === profile.banner_gradient.bg);
                if (found) setBannerGradient(found);
                // Fallback for raw string if structure changed significantly (shouldn't happen with this logic but being safe)
                else if (typeof profile.banner_gradient === 'string') setBannerGradient({ bg: profile.banner_gradient, text: 'text-indigo-100', accent: 'text-indigo-200' });
                else setBannerGradient(GRADIENTS[0]);
            } else {
                setBannerGradient(GRADIENTS[0]);
            }

            setAvatarUrl(profile.avatar_url || "");

            if (Array.isArray(profile.custom_fields)) {
                setCustomFields(profile.custom_fields);
            } else {
                setCustomFields([]);
            }
        }
    };

    useEffect(() => {
        resetForm();
    }, [profile]);

    const handleCancel = () => {
        resetForm();
        setIsEditing(false);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const updates = {
                id: session.user.id,
                nickname,
                about_me: aboutMe,
                custom_fields: customFields,
                banner_gradient: bannerGradient.bg,
                avatar_url: avatarUrl, // Include avatar updates
                updated_at: new Date(),
            };

            const { error } = await supabase.from("profiles").upsert(updates);

            if (error) throw error;

            await onProfileUpdate();
            setIsEditing(false);
        } catch (error: any) {
            console.error("Error updating profile:", error);
            alert("Failed to save profile: " + (error.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    // --- FEATURE 1: RANDOM GRADIENT ---
    const shuffleGradient = () => {
        const random = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
        setBannerGradient(random);
    };

    // --- FEATURE 2: AVATAR UPLOAD FLOW ---

    // Step 1: Select File & Read as Data URL
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const reader = new FileReader();
            reader.addEventListener("load", () => {
                setSelectedFile(reader.result?.toString() || null);
            });
            reader.readAsDataURL(event.target.files[0]);
        }
        // Reset inputs so same file can be selected again
        event.target.value = '';
    };

    // Step 2: Upload Cropped Blob
    const handleCropComplete = async (croppedBlob: Blob) => {
        try {
            setLoading(true);
            const fileName = `${session.user.id}/${Date.now()}.jpg`; // Use user ID + timestamp

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, croppedBlob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

            setAvatarUrl(data.publicUrl); // Optimistic update
            setSelectedFile(null); // Close cropper

        } catch (error: any) {
            console.error("Upload error:", error);
            alert("Error uploading avatar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- FEATURE 3: CUSTOM FIELDS ---
    const addCustomField = () => {
        if (customFields.length >= 5) return;
        setCustomFields([...customFields, { label: "Label", value: "Value", icon: "Globe" }]);
    };

    const removeCustomField = (index: number) => {
        setCustomFields(customFields.filter((_, i) => i !== index));
    };

    const updateCustomField = (index: number, key: keyof CustomField, val: string) => {
        const newFields = [...customFields];
        (newFields[index] as any)[key] = val;
        setCustomFields(newFields);
    };

    // Helper component for Icon Selection
    const IconSelector = ({ selected, onChange }: { selected: string, onChange: (icon: string) => void }) => {
        const [isOpen, setIsOpen] = useState(false);
        const SelectedIcon = ICON_MAP[selected] || Globe;

        return (
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1.5 bg-gray-800 border border-gray-600 rounded text-gray-300 hover:text-white"
                >
                    <SelectedIcon size={16} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl grid grid-cols-4 gap-1 p-2 z-50">
                        {Object.keys(ICON_MAP).map((iconKey) => {
                            const Icon = ICON_MAP[iconKey];
                            return (
                                <button
                                    key={iconKey}
                                    onClick={() => { onChange(iconKey); setIsOpen(false); }}
                                    className={`p-2 rounded hover:bg-gray-700 flex justify-center ${selected === iconKey ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                                    title={iconKey}
                                >
                                    <Icon size={16} />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const buttonBaseClass = "btn-animated font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/20";
    const buttonPrimaryClass = `${buttonBaseClass} bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:brightness-110 border border-white/10`;
    const buttonSecondaryClass = `${buttonBaseClass} bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 hover:text-white`;

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl animate-fade-in text-left">

            {/* CROPPER MODAL */}
            {selectedFile && (
                <ImageCropper
                    imageSrc={selectedFile}
                    onCancel={() => setSelectedFile(null)}
                    onCropComplete={handleCropComplete}
                />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: PROFILE CARD */}
                <div className="lg:col-span-1">
                    <div className="sticky top-8">
                        <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-gray-900/40 backdrop-blur-xl min-h-[600px] flex flex-col">

                            {/* Header Gradient */}
                            <div className={`h-48 ${bannerGradient.bg} relative flex items-center justify-center transition-colors duration-700`}>

                                {/* Shuffle Button (Edit Mode) */}
                                {isEditing && (
                                    <button
                                        onClick={shuffleGradient}
                                        className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-md transition-all border border-white/10 shadow-lg cursor-pointer"
                                        title="Shuffle Theme"
                                    >
                                        <Shuffle size={18} />
                                    </button>
                                )}

                                {/* Avatar Centered */}
                                <div className="h-40 w-40 rounded-full border-4 border-black/20 shadow-2xl overflow-hidden bg-gray-800 relative z-10 group">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-4xl font-bold text-white bg-gradient-to-br from-gray-700 to-gray-900">
                                            {nickname[0]?.toUpperCase() || "U"}
                                        </div>
                                    )}

                                    {/* Avatar Upload Overlay (Edit Mode) */}
                                    {isEditing && (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-medium gap-1"
                                        >
                                            <Camera size={24} />
                                            <span className="text-xs">Change</span>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                    />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 flex-1 flex flex-col">

                                {/* Name & Email */}
                                <div className="mb-8">
                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={nickname}
                                                onChange={(e) => setNickname(e.target.value)}
                                                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="Nickname"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <h1 className={`text-2xl font-bold ${bannerGradient.text} mb-1 drop-shadow-sm`}>{nickname || "Anonymous"}</h1>
                                            <p className="text-gray-400 text-sm font-medium">{session.user.email}</p>
                                        </>
                                    )}
                                </div>

                                {/* Custom Fields (Clean List) */}
                                <div className="space-y-4 mb-8">
                                    {customFields.map((field, index) => {
                                        // Resolve Icon
                                        const IconComponent = ICON_MAP[field.icon || "Globe"] || Globe;

                                        return (
                                            <div key={index} className="flex items-center gap-3 group">
                                                {/* Icon (Editable or Static) */}
                                                <div className="text-gray-400 shrink-0">
                                                    {isEditing ? (
                                                        <IconSelector
                                                            selected={field.icon || "Globe"}
                                                            onChange={(icon) => updateCustomField(index, "icon", icon)}
                                                        />
                                                    ) : (
                                                        <IconComponent size={20} />
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    {isEditing ? (
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={field.label}
                                                                onChange={(e) => updateCustomField(index, "label", e.target.value)}
                                                                className="w-1/3 bg-gray-800/50 border border-gray-700 rounded px-2 py-1 text-xs text-gray-400 focus:text-white outline-none"
                                                                placeholder="Label"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={field.value}
                                                                onChange={(e) => updateCustomField(index, "value", e.target.value)}
                                                                className="w-2/3 bg-gray-800/50 border border-gray-700 rounded px-2 py-1 text-sm text-white outline-none"
                                                                placeholder="Value"
                                                            />
                                                            <button
                                                                onClick={() => removeCustomField(index)}
                                                                className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{field.label}</span>
                                                            <span className={`text-sm font-semibold ${bannerGradient.accent} truncate`}>{field.value}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Add Field Button */}
                                    {isEditing && customFields.length < 5 && (
                                        <button
                                            onClick={addCustomField}
                                            className="w-full py-2 border border-dashed border-gray-700 rounded text-gray-500 hover:text-white hover:border-gray-500 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                                        >
                                            <Plus size={14} /> Add Field
                                        </button>
                                    )}
                                </div>

                                {/* Edit Controls */}
                                <div className="pt-4 border-t border-gray-800/50 mt-auto">
                                    {isEditing ? (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleCancel}
                                                className={`${buttonSecondaryClass} py-2 px-4 flex-1 text-sm`}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={loading}
                                                className={`${buttonPrimaryClass} py-2 px-4 flex-1 text-sm`}
                                            >
                                                {loading ? "Saving..." : <><Save size={16} /> Save</>}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className={`${buttonSecondaryClass} w-full py-2.5`}
                                        >
                                            <Edit2 size={16} /> Edit Profile
                                        </button>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: ABOUT ME */}
                <div className="lg:col-span-2">
                    <div className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 min-h-[500px] relative shadow-xl flex flex-col">

                        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3 shrink-0">
                            About Me <span className="text-blue-500">!</span>
                        </h2>

                        {isEditing ? (
                            <div className="flex-1 flex flex-col h-full">
                                <textarea
                                    value={aboutMe}
                                    onChange={(e) => setAboutMe(e.target.value)}
                                    className="w-full flex-1 bg-gray-950/50 border border-gray-700 rounded-xl p-6 text-gray-300 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-blue-500/50 outline-none resize-none"
                                    placeholder="Tell the world about yourself..."
                                />
                            </div>
                        ) : (
                            <div className="prose prose-invert max-w-none flex-1">
                                {aboutMe ? (
                                    <div className="whitespace-pre-wrap text-gray-300 leading-relaxed text-lg">
                                        {aboutMe}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-600 min-h-[300px]">
                                        <AlertCircle size={48} className="mb-4 opacity-50" />
                                        <p className="text-lg font-medium">This user hasn't written a bio yet.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

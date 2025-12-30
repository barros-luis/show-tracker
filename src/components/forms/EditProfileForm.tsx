import { useState, useRef, useEffect } from "react";
import {
    Plus, Trash2, Save, Camera, Shuffle, User as UserIconStub,
    Github, Globe, Linkedin, Twitter,
    Zap, Heart, Star, Code, Coffee, MapPin, Mail,
    Gamepad2, Clapperboard, Music, Smile
} from "lucide-react";
import { ImageCropper } from "./ImageCropper";

interface EditProfileFormProps {
    session: any;
    profile: any;
    supabase: any;
    onProfileUpdate: () => Promise<void>;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface CustomField {
    label: string;
    value: string;
    icon?: string;
}

// Icon Mapping
const ICON_MAP: Record<string, any> = {
    Globe, Github, Twitter, Linkedin, Mail, MapPin,
    Heart, Star, Zap, Code, Coffee,
    Gamepad2, Clapperboard, Music, Smile
};

// Gradients
const GRADIENTS = [
    { name: 'Sunset', bg: 'bg-gradient-to-r from-pink-500 to-violet-600', text: 'text-white', accent: 'text-pink-200' },
    { name: 'Ocean', bg: 'bg-gradient-to-r from-cyan-500 to-blue-600', text: 'text-white', accent: 'text-cyan-200' },
    { name: 'Forest', bg: 'bg-gradient-to-r from-emerald-500 to-teal-600', text: 'text-white', accent: 'text-emerald-200' },
    { name: 'Purple', bg: 'bg-gradient-to-r from-purple-500 to-indigo-600', text: 'text-white', accent: 'text-purple-200' },
    { name: 'Fire', bg: 'bg-gradient-to-r from-orange-500 to-red-600', text: 'text-white', accent: 'text-orange-200' },
    { name: 'Dark', bg: 'bg-gradient-to-r from-gray-800 to-black', text: 'text-white', accent: 'text-gray-400' },
];

export function EditProfileForm({ session, profile, supabase, onProfileUpdate, showToast }: EditProfileFormProps) {
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

    // Reset form to profile data
    // State to track dirty status to prevent overwrites on re-focus
    const isDirtyRef = useRef(false);

    useEffect(() => {
        if (profile && !isDirtyRef.current) {
            setNickname(profile.nickname || "");
            setAboutMe(profile.about_me || "");
            setAvatarUrl(profile.avatar_url || null);
            if (profile.custom_fields) {
                setCustomFields(profile.custom_fields);
            } else {
                setCustomFields([]);
            }

            // Set gradient if exists
            if (profile.banner_gradient) {
                const found = GRADIENTS.find(g => g.bg === profile.banner_gradient);
                if (found) setBannerGradient(found);
                else setBannerGradient({ name: 'Custom', bg: profile.banner_gradient, text: 'text-white', accent: 'text-gray-200' }); // Default text/accent for custom
            } else {
                setBannerGradient(GRADIENTS[0]);
            }
        }
    }, [profile]);

    const handleInputChange = (setter: any, value: any) => {
        setter(value);
        isDirtyRef.current = true;
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
                avatar_url: avatarUrl,
                updated_at: new Date(),
            };

            const { error } = await supabase.from("profiles").upsert(updates);
            if (error) throw error;

            await onProfileUpdate();
            isDirtyRef.current = false;
            showToast("Profile saved successfully! ✅", "success");
        } catch (error: any) {
            console.error("Error updating profile:", error);
            showToast("Failed to save profile: " + (error.message || "Unknown error"), "error");
        } finally {
            setLoading(false);
        }
    };

    const shuffleGradient = () => {
        let newGradient;
        do {
            newGradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
        } while (newGradient.bg === bannerGradient.bg && GRADIENTS.length > 1);
        setBannerGradient(newGradient);
        isDirtyRef.current = true;
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const reader = new FileReader();
            reader.addEventListener("load", () => {
                setSelectedFile(reader.result?.toString() || null);
            });
            reader.readAsDataURL(event.target.files[0]);
        }
        event.target.value = '';
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        try {
            setLoading(true);
            const fileName = `${session.user.id}/${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, croppedBlob, {
                contentType: 'image/jpeg',
                upsert: true
            });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
            setAvatarUrl(data.publicUrl);
            setSelectedFile(null);
            isDirtyRef.current = true;
        } catch (error: any) {
            console.error("Upload error:", error);
            alert("Error uploading avatar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Custom Fields Logic
    const addCustomField = () => {
        if (customFields.length >= 5) return;
        setCustomFields([...customFields, { label: "Label", value: "Value", icon: "Globe" }]);
        isDirtyRef.current = true;
    };

    const removeCustomField = (index: number) => {
        setCustomFields(customFields.filter((_, i) => i !== index));
        isDirtyRef.current = true;
    };

    const updateCustomField = (index: number, key: keyof CustomField, val: string) => {
        const newFields = [...customFields];
        (newFields[index] as any)[key] = val;
        setCustomFields(newFields);
        isDirtyRef.current = true;
    };

    // Icon Selector
    const IconSelector = ({ selected, onChange }: { selected: string, onChange: (icon: string) => void }) => {
        const [isOpen, setIsOpen] = useState(false);
        const SelectedIcon = ICON_MAP[selected] || Globe;
        return (
            <div className="relative">
                <button onClick={() => setIsOpen(!isOpen)} className="p-1.5 bg-gray-800 border border-gray-600 rounded text-gray-300 hover:text-white">
                    <SelectedIcon size={16} />
                </button>
                {isOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl grid grid-cols-4 gap-1 p-2 z-50">
                        {Object.keys(ICON_MAP).map((iconKey) => {
                            const Icon = ICON_MAP[iconKey];
                            return (
                                <button key={iconKey} onClick={() => { onChange(iconKey); setIsOpen(false); }} className={`p-2 rounded hover:bg-gray-700 flex justify-center ${selected === iconKey ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>
                                    <Icon size={16} />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {selectedFile && (
                <ImageCropper imageSrc={selectedFile} onCancel={() => setSelectedFile(null)} onCropComplete={handleCropComplete} />
            )}

            {/* SECTIONS */}
            <div className="flex flex-col gap-8">

                {/* 1. VISUAL IDENTIY */}
                <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Camera size={20} className="text-blue-400" /> Visual Identity
                    </h3>

                    <div className="space-y-6">
                        {/* Avatar & Banner Preview - Using CSS transition-colors */}
                        <div className={`h-48 ${bannerGradient.bg} rounded-xl relative flex items-center justify-center transition-colors duration-700`}>

                            <button
                                onClick={shuffleGradient}
                                className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-md transition-all duration-500 hover:rotate-180 hover:scale-110 border border-white/10 shadow-lg cursor-pointer z-10"
                                title="Shuffle Banner Color"
                            >
                                <Shuffle size={18} />
                            </button>

                            <div className="relative group z-10">
                                <div className="h-28 w-28 rounded-full border-4 border-gray-900 shadow-xl overflow-hidden bg-gray-800">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-3xl font-bold text-white bg-gray-700">
                                            {nickname[0]?.toUpperCase() || "U"}
                                        </div>
                                    )}
                                </div>
                                <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                                    <Camera size={20} />
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                            </div>
                        </div>

                        {/* Nickname */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Display Name</label>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => handleInputChange(setNickname, e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Your Nickname"
                            />
                        </div>
                    </div>
                </section>

                {/* 2. DETAILS */}
                <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <UserIconStub size={20} className="text-purple-400" /> Details
                    </h3>

                    <div className="flex-1 flex flex-col gap-6">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">About Me</label>
                            <textarea
                                value={aboutMe}
                                onChange={(e) => handleInputChange(setAboutMe, e.target.value)}
                                className="w-full min-h-[400px] bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none resize-y transition-all text-sm leading-relaxed"
                                placeholder="Tell us a bit about yourself..."
                            />
                        </div>
                    </div>
                </section>
            </div>

            {/* 3. SOCIAL LINKS */}
            <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Globe size={20} className="text-green-400" /> Social Links & Stats
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customFields.map((field, index) => (
                        <div key={index} className="flex items-center gap-2 bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                            <IconSelector selected={field.icon || "Globe"} onChange={(icon) => updateCustomField(index, "icon", icon)} />
                            <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateCustomField(index, "label", e.target.value)}
                                className="w-1/3 bg-transparent border-b border-gray-700 px-1 py-1 text-xs text-gray-500 focus:text-white focus:border-blue-500 outline-none"
                                placeholder="Label"
                            />
                            <input
                                type="text"
                                value={field.value}
                                onChange={(e) => updateCustomField(index, "value", e.target.value)}
                                className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Value / URL"
                            />
                            <button onClick={() => removeCustomField(index)} className="text-gray-600 hover:text-red-500 transition-colors p-1">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}

                    {customFields.length < 5 && (
                        <button onClick={addCustomField} className="cursor-pointer border border-dashed border-gray-700 rounded-lg p-3 text-gray-500 hover:text-white hover:bg-gray-800 hover:border-gray-500 transition-all flex items-center justify-center gap-2 text-sm">
                            <Plus size={16} /> Add Link or Stat
                        </button>
                    )}
                </div>
            </section>

            {/* SAVE ACTION - Outside main container */}
            <div className="flex justify-start pt-6">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="btn-animated bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 transition-all"
                >
                    {loading ? "Saving..." : <><Save size={20} /> Save Changes</>}
                </button>
            </div>
        </div>
    );
}

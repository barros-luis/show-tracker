import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, ChevronUp, ChevronDown, Check } from "lucide-react";
import { SupabaseClient } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";

export interface UserStatus {
    id: number;
    user_id: string;
    value: string;
    label: string;
    color: string;
    position: number;
    created_at: string;
}

const COLOR_OPTIONS = [
    { value: "gray", bg: "bg-gray-500", text: "text-gray-400" },
    { value: "red", bg: "bg-red-500", text: "text-red-400" },
    { value: "orange", bg: "bg-orange-500", text: "text-orange-400" },
    { value: "yellow", bg: "bg-yellow-500", text: "text-yellow-400" },
    { value: "green", bg: "bg-green-500", text: "text-green-400" },
    { value: "cyan", bg: "bg-cyan-500", text: "text-cyan-400" },
    { value: "blue", bg: "bg-blue-500", text: "text-blue-400" },
    { value: "purple", bg: "bg-purple-500", text: "text-purple-400" },
    { value: "pink", bg: "bg-pink-500", text: "text-pink-400" },
];

interface StatusManageModalProps {
    isOpen: boolean;
    onClose: () => void;
    statuses: UserStatus[];
    onStatusesChange: (statuses: UserStatus[]) => void;
    supabase: SupabaseClient;
    userId: string;
    showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
}

export function StatusManageModal({
    isOpen,
    onClose,
    statuses,
    onStatusesChange,
    supabase,
    userId,
    showToast
}: StatusManageModalProps) {
    const { t } = useTranslation();
    const [editingStatus, setEditingStatus] = useState<UserStatus | null>(null);
    const [newStatusLabel, setNewStatusLabel] = useState("");
    const [newStatusColor, setNewStatusColor] = useState("blue");
    const [showNewForm, setShowNewForm] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState<number | "new" | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<UserStatus | null>(null);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);

    // Prevent body scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    // Generate a unique value from label
    const generateValue = (label: string): string => {
        return label.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    };

    const createStatus = async () => {
        if (!newStatusLabel.trim()) return;

        const value = generateValue(newStatusLabel.trim());

        const { data, error } = await supabase
            .from('user_statuses')
            .insert({
                user_id: userId,
                value: value,
                label: newStatusLabel.trim(),
                color: newStatusColor,
                position: statuses.length,
            })
            .select()
            .single();

        if (data && !error) {
            onStatusesChange([...statuses, data]);
            setNewStatusLabel("");
            setNewStatusColor("blue");
            setShowNewForm(false);
            showToast(t('status_modal.create_success'), "success", 7000);
        }
    };

    const updateStatus = async (status: UserStatus) => {
        const { error } = await supabase
            .from('user_statuses')
            .update({ label: status.label, color: status.color })
            .eq('id', status.id);

        if (!error) {
            onStatusesChange(statuses.map(s => s.id === status.id ? status : s));
            setEditingStatus(null);
        }
    };

    const deleteStatus = async (statusId: number) => {
        // Get the first status to use as fallback
        const fallbackStatus = statuses.find(s => s.id !== statusId);
        if (fallbackStatus) {
            // Update watchlist items with this status to use the fallback
            const deletedStatus = statuses.find(s => s.id === statusId);
            if (deletedStatus) {
                await supabase
                    .from('watchlist')
                    .update({ status: fallbackStatus.value })
                    .eq('user_id', userId)
                    .eq('status', deletedStatus.value);
            }
        }

        await supabase.from('user_statuses').delete().eq('id', statusId);
        onStatusesChange(statuses.filter(s => s.id !== statusId));
    };

    const moveStatus = async (index: number, direction: 'up' | 'down') => {
        const sortedStatuses = [...statuses].sort((a, b) => a.position - b.position);
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        if (newIndex < 0 || newIndex >= sortedStatuses.length) return;

        // Swap positions
        const temp = sortedStatuses[index].position;
        sortedStatuses[index].position = sortedStatuses[newIndex].position;
        sortedStatuses[newIndex].position = temp;

        // Update in database
        await supabase
            .from('user_statuses')
            .update({ position: sortedStatuses[index].position })
            .eq('id', sortedStatuses[index].id);
        await supabase
            .from('user_statuses')
            .update({ position: sortedStatuses[newIndex].position })
            .eq('id', sortedStatuses[newIndex].id);

        onStatusesChange([...sortedStatuses]);
    };

    const getColorClasses = (colorName: string) => {
        return COLOR_OPTIONS.find(c => c.value === colorName) || COLOR_OPTIONS[0];
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 w-full max-w-sm max-h-[60vh] flex flex-col relative">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
                                <h2 className="text-lg font-bold text-white">{t('status_modal.title')}</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                                >
                                    <X size={20} className="text-gray-400" />
                                </button>
                            </div>

                            {/* Status Items */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                                {statuses
                                    .sort((a, b) => a.position - b.position)
                                    .map((status, index, sortedArr) => (
                                        <div
                                            key={status.id}
                                            className="relative flex items-center gap-3 p-3 rounded-xl border transition-all bg-gray-800/50 border-gray-700/50 hover:bg-gray-800"
                                        >
                                            {/* Reorder Buttons */}
                                            <div className="flex flex-col gap-0.5">
                                                <button
                                                    onClick={() => moveStatus(index, 'up')}
                                                    disabled={index === 0}
                                                    className={`p-0.5 rounded transition-colors cursor-pointer ${index === 0
                                                        ? 'text-gray-700 cursor-not-allowed'
                                                        : 'text-gray-500 hover:text-white hover:bg-gray-700'
                                                        }`}
                                                >
                                                    <ChevronUp size={14} />
                                                </button>
                                                <button
                                                    onClick={() => moveStatus(index, 'down')}
                                                    disabled={index === sortedArr.length - 1}
                                                    className={`p-0.5 rounded transition-colors cursor-pointer ${index === sortedArr.length - 1
                                                        ? 'text-gray-700 cursor-not-allowed'
                                                        : 'text-gray-500 hover:text-white hover:bg-gray-700'
                                                        }`}
                                                >
                                                    <ChevronDown size={14} />
                                                </button>
                                            </div>

                                            {/* Color indicator */}
                                            <div className={`w-3 h-3 rounded-full ${getColorClasses(status.color).bg}`} />

                                            {/* Name */}
                                            {editingStatus?.id === status.id ? (
                                                <input
                                                    type="text"
                                                    value={editingStatus.label}
                                                    onChange={(e) => setEditingStatus({ ...editingStatus, label: e.target.value })}
                                                    onBlur={() => updateStatus(editingStatus)}
                                                    onKeyDown={(e) => e.key === "Enter" && updateStatus(editingStatus)}
                                                    autoFocus
                                                    className="flex-1 bg-gray-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => setEditingStatus(status)}
                                                    className="flex-1 text-white text-sm cursor-text hover:text-blue-400"
                                                >
                                                    {status.label}
                                                </span>
                                            )}

                                            {/* Color Picker Container */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowColorPicker(showColorPicker === status.id ? null : status.id)}
                                                    className={`w-6 h-6 rounded-full ${getColorClasses(status.color).bg} cursor-pointer hover:scale-110 transition-transform`}
                                                />

                                                {/* Color Picker Popup */}
                                                {showColorPicker === status.id && (
                                                    <div className="absolute top-8 right-0 z-[70] bg-gray-800 rounded-lg p-2 border border-gray-700 shadow-xl grid grid-cols-5 gap-2 w-[180px]">
                                                        {COLOR_OPTIONS.map(color => (
                                                            <button
                                                                key={color.value}
                                                                onClick={() => {
                                                                    const updated = { ...status, color: color.value };
                                                                    updateStatus(updated);
                                                                    setShowColorPicker(null);
                                                                }}
                                                                className={`w-7 h-7 rounded-full ${color.bg} cursor-pointer hover:scale-110 transition-transform ${status.color === color.value ? "ring-2 ring-white ring-offset-2 ring-offset-gray-800" : ""
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Delete (only if more than 1 status) */}
                                            {statuses.length > 1 && (
                                                <button
                                                    onClick={() => setConfirmDelete(status)}
                                                    className="p-2 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                {/* New Status Form */}
                                {showNewForm ? (
                                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 space-y-3">
                                        {/* Row 1: Input */}
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${getColorClasses(newStatusColor).bg}`} />
                                            <input
                                                type="text"
                                                value={newStatusLabel}
                                                onChange={(e) => setNewStatusLabel(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && createStatus()}
                                                placeholder={t('status_modal.status_name_placeholder')}
                                                autoFocus
                                                className="flex-1 min-w-0 bg-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        {/* Row 2: Color + Actions */}
                                        <div className="flex items-center justify-between gap-2">
                                            {/* Color picker */}
                                            <div className="relative flex items-center gap-2">
                                                <span className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold tracking-wider">{t('status_modal.color')}:</span>
                                                <button
                                                    onClick={() => setShowColorPicker(showColorPicker === "new" ? null : "new")}
                                                    className={`w-6 h-6 rounded-full ${getColorClasses(newStatusColor).bg} cursor-pointer hover:scale-110 transition-transform ring-2 ring-gray-800`}
                                                />

                                                {showColorPicker === "new" && (
                                                    <div className="absolute bottom-8 left-0 z-[70] bg-gray-800 rounded-lg p-2 border border-gray-700 shadow-xl grid grid-cols-5 gap-2 w-[180px]">
                                                        {COLOR_OPTIONS.map(color => (
                                                            <button
                                                                key={color.value}
                                                                onClick={() => { setNewStatusColor(color.value); setShowColorPicker(null); }}
                                                                className={`w-7 h-7 rounded-full ${color.bg} cursor-pointer hover:scale-110 transition-transform ${newStatusColor === color.value ? "ring-2 ring-white ring-offset-2 ring-offset-gray-800" : ""
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => { setShowNewForm(false); setNewStatusLabel(""); }}
                                                    className="px-3 py-1.5 hover:bg-gray-700/50 rounded-lg text-gray-400 text-xs sm:text-sm transition-colors cursor-pointer"
                                                >
                                                    {t('status_modal.cancel')}
                                                </button>
                                                <button
                                                    onClick={createStatus}
                                                    disabled={!newStatusLabel.trim()}
                                                    className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg !text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 btn-animated"
                                                >
                                                    <Check size={14} />
                                                    {t('status_modal.create')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowNewForm(true)}
                                        className="flex items-center gap-2 w-full p-3 rounded-xl border border-dashed border-gray-700 hover:border-blue-500 hover:bg-blue-500/5 text-gray-500 hover:text-blue-400 transition-all cursor-pointer justify-center"
                                    >
                                        <Plus size={18} />
                                        {t('status_modal.create_new')}
                                    </button>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-gray-800 text-center">
                                <p className="text-gray-500 text-xs">
                                    {t('status_modal.footer_hint')}
                                </p>
                            </div>
                        </div>

                        {/* Click Outside Backdrop for Pickers */}
                        {showColorPicker !== null && (
                            <div
                                className="fixed inset-0 z-[60] bg-transparent"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowColorPicker(null);
                                }}
                            />
                        )}
                    </motion.div>

                    {/* Delete Confirmation Dialog */}
                    {confirmDelete && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center"
                        >
                            <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDelete(null)} />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative bg-gray-900 rounded-xl p-6 border border-gray-700 shadow-2xl max-w-sm mx-4"
                            >
                                <h3 className="text-lg font-bold text-white mb-2">{t('status_modal.delete_title', { name: confirmDelete.label })}</h3>
                                <p className="text-gray-400 text-sm mb-6">
                                    {t('status_modal.delete_warning')}
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setConfirmDelete(null)}
                                        className="flex-1 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors cursor-pointer font-medium"
                                    >
                                        {t('status_modal.cancel')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            deleteStatus(confirmDelete.id);
                                            setConfirmDelete(null);
                                        }}
                                        className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer font-medium"
                                    >
                                        {t('status_modal.delete')}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </>
            )}
        </AnimatePresence>
    );
}

import { useState } from "react";
import { Mail, Lock, Trash2, AlertTriangle, Loader2, AlertCircle } from "lucide-react";
import { useAuthContext } from "../../context/AuthContext";

export function AccountSettings() {
    const { supabase, session, showToast } = useAuthContext();

    const [emailLoading, setEmailLoading] = useState(false);
    const [passLoading, setPassLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteInput, setDeleteInput] = useState("");

    // --- Update Email ---
    const handleUpdateEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail || newEmail === session?.user?.email) return;

        setEmailLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ email: newEmail });
            if (error) throw error;
            showToast("Confirmation link sent to your new email!", "success");
            setNewEmail("");
        } catch (err: any) {
            showToast(err.message, "error");
        } finally {
            setEmailLoading(false);
        }
    };

    // --- Update Password ---
    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showToast("Passwords do not match", "error");
            return;
        }
        if (newPassword.length < 6) {
            showToast("Password must be at least 6 characters", "error");
            return;
        }

        setPassLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            showToast("Password updated successfully!", "success");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            showToast(err.message, "error");
        } finally {
            setPassLoading(false);
        }
    };

    // --- Delete Account ---
    const handleDeleteAccount = async () => {
        if (deleteInput !== "DELETE") return;

        setDeleteLoading(true);
        try {
            // Attempt to call RPC function (needs to be created in Supabase)
            const { error } = await supabase.rpc('delete_user');

            if (error) {
                console.error("RPC Delete Error:", error);
                // Fallback: Just sign out if RPC fails (or instruct user)
                if (error.message.includes('function delete_user() does not exist')) {
                    showToast("Deletion not configured. Signed out instead.", "error");
                } else {
                    throw error;
                }
            }

            // Always sign out after attempt
            await supabase.auth.signOut();
            window.location.reload();

        } catch (err: any) {
            showToast(err.message, "error");
            setDeleteLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Lock className="text-blue-500" /> Account Security
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your login credentials and account access.</p>
            </div>

            {/* Email Section */}
            <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Mail size={20} className="text-gray-400" /> Email Address
                </h3>

                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Current Email</label>
                        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300 font-mono text-sm border border-transparent dark:border-gray-700 break-all">
                            {session?.user?.email}
                        </div>
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <AlertCircle size={12} /> Changing email requires confirmation.
                        </p>
                    </div>

                    <form onSubmit={handleUpdateEmail} className="flex-1 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">New Email</label>
                            <input
                                type="email"
                                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                placeholder="Enter new email..."
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!newEmail || emailLoading}
                            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/25 cursor-pointer ml-auto"
                        >
                            {emailLoading ? <Loader2 className="animate-spin" size={16} /> : "Update Email"}
                        </button>
                    </form>
                </div>
            </div>

            {/* Password Section */}
            <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Lock size={20} className="text-gray-400" /> Change Password
                </h3>

                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">New Password</label>
                            <input
                                type="password"
                                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Confirm Password</label>
                            <input
                                type="password"
                                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={!newPassword || !confirmPassword || passLoading}
                            className="bg-gray-800 hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                        >
                            {passLoading ? <Loader2 className="animate-spin" size={16} /> : "Update Password"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Danger Zone */}
            <div className="border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-red-600 dark:text-red-500 mb-2 flex items-center gap-2">
                    <AlertTriangle size={20} /> Danger Zone
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Permanently delete your account and all of your content. This action is irreversible.
                </p>

                {!showDeleteConfirm ? (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg hover:shadow-red-500/25 cursor-pointer"
                    >
                        <Trash2 size={16} /> Delete Account
                    </button>
                ) : (
                    <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-red-200 dark:border-red-900/50 animate-in fade-in zoom-in-95">
                        <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                            Type <span className="font-mono text-red-500 select-none">DELETE</span> to confirm.
                        </p>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                className="flex-1 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500 transition-colors"
                                placeholder="DELETE"
                                value={deleteInput}
                                onChange={(e) => setDeleteInput(e.target.value)}
                            />
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteInput !== "DELETE" || deleteLoading}
                                className="bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold text-sm transition-all cursor-pointer whitespace-nowrap"
                            >
                                {deleteLoading ? "Deleting..." : "Confirm Deletion"}
                            </button>
                            <button
                                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                                className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-bold text-sm transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

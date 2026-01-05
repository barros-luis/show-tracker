import { useState } from 'react';
import { Download, X, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UpdateBannerProps {
    newVersion: string;
    onUpdate: () => Promise<void>;
    onDismiss: () => void;
}

export function UpdateBanner({ newVersion, onUpdate, onDismiss }: UpdateBannerProps) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpdate = async () => {
        setIsUpdating(true);
        setError(null);
        try {
            await onUpdate();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Update failed');
            setIsUpdating(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className="fixed top-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50"
            >
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-2xl shadow-blue-500/25 p-4 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 border border-white/10">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="p-2 bg-white/20 rounded-full flex-shrink-0">
                            <Download className="w-5 h-5 text-white" />
                        </div>

                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-white font-semibold text-sm">
                                New version available!
                            </span>
                            <span className="text-white/70 text-xs">
                                Version {newVersion} is ready to install
                            </span>
                            {error && (
                                <span className="text-red-300 text-xs mt-1">
                                    {error}
                                </span>
                            )}
                        </div>

                        {/* Mobile dismiss button */}
                        {!isUpdating && (
                            <button
                                onClick={onDismiss}
                                className="md:hidden p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                                title="Remind me later"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button
                            onClick={handleUpdate}
                            disabled={isUpdating}
                            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold text-sm hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {isUpdating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Updating...
                                </>
                            ) : error ? (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    Retry
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
                                    Update Now
                                </>
                            )}
                        </button>

                        {/* Desktop dismiss button */}
                        {!isUpdating && (
                            <button
                                onClick={onDismiss}
                                className="hidden md:block p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                title="Remind me later"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

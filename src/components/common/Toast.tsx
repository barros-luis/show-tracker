import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
    message: string | null;
    type?: ToastType;
    onClose: () => void;
    duration?: number;
}

export function Toast({ message, type = "success", onClose, duration = 4000 }: ToastProps) {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [message, onClose, duration]);

    const bgColors = {
        success: "bg-gray-900/95 border-green-500/50 text-green-400",
        error: "bg-gray-900/95 border-red-500/50 text-red-400",
        info: "bg-gray-900/95 border-blue-500/50 text-blue-400",
    };

    const Icon = {
        success: CheckCircle,
        error: XCircle,
        info: Info,
    }[type];

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border ${bgColors[type]}`}
                >
                    <Icon size={20} />
                    <span className="font-semibold text-white/90">{message}</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

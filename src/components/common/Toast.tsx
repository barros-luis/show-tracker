import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
    message: string | null;
    type?: ToastType;
    onClose: () => void;
    isMobile?: boolean; // Added isMobile prop
    duration?: number;
}

export function Toast({ message, type = "success", onClose, duration = 4000, isMobile = false }: ToastProps) {
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

    // Mobile Animations (Slide Left) vs Desktop (Slide Up)
    const initial = isMobile ? { opacity: 0, x: 20, scale: 0.95 } : { opacity: 0, y: 50, scale: 0.9 };
    const animate = { opacity: 1, x: 0, y: 0, scale: 1 };
    const exit = isMobile ? { opacity: 0, x: 20, scale: 0.95 } : { opacity: 0, y: 20, scale: 0.95 };

    // Mobile vs Desktop Styles
    const baseClasses = "fixed z-[100] flex items-center gap-3 backdrop-blur-md border shadow-2xl transition-all";
    // Mobile: Top Right, Compact
    const mobileClasses = "top-16 right-4 w-auto max-w-[220px] py-2.5 px-3 rounded-xl text-xs bg-gray-900/90 border-gray-700/50";
    // Desktop: Bottom Center, Standard
    const desktopClasses = "bottom-8 left-1/2 -translate-x-1/2 px-6 py-4 rounded-xl";

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={initial}
                    animate={animate}
                    exit={exit}
                    className={`${baseClasses} ${isMobile ? mobileClasses : desktopClasses} ${isMobile ? '' : bgColors[type]}`}
                    style={isMobile ? { borderLeftWidth: '4px', borderColor: type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6' } : {}}
                >
                    <Icon size={isMobile ? 16 : 20} className={`flex-shrink-0 ${isMobile ? (type === 'success' ? 'text-green-400' : type === 'error' ? 'text-red-400' : 'text-blue-400') : ''}`} />
                    <span className="font-medium text-white/90 truncate">{message}</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

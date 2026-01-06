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
    const mobileClasses = "top-16 right-4 w-auto max-w-[220px] py-2.5 px-3 rounded-xl text-xs bg-white/90 dark:bg-gray-900/90 border-gray-200 dark:border-gray-700/50 shadow-gray-200/20 dark:shadow-none";

    // Desktop: Bottom Center, Standard
    const desktopClasses = "bottom-8 left-1/2 -translate-x-1/2 px-6 py-4 rounded-xl";

    // Desktop background colors (Theme aware)
    const desktopTypeClasses = {
        success: "bg-white/90 dark:bg-gray-900/95 border-green-500/50 text-green-600 dark:text-green-400 shadow-green-500/10",
        error: "bg-white/90 dark:bg-gray-900/95 border-red-500/50 text-red-600 dark:text-red-400 shadow-red-500/10",
        info: "bg-white/90 dark:bg-gray-900/95 border-blue-500/50 text-blue-600 dark:text-blue-400 shadow-blue-500/10",
    };

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={initial}
                    animate={animate}
                    exit={exit}
                    className={`${baseClasses} ${isMobile ? mobileClasses : desktopClasses} ${isMobile ? '' : desktopTypeClasses[type]}`}
                    style={isMobile ? {
                        borderLeftWidth: '4px',
                        borderColor: type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6',
                        color: 'inherit' // let text color be determined by class
                    } : {}}
                >
                    <Icon size={isMobile ? 18 : 20} className={`flex-shrink-0 mt-0.5 ${isMobile ? (type === 'success' ? 'text-green-500 dark:text-green-400' : type === 'error' ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400') : ''}`} />
                    <span className="font-medium text-gray-900 dark:text-white/90 text-sm leading-snug break-words whitespace-normal">{message}</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

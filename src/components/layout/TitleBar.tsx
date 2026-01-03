import { useState, useEffect, useRef } from "react";
import { Minus, Square, X, Copy } from "lucide-react";

export function TitleBar() {
    const [isMaximized, setIsMaximized] = useState(true);
    const [shouldRender, setShouldRender] = useState(false);
    const lastClickRef = useRef(0);
    const appWindowRef = useRef<any>(null);

    // Check platform on mount - only initialize window API on Windows desktop
    useEffect(() => {
        const ua = navigator.userAgent.toLowerCase();
        const isMobile = /android|iphone|ipad|ipod/i.test(ua);
        const isWindows = navigator.userAgent.includes("Windows") ||
            navigator.platform.toLowerCase().includes("win");

        // Only render on Windows desktop
        if (isWindows && !isMobile) {
            // Dynamically import to avoid errors on mobile
            import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
                appWindowRef.current = getCurrentWindow();
                appWindowRef.current.isMaximized().then(setIsMaximized);
                setShouldRender(true);
            }).catch(() => {
                // Not in Tauri environment
            });
        }
    }, []);

    // Don't render on non-Windows platforms or mobile
    if (!shouldRender) return null;

    const appWindow = appWindowRef.current;
    if (!appWindow) return null;

    const handleMinimize = () => appWindow.minimize();

    const handleMaximize = async () => {
        if (await appWindow.isMaximized()) {
            await appWindow.unmaximize();
            setIsMaximized(false);
        } else {
            await appWindow.maximize();
            setIsMaximized(true);
        }
    };

    const handleClose = () => appWindow.close();

    // Handle mouse down - check for double click, otherwise drag
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only handle left click

        const now = Date.now();
        const timeSinceLastClick = now - lastClickRef.current;

        if (timeSinceLastClick < 300) {
            // Double click detected - maximize/restore
            lastClickRef.current = 0; // Reset to prevent triple-click
            handleMaximize();
        } else {
            // Single click - start dragging
            lastClickRef.current = now;
            appWindow.startDragging();
        }
    };

    return (
        <div
            onMouseDown={handleMouseDown}
            className="h-9 bg-[var(--bg-primary)] dark:bg-gray-900 flex items-center justify-between select-none border-b border-transparent dark:border-gray-800/50 shrink-0 transition-colors duration-300 relative z-50 shadow-sm dark:shadow-none"
        >
            {/* Left: App Logo & Title */}
            <div className="flex items-center gap-2 px-3 h-full">
                {/* AST Logo */}
                <div className="flex items-center gap-1">
                    <span className="text-slate-900 dark:text-white font-bold text-sm tracking-tight">/</span>
                    <span className="text-blue-500 font-bold text-sm">AST</span>
                </div>
                <span className="text-slate-500 dark:text-gray-500 text-xs">AShowTracker</span>
            </div>

            {/* Right: Window Controls */}
            <div className="flex h-full" onMouseDown={(e) => e.stopPropagation()}>
                {/* Minimize */}
                <button
                    onClick={handleMinimize}
                    className="w-12 h-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                    title="Minimize"
                >
                    <Minus className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                </button>

                {/* Maximize/Restore */}
                <button
                    onClick={handleMaximize}
                    className="w-12 h-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                    title={isMaximized ? "Restore" : "Maximize"}
                >
                    {isMaximized ? (
                        <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" />
                    ) : (
                        <Square className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" />
                    )}
                </button>

                {/* Close */}
                <button
                    onClick={handleClose}
                    className="w-12 h-full flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer group"
                    title="Close"
                >
                    <X className="w-4 h-4 text-slate-500 dark:text-gray-400 group-hover:text-white" />
                </button>
            </div>
        </div>
    );
}

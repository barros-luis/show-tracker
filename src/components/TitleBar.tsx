import { useState, useEffect } from "react";
import { Minus, Square, X, Copy } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function TitleBar() {
    const [isMaximized, setIsMaximized] = useState(true);
    const appWindow = getCurrentWindow();

    // Check maximized state on mount
    useEffect(() => {
        appWindow.isMaximized().then(setIsMaximized);
    }, []);

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

    // Handle drag - use Tauri's startDragging API
    const handleDragStart = (e: React.MouseEvent) => {
        // Only start drag on left click
        if (e.button === 0) {
            appWindow.startDragging();
        }
    };

    return (
        <div
            onMouseDown={handleDragStart}
            className="h-9 bg-gray-900 flex items-center justify-between select-none border-b border-gray-800/50 shrink-0"
        >
            {/* Left: App Logo & Title */}
            <div className="flex items-center gap-2 px-3 h-full">
                {/* AST Logo */}
                <div className="flex items-center gap-1">
                    <span className="text-white font-bold text-sm tracking-tight">/</span>
                    <span className="text-blue-500 font-bold text-sm">AST</span>
                </div>
                <span className="text-gray-500 text-xs">AShowTracker</span>
            </div>

            {/* Right: Window Controls */}
            <div className="flex h-full" onMouseDown={(e) => e.stopPropagation()}>
                {/* Minimize */}
                <button
                    onClick={handleMinimize}
                    className="w-12 h-full flex items-center justify-center hover:bg-gray-700/50 transition-colors cursor-pointer"
                    title="Minimize"
                >
                    <Minus className="w-4 h-4 text-gray-400" />
                </button>

                {/* Maximize/Restore */}
                <button
                    onClick={handleMaximize}
                    className="w-12 h-full flex items-center justify-center hover:bg-gray-700/50 transition-colors cursor-pointer"
                    title={isMaximized ? "Restore" : "Maximize"}
                >
                    {isMaximized ? (
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                        <Square className="w-3.5 h-3.5 text-gray-400" />
                    )}
                </button>

                {/* Close */}
                <button
                    onClick={handleClose}
                    className="w-12 h-full flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer group"
                    title="Close"
                >
                    <X className="w-4 h-4 text-gray-400 group-hover:text-white" />
                </button>
            </div>
        </div>
    );
}

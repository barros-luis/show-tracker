/**
 * Platform-Aware ShowDetailModal
 * 
 * Automatically renders the appropriate modal variant based on platform:
 * - Mobile: MobileShowDetailModal (bottom sheet, touch-optimized)
 * - Desktop: Original ShowDetailModal (side-by-side layout)
 */
import { useState, useEffect } from "react";
import { type MediaItem } from "../../api/mediaTypes";

// Lazy imports for code splitting - only load what's needed
const DesktopModal = () => import("./ShowDetailModal.desktop");
const MobileModal = () => import("../mobile/modals/MobileShowDetailModal");

interface ShowDetailModalWrapperProps {
    media: MediaItem | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToList: (media: MediaItem) => void;
    isLoggedIn: boolean;
}

// Simple platform detection
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => {
            const ua = navigator.userAgent.toLowerCase();
            setIsMobile(/android|iphone|ipad|ipod/i.test(ua) || window.innerWidth < 768);
        };
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    return isMobile;
}

export function ShowDetailModal(props: ShowDetailModalWrapperProps) {
    const isMobile = useIsMobile();
    const [ModalComponent, setModalComponent] = useState<React.ComponentType<ShowDetailModalWrapperProps> | null>(null);

    useEffect(() => {
        // Dynamically load the appropriate modal
        if (isMobile) {
            MobileModal().then(mod => setModalComponent(() => mod.MobileShowDetailModal));
        } else {
            DesktopModal().then(mod => setModalComponent(() => mod.DesktopShowDetailModal));
        }
    }, [isMobile]);

    if (!ModalComponent) {
        // Show nothing while loading (shouldn't be noticeable)
        return null;
    }

    return <ModalComponent {...props} />;
}

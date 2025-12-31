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
const DesktopModalImport = () => import("./ShowDetailModal.desktop");
const MobileModalImport = () => import("../mobile/modals/MobileShowDetailModal");

interface ShowDetailModalWrapperProps {
    media: MediaItem | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToList: (media: MediaItem) => void;
    isLoggedIn: boolean;
}

// Synchronous platform detection - runs immediately on first render
function getIsMobile(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();
    return /android|iphone|ipad|ipod/i.test(ua) || window.innerWidth < 768;
}

function useIsMobile() {
    // Start with actual value, not false
    const [isMobile, setIsMobile] = useState(getIsMobile);

    useEffect(() => {
        const check = () => setIsMobile(getIsMobile());
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
            MobileModalImport().then(mod => setModalComponent(() => mod.MobileShowDetailModal));
        } else {
            DesktopModalImport().then(mod => setModalComponent(() => mod.DesktopShowDetailModal));
        }
    }, [isMobile]);

    if (!ModalComponent) {
        // Show nothing while loading (shouldn't be noticeable)
        return null;
    }

    return <ModalComponent {...props} />;
}

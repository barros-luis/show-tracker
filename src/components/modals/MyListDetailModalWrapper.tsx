import { Suspense, lazy } from "react";
import { DesktopMyListDetailModal } from "./MyListDetailModal.desktop";
import { usePlatform } from "../../hooks/usePlatform";
import { SupabaseClient } from "@supabase/supabase-js";
import type { UserList } from "./ListManageModal";

// Lazy load mobile modal
const MobileMyListDetailModal = lazy(() =>
    import('../mobile').then(module => ({ default: module.MobileMyListDetailModal }))
);

export interface MyListDetailModalProps {
    item: any; // Using any for now to avoid circular dependency issues with types
    isOpen: boolean;
    onClose: () => void;
    onRemove: (item: any) => void;
    onEpisodeUpdate: (itemId: number, watchedCount: number) => void;
    onTotalEpisodesUpdate: (itemId: number, totalEpisodes: number) => void;
    onStatusUpdate: (itemId: number, status: string) => void;
    onListChange: (itemId: number, listId: number | null) => void;
    userLists: UserList[];
    supabase: SupabaseClient;
    userId: string | null;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function MyListDetailModal(props: MyListDetailModalProps) {
    const { isMobile } = usePlatform();

    // Only verify mobile status once mounted to avoid hydration mismatches if we were doing SSR (not an issue here but good practice)

    if (isMobile) {
        return (
            <Suspense fallback={null}>
                <MobileMyListDetailModal
                    item={props.item}
                    isOpen={props.isOpen}
                    onClose={props.onClose}
                    onRemove={props.onRemove}
                    onEpisodeUpdate={props.onEpisodeUpdate}
                    onTotalEpisodesUpdate={props.onTotalEpisodesUpdate}
                    onStatusUpdate={props.onStatusUpdate}
                    onListChange={props.onListChange}
                    userLists={props.userLists}
                    supabase={props.supabase}
                    userId={props.userId}
                    showToast={props.showToast}
                />
            </Suspense>
        );
    }

    return <DesktopMyListDetailModal {...props} />;
}

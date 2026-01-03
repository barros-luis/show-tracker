import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import type { WatchlistItem, WatchStatus } from "../types";

export function useWatchlist(userId: string | undefined) {
    const [items, setItems] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchItems = useCallback(async () => {
        if (!userId) {
            setItems([]);
            return;
        }

        setLoading(true);
        const { data, error } = await supabase
            .from("watchlist")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching watchlist:", error);
        } else {
            setItems(data || []);
        }
        setLoading(false);
    }, [userId]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // Realtime Subscription
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`watchlist_changes_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'watchlist',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setItems((prev) => {
                            // Prevent duplicates if we already added it via optimistic update elsewhere (though complex to track, simple check helps)
                            if (prev.find(i => i.id === payload.new.id)) return prev;
                            const newItem = payload.new as WatchlistItem;
                            return [newItem, ...prev].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setItems((prev) =>
                            prev.map((item) =>
                                item.id === payload.new.id ? { ...item, ...payload.new } as WatchlistItem : item
                            )
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setItems((prev) => prev.filter((item) => item.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const removeItem = useCallback(async (itemId: number) => {
        // Also delete watched episodes
        await supabase.from("watched_episodes").delete().eq("watchlist_id", itemId);
        await supabase.from("watchlist").delete().eq("id", itemId);
        setItems((prev) => prev.filter((item) => item.id !== itemId));
    }, []);

    const updateEpisodeCount = useCallback((itemId: number, count: number) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === itemId ? { ...item, watched_episodes: count } : item
            )
        );
    }, []);

    const updateTotalEpisodes = useCallback((itemId: number, total: number) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === itemId ? { ...item, total_episodes: total } : item
            )
        );
    }, []);

    const updateStatus = useCallback((itemId: number, status: WatchStatus) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === itemId ? { ...item, status } : item
            )
        );
    }, []);

    const updateListId = useCallback((itemId: number, listId: number | null) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === itemId ? { ...item, list_id: listId } : item
            )
        );
    }, []);

    return {
        items,
        loading,
        fetchItems,
        removeItem,
        updateEpisodeCount,
        updateTotalEpisodes,
        updateStatus,
        updateListId,
    };
}

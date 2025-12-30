import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import type { UserList } from "../types";

export function useUserLists(userId: string | undefined) {
    const [lists, setLists] = useState<UserList[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchLists = useCallback(async () => {
        if (!userId) {
            setLists([]);
            return;
        }

        setLoading(true);
        const { data, error } = await supabase
            .from("lists")
            .select("*")
            .eq("user_id", userId)
            .order("position", { ascending: true });

        if (error) {
            console.error("Error fetching user lists:", error);
        } else {
            setLists(data || []);
        }
        setLoading(false);
    }, [userId]);

    useEffect(() => {
        fetchLists();
    }, [fetchLists]);

    const updateLists = useCallback((newLists: UserList[]) => {
        setLists(newLists);
    }, []);

    return {
        lists,
        loading,
        fetchLists,
        updateLists,
    };
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import type { UserList } from "../types";

export function useUserLists(userId: string | undefined, userCreatedAt?: string) {
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
            let currentLists = data || [];

            // Check if lists are empty and verify if user is "new" (created in the last few minutes)
            if (currentLists.length === 0 && userCreatedAt) {
                const createdTime = new Date(userCreatedAt).getTime();
                const now = new Date().getTime();
                // 5 minutes threshold
                const isNewUser = (now - createdTime) < 5 * 60 * 1000;

                const hasInitialized = localStorage.getItem(`has_initialized_lists_${userId}`);

                if (isNewUser && !hasInitialized) {
                    console.log("🆕 New user detected! Creating default lists...");

                    const defaultLists = [
                        { user_id: userId, name: "Animes", icon: "sparkles", color: "purple", position: 0, is_default: false },
                        { user_id: userId, name: "Series", icon: "tv", color: "blue", position: 1, is_default: false },
                        { user_id: userId, name: "Movies", icon: "film", color: "red", position: 2, is_default: false }
                    ];

                    const { data: createdData, error: createError } = await supabase
                        .from("lists")
                        .insert(defaultLists)
                        .select();

                    if (createError) {
                        console.error("Failed to create default lists", createError);
                    } else if (createdData) {
                        currentLists = createdData.sort((a, b) => a.position - b.position);
                        localStorage.setItem(`has_initialized_lists_${userId}`, "true");
                    }
                }
            }

            setLists(currentLists);
        }
        setLoading(false);
    }, [userId, userCreatedAt]);

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

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import type { UserStatus } from "../types";

// Default statuses for new users
const DEFAULT_STATUSES = [
    { value: "WATCHING", label: "Watching", color: "green", position: 0 },
    { value: "PLANNED", label: "Planned", color: "yellow", position: 1 },
    { value: "FINISHED", label: "Finished", color: "blue", position: 2 },
    { value: "ON_HOLD", label: "On Hold", color: "orange", position: 3 },
    { value: "REWATCHING", label: "Re-watching", color: "pink", position: 4 },
    { value: "REWATCHED", label: "Re-watched", color: "cyan", position: 5 },
];

export function useUserStatuses(userId: string | undefined, userCreatedAt?: string) {
    const [statuses, setStatuses] = useState<UserStatus[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchStatuses = useCallback(async () => {
        if (!userId) {
            setStatuses([]);
            return;
        }

        setLoading(true);
        const { data, error } = await supabase
            .from("user_statuses")
            .select("*")
            .eq("user_id", userId)
            .order("position", { ascending: true });

        if (error) {
            console.error("Error fetching user statuses:", error);
        } else {
            let currentStatuses = data || [];

            // Check if statuses are empty and verify if user is "new" (created in the last few minutes)
            if (currentStatuses.length === 0 && userCreatedAt) {
                const createdTime = new Date(userCreatedAt).getTime();
                const now = new Date().getTime();
                // 5 minutes threshold
                const isNewUser = (now - createdTime) < 5 * 60 * 1000;

                const hasInitialized = localStorage.getItem(`has_initialized_statuses_${userId}`);

                if (isNewUser && !hasInitialized) {
                    console.log("🆕 New user detected! Creating default statuses...");

                    const defaultStatusesToCreate = DEFAULT_STATUSES.map(s => ({
                        user_id: userId,
                        value: s.value,
                        label: s.label,
                        color: s.color,
                        position: s.position,
                    }));

                    const { data: createdData, error: createError } = await supabase
                        .from("user_statuses")
                        .insert(defaultStatusesToCreate)
                        .select();

                    if (createError) {
                        console.error("Failed to create default statuses", createError);
                    } else if (createdData) {
                        currentStatuses = createdData.sort((a, b) => a.position - b.position);
                        localStorage.setItem(`has_initialized_statuses_${userId}`, "true");
                    }
                }
            }

            // If still empty (existing user without statuses), create defaults
            if (currentStatuses.length === 0) {
                console.log("📋 Existing user without statuses, creating defaults...");

                const defaultStatusesToCreate = DEFAULT_STATUSES.map(s => ({
                    user_id: userId,
                    value: s.value,
                    label: s.label,
                    color: s.color,
                    position: s.position,
                }));

                const { data: createdData, error: createError } = await supabase
                    .from("user_statuses")
                    .insert(defaultStatusesToCreate)
                    .select();

                if (createError) {
                    console.error("Failed to create default statuses for existing user", createError);
                } else if (createdData) {
                    currentStatuses = createdData.sort((a, b) => a.position - b.position);
                }
            }

            setStatuses(currentStatuses);
        }
        setLoading(false);
    }, [userId, userCreatedAt]);

    useEffect(() => {
        fetchStatuses();
    }, [fetchStatuses]);

    const updateStatuses = useCallback((newStatuses: UserStatus[]) => {
        setStatuses(newStatuses);
    }, []);

    return {
        statuses,
        loading,
        fetchStatuses,
        updateStatuses,
    };
}

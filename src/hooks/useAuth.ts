import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import type { Profile } from "../types";

interface UseAuthReturn {
    session: any;
    profile: Profile | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
    const [session, setSession] = useState<any>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async (userId: string) => {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
        setProfile(data);
    }, []);

    const refreshProfile = useCallback(async () => {
        if (session?.user?.id) {
            await fetchProfile(session.user.id);
        }
    }, [session?.user?.id, fetchProfile]);

    useEffect(() => {
        // Initial auth check
        supabase.auth.getUser().then(async ({ data: { user }, error }) => {
            if (error || !user) {
                console.log("Session invalid or user deleted. Clearing state.");
                await supabase.auth.signOut();
                setSession(null);
                setProfile(null);
                setLoading(false);
            } else {
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .maybeSingle();

                if (!profileData) {
                    console.log("User has valid token but NO profile. Forcing Logout.");
                    await supabase.auth.signOut();
                    setSession(null);
                    setProfile(null);
                } else {
                    supabase.auth.getSession().then(({ data: { session } }) => {
                        setSession(session);
                        setProfile(profileData);
                    });
                }
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setSession(session);
                if (session) {
                    await fetchProfile(session.user.id);
                } else if (event === "SIGNED_OUT") {
                    setProfile(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [fetchProfile]);

    return { session, profile, loading, refreshProfile };
}

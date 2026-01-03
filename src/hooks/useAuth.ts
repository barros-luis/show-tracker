import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import type { Profile } from "../types";

interface UseAuthReturn {
    session: any;
    profile: Profile | null;
    loading: boolean;
    error: string | null;
    refreshProfile: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
    const [session, setSession] = useState<any>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch profile without blocking
    const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
        try {
            const { data, error: queryError } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            if (queryError) {
                console.error("[Auth] Profile query error:", queryError.message);
                return null;
            }
            return data as Profile;
        } catch (err: any) {
            console.error("[Auth] fetchProfile exception:", err.message);
            return null;
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        if (session?.user?.id) {
            const profileData = await fetchProfile(session.user.id);
            if (profileData) setProfile(profileData);
        }
    }, [session?.user?.id, fetchProfile]);

    useEffect(() => {
        let isMounted = true;

        const initAuth = async () => {
            try {
                // 1. Get Session fast
                const { data } = await supabase.auth.getSession();

                if (!isMounted) return;

                const cachedSession = data?.session;

                if (!cachedSession) {
                    setLoading(false);
                    return;
                }

                // 2. Set Session & UNBLOCK THE APP IMMEDIATELY
                setSession(cachedSession);
                setLoading(false);

                // 3. Fetch Profile in background
                if (cachedSession.user?.id) {
                    const profileData = await fetchProfile(cachedSession.user.id);
                    if (isMounted && profileData) {
                        setProfile(profileData);
                        // Optional: Cache locally if needed, but session-first strategy relies less on it
                        try {
                            localStorage.setItem(`profile_${cachedSession.user.id}`, JSON.stringify(profileData));
                        } catch (e) { /* ignore */ }
                    }
                }

            } catch (err: any) {
                console.error("[Auth] initAuth error:", err.message);
                if (isMounted) {
                    setError(err.message);
                    setLoading(false);
                }
            }
        };



        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                if (!isMounted) return;

                if (event === "SIGNED_OUT") {
                    setSession(null);
                    setProfile(null);
                    setLoading(false);
                } else if (event === "SIGNED_IN" && newSession) {
                    setSession(newSession);
                    setLoading(false); // Immediate unlock

                    // Fetch profile in background
                    const userId = newSession.user?.id;
                    if (userId) {
                        fetchProfile(userId).then(data => {
                            if (isMounted && data) {
                                setProfile(data);
                                localStorage.setItem(`profile_${userId}`, JSON.stringify(data));
                            }
                        });
                    }
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    // Realtime Profile Sync
    useEffect(() => {
        if (!session?.user?.id) return;

        const userId = session.user.id;
        const channel = supabase
            .channel(`profile_changes_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${userId}`,
                },
                (payload) => {
                    if (payload.eventType === 'UPDATE') {
                        setProfile((prev) => ({ ...prev, ...(payload.new as Profile) }));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id]);

    return { session, profile, loading, error, refreshProfile };
}

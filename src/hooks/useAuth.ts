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
    console.log("[Auth] useAuth hook called");

    const [session, setSession] = useState<any>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Simple profile fetch with timeout
    const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
        console.log("[Auth] fetchProfile starting for:", userId);
        const startTime = Date.now();

        try {
            // Create a promise that rejects after 10 seconds
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("Profile fetch timeout")), 10000);
            });

            // Create the Supabase query promise
            const queryPromise = supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single()
                .then(result => {
                    console.log("[Auth] Supabase query returned in:", Date.now() - startTime, "ms");
                    return result;
                });

            // Race between timeout and query
            const { data, error: queryError } = await Promise.race([queryPromise, timeoutPromise]);

            console.log("[Auth] fetchProfile completed in:", Date.now() - startTime, "ms");

            if (queryError) {
                console.error("[Auth] Profile query error:", queryError.message);
                return null;
            }

            console.log("[Auth] Profile data received:", data?.nickname || "no nickname");
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
        console.log("[Auth] useEffect running");
        let isMounted = true;

        const initAuth = async () => {
            console.log("[Auth] initAuth starting");

            try {
                // Get session - this should be fast (reads from localStorage)
                console.log("[Auth] Calling getSession...");
                const startTime = Date.now();
                const { data, error: sessionError } = await supabase.auth.getSession();
                console.log("[Auth] getSession completed in:", Date.now() - startTime, "ms");

                if (!isMounted) {
                    console.log("[Auth] Component unmounted, aborting");
                    return;
                }

                const cachedSession = data?.session;
                console.log("[Auth] Session result:", cachedSession ? "found" : "none", sessionError?.message || "");

                if (!cachedSession) {
                    console.log("[Auth] No session, setting loading false");
                    setLoading(false);
                    return;
                }

                // Set session immediately
                console.log("[Auth] Setting session for:", cachedSession.user?.email);
                setSession(cachedSession);

                // Fetch profile
                const userId = cachedSession.user?.id;
                if (userId) {
                    console.log("[Auth] Starting profile fetch for user:", userId);
                    const profileData = await fetchProfile(userId);
                    if (isMounted) {
                        console.log("[Auth] Setting profile:", profileData ? "success" : "null");
                        setProfile(profileData);
                    }
                }

                if (isMounted) {
                    console.log("[Auth] Done, setting loading false");
                    setLoading(false);
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

        // Auth state change listener (for login/logout during app usage)
        console.log("[Auth] Setting up auth listener");
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                console.log("[Auth] Auth state changed:", event, newSession?.user?.email);
                if (!isMounted) return;

                // Only handle actual state changes, not initial
                if (event === "SIGNED_OUT") {
                    setSession(null);
                    setProfile(null);
                    setLoading(false);
                } else if (event === "SIGNED_IN" && newSession) {
                    console.log("[Auth] SIGNED_IN - fetching profile");
                    setSession(newSession);
                    // Fetch profile immediately on sign in
                    const userId = newSession.user?.id;
                    if (userId) {
                        const profileData = await fetchProfile(userId);
                        if (isMounted) {
                            setProfile(profileData);
                            setLoading(false);
                        }
                    }
                }
            }
        );

        return () => {
            console.log("[Auth] Cleanup");
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    console.log("[Auth] Returning - loading:", loading, "session:", !!session, "profile:", !!profile);
    return { session, profile, loading, error, refreshProfile };
}

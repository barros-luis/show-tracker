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

// Timeout wrapper for async operations (works with PromiseLike)
function withTimeout<T>(promiseLike: PromiseLike<T>, ms: number): Promise<T> {
    const promise = Promise.resolve(promiseLike);
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Request timeout")), ms);
        promise
            .then((value) => {
                clearTimeout(timer);
                resolve(value);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
}

export function useAuth(): UseAuthReturn {
    const [session, setSession] = useState<any>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = useCallback(async (userId: string, retries = 2): Promise<Profile | null> => {
        for (let i = 0; i <= retries; i++) {
            try {
                // Create a proper promise from the Supabase query
                const queryPromise = supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", userId)
                    .single()
                    .then(result => result);

                const result = await withTimeout(queryPromise, 10000);
                if (result.error) throw result.error;
                return result.data as Profile;
            } catch (err) {
                console.warn(`Profile fetch attempt ${i + 1} failed:`, err);
                if (i === retries) return null;
                // Wait before retry (exponential backoff)
                await new Promise(r => setTimeout(r, 1000 * (i + 1)));
            }
        }
        return null;
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
                // Try to get the session with timeout
                const { data: { session: currentSession }, error: sessionError } = await withTimeout(
                    supabase.auth.getSession(),
                    10000 // 10 second timeout
                );

                if (!isMounted) return;

                if (sessionError || !currentSession) {
                    // No valid session
                    setSession(null);
                    setProfile(null);
                    setLoading(false);
                    return;
                }

                // Verify user is valid
                const { data: { user }, error: userError } = await withTimeout(
                    supabase.auth.getUser(),
                    10000
                );

                if (!isMounted) return;

                if (userError || !user) {
                    console.log("Session verification failed:", userError?.message);

                    // Only sign out if strictly 401 (unauthorized/invalid token)
                    // If it's a network error or 5xx, keep the session
                    if (userError?.status === 401 || userError?.message?.includes("invalid")) {
                        await supabase.auth.signOut();
                        setSession(null);
                        setProfile(null);
                        setLoading(false);
                        return;
                    } else {
                        // Network error or other issue - keep session but show warning
                        console.warn("Keeping session despite verification failure (likely offline)");
                        setSession(currentSession);
                        setError("Offline mode: User verification failed");

                        // If we have a session user, try to use that ID for profile fetch
                        // But don't crash if user is null
                        if (currentSession?.user) {
                            // Proceed to try fetching profile with session user ID
                            // user variable might be null, so we use currentSession.user
                        } else {
                            setLoading(false);
                            return;
                        }
                    }
                }

                const targetUser = user || currentSession?.user;
                if (!targetUser) {
                    setLoading(false);
                    return;
                }

                // Fetch profile with retries
                const profileData = await fetchProfile(targetUser.id);

                if (!isMounted) return;

                if (!profileData) {
                    console.log("Could not fetch profile. Session may be valid.");
                    // Still set session so user can at least see they're logged in
                    setSession(currentSession);
                    setProfile(null);
                    setError("Could not load profile. Check your connection.");
                    setLoading(false);
                    return;
                }

                // Success!
                setSession(currentSession);
                setProfile(profileData);
                setError(null);
                setLoading(false);

            } catch (err: any) {
                console.error("Auth init error:", err);
                if (!isMounted) return;

                // On timeout/error, check if we have cached session
                const { data: { session: cachedSession } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
                if (cachedSession) {
                    setSession(cachedSession);
                    setError("Connection issues. Some features may not work.");
                }
                setLoading(false);
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                if (!isMounted) return;

                setSession(newSession);
                if (newSession) {
                    const profileData = await fetchProfile(newSession.user.id);
                    if (isMounted && profileData) {
                        setProfile(profileData);
                        setError(null);
                    }
                } else if (event === "SIGNED_OUT") {
                    setProfile(null);
                    setError(null);
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    return { session, profile, loading, error, refreshProfile };
}

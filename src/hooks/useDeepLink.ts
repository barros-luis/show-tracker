import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { onOpenUrl, getCurrent } from "@tauri-apps/plugin-deep-link";
import { invoke } from "@tauri-apps/api/core";
import { supabase } from "../services/supabase";
// Make sure this export exists in your src/main.tsx
import { clearPendingDeepLinkUrls } from "../main";

interface UseDeepLinkOptions {
    onSuccess?: () => void;
    onError?: (error: string) => void;
    refreshProfile?: (userId: string) => void;
    refreshList?: () => void;
}

// Track processed auth codes to prevent duplicate exchanges
let processedCodes = new Set<string>();
let lastProcessedUrl: string | null = null; // Track the last URL to prevent duplicates

// Export function to clear processed codes on logout
export function clearDeepLinkCache() {
    processedCodes.clear();
    processedCodes = new Set<string>();
    lastProcessedUrl = null;
    // Also clear the pending URLs in main.tsx logic
    try {
        clearPendingDeepLinkUrls();
    } catch (e) {
        console.warn("Could not clear pending URLs from main:", e);
    }
}

export function useDeepLink(options: UseDeepLinkOptions = {}) {
    const optionsRef = useRef(options);
    // Update ref on every render so we always have the latest callbacks
    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    const isProcessingRef = useRef(false);

    useEffect(() => {
        let isUnmounted = false;

        const handleDeepLink = async (urls: string[]) => {

            if (isProcessingRef.current) {
                return;
            }

            if (!urls || urls.length === 0) {
                return;
            }

            // Prevent processing the same URL multiple times
            const urlString = urls[0];
            if (lastProcessedUrl === urlString) {
                return;
            }

            lastProcessedUrl = urlString;
            isProcessingRef.current = true;

            // Small delay to ensure Supabase client is ready
            await new Promise(resolve => setTimeout(resolve, 200));

            for (const url of urls) {

                // 1. Handle PKCE Flow (Code in Query Params) - PREFERRED
                if (url.includes("code=")) {
                    const params = new URLSearchParams(url.split("?")[1]);
                    const code = params.get("code");

                    if (!code) {
                        continue;
                    }


                    // Try to get verifier - check persistent store first (for mobile)
                    const { getPkceVerifier, isMobilePlatform } = await import("../services/pkceStore");
                    let storedVerifier: string | null = null;

                    if (isMobilePlatform()) {
                        storedVerifier = await getPkceVerifier();
                    }

                    // Fall back to localStorage if not found in persistent store
                    if (!storedVerifier) {
                        const verifierKey = `supabase.auth.token-code-verifier`;
                        storedVerifier = localStorage.getItem(verifierKey);
                    }

                    if (!storedVerifier) {
                        // This is a stale URL from a previous session - silently skip
                        processedCodes.add(code);
                        isProcessingRef.current = false;
                        return;
                    }

                    if (processedCodes.has(code)) {
                        isProcessingRef.current = false;
                        return;
                    }

                    processedCodes.add(code);

                    try {
                        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

                        if (isUnmounted) {
                            isProcessingRef.current = false;
                            return;
                        }

                        if (!error && data.session) {
                            try { clearPendingDeepLinkUrls(); } catch { }
                            lastProcessedUrl = null;

                            optionsRef.current.refreshProfile?.(data.session.user.id);
                            optionsRef.current.refreshList?.();
                            invoke("force_focus").catch(() => { });
                            optionsRef.current.onSuccess?.();
                        } else {
                            console.error("🔗 [DeepLink] ❌ Exchange failed:", error);
                            processedCodes.delete(code);

                            if (error &&
                                !error.message?.includes("session_not_found") &&
                                !error.message?.includes("already_used")) {
                                optionsRef.current.onError?.("Login failed. Please try again.");
                            }
                        }
                    } catch (err: any) {
                        console.error("🔗 [DeepLink] ❌ Exception:", err);
                        processedCodes.delete(code);

                        if (!isUnmounted && err?.message &&
                            !err.message.includes("session_not_found") &&
                            !err.message.includes("already_used")) {
                            optionsRef.current.onError?.("Login failed. Please try again.");
                        }
                    } finally {
                        isProcessingRef.current = false;
                    }

                    return;
                }

                // 2. Handle Implicit Flow (Tokens in Hash) - FALLBACK ONLY
                if (url.includes("access_token") && url.includes("refresh_token")) {
                    const fragment = url.split("#")[1];
                    if (!fragment) {
                        isProcessingRef.current = false;
                        continue;
                    }

                    const params = new URLSearchParams(fragment);
                    const accessToken = params.get("access_token");
                    const refreshToken = params.get("refresh_token");

                    if (accessToken && refreshToken) {
                        if (refreshToken.length < 20) {
                            console.error("🔗 [DeepLink] ❌ Invalid refresh token (too short)");
                            isProcessingRef.current = false;
                            optionsRef.current.onError?.("Invalid authentication token. Please try again.");
                            return;
                        }

                        const tokenKey = accessToken.substring(0, 30);

                        if (processedCodes.has(tokenKey)) {
                            isProcessingRef.current = false;
                            return;
                        }

                        processedCodes.add(tokenKey);

                        try {
                            const { data, error } = await supabase.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken,
                            });

                            if (isUnmounted) {
                                isProcessingRef.current = false;
                                return;
                            }

                            if (!error && data.session) {
                                try { clearPendingDeepLinkUrls(); } catch { }

                                optionsRef.current.refreshProfile?.(data.session.user.id);
                                optionsRef.current.refreshList?.();
                                invoke("force_focus").catch(() => { });
                                optionsRef.current.onSuccess?.();
                            } else {
                                console.error("🔗 [DeepLink] ❌ Failed to set session:", error);
                                processedCodes.delete(tokenKey);
                                if (error && !error.message?.includes("session_not_found")) {
                                    optionsRef.current.onError?.("Failed to verify session.");
                                }
                            }
                        } catch (err: any) {
                            console.error("🔗 [DeepLink] ❌ Session set error:", err);
                            processedCodes.delete(tokenKey);
                            if (!isUnmounted && err?.message && !err.message.includes("session_not_found")) {
                                optionsRef.current.onError?.("Failed to verify session.");
                            }
                        } finally {
                            isProcessingRef.current = false;
                        }
                    } else {
                        isProcessingRef.current = false;
                    }
                }
            }

            isProcessingRef.current = false;
        };

        const setupDeepLink = async () => {
            try {
                // Process early-captured URLs
                const { pendingDeepLinkUrls } = await import("../main");

                if (pendingDeepLinkUrls && pendingDeepLinkUrls.length > 0 && !isUnmounted) {
                    await handleDeepLink(pendingDeepLinkUrls);
                }

                // Check getCurrent as backup (but only if we haven't processed anything yet)
                const checkInitialUrl = async (attempt: number = 0): Promise<void> => {
                    if (isUnmounted || lastProcessedUrl) return;

                    const initialUrls = await getCurrent();
                    if (initialUrls && initialUrls.length > 0) {
                        await handleDeepLink(initialUrls);
                        return;
                    }

                    const delays = [100, 300, 500];
                    if (attempt < delays.length) {
                        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
                        return checkInitialUrl(attempt + 1);
                    }
                };

                await checkInitialUrl();

                const unlisten = await onOpenUrl((urls) => {
                    if (!isUnmounted) {
                        handleDeepLink(urls);
                    }
                });

                const unlistenWindows = await listen<string[]>("deep-link-received", (event) => {
                    if (!isUnmounted) {
                        handleDeepLink(event.payload);
                    }
                });

                const handleEarlyCapture = (event: Event) => {
                    if (!isUnmounted) {
                        const customEvent = event as CustomEvent<string[]>;
                        handleDeepLink(customEvent.detail);
                    }
                };
                window.addEventListener("deep-link-early-capture", handleEarlyCapture);

                const handleVisibilityChange = async () => {
                    if (document.visibilityState === 'visible' && !isUnmounted) {
                        const pendingUrls = await getCurrent();
                        if (pendingUrls && pendingUrls.length > 0) {
                            handleDeepLink(pendingUrls);
                        }
                    }
                };
                document.addEventListener("visibilitychange", handleVisibilityChange);

                return () => {
                    unlisten();
                    unlistenWindows();
                    window.removeEventListener("deep-link-early-capture", handleEarlyCapture);
                    document.removeEventListener("visibilitychange", handleVisibilityChange);
                };
            } catch (err) {
                console.log("Deep-link setup failed:", err);
            }
        };

        setupDeepLink();

        return () => {
            isUnmounted = true;
        };

    }, []);
}
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { onOpenUrl, getCurrent } from "@tauri-apps/plugin-deep-link";
import { invoke } from "@tauri-apps/api/core";
import { supabase } from "../services/supabase";

interface UseDeepLinkOptions {
    onSuccess?: () => void;
    onError?: (error: string) => void;
    refreshProfile?: (userId: string) => void;
    refreshList?: () => void;
}

export function useDeepLink(options: UseDeepLinkOptions = {}) {
    const { onSuccess, onError, refreshProfile, refreshList } = options;

    useEffect(() => {
        const handleDeepLink = (urls: string[]) => {
            console.log("Processing Deep Link:", urls);

            for (const url of urls) {
                // 1. Handle PKCE Flow (Code in Query Params)
                if (url.includes("code=")) {
                    const params = new URLSearchParams(url.split("?")[1]);
                    const code = params.get("code");

                    if (code) {
                        supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
                            if (!error && data.session) {
                                console.log("PKCE Session exchange successful");
                                refreshProfile?.(data.session.user.id);
                                refreshList?.();
                                invoke("force_focus").catch(() => { });
                                onSuccess?.();
                            } else {
                                console.error("PKCE exchange failed:", error);
                                onError?.("Login failed. Please try again.");
                            }
                        });
                        return;
                    }
                }

                // 2. Handle Implicit Flow (Tokens in Hash)
                if (url.includes("access_token") || url.includes("refresh_token")) {
                    const fragment = url.split("#")[1];
                    if (!fragment) continue;

                    const params = new URLSearchParams(fragment);
                    const accessToken = params.get("access_token");
                    const refreshToken = params.get("refresh_token");

                    if (accessToken && refreshToken) {
                        supabase.auth
                            .setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken,
                            })
                            .then(async ({ data, error }) => {
                                if (!error && data.session) {
                                    console.log("Session set successfully via Deep Link");
                                    refreshProfile?.(data.session.user.id);
                                    refreshList?.();
                                    invoke("force_focus").catch(() => { });
                                    onSuccess?.();
                                } else {
                                    console.error("Failed to set session:", error);
                                    onError?.("Failed to verify session.");
                                }
                            });
                    }
                }
            }
        };

        const setupDeepLink = async () => {
            try {
                // 1. Check if app was LAUNCHED by a URL (Cold Start)
                const initialUrls = await getCurrent();
                if (initialUrls) {
                    console.log("App launched via URL:", initialUrls);
                    handleDeepLink(initialUrls);
                }

                // 2. Listen for NEW URLs while app is open (Warm Start)
                const unlisten = await onOpenUrl((urls) => {
                    console.log("New URL received:", urls);
                    handleDeepLink(urls);
                });

                // 3. Listen for Windows Deep Links (via Single Instance args)
                const unlistenWindows = await listen<string[]>("deep-link-received", (event) => {
                    console.log("Windows Deep Link received:", event.payload);
                    handleDeepLink(event.payload);
                });

                return () => {
                    unlisten();
                    unlistenWindows();
                };
            } catch (err) {
                console.log("Deep-link setup failed (may not be available on this platform):", err);
            }
        };

        setupDeepLink();
    }, [onSuccess, onError, refreshProfile, refreshList]);
}

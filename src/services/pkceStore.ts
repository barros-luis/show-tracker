/**
 * PKCE Store Service
 * Uses tauri-plugin-store for persistent file-based storage on mobile.
 * This survives Android killing the app process during OAuth browser flow.
 */
import { load } from "@tauri-apps/plugin-store";

const STORE_NAME = "pkce-auth.json";
const VERIFIER_KEY = "code_verifier";

// Cache the store instance
let storeInstance: Awaited<ReturnType<typeof load>> | null = null;

async function getStore() {
    if (!storeInstance) {
        storeInstance = await load(STORE_NAME, {
            autoSave: true,
            defaults: {}
        });
    }
    return storeInstance;
}

/**
 * Save the PKCE verifier to persistent storage
 */
export async function savePkceVerifier(verifier: string): Promise<void> {
    try {
        const store = await getStore();
        await store.set(VERIFIER_KEY, verifier);
        await store.save();
    } catch (error) {
        // Fallback to localStorage
        localStorage.setItem(`supabase.auth.token-code-verifier`, verifier);
    }
}

/**
 * Retrieve the PKCE verifier from persistent storage
 */
export async function getPkceVerifier(): Promise<string | null> {
    try {
        const store = await getStore();
        const verifier = await store.get<string>(VERIFIER_KEY);
        return verifier ?? null;
    } catch (error) {
        return null;
    }
}

/**
 * Clear the PKCE verifier after successful auth
 */
export async function clearPkceVerifier(): Promise<void> {
    try {
        const store = await getStore();
        await store.delete(VERIFIER_KEY);
        await store.save();
    } catch (error) {
        console.error("[PkceStore] ❌ Failed to clear verifier:", error);
    }
}

/**
 * Check if we're on a mobile platform
 */
export function isMobilePlatform(): boolean {
    const ua = navigator.userAgent.toLowerCase();
    return /android|iphone|ipad|ipod/i.test(ua);
}

/**
 * Unified Supabase Client
 * Single source of truth for Supabase connection across the application
 */
import { createClient } from "@supabase/supabase-js";
import { savePkceVerifier, getPkceVerifier, clearPkceVerifier, isMobilePlatform } from "./pkceStore";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        "Supabase environment variables not set. Please check your .env file."
    );
}

// Custom storage that ensures PKCE verifier persists across Android process death
class PersistentStorage {
    async getItem(key: string): Promise<string | null> {
        try {
            // For PKCE verifier on mobile, use persistent store
            if (key.includes('code-verifier') && isMobilePlatform()) {
                const verifier = await getPkceVerifier();
                if (verifier) {
                    return verifier;
                }
            }

            // Fall back to localStorage
            const value = localStorage.getItem(key);
            console.log(`[Storage] GET ${key}:`, value ? 'found' : 'not found');
            return value;
        } catch (error) {
            console.error('[Storage] GET error:', error);
            return null;
        }
    }

    async setItem(key: string, value: string): Promise<void> {
        try {
            // For PKCE verifier on mobile, also save to persistent store
            if (key.includes('code-verifier') && isMobilePlatform()) {
                await savePkceVerifier(value);
            }

            // Always save to localStorage as well (for desktop/fallback)
            localStorage.setItem(key, value);
        } catch (error) {
            console.error('[Storage] SET error:', error);
        }
    }

    async removeItem(key: string): Promise<void> {
        try {
            // For PKCE verifier on mobile, clear persistent store too
            if (key.includes('code-verifier') && isMobilePlatform()) {
                await clearPkceVerifier();
            }

            localStorage.removeItem(key);
        } catch (error) {
            console.error('[Storage] REMOVE error:', error);
        }
    }
}

export const supabase = createClient(
    supabaseUrl || "",
    supabaseAnonKey || "",
    {
        auth: {
            // Use our custom storage with persistent PKCE support
            storage: new PersistentStorage(),
            persistSession: true,
            autoRefreshToken: true,
            // We handle deep links manually
            detectSessionInUrl: false,
            // Use PKCE flow for security
            flowType: 'pkce',
            storageKey: 'supabase.auth.token',
        }
    }
);

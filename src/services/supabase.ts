/**
 * Unified Supabase Client
 * Single source of truth for Supabase connection across the application
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        "Supabase environment variables not set. Please check your .env file."
    );
}

export const supabase = createClient(
    supabaseUrl || "",
    supabaseAnonKey || "",
    {
        auth: {
            // Persist session to localStorage (important for mobile)
            persistSession: true,
            storage: typeof window !== 'undefined' ? window.localStorage : undefined,
            // Auto refresh tokens before they expire
            autoRefreshToken: true,
            // Detect session from URL (for OAuth redirects)
            detectSessionInUrl: true,
        }
    }
);

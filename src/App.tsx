import { useState, useEffect } from "react";
import { Search, Loader2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { listen } from "@tauri-apps/api/event";
import { searchAnime, type Anime } from "./api/jikan";
import { AnimeCard } from "./components/AnimeCard";
import { AuthModal } from "./components/AuthModal";
import { UserMenu } from "./components/UserMenu";
import { Toast, type ToastType } from "./components/Toast";
import { MouseAura } from "./components/MouseAura";
import { ProfilePage } from "./components/ProfilePage";
// Import both functions from the plugin
import { onOpenUrl, getCurrent } from '@tauri-apps/plugin-deep-link';
import { invoke } from "@tauri-apps/api/core";
import "./App.css";


// --- CONFIGURATION ---
const supabase = createClient(
  "https://xbosdjujcvfqujtdamun.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3NkanVqY3ZmcXVqdGRhbXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMzUzNjksImV4cCI6MjA4MDkxMTM2OX0.BrKUQ_VGTfCbNW2dST3LHPz0UUbC9ZNn98mbb5FAVig"
);

function App() {
  // --- STATE ---
  const [view, setView] = useState<"search" | "list" | "profile">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Anime[]>([]);
  const [myList, setMyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type });
  };

  // --- 0. AUTH LOGIC ---
  // Handle Login/Logout Logic
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user }, error }) => {
      if (error || !user) {
        console.log("Session invalid or user deleted (Auth check failed). Clearing state.");
        await supabase.auth.signOut(); // Wipes LocalStorage
        setSession(null);
        setProfile(null);
        setMyList([]);
      } else {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

        if (!profile) {
          console.log("User has valid token but NO profile (Deleted?). Forcing Logout.");
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
        } else {
          supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setProfile(profile);
            if (session) fetchMyList();
          });
        }
      }
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        fetchMyList();
      } else {
        setProfile(null);
        setMyList([]);
        setView("search");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleDeepLink = (urls: string[]) => {
      console.log("Processing Deep Link:", urls);

      for (const url of urls) {
        // 1. Handle PKCE Flow (Code in Query Params)
        if (url.includes("code=")) {
          const params = new URLSearchParams(url.split('?')[1]);
          const code = params.get("code");

          if (code) {
            supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
              if (!error && data.session) {
                console.log("PKCE Session exchange successful");
                fetchProfile(data.session.user.id);
                fetchMyList();
                setAuthModalOpen(false);

                // Use Rust command to force focus (works on macOS spaces)
                invoke('force_focus');

                showToast("Logged in via Google! You can close the browser tab.", "success");
              } else {
                console.error("PKCE exchange failed:", error);
                showToast("Login failed. Please try again.", "error");
              }
            });
            return; // Stop processing this URL
          }
        }

        // 2. Handle Implicit Flow (Tokens in Hash)
        if (url.includes("access_token") || url.includes("refresh_token")) {
          const fragment = url.split('#')[1];
          if (!fragment) continue;

          const params = new URLSearchParams(fragment);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            }).then(async ({ data, error }) => {
              if (!error && data.session) {
                console.log("Session set successfully via Deep Link");
                fetchProfile(data.session.user.id);
                fetchMyList();
                setAuthModalOpen(false);

                // Use Rust command to force focus (works on macOS spaces)
                invoke('force_focus');

                showToast("Verified & Logged In! Welcome back. You may close the browser tab now :)", "success");
              } else {
                console.error("Failed to set session:", error);
                showToast("Failed to verify session.", "error");
              }
            });
          }
        }
      }
    };

    const setupDeepLink = async () => {
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
    };

    setupDeepLink();
  }, []);


  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
  }


  // --- 1. SEARCH LOGIC ---
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 3) {
        setLoading(true);
        try {
          const data = await searchAnime(query);
          setResults(data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  // --- 2. FETCH MY LIST LOGIC ---
  async function fetchMyList() {
    if (!session?.user) {
      setMyList([]);
      return;
    }

    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching list:", error);
    else setMyList(data || []);
  }

  // Refresh list whenever we switch to the "My List" tab
  useEffect(() => {
    if (view === "list") {
      fetchMyList();
    }
  }, [view]);

  // --- 3. SAVE LOGIC ---
  async function addToWatchlist(anime: Anime) {
    // Check for duplicates
    const { data: existing } = await supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('mal_id', anime.mal_id)
      .maybeSingle();

    if (existing) {
      showToast("You already added this show! 😅", "info");
      return;
    }

    const { error } = await supabase.from('watchlist').insert({
      user_id: session.user.id,
      mal_id: anime.mal_id,
      title: anime.title,
      image_url: anime.images.jpg.large_image_url,
      score: anime.score,
      total_episodes: anime.episodes || 0
    });

    if (error) {
      console.error("Save Error:", error);
      showToast(`Failed to save: ${error.message}`, "error");
    } else {
      showToast(`Added ${anime.title} to your list! ✅`, "success");
      setQuery("");
    }
  }

  // --- RENDER ---
  return (
    <div className="min-h-screen text-white font-sans selection:bg-blue-500 selection:text-white p-8 overflow-hidden relative">
      <MouseAura />
      <div className="max-w-6xl mx-auto relative z-10">

        {/* TOAST NOTIFICATIONS */}
        <Toast
          message={toast?.message || null}
          type={toast?.type}
          onClose={() => setToast(null)}
        />

        <AuthModal
          supabase={supabase}
          isOpen={isAuthModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />

        {/* HEADER & TABS */}
        <header className="mb-8 flex items-center justify-between relative z-10">
          {/* Left: Logo */}
          <div className="w-1/3 text-left">
            <img
              src="/logo.png"
              alt="AShow Tracker"
              className="h-24 object-contain cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setView('search')}
            />
          </div>

          {/* Center: Tabs */}
          <div className="flex justify-center gap-1 bg-gray-900/80 p-1 rounded-full border border-gray-800 backdrop-blur-md">
            <button
              onClick={() => setView("search")}
              className={`cursor-pointer px-6 py-1.5 rounded-full text-sm font-medium transition-all ${view === "search" ? "bg-gray-800 text-white shadow-sm border border-gray-700" : "text-gray-400 hover:text-white"
                }`}
            >
              Search
            </button>
            <button
              onClick={() => setView("list")}
              className={`cursor-pointer px-6 py-1.5 rounded-full text-sm font-medium transition-all ${view === "list" ? "bg-gray-800 text-white shadow-sm border border-gray-700" : "text-gray-400 hover:text-white"
                }`}
            >
              My List
            </button>
          </div>

          {/* Right: User Menu */}
          <div className="w-1/3 flex justify-end">
            {session ? (
              <UserMenu
                session={session}
                profile={profile}
                onLogout={() => supabase.auth.signOut()}
                onOpenProfile={() => {
                  console.log("Opening Profile");
                  setView("profile");
                }}
              />
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="btn-animated btn-glow bg-white hover:bg-gray-100 text-black px-8 py-2 rounded-full font-bold text-sm transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* VIEW 1: SEARCH */}
        {view === "search" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="relative max-w-xl mx-auto mb-12">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search anime..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-full py-4 pl-12 pr-6 text-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-xl"
              />
              {loading && (
                <div className="absolute inset-y-0 right-4 flex items-center">
                  <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                </div>
              )}
            </div>

            <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <AnimatePresence>
                {results.map((anime) => (
                  <AnimeCard key={anime.mal_id} anime={anime} onClick={(item) => addToWatchlist(item)} />
                ))}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}

        {/* VIEW 2: MY LIST */}
        {view === "list" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {myList.map((item) => (
              <div
                key={item.id}
                className="anime-card relative bg-gray-900 rounded-xl overflow-hidden shadow-lg hover:scale-105 transition-transform duration-300 group"
              >
                {/* Background Image */}
                <div className="aspect-[2/3] w-full">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="h-full w-full object-cover transition-all duration-300 group-hover:brightness-50"
                  />
                </div>

                {/* Card Content Overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-4">
                  {/* Title & Stats */}
                  <div className="mb-3">
                    <h3 className="font-bold text-white text-lg leading-tight mb-1 drop-shadow-md line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-blue-400 font-bold">
                        EP {item.watched_episodes} / {item.total_episodes || "?"}
                      </span>
                      <span className="text-gray-400 uppercase tracking-wider">{item.status}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-gray-700/50 rounded-full overflow-hidden mb-4 backdrop-blur-sm">
                    <div
                      className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-500 ease-out"
                      style={{ width: `${Math.min(100, (item.watched_episodes / (item.total_episodes || 1)) * 100)}%` }}
                    />
                  </div>

                  {/* ACTION BUTTONS (Always visible but dimmed) */}
                  <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity duration-200">

                    {/* 1. INCREMENT BUTTON */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevents clicking the card background
                        const newCount = item.watched_episodes + 1;

                        // Optimistic UI Update
                        setMyList(prev => prev.map(show => show.id === item.id ? { ...show, watched_episodes: newCount } : show));

                        // DB Update
                        supabase.from('watchlist').update({ watched_episodes: newCount }).eq('id', item.id).then();
                      }}
                      className="flex-1 bg-white hover:bg-blue-50 text-black font-bold py-2 rounded-lg active:scale-95 transition-all shadow-lg flex items-center justify-center gap-1"
                    >
                      <span>+1 Ep</span>
                    </button>

                    {/* 2. DELETE BUTTON (Debug Version) */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        console.log("🗑 Clicked delete for:", item.title, "ID:", item.id);

                        // 1. Optimistic UI Update (Remove immediately)
                        setMyList(prev => prev.filter(show => show.id !== item.id));

                        // 2. DB Update
                        const { error } = await supabase
                          .from('watchlist')
                          .delete()
                          .eq('id', item.id);

                        if (error) {
                          console.error("❌ Delete failed:", error);
                          showToast("Error deleting: " + error.message, "error");
                          // Optional: Refresh list to bring it back if delete failed
                          fetchMyList();
                        } else {
                          console.log("✅ Deleted from DB successfully");
                        }
                      }}
                      className="p-2 bg-gray-800/80 text-gray-400 hover:text-red-500 hover:bg-red-500/20 rounded-lg backdrop-blur-md transition-all border border-gray-700 hover:border-red-500/50 cursor-pointer"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {myList.length === 0 && (
              <div className="col-span-full text-center mt-20">
                <p className="text-gray-500 text-xl">Your list is empty.</p>
                <button onClick={() => setView("search")} className="text-blue-400 mt-2 hover:underline">
                  Go search for something!
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 3: PROFILE */}
        {view === "profile" && (
          <ProfilePage
            session={session}
            profile={profile}
            supabase={supabase}
            onProfileUpdate={() => fetchProfile(session.user.id)}
          />
        )}

      </div>
    </div>
  );
}

export default App;
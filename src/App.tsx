import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { listen } from "@tauri-apps/api/event";
import { searchAnime, type Anime } from "./api/jikan";
import { AnimeCard } from "./components/AnimeCard";
import { ShowDetailModal } from "./components/ShowDetailModal";
import { MyListDetailModal } from "./components/MyListDetailModal";
import { AuthModal } from "./components/AuthModal";
import { UserMenu } from "./components/UserMenu";
import { Toast, type ToastType } from "./components/Toast";
import { MouseAura } from "./components/MouseAura";
import { ProfilePage } from "./components/ProfilePage";
import { SettingsPage } from "./components/SettingsPage";
import { SettingsProvider } from "./context/SettingsContext";
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
  const [view, setView] = useState<"search" | "list" | "profile" | "settings">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Anime[]>([]);
  const [myList, setMyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [selectedMyListItem, setSelectedMyListItem] = useState<any | null>(null);

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
      showToast(`Failed to save: ${error.message} `, "error");
    } else {
      showToast(`Added ${anime.title} to your list! ✅`, "success");
      setQuery("");
    }
  }

  // --- RENDER ---
  return (
    <SettingsProvider session={session}>
      <div className="min-h-screen font-sans selection:bg-blue-500 selection:text-white p-8 overflow-hidden relative bg-[#e8f0fe] dark:bg-[#070d1c] text-slate-900 dark:text-white transition-colors duration-300">
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

          <ShowDetailModal
            anime={selectedAnime}
            isOpen={selectedAnime !== null}
            onClose={() => setSelectedAnime(null)}
            onAddToList={(anime) => {
              addToWatchlist(anime);
              setSelectedAnime(null);
            }}
            isLoggedIn={!!session}
          />

          <MyListDetailModal
            item={selectedMyListItem}
            isOpen={selectedMyListItem !== null}
            onClose={() => setSelectedMyListItem(null)}
            onRemove={async (item) => {
              // Delete watched episodes first
              await supabase.from('watched_episodes').delete().eq('watchlist_id', item.id);
              // Delete from watchlist
              await supabase.from('watchlist').delete().eq('id', item.id);
              // Update local state
              setMyList(prev => prev.filter(show => show.id !== item.id));
              showToast(`${item.title} removed from your list`, 'success');
            }}
            onEpisodeUpdate={(itemId, watchedCount) => {
              setMyList(prev => prev.map(show =>
                show.id === itemId ? { ...show, watched_episodes: watchedCount } : show
              ));
            }}
            onTotalEpisodesUpdate={(itemId, totalEpisodes) => {
              setMyList(prev => prev.map(show =>
                show.id === itemId ? { ...show, total_episodes: totalEpisodes } : show
              ));
            }}
            onStatusUpdate={(itemId, status) => {
              setMyList(prev => prev.map(show =>
                show.id === itemId ? { ...show, status } : show
              ));
            }}
            supabase={supabase}
            userId={session?.user?.id || null}
          />

          {/* HEADER & TABS */}
          <header className="mb-8 flex items-center justify-between relative z-10">
            {/* Left: Logo */}
            <div className="w-1/3 text-left">
              {/* Light mode logo (dark text) */}
              <img
                src="/ast-logo-dark.png"
                alt="AShow Tracker"
                className="h-24 object-contain cursor-pointer hover:opacity-90 transition-opacity dark:hidden"
                onClick={() => setView('search')}
              />
              {/* Dark mode logo (light text) */}
              <img
                src="/logo.png"
                alt="AShow Tracker"
                className="h-24 object-contain cursor-pointer hover:opacity-90 transition-opacity hidden dark:block"
                onClick={() => setView('search')}
              />
            </div>

            {/* Center: View Toggle */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-100 dark:bg-slate-900/50 backdrop-blur-md p-1.5 rounded-full flex items-center shadow-inner border border-white/5">

              {/* Animated Background Pill */}
              <div className="absolute inset-0 p-1.5">
                <motion.div
                  className="h-full w-1/2 bg-white dark:bg-gray-800 rounded-full shadow-md"
                  initial={false}
                  animate={{
                    x: view === "search" ? "0%" : "100%"
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              </div>

              <button
                onClick={() => setView("search")}
                className={`relative cursor-pointer px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 z-10 ${view === "search"
                  ? "text-slate-900 dark:text-white"
                  : "text-gray-500 hover:text-slate-700 dark:hover:text-gray-300"
                  }`}
              >
                Search
              </button>
              <button
                onClick={() => setView("list")}
                className={`relative cursor-pointer px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 z-10 ${view === "list"
                  ? "text-slate-900 dark:text-white"
                  : "text-gray-500 hover:text-slate-700 dark:hover:text-gray-300"
                  }`}
              >
                My List
              </button>
            </div>

            {/* Right: User Menu */}
            <div className="w-1/3 flex justify-end items-center gap-4">
              {/* Settings Button Moved to UserMenu */}

              {session ? (
                <UserMenu
                  session={session}
                  profile={profile}
                  onLogout={() => supabase.auth.signOut()}
                  onOpenProfile={() => setView("profile")}
                  onOpenSettings={() => setView("settings")}
                />
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="btn-animated btn-glow bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-gray-100 text-white dark:text-black px-8 py-2 rounded-full font-bold text-sm transition-all shadow-lg"
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
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full py-4 pl-12 pr-6 text-lg text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-xl"
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
                    <AnimeCard key={anime.mal_id} anime={anime} onClick={(item) => setSelectedAnime(item)} />
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
                  onClick={() => setSelectedMyListItem(item)}
                  className="anime-card relative bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-lg hover:scale-105 transition-transform duration-300 group border border-gray-100 dark:border-gray-800 cursor-pointer"
                >
                  {/* Background Image */}
                  <div className="aspect-[2/3] w-full">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="h-full w-full object-cover transition-all duration-300 group-hover:brightness-75"
                    />
                  </div>

                  {/* Card Content Overlay - with gradient for text visibility */}
                  <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/90 via-black/20 to-transparent">
                    {/* Status Badge - Top Right Corner */}
                    <div className="p-3 flex justify-end">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm ${item.status === "WATCHING" ? "bg-green-500/30 text-green-300 border border-green-500/40" :
                          item.status === "FINISHED" ? "bg-blue-500/30 text-blue-300 border border-blue-500/40" :
                            item.status === "ON_HOLD" ? "bg-orange-500/30 text-orange-300 border border-orange-500/40" :
                              item.status === "PLANNED" ? "bg-yellow-500/30 text-yellow-300 border border-yellow-500/40" :
                                "bg-gray-500/30 text-gray-300 border border-gray-500/40"
                        }`}>
                        {item.status === "ON_HOLD" ? "On Hold" :
                          item.status === "PLANNED" ? "Planned" :
                            item.status === "WATCHING" ? "Watching" :
                              item.status === "FINISHED" ? "Finished" :
                                item.status}
                      </span>
                    </div>

                    {/* Bottom Info */}
                    <div className="p-4">
                      {/* Title & Stats */}
                      <div className="mb-3">
                        <h3 className="font-bold text-white text-lg leading-tight mb-1 drop-shadow-lg line-clamp-2">
                          {item.title}
                        </h3>
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="text-blue-400 font-bold drop-shadow-sm">
                            EP {item.watched_episodes} / {item.total_episodes || "?"}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-1.5 w-full bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                        <div
                          className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-500 ease-out"
                          style={{ width: `${Math.min(100, (item.watched_episodes / (item.total_episodes || 1)) * 100)}%` }}
                        />
                      </div>
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

          {/* VIEW 3: PROFILE -> Redirects to Settings/Profile now in a robust app, but keeping separately for now if needed.
              Actually, let's keep it but perhaps deprecate it in favor of Settings -> Profile.
              For now keeping existing view.
          */}
          {view === "profile" && (
            <ProfilePage
              session={session}
              profile={profile}
            />
          )}

          {/* VIEW 4: SETTINGS */}
          {view === "settings" && (
            <SettingsPage
              session={session}
              profile={profile}
              supabase={supabase}
              onProfileUpdate={() => fetchProfile(session.user.id)}
              showToast={showToast}
            />
          )}

        </div>
      </div>
    </SettingsProvider>
  );
}

export default App;
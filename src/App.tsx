import { useState, useEffect, useRef } from "react";
import { Search, Loader2, ChevronLeft, ChevronRight, ChevronDown, Edit2, Film, Tv, Sparkles, Folder, Gamepad2, Book, Music, Star, Heart, Flame, Zap, Moon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { listen } from "@tauri-apps/api/event";
import { searchAnime } from "./api/jikan";
import { searchMovies, searchTVShows } from "./api/tmdb";
import { type MediaItem, animeToMediaItem, movieToMediaItem, tvToMediaItem } from "./api/mediaTypes";
import { MediaCard } from "./components/MediaCard";
import { ShowDetailModal } from "./components/ShowDetailModal";
import { MyListDetailModal } from "./components/MyListDetailModal";
import { AuthModal } from "./components/AuthModal";
import { UserMenu } from "./components/UserMenu";
import { Toast, type ToastType } from "./components/Toast";
import { MouseAura } from "./components/MouseAura";
import { ProfilePage } from "./components/ProfilePage";
import { SettingsPage } from "./components/SettingsPage";
import { SettingsProvider } from "./context/SettingsContext";
import { ListManageModal, type UserList } from "./components/ListManageModal";
import { ListPickerModal } from "./components/ListPickerModal";
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
  const [results, setResults] = useState<MediaItem[]>([]);
  const [myList, setMyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [selectedMyListItem, setSelectedMyListItem] = useState<any | null>(null);

  // List management state
  const [userLists, setUserLists] = useState<UserList[]>([]);
  const [isListManageModalOpen, setListManageModalOpen] = useState(false);
  const [isListPickerOpen, setListPickerOpen] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<MediaItem | null>(null);

  // My List filters (multi-select)
  const [mediaTypeFilters, setMediaTypeFilters] = useState<Set<string>>(new Set());
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Search filters
  const [searchMediaTypeFilter, setSearchMediaTypeFilter] = useState<Set<string>>(new Set());

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type });
  };

  // Icon helper for lists
  const getListIcon = (iconName: string | null, size: number = 18) => {
    const icons: Record<string, React.ReactNode> = {
      folder: <Folder size={size} />,
      film: <Film size={size} />,
      tv: <Tv size={size} />,
      sparkles: <Sparkles size={size} />,
      gamepad: <Gamepad2 size={size} />,
      book: <Book size={size} />,
      music: <Music size={size} />,
      star: <Star size={size} />,
      heart: <Heart size={size} />,
      flame: <Flame size={size} />,
      zap: <Zap size={size} />,
      moon: <Moon size={size} />,
    };
    return icons[iconName || 'folder'] || <Folder size={size} />;
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        fetchMyList(session.user.id); // Pass user ID to avoid stale closure
      } else if (event === 'SIGNED_OUT') {
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


  // --- 1. SEARCH LOGIC (Unified: Anime + Movies + TV) ---
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 3) {
        setLoading(true);
        try {
          // Read adult content setting from localStorage
          const savedSettings = localStorage.getItem('app_settings');
          const adultContent = savedSettings ? JSON.parse(savedSettings).adultContent ?? false : false;

          // Search all three sources in parallel
          // For anime
          // For movies/tv
          const [animeData, movieData, tvData] = await Promise.all([
            searchAnime(query, !adultContent),
            searchMovies(query, adultContent),
            searchTVShows(query, adultContent),
          ]);

          // Convert to unified MediaItem format
          const animeItems = animeData.map(animeToMediaItem);
          const movieItems = movieData.map(movieToMediaItem);
          const tvItems = tvData.map(tvToMediaItem);

          // Combine and sort by score (highest first)
          const combined = [...animeItems, ...movieItems, ...tvItems]
            .filter(item => item.imageUrl) // Filter out items without images
            .sort((a, b) => (b.score || 0) - (a.score || 0));

          setResults(combined);
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
  async function fetchMyList(userId?: string) {
    // Use passed userId or fall back to session (for calls from UI)
    const uid = userId ?? session?.user?.id;
    if (!uid) {
      setMyList([]);
      return;
    }

    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching list:", error);
    else setMyList(data || []);
  }

  // Fetch user's custom lists
  async function fetchUserLists() {
    if (!session?.user) {
      setUserLists([]);
      return;
    }

    const { data, error } = await supabase
      .from('lists')
      .select('*')
      .eq('user_id', session.user.id)
      .order('position', { ascending: true });

    if (error) console.error("Error fetching lists:", error);
    else setUserLists(data || []);
  }

  // Refresh list whenever we switch to the "My List" tab
  useEffect(() => {
    if (view === "list") {
      fetchMyList();
      fetchUserLists();
    }
  }, [view]);

  // Fetch lists when session changes
  useEffect(() => {
    if (session?.user) {
      fetchUserLists();
    }
  }, [session]);

  // --- 3. SAVE LOGIC ---
  async function addToWatchlist(media: MediaItem, listId: number | null = null) {
    // Check for duplicates based on media type and source ID
    let existing;
    if (media.type === 'anime') {
      // For anime, check by mal_id
      const { data } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('mal_id', media.sourceId)
        .maybeSingle();
      existing = data;
    } else {
      // For movies/TV, check by tmdb_id
      const { data } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('tmdb_id', media.sourceId)
        .maybeSingle();
      existing = data;
    }

    if (existing) {
      showToast("You already added this to your list! 😅", "info");
      return;
    }

    const insertData: any = {
      user_id: session.user.id,
      title: media.title,
      image_url: media.largeImageUrl,
      score: media.score,
      total_episodes: media.episodes || (media.type === 'movie' ? 1 : 0),
      media_type: media.type,
      list_id: listId,
    };

    // Set the appropriate ID field
    if (media.type === 'anime') {
      insertData.mal_id = media.sourceId;
    } else {
      insertData.tmdb_id = media.sourceId;
    }

    const { error } = await supabase.from('watchlist').insert(insertData);

    if (error) {
      console.error("Save Error:", error);
      showToast(`Failed to save: ${error.message}`, "error");
    } else {
      const list = userLists.find(l => l.id === listId);
      const listName = list ? ` to ${list.name}` : '';
      const emoji = media.type === 'movie' ? '🎬' : media.type === 'tv' ? '📺' : '✅';
      showToast(`Added ${media.title}${listName}! ${emoji}`, "success");
      setQuery("");
    }
  }

  // Handler for add button in ShowDetailModal - opens list picker
  const handleAddToListClick = (media: MediaItem) => {
    if (userLists.length > 0) {
      setPendingMedia(media);
      setListPickerOpen(true);
    } else {
      // No lists, just add without list
      addToWatchlist(media, null);
    }
    setSelectedMedia(null);
  };

  // Handle list selection from picker
  const handleListSelected = (list: UserList | null) => {
    if (pendingMedia) {
      addToWatchlist(pendingMedia, list?.id || null);
      setPendingMedia(null);
    }
    setListPickerOpen(false);
  };

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

          {/* List Picker Modal */}
          <ListPickerModal
            isOpen={isListPickerOpen}
            onClose={() => { setListPickerOpen(false); setPendingMedia(null); }}
            lists={userLists}
            onSelectList={handleListSelected}
            mediaTitle={pendingMedia?.title || ""}
          />

          {/* List Management Modal */}
          <ListManageModal
            isOpen={isListManageModalOpen}
            onClose={() => setListManageModalOpen(false)}
            lists={userLists}
            onListsChange={setUserLists}
            supabase={supabase}
            userId={session?.user?.id || ""}
          />

          <ShowDetailModal
            media={selectedMedia}
            isOpen={selectedMedia !== null}
            onClose={() => setSelectedMedia(null)}
            onAddToList={handleAddToListClick}
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
            onListChange={(itemId, listId) => {
              setMyList(prev => prev.map(show =>
                show.id === itemId ? { ...show, list_id: listId } : show
              ));
            }}
            userLists={userLists}
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
              <div className="relative max-w-xl mx-auto mb-6">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="text"
                  placeholder="Search anime, movies, or TV shows..."
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

              {/* Search Filters */}
              <div className="flex justify-center gap-2 mb-8">
                <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
                  {[
                    { value: 'anime', label: 'Animes', icon: <Sparkles size={12} />, color: 'purple' },
                    { value: 'movie', label: 'Movies', icon: <Film size={12} />, color: 'red' },
                    { value: 'tv', label: 'Series', icon: <Tv size={12} />, color: 'green' },
                  ].map(type => {
                    const isActive = searchMediaTypeFilter.has(type.value);
                    return (
                      <button
                        key={type.value}
                        onClick={() => {
                          const newFilters = new Set(searchMediaTypeFilter);
                          if (isActive) {
                            newFilters.delete(type.value);
                          } else {
                            newFilters.add(type.value);
                          }
                          setSearchMediaTypeFilter(newFilters);
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${isActive
                          ? `bg-${type.color}-500 text-white`
                          : 'text-gray-400 hover:text-white'
                          }`}
                      >
                        {type.icon} {type.label}
                      </button>
                    );
                  })}
                </div>

                {searchMediaTypeFilter.size > 0 && (
                  <button
                    onClick={() => setSearchMediaTypeFilter(new Set())}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <X size={12} /> Clear
                  </button>
                )}
              </div>

              <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <AnimatePresence>
                  {results
                    .filter(media => {
                      if (searchMediaTypeFilter.size === 0) return true;
                      return searchMediaTypeFilter.has(media.type);
                    })
                    .map((media) => (
                      <MediaCard key={media.id} media={media} onClick={(m) => setSelectedMedia(m)} />
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
              className="space-y-8"
            >
              {/* Filter Bar */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Media Type Filters (toggle multiple) */}
                <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
                  {[
                    { value: 'anime', label: 'Anime', icon: <Sparkles size={12} />, color: 'purple' },
                    { value: 'movie', label: 'Movies', icon: <Film size={12} />, color: 'red' },
                    { value: 'tv', label: 'Series', icon: <Tv size={12} />, color: 'green' },
                  ].map(type => {
                    const isActive = mediaTypeFilters.has(type.value);
                    return (
                      <button
                        key={type.value}
                        onClick={() => {
                          const newFilters = new Set(mediaTypeFilters);
                          if (isActive) {
                            newFilters.delete(type.value);
                          } else {
                            newFilters.add(type.value);
                          }
                          setMediaTypeFilters(newFilters);
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${isActive
                          ? `bg-${type.color}-500 text-white`
                          : 'text-gray-400 hover:text-white'
                          }`}
                      >
                        {type.icon} {type.label}
                      </button>
                    );
                  })}
                </div>

                {/* Status Filters (toggle multiple) */}
                <div className="relative" ref={statusDropdownRef}>
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {statusFilters.size === 0
                      ? 'All Statuses'
                      : statusFilters.size === 1
                        ? Array.from(statusFilters)[0].split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
                        : `${statusFilters.size} statuses`}
                    <ChevronDown size={12} className={`transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showStatusDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden min-w-[160px]"
                      >
                        {/* Clear All button */}
                        <button
                          onClick={() => {
                            setStatusFilters(new Set());
                            setShowStatusDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-xs font-medium cursor-pointer transition-colors ${statusFilters.size === 0
                            ? 'bg-blue-500/20 text-white'
                            : 'text-gray-300 hover:bg-gray-700'
                            }`}
                        >
                          All Statuses
                        </button>

                        {[
                          { value: 'WATCHING', label: 'Watching' },
                          { value: 'PLANNED', label: 'Planned' },
                          { value: 'FINISHED', label: 'Finished' },
                          { value: 'ON_HOLD', label: 'On Hold' },
                          { value: 'REWATCHING', label: 'Re-watching' },
                          { value: 'REWATCHED', label: 'Re-watched' },
                        ].map(option => {
                          const isActive = statusFilters.has(option.value);
                          return (
                            <button
                              key={option.value}
                              onClick={() => {
                                const newFilters = new Set(statusFilters);
                                if (isActive) {
                                  newFilters.delete(option.value);
                                } else {
                                  newFilters.add(option.value);
                                }
                                setStatusFilters(newFilters);
                              }}
                              className={`w-full px-3 py-2 text-left text-xs font-medium cursor-pointer transition-colors flex items-center gap-2 ${isActive
                                ? 'bg-blue-500/20 text-white'
                                : 'text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                              <div className={`w-3 h-3 rounded border ${isActive ? 'bg-blue-500 border-blue-500' : 'border-gray-500'}`}>
                                {isActive && <span className="text-white text-[8px] flex items-center justify-center">✓</span>}
                              </div>
                              {option.label}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Clear Filters Button (shows when filters active) */}
                {(mediaTypeFilters.size > 0 || statusFilters.size > 0) && (
                  <button
                    onClick={() => {
                      setMediaTypeFilters(new Set());
                      setStatusFilters(new Set());
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <X size={12} /> Clear Filters
                  </button>
                )}

                {/* Edit Lists Button */}
                <button
                  onClick={() => setListManageModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
                >
                  <Edit2 size={12} /> Edit Lists
                </button>
              </div>



              {/* List Rows */}
              {userLists
                .sort((a, b) => a.position - b.position)
                .map(list => {
                  // Filter items for this list
                  const listItems = myList.filter(item => {
                    if (item.list_id !== list.id) return false;
                    if (mediaTypeFilters.size > 0 && !mediaTypeFilters.has(item.media_type)) return false;
                    if (statusFilters.size > 0 && !statusFilters.has(item.status)) return false;
                    return true;
                  });

                  if (listItems.length === 0) return null;

                  return (
                    <div key={list.id} className="space-y-3">
                      {/* List Header */}
                      <div className="flex items-center gap-2">
                        <span className={`text-${list.color}-400`}>{getListIcon(list.icon, 20)}</span>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{list.name}</h2>
                        <span className="text-gray-500 text-sm">({listItems.length})</span>
                      </div>

                      {/* Horizontal Scroll Row */}
                      <div className="relative group">
                        <div
                          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
                          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                          {listItems.map(item => (
                            <div
                              key={item.id}
                              onClick={() => setSelectedMyListItem(item)}
                              className="flex-shrink-0 w-36 cursor-pointer group/card"
                            >
                              <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform duration-300">
                                <img
                                  src={item.image_url}
                                  alt={item.title}
                                  className="h-full w-full object-cover"
                                />
                                {/* Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity">
                                  <div className="absolute bottom-0 left-0 right-0 p-2">
                                    <p className="text-xs font-medium line-clamp-2" style={{ color: 'white' }}>{item.title}</p>
                                    <p className="text-blue-400 text-[10px] font-mono">EP {item.watched_episodes}/{item.total_episodes || '?'}</p>
                                  </div>
                                </div>
                                {/* Progress bar */}
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900/80">
                                  <div
                                    className="h-full bg-blue-500"
                                    style={{ width: `${Math.min(100, (item.watched_episodes / (item.total_episodes || 1)) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Scroll buttons */}
                        <button
                          onClick={(e) => {
                            const container = (e.target as HTMLElement).parentElement?.querySelector('.overflow-x-auto');
                            container?.scrollBy({ left: -300, behavior: 'smooth' });
                          }}
                          className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-black/70 rounded-full flex items-center justify-center text-gray-800 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-gray-100 dark:hover:bg-black shadow-lg"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            const container = (e.target as HTMLElement).parentElement?.querySelector('.overflow-x-auto');
                            container?.scrollBy({ left: 300, behavior: 'smooth' });
                          }}
                          className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-black/70 rounded-full flex items-center justify-center text-gray-800 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-gray-100 dark:hover:bg-black shadow-lg"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}

              {/* Uncategorized Items */}
              {(() => {
                const uncategorizedItems = myList.filter(item => {
                  if (item.list_id !== null) return false;
                  if (mediaTypeFilters.size > 0 && !mediaTypeFilters.has(item.media_type)) return false;
                  if (statusFilters.size > 0 && !statusFilters.has(item.status)) return false;
                  return true;
                });

                if (uncategorizedItems.length === 0) return null;

                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 dark:text-gray-400"><Folder size={20} /></span>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Uncategorized</h2>
                      <span className="text-gray-500 text-sm">({uncategorizedItems.length})</span>
                    </div>
                    <div className="relative group">
                      <div
                        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        {uncategorizedItems.map(item => (
                          <div
                            key={item.id}
                            onClick={() => setSelectedMyListItem(item)}
                            className="flex-shrink-0 w-36 cursor-pointer group/card"
                          >
                            <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform duration-300">
                              <img
                                src={item.image_url}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                              {/* Always visible overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent">
                                <div className="absolute bottom-0 left-0 right-0 p-2">
                                  <p className="text-xs font-medium line-clamp-2 drop-shadow-lg" style={{ color: 'white' }}>{item.title}</p>
                                  <p className="text-blue-400 text-[10px] font-mono drop-shadow-lg">EP {item.watched_episodes}/{item.total_episodes || '?'}</p>
                                </div>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900/80">
                                <div
                                  className="h-full bg-blue-500"
                                  style={{ width: `${Math.min(100, (item.watched_episodes / (item.total_episodes || 1)) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Empty State */}
              {myList.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-gray-500 text-xl">Your list is empty.</p>
                  <button onClick={() => setView("search")} className="text-blue-400 mt-2 hover:underline cursor-pointer">
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
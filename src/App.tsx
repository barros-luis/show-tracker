import { useState, useEffect } from "react";
import { Search, Loader2, Trash2, List } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { searchAnime, type Anime } from "./api/jikan";
import { AnimeCard } from "./components/AnimeCard";
import "./App.css";


// --- CONFIGURATION ---
const supabase = createClient(
  "https://xbosdjujcvfqujtdamun.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3NkanVqY3ZmcXVqdGRhbXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMzUzNjksImV4cCI6MjA4MDkxMTM2OX0.BrKUQ_VGTfCbNW2dST3LHPz0UUbC9ZNn98mbb5FAVig"
);

function App() {
  // --- STATE ---
  const [view, setView] = useState<"search" | "list">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Anime[]>([]);
  const [myList, setMyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
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
      .eq('mal_id', anime.mal_id)
      .maybeSingle();

    if (existing) {
      alert("You already added this show! 😅");
      return;
    }

    const { error } = await supabase.from('watchlist').insert({
      mal_id: anime.mal_id,
      title: anime.title,
      image_url: anime.images.jpg.large_image_url,
      score: anime.score,
      total_episodes: anime.episodes || 0
    });

    if (error) {
      alert("Failed to save ❌");
    } else {
      alert(`Added ${anime.title} to your list! ✅`);
      setQuery(""); // Clear search bar optionally
    }
  }

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-6xl mx-auto">

        {/* HEADER & TABS */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-6">
            Show Tracker
          </h1>

          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => setView("search")}
              className={`px-6 py-2 rounded-full font-medium transition-all ${view === "search" ? "bg-white text-black shadow-lg scale-105" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
            >
              Search
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-6 py-2 rounded-full font-medium transition-all ${view === "list" ? "bg-white text-black shadow-lg scale-105" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
            >
              My List
            </button>
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
                className="relative group overflow-hidden rounded-xl bg-gray-900 border border-gray-800 shadow-lg transition-all hover:shadow-blue-900/20 hover:scale-[1.02]"
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
                          alert("Error deleting: " + error.message);
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

      </div>
    </div>
  );
}

export default App;
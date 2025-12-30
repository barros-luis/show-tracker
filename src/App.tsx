import { MemoryRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, List } from "lucide-react";

// Pages
import { SearchPage, MyListPage, ProfilePage, SettingsPage } from "./pages";

// Components
import { TitleBar } from "./components/layout/TitleBar";
import { MouseAura } from "./components/common/MouseAura";
import { Toast } from "./components/common/Toast";
import { UpdateBanner } from "./components/common/UpdateBanner";
import { NotificationBell } from "./components/common/NotificationBell";
import { UserMenu } from "./components/user/UserMenu";
import { AuthModal } from "./components/modals/AuthModal";

// Context
import { AuthProvider, useAuthContext } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";

// Styles
import "./App.css";

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    session,
    profile,
    supabase,
    toast,
    showToast,
    hideToast,
    notifications,
    setNotifications,
    updateAvailable,
    handleInstallUpdate,
    isAuthModalOpen,
    setAuthModalOpen,
  } = useAuthContext();

  // Determine active view from route
  const getActiveView = (): "search" | "list" | "profile" | "settings" => {
    if (location.pathname === "/list") return "list";
    if (location.pathname === "/profile") return "profile";
    if (location.pathname === "/settings") return "settings";
    return "search";
  };
  const view = getActiveView();

  const handleLogout = async () => {
    console.log("Logging out...");
    // Clear all supabase auth data from storage
    const keysToRemove = Object.keys(localStorage).filter(key =>
      key.startsWith('sb-') || key.includes('supabase')
    );
    keysToRemove.forEach(key => localStorage.removeItem(key));
    // Also try signOut (fire and forget)
    supabase.auth.signOut().catch(() => { });
    // Reload to clear all state
    window.location.reload();
  };

  return (
    <SettingsProvider session={session}>
      <div className="h-screen flex flex-col">
        {/* Custom Title Bar */}
        <TitleBar />

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto font-sans selection:bg-blue-500 selection:text-white p-8 relative bg-[#e8f0fe] dark:bg-[#070d1c] text-slate-900 dark:text-white transition-colors duration-300">
          <MouseAura />
          <div className="max-w-6xl mx-auto relative z-10">

            {/* Toast Notifications */}
            <Toast
              message={toast?.message || null}
              type={toast?.type}
              onClose={hideToast}
            />

            {/* Update Banner */}
            {updateAvailable && (
              <UpdateBanner
                newVersion={updateAvailable}
                onUpdate={handleInstallUpdate}
                onDismiss={() => {/* Could add dismiss state if needed */ }}
              />
            )}

            {/* Auth Modal */}
            <AuthModal
              supabase={supabase}
              isOpen={isAuthModalOpen}
              onClose={() => setAuthModalOpen(false)}
            />

            {/* Header */}
            <header className="mb-8 flex items-center justify-between relative z-10">
              {/* Left: Logo */}
              <div className="w-1/3 text-left">
                <img
                  src="/ast-logo-dark.png"
                  alt="AShow Tracker"
                  className="h-24 object-contain cursor-pointer hover:opacity-90 transition-opacity dark:hidden"
                  onClick={() => navigate('/')}
                />
                <img
                  src="/logo.png"
                  alt="AShow Tracker"
                  className="h-24 object-contain cursor-pointer hover:opacity-90 transition-opacity hidden dark:block"
                  onClick={() => navigate('/')}
                />
              </div>

              {/* Center: View Toggle */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-100 dark:bg-slate-900/50 backdrop-blur-md p-1.5 rounded-full flex items-center shadow-inner border border-white/5">
                <div className="absolute inset-0 p-1.5">
                  <motion.div
                    className="h-full w-1/2 bg-white dark:bg-gray-800 rounded-full shadow-md"
                    initial={false}
                    animate={{ x: view === "search" ? "0%" : "100%" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                </div>

                <button
                  onClick={() => navigate("/")}
                  className={`relative px-4 py-2 flex items-center gap-2 text-sm font-semibold rounded-full transition-colors cursor-pointer ${view === "search"
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    }`}
                >
                  <Search size={16} /> Search
                </button>
                <button
                  onClick={() => {
                    if (!session) {
                      setAuthModalOpen(true);
                      return;
                    }
                    navigate("/list");
                  }}
                  className={`relative px-4 py-2 flex items-center gap-2 text-sm font-semibold rounded-full transition-colors cursor-pointer ${view === "list"
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    }`}
                >
                  <List size={16} /> My List
                </button>
              </div>

              {/* Right: User Actions */}
              <div className="w-1/3 flex items-center justify-end gap-2">
                {session ? (
                  <>
                    <NotificationBell
                      supabase={supabase}
                      userId={session?.user?.id || null}
                      notifications={notifications}
                      onNotificationsChange={setNotifications}
                    />

                    <UserMenu
                      session={session}
                      profile={profile}
                      onOpenProfile={() => navigate("/profile")}
                      onOpenSettings={() => navigate("/settings")}
                      onLogout={handleLogout}
                    />
                  </>
                ) : (
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="btn-animated btn-glow bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-gray-100 text-white dark:text-black px-8 py-2 rounded-full font-bold text-sm transition-all shadow-lg cursor-pointer"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </header>

            {/* Routes */}
            <Routes>
              <Route path="/" element={<SearchPage />} />
              <Route path="/list" element={<MyListPage />} />
              <Route path="/profile" element={<ProfilePage session={session} profile={profile} />} />
              <Route path="/settings" element={
                <SettingsPage
                  session={session}
                  profile={profile}
                  supabase={supabase}
                  onProfileUpdate={async () => {/* Could add refresh */ }}
                  showToast={showToast}
                />
              } />
            </Routes>

          </div>
        </div>
      </div>
    </SettingsProvider>
  );
}

function App() {
  return (
    <MemoryRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </MemoryRouter>
  );
}

export default App;
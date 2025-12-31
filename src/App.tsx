import { MemoryRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, List } from "lucide-react";
import { useState, useEffect } from "react";

// Pages
import { SearchPage, MyListPage, ProfilePage, SettingsPage } from "./pages";

// Components
import { TitleBar } from "./components/layout/TitleBar";
import { MobileNav } from "./components/layout/MobileNav";
import { MobileHeader } from "./components/layout/MobileHeader";
import { MouseAura } from "./components/common/MouseAura";
import { Toast } from "./components/common/Toast";
import { UpdateBanner } from "./components/common/UpdateBanner";
import { NotificationBell } from "./components/common/NotificationBell";
import { UserMenu } from "./components/user/UserMenu";
import { AuthModal } from "./components/modals/AuthModal";

// Context & Hooks
import { AuthProvider, useAuthContext } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";

// Styles
import "./App.css";

// Synchronous platform detection - computes on first render
function usePlatform() {
  // Compute initial state synchronously to prevent flash of wrong UI
  const getInitialPlatform = () => {
    if (typeof window === 'undefined') return { isMobile: false, isDesktop: true };

    const ua = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|iphone|ipad|ipod/i.test(ua);
    const isMobileWidth = window.innerWidth < 768;
    const isMobile = isMobileUA || isMobileWidth;

    return { isMobile, isDesktop: !isMobile };
  };

  const [info, setInfo] = useState(getInitialPlatform);

  // Handle resize events (for testing in browser dev tools)
  useEffect(() => {
    const handleResize = () => {
      const ua = navigator.userAgent.toLowerCase();
      const isMobileUA = /android|iphone|ipad|ipod/i.test(ua);
      const isMobileWidth = window.innerWidth < 768;
      const isMobile = isMobileUA || isMobileWidth;
      setInfo({ isMobile, isDesktop: !isMobile });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return info;
}


function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, isDesktop } = usePlatform();
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
    const keysToRemove = Object.keys(localStorage).filter(key =>
      key.startsWith('sb-') || key.includes('supabase')
    );
    keysToRemove.forEach(key => localStorage.removeItem(key));
    supabase.auth.signOut().catch(() => { });
    window.location.reload();
  };

  return (
    <SettingsProvider session={session}>
      <div className="h-screen flex flex-col">
        {/* Desktop: Custom Title Bar (Windows only) */}
        {isDesktop && <TitleBar />}

        {/* Mobile: Custom Header */}
        {isMobile && (
          <MobileHeader
            isLoggedIn={!!session}
            profileAvatar={profile?.avatar_url}
            notificationCount={notifications.length}
            onAuthClick={() => setAuthModalOpen(true)}
          />
        )}

        {/* Main Content */}
        <div className={`flex-1 overflow-y-auto font-sans selection:bg-blue-500 selection:text-white ${isMobile ? 'p-4 pb-24' : 'p-8'} relative bg-[#e8f0fe] dark:bg-[#070d1c] text-slate-900 dark:text-white transition-colors duration-300`}>
          {/* Mouse Aura - desktop only for performance */}
          {isDesktop && <MouseAura />}

          <div className={`${isMobile ? 'max-w-full' : 'max-w-6xl'} mx-auto ${isMobile ? '' : 'relative z-10'}`}>

            {/* Toast Notifications */}
            <Toast
              message={toast?.message || null}
              type={toast?.type}
              onClose={hideToast}
            />

            {/* Update Banner - desktop only (mobile uses app stores) */}
            {isDesktop && updateAvailable && (
              <UpdateBanner
                newVersion={updateAvailable}
                onUpdate={handleInstallUpdate}
                onDismiss={() => { }}
              />
            )}

            {/* Auth Modal */}
            <AuthModal
              supabase={supabase}
              isOpen={isAuthModalOpen}
              onClose={() => setAuthModalOpen(false)}
            />

            {/* Desktop Header - hidden on mobile */}
            {isDesktop && (
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
            )}

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
                  onProfileUpdate={async () => { }}
                  showToast={showToast}
                />
              } />
            </Routes>

          </div>
        </div>

        {/* Mobile: Bottom Navigation - Hide if modal is open */}
        {isMobile && !location.search.includes('view=modal') && (
          <MobileNav
            isLoggedIn={!!session}
            onAuthClick={() => setAuthModalOpen(true)}
          />
        )}
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
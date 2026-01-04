import { useState, useRef, useEffect } from "react";
import { User, Settings, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";

interface UserMenuProps {
  session: any;
  profile: any;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}

export function UserMenu({ session, profile, onLogout, onOpenProfile, onOpenSettings }: UserMenuProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu if clicking outside
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = profile?.nickname || session.user.email?.split('@')[0] || "User";
  const avatar = profile?.avatar_url;

  return (
    <div className="relative" ref={menuRef}>
      {/* TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer flex items-center gap-3 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-100 dark:border-white/5 rounded-full pl-5 pr-3 py-2 transition-all shadow-sm dark:shadow-none"
      >
        <span className="text-sm font-medium text-gray-900 dark:text-white max-w-[100px] truncate">{displayName}</span>
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-white">{displayName[0].toUpperCase()}</span>
          )}
        </div>
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10 rounded-xl shadow-md overflow-hidden z-40">
          <div className="p-4 border-b border-gray-100 dark:border-white/5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('user_menu.signed_in_as')}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{session.user.email}</p>
          </div>
          <div className="p-1">
            <button
              onClick={() => { setIsOpen(false); onOpenProfile(); }}
              className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
            >
              <User size={16} /> {t('user_menu.profile')}
            </button>
            <button
              onClick={() => { setIsOpen(false); onOpenSettings(); }}
              className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
            >
              <Settings size={16} /> {t('user_menu.settings')}
            </button>
            <div className="h-px bg-gray-200 dark:bg-white/5 my-1" />
            <button
              onClick={() => { setIsOpen(false); onLogout(); }}
              className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300 rounded-lg transition-colors"
            >
              <LogOut size={16} /> {t('user_menu.sign_out')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

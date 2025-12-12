import { useState, useRef, useEffect } from "react";
import { User, Settings, LogOut } from "lucide-react";

interface UserMenuProps {
  session: any;
  profile: any;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}

export function UserMenu({ session, profile, onLogout, onOpenProfile, onOpenSettings }: UserMenuProps) {
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
        className="cursor-pointer flex items-center gap-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-full pl-5 pr-3 py-2 transition-all"
      >
        <span className="text-sm font-medium text-white max-w-[100px] truncate">{displayName}</span>
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden border border-gray-700">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-white">{displayName[0].toUpperCase()}</span>
          )}
        </div>
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden z-40">
          <div className="p-4 border-b border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Signed in as</p>
            <p className="text-sm font-bold text-white truncate">{session.user.email}</p>
          </div>
          <div className="p-1">
            <button
              onClick={() => { setIsOpen(false); onOpenProfile(); }}
              className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
            >
              <User size={16} /> Profile
            </button>
            <button
              onClick={() => { setIsOpen(false); onOpenSettings(); }}
              className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
            >
              <Settings size={16} /> Settings
            </button>
            <div className="h-px bg-gray-800 my-1" />
            <button
              onClick={onLogout}
              className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
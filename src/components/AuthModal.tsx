import { useState } from "react";
import { X, Mail, Lock, Loader2, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { SupabaseClient } from "@supabase/supabase-js";
import { openUrl } from '@tauri-apps/plugin-opener';

interface AuthModalProps {
  supabase: SupabaseClient;
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ supabase, isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [successMode, setSuccessMode] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  // --- GOOGLE LOGIN LOGIC ---
  async function handleGoogleLogin() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'show-tracker://auth-callback',
          skipBrowserRedirect: true
        },
      });

      if (error) throw error;

      // 3. Open the System Browser (Chrome/Safari)
      if (data.url) {
        await openUrl(data.url);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }
  // --------------------------

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match!");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: email.split('@')[0] } }
        });
        if (error) throw error;
        if (data.user && !data.session) setSuccessMode(true);
        else onClose();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (successMode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 relative shadow-2xl text-center">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
          <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6 text-green-500"><CheckCircle2 size={32} /></div>
          <h2 className="text-2xl font-bold text-white mb-2">Check your inbox!</h2>
          <p className="text-gray-400 mb-8">We sent a confirmation link to <span className="text-white font-medium">{email}</span>.</p>
          <button onClick={() => { setSuccessMode(false); setIsSignUp(false); }} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2">Return to Sign In <ArrowRight size={18} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>

        <h2 className="text-2xl font-bold text-white mb-2">{isSignUp ? "Create Account" : "Welcome Back"}</h2>
        <p className="text-gray-400 mb-6">{isSignUp ? "Join the club." : "Login to sync your list."}</p>

        {/* GOOGLE BUTTON */}
        <button
          onClick={handleGoogleLogin}
          className="btn-animated w-full bg-white text-gray-900 font-bold py-3 rounded-lg transition-all hover:bg-gray-100 flex items-center justify-center gap-3 mb-6 group"
        >
          {/* Google Icon SVG */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Sign in with Google
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-px bg-gray-800 flex-1" />
          <span className="text-xs text-gray-500 font-bold uppercase">Or continue with</span>
          <div className="h-px bg-gray-800 flex-1" />
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-500 text-sm rounded-lg flex items-center gap-2"><AlertCircle size={16} />{error}</div>}

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
              <input type="email" required className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2.5 pl-10 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
              <input type="password" required className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2.5 pl-10 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>

          {isSignUp && (
            <div className="space-y-2 animate-in slide-in-from-top-2 fade-in">
              <label className="text-xs font-bold text-gray-500 uppercase">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
                <input type="password" required className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2.5 pl-10 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
            </div>
          )}

          <button disabled={loading} className="btn-animated w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all mt-4 flex justify-center items-center">
            {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? "Sign Up" : "Sign In")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          <button onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccessMode(false); }} className="text-blue-400 hover:underline font-medium">
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
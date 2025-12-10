import { useState } from "react";
import { X, Mail, Lock, Loader2, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { SupabaseClient } from "@supabase/supabase-js";


interface AuthModalProps {
  supabase: SupabaseClient;
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ supabase, isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [successMode, setSuccessMode] = useState(false); // <--- NEW STATE
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Client-side validation
    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match!");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // SIGN UP
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { full_name: email.split('@')[0] } }
        });
        
        if (error) throw error;

        // If signup worked and requires email confirmation:
        if (data.user && !data.session) {
          setSuccessMode(true); // <--- Switch to Success View
        } else {
          // If email confirmation is disabled in Supabase, just close
          onClose();
        }

      } else {
        // SIGN IN
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

  // --- RENDER SUCCESS VIEW ---
  if (successMode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 relative shadow-2xl text-center">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
            <X size={24} />
          </button>

          <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6 text-green-500">
            <CheckCircle2 size={32} />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">Check your inbox!</h2>
          <p className="text-gray-400 mb-8">
            We sent a confirmation link to <span className="text-white font-medium">{email}</span>.
            <br />Click it to activate your account.
          </p>

          <button 
            onClick={() => {
              setSuccessMode(false);
              setIsSignUp(false); // Switch back to Login mode so they can log in after confirming
            }}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2"
          >
            Return to Sign In <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER NORMAL FORM ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-2">
          {isSignUp ? "Create Account" : "Welcome Back"}
        </h2>
        <p className="text-gray-400 mb-6">
          {isSignUp ? "Join the club." : "Login to sync your list."}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-500 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
              <input 
                type="email" 
                required
                className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2.5 pl-10 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="email@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
              <input 
                type="password" 
                required
                className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2.5 pl-10 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          {isSignUp && (
            <div className="space-y-2 animate-in slide-in-from-top-2 fade-in">
              <label className="text-xs font-bold text-gray-500 uppercase">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
                <input 
                  type="password" 
                  required
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2.5 pl-10 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all mt-4 flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? "Sign Up" : "Sign In")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          <button 
            onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccessMode(false); }}
            className="text-blue-400 hover:underline font-medium"
          >
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
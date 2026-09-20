import React, { useState } from 'react';
import { Logo } from './Logo';
import { 
  X, 
  ShieldCheck, 
  Compass, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  ExternalLink,
  Sparkles,
  AlertCircle,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { triggerHaptic } from '../lib/device';

interface AuthModalProps {
  onClose: () => void;
  onSignInGoogle: () => void;
  onSignInEmail?: (email: string, pass: string) => Promise<void>;
  onSignUpEmail?: (email: string, pass: string, username: string) => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onSignInGoogle,
  onSignInEmail,
  onSignUpEmail,
}) => {
  const [authMode, setAuthMode] = useState<'google' | 'email_login' | 'email_register'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detect iOS and Standalone PWA environment
  const isIos = typeof window !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  const isStandalone = typeof window !== 'undefined' && ((window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches);

  const handleGoogleClick = () => {
    triggerHaptic('medium');
    onSignInGoogle();
    onClose();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setLoading(true);
    triggerHaptic('medium');

    try {
      if (authMode === 'email_login' && onSignInEmail) {
        await onSignInEmail(email.trim(), password);
        triggerHaptic('success');
        onClose();
      } else if (authMode === 'email_register' && onSignUpEmail) {
        if (!username.trim()) {
          setErrorMessage('Please enter a display name or username.');
          setLoading(false);
          return;
        }
        await onSignUpEmail(email.trim(), password, username.trim());
        triggerHaptic('success');
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please try again.');
      triggerHaptic('warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-md animate-fade-in modal-safe-overlay">
      <div className="glass-card border border-white/80 rounded-3xl p-5 sm:p-6 max-w-sm sm:max-w-md w-full text-slate-800 shadow-2xl relative text-center max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-3">
          <Logo size="lg" />
        </div>

        <h2 className="text-xl font-black text-slate-900 leading-tight">Welcome to AddMeUp</h2>
        <p className="text-xs text-slate-500 mt-1 leading-snug font-medium max-w-xs mx-auto">
          Sign in to add handles, earn promotional credits, and grow your audience.
        </p>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl my-4 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => {
              setAuthMode('google');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              authMode === 'google'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'hover:text-slate-900'
            }`}
          >
            Google Login
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('email_login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              authMode === 'email_login' || authMode === 'email_register'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'hover:text-slate-900'
            }`}
          >
            Email & Password
          </button>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold text-left flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Tab 1: Google Sign In + Safari PWA Solution */}
        {authMode === 'google' && (
          <div className="space-y-3">
            
            {/* Primary Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleClick}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2.5 transition-all active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* iOS Standalone PWA Solution Box */}
            {(isStandalone || isIos) && (
              <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl text-left space-y-2 shadow-2xs">
                <div className="flex items-center gap-1.5 text-amber-900 font-black text-[11px]">
                  <Compass className="w-3.5 h-3.5 text-amber-600" />
                  <span>Already logged into Google in Safari?</span>
                </div>

                <p className="text-[10px] text-amber-800 leading-snug font-medium">
                  Apple isolates Home Screen PWAs from Safari cookies. You have two easy 1-tap options:
                </p>

                {/* Direct Safari Browser Link */}
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black rounded-xl text-[11px] flex items-center justify-between shadow-xs transition-transform active:scale-98"
                >
                  <div className="flex items-center gap-1.5">
                    <span>🧭</span>
                    <span>Open in Full Safari Browser</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-950" />
                </a>

                {/* Screenshot Compass Tip */}
                <div className="bg-white/80 p-2 rounded-xl border border-amber-200/70 text-[10px] text-slate-600 leading-tight flex items-start gap-2">
                  <span className="text-sm">💡</span>
                  <span>
                    <strong>Instant Safari Switch:</strong> When you tap <em>Continue with Google</em> above, look at the bottom-right corner of the popup window and tap the <strong>Compass icon (🧭)</strong> to load your saved Safari Google accounts!
                  </span>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-400 font-medium">
              Or use <button type="button" onClick={() => setAuthMode('email_login')} className="text-orange-600 font-bold hover:underline">Email & Password</button> for instant Keychain autofill
            </p>
          </div>
        )}

        {/* Tab 2: Email & Password (Autofill with iOS Keychain) */}
        {(authMode === 'email_login' || authMode === 'email_register') && (
          <form onSubmit={handleEmailSubmit} className="space-y-3 text-left">
            
            {authMode === 'email_register' && (
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  Display Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your Name or Nickname"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-black text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-black text-slate-700">
                  Password
                </label>
                {authMode === 'email_register' && (
                  <span className="text-[9px] text-slate-400">Min. 6 chars</span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={authMode === 'email_register' ? 'new-password' : 'current-password'}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 mt-1"
            >
              {loading ? (
                <span>Please wait...</span>
              ) : authMode === 'email_login' ? (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Create Account & Claim +20 Credits</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                </>
              )}
            </button>

            {/* Toggle Login / Register */}
            <div className="pt-2 text-center">
              {authMode === 'email_login' ? (
                <p className="text-[11px] text-slate-500 font-medium">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('email_register');
                      setErrorMessage(null);
                    }}
                    className="text-orange-600 font-black hover:underline"
                  >
                    Register free (+20 Cr)
                  </button>
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 font-medium">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('email_login');
                      setErrorMessage(null);
                    }}
                    className="text-orange-600 font-black hover:underline"
                  >
                    Log in here
                  </button>
                </p>
              )}
            </div>
          </form>
        )}

        {/* Footer Guarantee */}
        <div className="pt-3 mt-3 border-t border-slate-200/60 text-[10px] text-slate-500 font-medium flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted Authentication • Your data is protected</span>
        </div>

      </div>
    </div>
  );
};

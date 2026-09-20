import React, { useState } from 'react';
import { Logo } from './Logo';
import { 
  X, 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Sparkles,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { triggerHaptic } from '../lib/device';

interface AuthModalProps {
  onClose: () => void;
  onSignInGoogle: () => Promise<any> | void;
  onSignInEmail?: (email: string, pass: string) => Promise<void>;
  onSignUpEmail?: (email: string, pass: string, username: string) => Promise<void>;
  onSendPasswordReset?: (email: string) => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onSignInGoogle,
  onSignInEmail,
  onSignUpEmail,
  onSendPasswordReset,
}) => {
  const [authMode, setAuthMode] = useState<'google' | 'email_login' | 'email_register' | 'forgot_password'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetSentSuccess, setResetSentSuccess] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);

  const isGoogleEmail = email.trim().toLowerCase().endsWith('@gmail.com') || email.trim().toLowerCase().endsWith('@googlemail.com');

  const handleGoogleClick = async () => {
    triggerHaptic('medium');
    setErrorMessage(null);
    setPopupBlocked(false);
    setGoogleLoading(true);

    try {
      await onSignInGoogle();
      triggerHaptic('success');
      onClose();
    } catch (err: any) {
      console.warn("Google sign-in attempt notice:", err);
      const errMsg = err?.message || '';
      const isBlocked = errMsg.includes('popup-blocked') || 
                        err?.code === 'auth/popup-blocked' || 
                        errMsg.includes('cancelled-popup-request') ||
                        errMsg.includes('redirect');

      if (isBlocked) {
        setPopupBlocked(true);
        setErrorMessage("Browser or preview iframe blocked the Google login popup. Please click 'Open in New Tab' below to sign in, or set a password to use Email & Password.");
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(errMsg || "Google sign-in could not complete. You can also use Email & Password below.");
      }
      triggerHaptic('warning');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
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

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address to receive the password link.');
      return;
    }

    setLoading(true);
    triggerHaptic('medium');

    try {
      if (onSendPasswordReset) {
        await onSendPasswordReset(email.trim());
      }
      setResetSentSuccess(true);
      triggerHaptic('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not send password setup link. Please verify your email.');
      triggerHaptic('warning');
    } finally {
      setLoading(false);
    }
  };

  const openAppInNewTab = () => {
    try {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn("Could not open new tab:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in modal-safe-overlay">
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
              setResetSentSuccess(false);
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
              setResetSentSuccess(false);
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              authMode === 'email_login' || authMode === 'email_register' || authMode === 'forgot_password'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'hover:text-slate-900'
            }`}
          >
            Email & Password
          </button>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="mb-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold text-left flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <span className="leading-snug block">{errorMessage}</span>
              
              {/* Quick Actions based on error */}
              {(errorMessage.includes('Google') || isGoogleEmail) && (
                <div className="pt-1 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={handleGoogleClick}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-rose-300 rounded-lg text-[10px] font-black text-slate-900 shadow-2xs inline-flex items-center gap-1"
                  >
                    <span>Try Google Sign-In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot_password');
                      setErrorMessage(null);
                    }}
                    className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-black shadow-2xs inline-flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Set Password for this Email</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 1: Google Sign In */}
        {authMode === 'google' && (
          <div className="space-y-3.5">
            
            {/* Primary Google Login Button */}
            <button
              type="button"
              disabled={googleLoading}
              onClick={handleGoogleClick}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-75 text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-md flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              {googleLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* If popup blocked, show Open in New Tab helper */}
            {popupBlocked && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-left space-y-2">
                <p className="text-xs font-bold text-amber-900">
                  Google login works best outside the preview frame:
                </p>
                <button
                  type="button"
                  onClick={openAppInNewTab}
                  className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open AddMeUp in New Tab</span>
                </button>
              </div>
            )}

            <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-100 text-left text-xs text-slate-700 space-y-1">
              <span className="font-extrabold text-orange-950 block">Prefer email and password?</span>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                If you have a Google email and want to sign in with a password, click{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('forgot_password');
                    setErrorMessage(null);
                  }}
                  className="text-orange-600 font-bold underline"
                >
                  Set a Password
                </button>{' '}
                to create your AddMeUp password.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Email & Password */}
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="you@example.com (or Gmail)"
                  autoComplete="email"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
                />
              </div>

              {/* Detected Google Account Callout */}
              {isGoogleEmail && (
                <div className="mt-1.5 p-2 rounded-xl bg-blue-50 border border-blue-200/80 text-[11px] text-blue-950 flex items-center justify-between gap-2">
                  <span className="font-semibold text-[10px] leading-tight">
                    Google address detected. Have no password yet?
                  </span>
                  <button
                    type="button"
                    onClick={handleGoogleClick}
                    className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-black whitespace-nowrap"
                  >
                    1-Tap Google
                  </button>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-black text-slate-700">
                  Password
                </label>
                {authMode === 'email_login' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot_password');
                      setErrorMessage(null);
                    }}
                    className="text-[10px] text-orange-600 font-bold hover:underline"
                  >
                    Forgot / Set Password?
                  </button>
                ) : (
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 mt-1"
            >
              {loading ? (
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying credentials...</span>
                </div>
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
            <div className="pt-2 text-center space-y-1">
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

        {/* Tab 3: Forgot Password / Set Password for Google Email */}
        {authMode === 'forgot_password' && (
          <div className="space-y-3.5 text-left">
            {resetSentSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2.5">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-emerald-950">Password Link Sent!</h3>
                <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                  We've sent a secure password setup link to <strong className="font-mono text-emerald-950">{email}</strong>. Check your inbox to set a password, then sign in below!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('email_login');
                    setResetSentSuccess(false);
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all mt-2"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordResetSubmit} className="space-y-3">
                <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-2xl text-xs text-amber-950 space-y-1">
                  <span className="font-black flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Set or Reset Password</span>
                  </span>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    Enter your email address (including your Google email). We'll email you a link to create your password so you can sign in with Email & Password anytime.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">
                    Your Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  {loading ? (
                    <div className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending link...</span>
                    </div>
                  ) : (
                    <>
                      <span>Send Password Setup Link</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('email_login');
                      setErrorMessage(null);
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
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

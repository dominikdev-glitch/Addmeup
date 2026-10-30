import React, { useState } from 'react';
import { Logo } from './Logo';
import { 
  X, 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Coins,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff
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
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const cleanErrorMessage = (rawError: any): string => {
    const msg = String(rawError?.message || rawError || '');
    if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
      return 'Incorrect email or password. Please check your credentials and try again.';
    }
    if (msg.includes('email-already-in-use')) {
      return 'This email address is already registered. Please sign in instead.';
    }
    if (msg.includes('weak-password')) {
      return 'Password should be at least 6 characters.';
    }
    if (msg.includes('invalid-email')) {
      return 'Please enter a valid email address.';
    }
    if (msg.includes('network-request-failed')) {
      return 'Network connection issue. Please check your internet connection.';
    }
    if (msg.includes('popup-closed-by-user')) {
      return 'Google sign-in was closed before completion.';
    }
    return msg || 'Authentication error. Please try again.';
  };

  const handleGoogleClick = async () => {
    triggerHaptic('medium');
    setErrorMessage(null);
    setGoogleLoading(true);

    try {
      await onSignInGoogle();
      triggerHaptic('success');
      onClose();
    } catch (err: any) {
      console.warn("Google sign-in notice:", err);
      const friendly = cleanErrorMessage(err);
      if (!friendly.includes('closed before completion')) {
        setErrorMessage(friendly);
      }
      triggerHaptic('warning');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (mode === 'forgot') {
      if (!onSendPasswordReset) return;
      setLoading(true);
      triggerHaptic('medium');
      try {
        await onSendPasswordReset(cleanEmail);
        setResetSuccess(true);
        triggerHaptic('success');
      } catch (err: any) {
        setErrorMessage(cleanErrorMessage(err));
        triggerHaptic('warning');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    triggerHaptic('medium');

    try {
      if (mode === 'signin') {
        if (!onSignInEmail) throw new Error('Email sign-in is unavailable.');
        await onSignInEmail(cleanEmail, password);
      } else {
        if (!username.trim()) {
          setErrorMessage('Please enter your display name.');
          setLoading(false);
          return;
        }
        if (!onSignUpEmail) throw new Error('Registration is unavailable.');
        await onSignUpEmail(cleanEmail, password, username.trim());
      }
      triggerHaptic('success');
      onClose();
    } catch (err: any) {
      setErrorMessage(cleanErrorMessage(err));
      triggerHaptic('warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md w-full text-slate-800 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all active:scale-95"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Logo & Header */}
        <div className="text-center mb-5">
          <div className="flex justify-center mb-3">
            <Logo size="lg" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Create Your Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xs mx-auto leading-relaxed">
            {mode === 'signin' && 'Sign in to access your wallet, manage ads, and earn points.'}
            {mode === 'signup' && 'Join AddMeUp to share your social handles and connect with real people.'}
            {mode === 'forgot' && "Enter your email and we'll send you a secure password reset link."}
          </p>
        </div>

        {/* Classic 2-Tab Switcher (Sign In vs Create Account) */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-5 font-bold text-xs text-slate-600">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-xl transition-all ${
                mode === 'signin'
                  ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                  : 'hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                  : 'hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Forgot Password Success Screen */}
        {mode === 'forgot' && resetSuccess ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">Password Reset Link Sent</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                We've sent a link to <strong className="text-slate-900">{email}</strong>. Please check your inbox (and spam folder) to set your new password.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setResetSuccess(false);
              }}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs transition-all"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          /* Classic Authentication Form */
          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            
            {/* Display Name Input (Only on Sign Up) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Your Full Name or Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. John Doe or @john"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Input (Sign In & Sign Up) */}
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-slate-700">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMessage(null);
                      }}
                      className="text-xs text-orange-600 font-bold hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-11 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Signup Bonus Incentive Tag */}
            {mode === 'signup' && (
              <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-xs font-bold flex items-center gap-2">
                <Coins className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <span>Includes <strong>+20 Free Welcome Points</strong> to start promoting immediately!</span>
              </div>
            )}

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Please wait...</span>
                </>
              ) : mode === 'signin' ? (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === 'signup' ? (
                <>
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Back link when in forgot mode */}
            {mode === 'forgot' && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 hover:underline"
                >
                  ← Back to Sign In
                </button>
              </div>
            )}

            {/* Divider for 1-Tap Google Sign-In */}
            {mode !== 'forgot' && (
              <>
                <div className="relative my-4 flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-[11px] uppercase font-bold tracking-wider text-slate-400 absolute">
                    or continue with
                  </span>
                </div>

                {/* Classic Google Sign-In Button */}
                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={handleGoogleClick}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-2xl text-xs font-black text-slate-700 shadow-2xs flex items-center justify-center gap-2.5 transition-all active:scale-95"
                >
                  {googleLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>{mode === 'signin' ? 'Continue with Google' : 'Sign Up with Google'}</span>
                    </>
                  )}
                </button>

                {/* Subtext Switcher */}
                <div className="pt-2 text-center">
                  {mode === 'signin' ? (
                    <p className="text-xs text-slate-500 font-medium">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signup');
                          setErrorMessage(null);
                        }}
                        className="text-orange-600 font-extrabold hover:underline"
                      >
                        Create Account (+20 Pts)
                      </button>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 font-medium">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signin');
                          setErrorMessage(null);
                        }}
                        className="text-orange-600 font-extrabold hover:underline"
                      >
                        Sign In
                      </button>
                    </p>
                  )}
                </div>
              </>
            )}

          </form>
        )}

        {/* White-labeled SSL & Security Guarantee */}
        <div className="pt-4 mt-4 border-t border-slate-100 text-[10px] text-slate-500 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>256-Bit SSL Encrypted & Secure Authentication</span>
          </div>
          <p className="text-slate-400">
            By signing in, you agree to AddMeUp's{' '}
            <a href="/terms" className="text-slate-600 hover:text-orange-600 underline font-semibold">Terms</a> and{' '}
            <a href="/privacy" className="text-slate-600 hover:text-orange-600 underline font-semibold">Privacy Policy</a>.
          </p>
        </div>

      </div>
    </div>
  );
};

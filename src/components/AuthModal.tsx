import React from 'react';
import { Logo } from './Logo';
import { X, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onSignInGoogle: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onSignInGoogle,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-md animate-fade-in modal-safe-overlay">
      <div className="glass-card border border-white/80 rounded-3xl p-6 max-w-sm w-full text-slate-800 shadow-2xl relative text-center">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/60 border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Logo size="xl" />
        </div>

        <h2 className="text-xl font-extrabold text-slate-900">Sign in to AddMeUp</h2>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto font-medium">
          Create your account with Google to start sharing handles and earning free promotional credits!
        </p>

        {/* Action Buttons */}
        <div className="space-y-3 my-6">
          <button
            onClick={() => {
              onSignInGoogle();
              onClose();
            }}
            className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2.5 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 font-medium flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Secure Google Login • Instant Onboarding</span>
        </div>

      </div>
    </div>
  );
};

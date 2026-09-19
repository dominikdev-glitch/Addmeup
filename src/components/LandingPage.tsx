import React from 'react';
import { Logo } from './Logo';
import { 
  ShieldCheck, 
  Zap, 
  ExternalLink, 
  Coins 
} from 'lucide-react';

interface LandingPageProps {
  onSignInGoogle: () => void;
  onOpenAuthModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignInGoogle,
  onOpenAuthModal,
}) => {
  return (
    <div className="min-h-screen bg-[#fffaf0] text-slate-800 flex flex-col selection:bg-orange-500 selection:text-white">
      
      {/* Public Header */}
      <header className="sticky top-0 z-40 glass-header text-slate-800 shadow-xs border-b border-orange-100/80">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          
          {/* Logo */}
          <Logo size="md" showText={true} subtitle="HANDLE EXCHANGE" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenAuthModal}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-2 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onSignInGoogle}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow-md shadow-orange-500/20 flex items-center gap-1.5"
            >
              <span>Join Free</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Landing Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 space-y-12">
        
        {/* HERO SECTION */}
        <section className="text-center max-w-3xl mx-auto space-y-6 pt-4">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-orange-100/80 border border-orange-200/80 text-orange-800 px-3.5 py-1.5 rounded-full text-xs font-extrabold shadow-2xs animate-fade-in">
            <span>The #1 Exchange Platform for Snapchat & WhatsApp</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight sm:leading-none">
            Boost Your Friends & Customers on{' '}
            <span className="text-orange-600 underline decoration-amber-300 decoration-3 underline-offset-4">
              Snapchat
            </span>{' '}
            &{' '}
            <span className="text-emerald-700 underline decoration-emerald-300 decoration-3 underline-offset-4">
              WhatsApp
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto">
            Join thousands of active users sharing handles daily on AddMeUp. Post your handle, add real profiles to earn free promotional credits, and run targeted campaigns instantly.
          </p>

          {/* CTA Group */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenAuthModal}
              className="w-full sm:w-auto px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>Create Account • Get +20 Free Credits</span>
            </button>
          </div>

          {/* Trust Guarantees */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Free & Fair Play</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>+20 Welcome Credits</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-orange-500" />
              <span>Google One-Tap Auth</span>
            </span>
          </div>

        </section>

        {/* MOCKUP / LIVE PREVIEW CARDS */}
        <section className="glass-card border border-orange-200/80 rounded-3xl p-6 shadow-lg bg-gradient-to-br from-white/90 via-orange-50/30 to-amber-50/20">
          <div className="text-center mb-6 space-y-1">
            <h2 className="text-lg font-black text-slate-900">Live Handle Feed Preview</h2>
            <p className="text-xs text-slate-500 font-medium">Real handles active right now in the AddMeUp network</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Demo Card 1 */}
            <div className="bg-white/90 rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase">
                    👻 Snapchat • Fitness
                  </span>
                  <span className="text-[10px] text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    +5 Credits
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm mb-1">
                  Add me for daily workout routines & clean eating tips!
                </h3>
                <p className="text-xs font-mono font-bold text-orange-600 mb-3">
                  @alex_fit_daily
                </p>
              </div>
              <button 
                onClick={onOpenAuthModal}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span>Add on Snapchat</span>
                <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
              </button>
            </div>

            {/* Demo Card 2 */}
            <div className="bg-white/90 rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase">
                    💬 WhatsApp • Business
                  </span>
                  <span className="text-[10px] text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    +5 Credits
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm mb-1">
                  Urban Kicks Store CS — Message for wholesale sneaker catalog
                </h3>
                <p className="text-xs font-mono font-bold text-emerald-700 mb-3">
                  +1 555 019 2831
                </p>
              </div>
              <button 
                onClick={onOpenAuthModal}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span>Message on WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Demo Card 3 */}
            <div className="bg-white/90 rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between hidden lg:flex">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase">
                    👻 Snapchat • Gaming
                  </span>
                  <span className="text-[10px] text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    +5 Credits
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm mb-1">
                  Looking for Fortnite & Warzone squad members!
                </h3>
                <p className="text-xs font-mono font-bold text-orange-600 mb-3">
                  @gaming_ninja_x
                </p>
              </div>
              <button 
                onClick={onOpenAuthModal}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span>Add on Snapchat</span>
                <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
              </button>
            </div>

          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black text-slate-900">How AddMeUp Works</h2>
            <p className="text-xs text-slate-500 font-medium">Simple 3-step growth loop designed for maximum engagement</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="glass-card border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-2 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-100 border border-orange-200 text-orange-600 flex items-center justify-center font-black text-xl shadow-2xs">
                1
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Create Account</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Sign in with Google in seconds. Instantly receive +20 free promotional credits in your AddMeUp wallet.
              </p>
            </div>

            <div className="glass-card border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-2 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center font-black text-xl shadow-2xs">
                2
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Add Members & Earn</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Browse the live feed, tap to open Snapchat or WhatsApp, add members, and claim +5 credits per valid add.
              </p>
            </div>

            <div className="glass-card border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-2 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-black text-xl shadow-2xs">
                3
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Promote Your Handle</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Choose flexible durations (6hrs for 100cr, 12hrs for 200cr, 24hrs for 450cr, 7 days, or 1 month). Your handle stays pinned for top reach.
              </p>
            </div>

          </div>
        </section>

        {/* FEATURES GRID */}
        <section className="glass-card border border-orange-200/80 rounded-3xl p-6 sm:p-8 shadow-md bg-gradient-to-br from-white/90 via-slate-50/50 to-orange-50/30 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black text-slate-900">Built for Authentic Social Growth</h2>
            <p className="text-xs text-slate-500 font-medium">Why thousands choose AddMeUp to expand their reach</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="bg-white/90 border border-slate-200/80 rounded-2xl p-4 flex gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 text-orange-600 flex items-center justify-center font-black text-lg flex-shrink-0">
                ⚡
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-extrabold text-slate-900">Instant Paystack NGN Deposits</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Top up credits securely via Paystack with Nigerian Debit Cards, Bank Transfer, USSD, or OPay (₦1,000 = 100 Credits).
                </p>
              </div>
            </div>

            <div className="bg-white/90 border border-slate-200/80 rounded-2xl p-4 flex gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-black text-lg flex-shrink-0">
                🛡️
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-extrabold text-slate-900">Fair Play Verification</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Smart 10-second verification timer ensures users genuinely open Snapchat or WhatsApp before claiming credits.
                </p>
              </div>
            </div>

            <div className="bg-white/90 border border-slate-200/80 rounded-2xl p-4 flex gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center font-black text-lg flex-shrink-0">
                🪙
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-extrabold text-slate-900">Earn Free Ad Credits</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Add members and businesses directly from the feed to earn +5 credits every time with zero daily limits.
                </p>
              </div>
            </div>

            <div className="bg-white/90 border border-slate-200/80 rounded-2xl p-4 flex gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-black text-lg flex-shrink-0">
                ⚡
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-extrabold text-slate-900">Instant Cross-Platform Growth</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Seamlessly connects to native Snapchat and WhatsApp apps on iPhone, Android, and desktop in 1 click.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* BOTTOM FINAL CTA */}
        <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-5 relative overflow-hidden">
          <div className="max-w-xl mx-auto space-y-2 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Ready to Grow Your Handles Today?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Join AddMeUp in less than 30 seconds. Claim your +20 free credits and start earning today.
            </p>
          </div>

          <div className="flex justify-center relative z-10 pt-2">
            <button
              onClick={onOpenAuthModal}
              className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>Get Started Now (Free)</span>
            </button>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/40 py-6 text-center text-xs text-slate-500 font-medium space-y-1">
        <p>AddMeUp © {new Date().getFullYear()} • Social Handle Exchange Platform</p>
        <p className="text-[11px] text-slate-400">Snapchat and WhatsApp are trademarks of their respective owners.</p>
      </footer>

    </div>
  );
};

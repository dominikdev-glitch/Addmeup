import React from 'react';
import { UserProfile } from '../types';
import { Logo } from './Logo';
import { 
  PlusCircle, 
  Wallet, 
  Compass, 
  User, 
  ShieldCheck, 
  Bell, 
  Flame, 
  LayoutDashboard,
  ShieldAlert
} from 'lucide-react';
import { getEffectiveAvatar } from '../lib/avatar';
import { triggerHaptic } from '../lib/device';

interface HeaderProps {
  profile: UserProfile | null;
  activeTab: 'feed' | 'post' | 'verifications' | 'wallet';
  setActiveTab: (tab: 'feed' | 'post' | 'verifications' | 'wallet') => void;
  pendingCount?: number;
  unreadNotifCount?: number;
  onOpenNotifications?: () => void;
  onOpenProfile: () => void;
  onSignIn: () => void;
  onOpenMyAds?: () => void;
  onOpenDailyBonus?: () => void;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  activeTab,
  setActiveTab,
  pendingCount = 0,
  unreadNotifCount = 0,
  onOpenNotifications,
  onOpenProfile,
  onSignIn,
  onOpenMyAds,
  onOpenDailyBonus,
  onOpenAdmin,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const isDailyBonusReady = profile && profile.lastDailyBonusDate !== todayStr;
  const currentStreak = Number(profile?.dailyStreak || 0);

  return (
    <header className="sticky top-0 z-40 glass-header text-slate-800 shadow-xs border-b border-orange-100/80">
      <div className="max-w-md md:max-w-4xl lg:max-w-6xl mx-auto px-3.5 py-2 sm:py-2.5 flex items-center justify-between">
        
        {/* Brand Logo */}
        <button 
          onClick={() => setActiveTab('feed')}
          className="flex items-center text-left group"
        >
          <Logo size="md" showText={true} subtitle="Friends & Customers" />
        </button>

        {/* Desktop Header Links */}
        <div className="hidden md:flex items-center gap-1 bg-white/60 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === 'feed'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Feed</span>
          </button>

          <button
            onClick={() => setActiveTab('post')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === 'post'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Post Ad</span>
          </button>

          <button
            onClick={() => setActiveTab('verifications')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 relative ${
              activeTab === 'verifications'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
            <span>Verifications</span>
            {pendingCount > 0 && (
              <span className="bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-xs animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          {onOpenMyAds && (
            <button
              onClick={onOpenMyAds}
              className="px-3 py-1.5 rounded-lg text-xs font-extrabold text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-amber-500" />
              <span>My Ads</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === 'wallet'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Wallet</span>
          </button>

          {profile?.isAdmin && onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="px-2.5 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-xs hover:brightness-110 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Panel</span>
            </button>
          )}
        </div>

        {/* Balance & User Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {profile ? (
            <>
              {/* Daily Bonus Shortcut Button */}
              {onOpenDailyBonus && (
                <button
                  onClick={onOpenDailyBonus}
                  className={`px-2 py-1 rounded-full text-[10px] font-black flex items-center gap-1 transition-all active:scale-95 shadow-2xs ${
                    isDailyBonusReady
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 animate-bounce'
                      : 'bg-white/80 border border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                  title={isDailyBonusReady ? 'Daily bonus available!' : `Streak: ${currentStreak} days`}
                >
                  <Flame className="w-3 h-3 text-orange-600" />
                  <span className="hidden sm:inline">{isDailyBonusReady ? 'Claim Free' : `${currentStreak}d Streak`}</span>
                </button>
              )}

              {/* Wallet Points Pill */}
              <button
                onClick={() => setActiveTab('wallet')}
                className="flex items-center gap-1 bg-amber-100/90 hover:bg-amber-200/80 border border-amber-300/70 px-2.5 py-1 rounded-full text-[11px] font-bold text-amber-950 transition-all active:scale-95 shadow-2xs"
              >
                <span>🪙</span>
                <span className="font-black text-slate-900 font-mono">{profile.creditBalance.toLocaleString()}</span>
                <span className="text-[9px] text-amber-800 font-bold uppercase hidden sm:inline">Pts</span>
              </button>

              {/* Notification Bell */}
              {onOpenNotifications && (
                <button
                  onClick={onOpenNotifications}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:border-slate-400 transition-all shadow-2xs relative"
                  title="Notifications"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] bg-orange-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 border border-white animate-pulse">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={onOpenProfile}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-orange-300 hover:border-orange-500 transition-all shadow-2xs flex items-center justify-center bg-white"
                title="Your Profile"
              >
                <img
                  src={getEffectiveAvatar(profile.photoUrl, profile.username || profile.email || 'me')}
                  alt={profile.username || 'Profile'}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </button>
            </>
          ) : (
            <button
              onClick={onSignIn}
              className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 shadow-xs flex items-center gap-1"
            >
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs for Mobile */}
      <nav className="md:hidden max-w-md mx-auto px-1.5 flex border-t border-slate-200/50 bg-white/40">
        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('feed');
          }}
          className={`flex-1 py-2 flex items-center justify-center gap-0.5 text-[11px] font-extrabold transition-all relative ${
            activeTab === 'feed'
              ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-500/10'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Feed</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('post');
          }}
          className={`flex-1 py-2 flex items-center justify-center gap-0.5 text-[11px] font-extrabold transition-all relative ${
            activeTab === 'post'
              ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-500/10'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Post</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('verifications');
          }}
          className={`flex-1 py-2 flex items-center justify-center gap-0.5 text-[11px] font-extrabold transition-all relative ${
            activeTab === 'verifications'
              ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-500/10'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verify</span>
          {pendingCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-orange-500 absolute top-2 right-2 ring-2 ring-white animate-pulse" />
          )}
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('wallet');
          }}
          className={`flex-1 py-2 flex items-center justify-center gap-0.5 text-[11px] font-extrabold transition-all relative ${
            activeTab === 'wallet'
              ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-500/10'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Wallet</span>
        </button>
      </nav>
    </header>
  );
};

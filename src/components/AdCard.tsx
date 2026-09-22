import React, { useState, useEffect } from 'react';
import { Ad, UserProfile } from '../types';
import { 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  Flag, 
  Rocket, 
  Flame, 
  Share2, 
  Eye, 
  MousePointerClick,
  PauseCircle
} from 'lucide-react';
import { PlatformIcon } from './PlatformIcon';
import { getEffectiveAvatar, getEffectiveAdCover, getEffectiveAdDescription } from '../lib/avatar';
import { triggerHaptic, triggerNativeShare } from '../lib/device';
import { recordAdView } from '../lib/transactions';
import { getCreatorBadge } from '../lib/badges';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AdCardProps {
  ad: Ad;
  isClaimed: boolean;
  onSelectAd: (ad: Ad) => void;
  onReportAd?: (ad: Ad) => void;
  currentUserId?: string | null;
  onBoostAd?: (ad: Ad) => void;
}

export const AdCard: React.FC<AdCardProps> = ({ 
  ad, 
  isClaimed, 
  onSelectAd, 
  onReportAd,
  currentUserId,
  onBoostAd,
}) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(100);
  const [boostTimeLeft, setBoostTimeLeft] = useState<string>('');
  const [creatorUser, setCreatorUser] = useState<UserProfile | null>(null);
  const isBoosted = Boolean(ad.boostedUntil && ad.boostedUntil > Date.now());
  const isOwner = Boolean(currentUserId && currentUserId === ad.userId);
  const isPaused = ad.status === 'paused';

  // Count ad view on mount
  useEffect(() => {
    if (ad.adId && ad.status === 'active') {
      recordAdView(ad.adId);
    }
  }, [ad.adId, ad.status]);

  // Load creator reliability stats
  useEffect(() => {
    if (ad.userId) {
      getDoc(doc(db, 'users', ad.userId))
        .then((s) => {
          if (s.exists()) setCreatorUser(s.data() as UserProfile);
        })
        .catch(console.error);
    }
  }, [ad.userId]);

  const creatorBadge = getCreatorBadge(
    creatorUser?.approvedClaimsCount || 0,
    creatorUser?.totalClaimsCount || 0
  );

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const expiresAt = typeof ad.expiresAt === 'number' ? ad.expiresAt : Date.now();
      const createdAt = typeof ad.createdAt === 'number' ? ad.createdAt : (expiresAt - 6 * 60 * 60 * 1000);
      const diff = expiresAt - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Ended');
        setProgressPercent(0);
      } else {
        setIsExpired(false);
        const totalDuration = Math.max(1000, expiresAt - createdAt);
        const remainingRatio = Math.max(0, Math.min(100, (diff / totalDuration) * 100));
        setProgressPercent(remainingRatio);

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft(`Ends in ${days}d ${hours}h`);
        } else if (hours > 0) {
          setTimeLeft(`Ends in ${hours}h ${minutes}m`);
        } else if (minutes > 0) {
          setTimeLeft(`Ends in ${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`Ends in ${seconds}s`);
        }
      }

      // Boost countdown
      if (ad.boostedUntil && ad.boostedUntil > now) {
        const boostDiff = ad.boostedUntil - now;
        const bHours = Math.floor(boostDiff / (1000 * 60 * 60));
        const bMins = Math.floor((boostDiff % (1000 * 60 * 60)) / (1000 * 60));
        if (bHours > 0) {
          setBoostTimeLeft(`${bHours}h ${bMins}m`);
        } else {
          const bSecs = Math.floor((boostDiff % (1000 * 60)) / 1000);
          setBoostTimeLeft(`${bMins}m ${bSecs}s`);
        }
      } else {
        setBoostTimeLeft('');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [ad.expiresAt, ad.createdAt, ad.boostedUntil]);

  const isSnapchat = ad.platform === 'snapchat';

  // Duration label display
  const durationLabel = ad.durationHours 
    ? (ad.durationHours >= 720 ? '1 Month' : ad.durationHours >= 168 ? '7 Days' : ad.durationHours >= 24 ? '24 Hours' : `${ad.durationHours} Hours`)
    : 'Live Ad';

  const views = Number(ad.viewsCount || 0);
  const clicks = Number(ad.clicksCount || 0);
  const ctrPercent = views > 0 ? ((clicks / views) * 100).toFixed(0) : '0';

  const effectiveCover = getEffectiveAdCover(ad);
  const effectiveDescription = getEffectiveAdDescription(ad);

  return (
    <div className={`bg-white rounded-3xl border transition-all duration-300 hover:shadow-xl relative group flex flex-col justify-between overflow-hidden ${
      isBoosted 
        ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/10' 
        : 'border-slate-200/90 hover:border-orange-300 shadow-xs'
    }`}>
      
      <div>
        {/* Top Hero Visual Media Showcase */}
        <div className="relative w-full h-48 sm:h-56 bg-slate-900 overflow-hidden cursor-pointer" onClick={() => onSelectAd(ad)}>
          {/* Background Cover Image with Zoom Effect */}
          <img
            src={effectiveCover}
            alt={ad.title}
            className="w-full h-full object-cover brightness-[0.88] group-hover:scale-105 group-hover:brightness-95 transition-all duration-700"
            referrerPolicy="no-referrer"
            loading="lazy"
          />

          {/* Dark Gradient Overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-black/40 pointer-events-none" />

          {/* Top Floating Badges Bar */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
            {/* Left: Platform & Category */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wide shadow-md backdrop-blur-md ${
                isSnapchat
                  ? 'bg-yellow-400 text-slate-950 border border-yellow-300'
                  : 'bg-emerald-600 text-white border border-emerald-400'
              }`}>
                <PlatformIcon platform={ad.platform} size="sm" />
                <span>{isSnapchat ? 'Snapchat' : 'WhatsApp'}</span>
              </span>

              <span className="px-2 py-0.8 rounded-full text-[10px] font-extrabold bg-black/50 text-white backdrop-blur-md border border-white/20 shadow-xs">
                {ad.category}
              </span>
            </div>

            {/* Right: Reward Pill + Boost Badge */}
            <div className="flex items-center gap-1.5">
              {isBoosted && (
                <div className="px-2.5 py-0.8 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md animate-pulse">
                  <Flame className="w-3 h-3 text-amber-200" />
                  <span>VIP</span>
                  {boostTimeLeft && <span className="font-mono text-[9px] opacity-90">• {boostTimeLeft}</span>}
                </div>
              )}

              <div className="bg-orange-500/90 hover:bg-orange-500 text-white border border-orange-300/60 px-2.5 py-0.8 rounded-full text-[11px] font-black flex items-center gap-1 shadow-md backdrop-blur-md">
                <span>🪙</span>
                <span>+{ad.rewardPerAdd || 5} Pts</span>
              </div>
            </div>
          </div>

          {/* Bottom of Image: Creator Avatar, Username & Badges */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 z-10">
            <div className="flex items-center gap-3">
              {/* High-res Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-white border-2 border-white shadow-xl flex items-center justify-center">
                  <img
                    src={getEffectiveAvatar(ad.avatarUrl, ad.targetHandleOrNumber || ad.userDisplayName || ad.title)}
                    alt={ad.userDisplayName || 'Contact'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-md border border-slate-100">
                  <PlatformIcon platform={ad.platform} size="sm" />
                </div>
              </div>

              {/* Creator & Verification Badges */}
              <div className="text-white space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-xs sm:text-sm text-white drop-shadow-md tracking-tight">
                    {ad.userDisplayName || 'Social Member'}
                  </span>
                  {creatorBadge && (
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-black border shadow-xs ${creatorBadge.bgClass} ${creatorBadge.colorClass} ${creatorBadge.borderClass}`}>
                      <span>{creatorBadge.icon}</span>
                      <span>{creatorBadge.shortLabel}</span>
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-300 font-medium drop-shadow-xs flex items-center gap-1">
                  <span>{isSnapchat ? 'Snapchat Connect' : 'WhatsApp Connect'}</span>
                  {isPaused && (
                    <span className="px-1.5 py-0.2 bg-amber-400/90 text-slate-950 font-black rounded-md text-[9px]">
                      Paused
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Share & Report Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  triggerNativeShare({
                    title: `${ad.title} on AddMeUp`,
                    text: `Connect with ${ad.userDisplayName || 'creator'} on ${ad.platform === 'snapchat' ? 'Snapchat' : 'WhatsApp'}! Earn points on AddMeUp.`,
                    url: window.location.href,
                  });
                }}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all shadow-xs"
                title="Share ad"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>

              {onReportAd && !isOwner && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('light');
                    onReportAd(ad);
                  }}
                  className="w-8 h-8 rounded-full bg-black/40 hover:bg-rose-500/80 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all shadow-xs"
                  title="Report ad"
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Card Body: Title, Description & Metadata */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Main Title */}
          <div>
            <h3 
              onClick={() => onSelectAd(ad)}
              className="font-black text-slate-900 text-base sm:text-lg leading-snug tracking-tight hover:text-orange-600 transition-colors cursor-pointer line-clamp-2"
            >
              {ad.title}
            </h3>
          </div>

          {/* Description Block */}
          <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100/90 text-slate-600 text-xs sm:text-sm font-normal leading-relaxed">
            <p className="line-clamp-3">
              {effectiveDescription}
            </p>
          </div>

          {/* Direct Verified Link Notice - removes manual phone copying so users use the tracking link */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-orange-50/60 border border-orange-200/50 text-[11px]">
            <span className="text-orange-950 font-bold flex items-center gap-1.5 truncate">
              <span>⚡</span>
              <span className="truncate">Tap below to open {isSnapchat ? 'Snapchat' : 'WhatsApp'} & earn points</span>
            </span>
            <span className="text-[10px] font-black text-orange-600 bg-white px-2 py-0.5 rounded-md border border-orange-200 shadow-2xs whitespace-nowrap">
              Direct Link
            </span>
          </div>

          {/* Countdown Timer & Campaign Progress */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
            <div className="flex justify-between items-center text-[10px] font-bold mb-1.5">
              <div className="flex items-center gap-1 text-orange-600">
                <Clock className="w-3 h-3" />
                <span>{timeLeft}</span>
              </div>
              <span className="text-slate-400 text-[10px] font-semibold">{durationLabel}</span>
            </div>
            <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 rounded-full ${
                  isSnapchat ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Performance Metrics Tracker (Views, Clicks/Taps, CTR) */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1 pt-0.5">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1" title="Feed impressions">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>{views} views</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1" title="Taps on Add button">
                <MousePointerClick className="w-3.5 h-3.5 text-slate-400" />
                <span>{clicks} adds</span>
              </span>
            </div>
            {views > 0 && clicks > 0 && (
              <span className="text-orange-600 font-extrabold text-[10px]">
                {ctrPercent}% CTR
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer: Large Action Button */}
      <div className="p-4 sm:p-5 pt-0">
        {isExpired ? (
          <div className="w-full py-3 bg-slate-100 text-slate-400 rounded-2xl text-center text-xs font-bold border border-slate-200">
            This ad has ended
          </div>
        ) : isPaused ? (
          <div className="w-full py-3 bg-amber-50 text-amber-800 rounded-2xl text-center text-xs font-bold border border-amber-200 flex items-center justify-center gap-1.5">
            <PauseCircle className="w-4 h-4 text-amber-600" />
            <span>Ad Temporarily Paused by Creator</span>
          </div>
        ) : isOwner ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectAd(ad)}
              className="flex-1 py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <span>View Ad Details</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>

            {onBoostAd && (
              <button
                onClick={() => onBoostAd(ad)}
                className="flex-1 py-3 px-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs hover:opacity-95 transition-all active:scale-95"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>{isBoosted ? 'Extend VIP' : 'Boost to Top'}</span>
              </button>
            )}
          </div>
        ) : isClaimed ? (
          <div className="w-full py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-center text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Claimed & Rewarded (+{ad.rewardPerAdd || 5} Pts)</span>
          </div>
        ) : (
          <button
            onClick={() => {
              triggerHaptic('medium');
              onSelectAd(ad);
            }}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 active:scale-98 shadow-md ${
              isSnapchat
                ? 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-slate-950 shadow-yellow-500/20'
                : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20'
            }`}
          >
            <PlatformIcon platform={ad.platform} size="sm" />
            <span>Tap to Add & Earn +{ad.rewardPerAdd || 5} Points</span>
            <ExternalLink className="w-4 h-4 opacity-90" />
          </button>
        )}
      </div>
    </div>
  );
};


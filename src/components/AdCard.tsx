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
import { getEffectiveAvatar } from '../lib/avatar';
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
  onBoostAd
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

  return (
    <div className={`glass-card rounded-2xl p-3.5 transition-all duration-200 hover:shadow-md relative group flex flex-col justify-between ${
      isBoosted 
        ? 'border-amber-400/90 bg-gradient-to-b from-amber-50/50 via-white to-white shadow-md ring-1 ring-amber-400/40' 
        : 'hover:border-orange-200/80'
    }`}>
      {/* Top Banner Row */}
      <div>
        {/* Boosted VIP Banner if active */}
        {isBoosted && (
          <div className="mb-2.5 -mt-1 -mx-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
              <Rocket className="w-3 h-3 text-amber-100 animate-bounce" />
              <span>TOP VIP PINNED</span>
            </div>
            {boostTimeLeft && (
              <div className="flex items-center gap-1 text-[9px] font-mono font-bold bg-black/20 px-1.5 py-0.5 rounded-md">
                <Flame className="w-2.5 h-2.5 text-amber-300" />
                <span>{boostTimeLeft} left</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5">
            {/* Contact Profile Picture Avatar + Platform Badge */}
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 border-2 border-orange-200/90 shadow-xs flex items-center justify-center group-hover:border-orange-400 transition-colors">
                <img
                  src={getEffectiveAvatar(ad.avatarUrl, ad.targetHandleOrNumber || ad.userDisplayName || ad.title)}
                  alt={ad.userDisplayName || 'Contact'}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-2xs border border-slate-200">
                <PlatformIcon platform={ad.platform} size="sm" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
                  isSnapchat 
                    ? 'bg-yellow-100 text-yellow-900 border-yellow-300' 
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}>
                  {isSnapchat ? 'Snapchat' : 'WhatsApp'}
                </span>

                {isPaused && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                    <PauseCircle className="w-2.5 h-2.5" />
                    <span>Paused</span>
                  </span>
                )}

                <span className="text-[10px] text-slate-500 font-bold">
                  • {ad.category}
                </span>
              </div>

              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {ad.userDisplayName && (
                  <p className="text-[9px] text-slate-400 font-medium leading-tight">
                    by {ad.userDisplayName}
                  </p>
                )}

                {/* Creator Reliability Trust Badge */}
                {creatorBadge && (
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-bold border ${creatorBadge.bgClass} ${creatorBadge.colorClass} ${creatorBadge.borderClass}`} title={creatorBadge.description}>
                    <span>{creatorBadge.icon}</span>
                    <span>{creatorBadge.shortLabel}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Reward Badge & Actions */}
          <div className="flex items-center gap-1.5">
            <div className="bg-orange-100/80 border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 shadow-2xs">
              <span>🪙</span>
              <span>+{ad.rewardPerAdd || 5}</span>
            </div>

            {/* Owner Boost Icon Shortcut */}
            {isOwner && onBoostAd && !isExpired && (
              <button
                onClick={() => onBoostAd(ad)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 transition-all active:scale-95 shadow-2xs ${
                  isBoosted
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-95'
                }`}
                title={isBoosted ? 'Extend Boost' : 'Boost post to top'}
              >
                <Rocket className="w-2.5 h-2.5" />
                <span>{isBoosted ? 'Boosted' : 'Boost'}</span>
              </button>
            )}

            {/* Native Share on mobile */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                triggerNativeShare({
                  title: `${ad.title} on AddMeUp`,
                  text: `Connect with ${ad.targetHandleOrNumber} on ${ad.platform === 'snapchat' ? 'Snapchat' : 'WhatsApp'}! Earn credits on AddMeUp.`,
                  url: window.location.href,
                });
              }}
              className="w-6 h-6 rounded-full bg-slate-100 hover:bg-orange-50 text-slate-400 hover:text-orange-600 flex items-center justify-center transition-all opacity-60 group-hover:opacity-100"
              title="Share ad"
            >
              <Share2 className="w-3 h-3" />
            </button>

            {onReportAd && !isOwner && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onReportAd(ad);
                }}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all opacity-40 group-hover:opacity-100"
                title="Report ad"
              >
                <Flag className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Title & Handle */}
        <div className="mb-2.5">
          <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2">
            {ad.title}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 font-mono flex items-center gap-1.5">
            <span className="text-slate-400 font-sans text-[10px]">Handle:</span>
            <span className="font-bold text-slate-800 bg-white/90 px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs text-[11px]">
              {ad.targetHandleOrNumber}
            </span>
          </p>
        </div>

        {/* Performance Metrics Tracker (Views, Clicks/Taps, CTR) */}
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mb-2.5 px-0.5">
          <span className="flex items-center gap-1" title="Impressions in feed">
            <Eye className="w-3 h-3 text-slate-400" />
            <span>{views} views</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1" title="Taps on Add button">
            <MousePointerClick className="w-3 h-3 text-slate-400" />
            <span>{clicks} taps</span>
          </span>
          {views > 0 && clicks > 0 && (
            <>
              <span>•</span>
              <span className="text-orange-600 font-extrabold">
                {ctrPercent}% CTR
              </span>
            </>
          )}
        </div>
      </div>

      <div>
        {/* Countdown Timer Bar */}
        <div className="mb-3 bg-white/60 p-2 rounded-xl border border-slate-100 shadow-2xs">
          <div className="flex justify-between items-center text-[10px] font-bold mb-1">
            <div className="flex items-center gap-1 text-orange-600">
              <Clock className="w-3 h-3" />
              <span>{timeLeft}</span>
            </div>
            <span className="text-slate-400 text-[9px] font-medium">{durationLabel}</span>
          </div>
          <div className="w-full bg-slate-200/60 h-1 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 rounded-full ${
                isSnapchat ? 'bg-orange-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action Button & Owner Boost Shortcut */}
        {isExpired ? (
          <div className="w-full py-2 bg-slate-100 text-slate-400 rounded-xl text-center text-[11px] font-bold border border-slate-200">
            This ad has ended
          </div>
        ) : isPaused ? (
          <div className="w-full py-2 bg-amber-50 text-amber-800 rounded-xl text-center text-[11px] font-bold border border-amber-200 flex items-center justify-center gap-1.5">
            <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Ad Temporarily Paused by Creator</span>
          </div>
        ) : isOwner ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectAd(ad)}
              className="flex-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
            >
              <span>View Ad</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </button>

            {onBoostAd && (
              <button
                onClick={() => onBoostAd(ad)}
                className="flex-1 py-2 px-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-1 shadow-xs hover:opacity-95 transition-all active:scale-95"
              >
                <Rocket className="w-3 h-3" />
                <span>{isBoosted ? 'Extend VIP' : 'Boost Top'}</span>
              </button>
            )}
          </div>
        ) : isClaimed ? (
          <div className="w-full py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Claimed & Credited!</span>
          </div>
        ) : (
          <button
            onClick={() => {
              triggerHaptic('medium');
              onSelectAd(ad);
            }}
            className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-[11px] uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1.5 active:scale-95 shadow-xs ${
              isSnapchat
                ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10'
            }`}
          >
            <span>Tap to Add</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-90" />
          </button>
        )}
      </div>
    </div>
  );
};

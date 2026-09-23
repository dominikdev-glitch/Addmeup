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
  PauseCircle,
  ThumbsUp
} from 'lucide-react';
import { PlatformIcon } from './PlatformIcon';
import { getEffectiveAvatar, getEffectiveAdCover, getEffectiveAdDescription } from '../lib/avatar';
import { triggerHaptic, triggerNativeShare } from '../lib/device';
import { recordAdView } from '../lib/transactions';
import { getCreatorBadge } from '../lib/badges';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  isAdLikedLocally, 
  setAdLikedLocally, 
  toggleAdLikeInFirestore, 
  getVisitorOrUserId 
} from '../lib/likes';

interface AdCardProps {
  ad: Ad;
  isClaimed: boolean;
  onSelectAd: (ad: Ad) => void;
  onReportAd?: (ad: Ad) => void;
  currentUserId?: string | null;
  onBoostAd?: (ad: Ad) => void;
  compact?: boolean;
}

export const AdCard: React.FC<AdCardProps> = ({ 
  ad, 
  isClaimed, 
  onSelectAd, 
  onReportAd,
  currentUserId,
  onBoostAd,
  compact = false,
}) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(100);
  const [boostTimeLeft, setBoostTimeLeft] = useState<string>('');
  const [creatorUser, setCreatorUser] = useState<UserProfile | null>(null);
  const isBoosted = Boolean(ad.boostedUntil && ad.boostedUntil > Date.now());
  const isOwner = Boolean(currentUserId && currentUserId === ad.userId);
  const isPaused = ad.status === 'paused';

  // Likes / Thumbs State
  const [isLiked, setIsLiked] = useState<boolean>(() => isAdLikedLocally(ad.adId));
  const [likesCount, setLikesCount] = useState<number>(() => Number(ad.likesCount || 0));
  const [isLiking, setIsLiking] = useState<boolean>(false);
  const [likePopping, setLikePopping] = useState<boolean>(false);

  // Sync likesCount if external Firestore changes occur
  useEffect(() => {
    if (typeof ad.likesCount === 'number') {
      setLikesCount(ad.likesCount);
    }
  }, [ad.likesCount]);

  // Handler to toggle thumbs up
  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');

    const nextLiked = !isLiked;
    const nextCount = Math.max(0, likesCount + (nextLiked ? 1 : -1));

    // Optimistic UI response
    setIsLiked(nextLiked);
    setLikesCount(nextCount);
    setAdLikedLocally(ad.adId, nextLiked);
    setLikePopping(true);
    setTimeout(() => setLikePopping(false), 350);

    try {
      setIsLiking(true);
      const visitorOrUid = getVisitorOrUserId(currentUserId);
      const res = await toggleAdLikeInFirestore(ad.adId, visitorOrUid);
      setLikesCount(res.newLikesCount);
      setIsLiked(res.liked);
      setAdLikedLocally(ad.adId, res.liked);
    } catch (err) {
      console.warn("Could not save like:", err);
      // Revert optimistic update
      setIsLiked(!nextLiked);
      setLikesCount(likesCount);
      setAdLikedLocally(ad.adId, !nextLiked);
    } finally {
      setIsLiking(false);
    }
  };

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
    <div className={`bg-white rounded-2xl sm:rounded-3xl border transition-all duration-300 hover:shadow-xl relative group flex flex-col justify-between overflow-hidden ${
      isBoosted 
        ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/10' 
        : 'border-slate-200/90 hover:border-orange-300 shadow-xs'
    }`}>
      
      <div>
        {/* Top Hero Visual Media Showcase */}
        <div 
          className={`relative w-full bg-slate-900 overflow-hidden cursor-pointer ${
            compact ? 'h-32 sm:h-44 md:h-52' : 'h-48 sm:h-56'
          }`} 
          onClick={() => onSelectAd(ad)}
        >
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
          <div className={`absolute flex items-center justify-between gap-1.5 z-10 ${
            compact ? 'top-2 left-2 right-2' : 'top-3 left-3 right-3'
          }`}>
            {/* Left: Platform & Category */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className={`inline-flex items-center gap-1 rounded-full font-black tracking-wide shadow-md backdrop-blur-md ${
                compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[11px]'
              } ${
                isSnapchat
                  ? 'bg-yellow-400 text-slate-950 border border-yellow-300'
                  : 'bg-emerald-600 text-white border border-emerald-400'
              }`}>
                <PlatformIcon platform={ad.platform} size="xs" />
                <span>{isSnapchat ? 'Snap' : 'WhatsApp'}</span>
              </span>

              <span className={`rounded-full font-extrabold bg-black/50 text-white backdrop-blur-md border border-white/20 shadow-xs ${
                compact ? 'hidden sm:inline-block px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.8 text-[10px]'
              }`}>
                {ad.category}
              </span>
            </div>

            {/* Right: Reward Pill + Boost Badge */}
            <div className="flex items-center gap-1">
              {isBoosted && (
                <div className={`rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-black uppercase tracking-wider flex items-center gap-0.5 shadow-md animate-pulse ${
                  compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-0.8 text-[10px]'
                }`}>
                  <Flame className="w-2.5 h-2.5 text-amber-200" />
                  <span>VIP</span>
                  {boostTimeLeft && isOwner && !compact && <span className="font-mono text-[9px] opacity-90">• {boostTimeLeft}</span>}
                </div>
              )}

              <div className={`bg-orange-500/90 hover:bg-orange-500 text-white border border-orange-300/60 rounded-full font-black flex items-center gap-0.5 shadow-md backdrop-blur-md ${
                compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-0.8 text-[11px]'
              }`}>
                <span>🪙</span>
                <span>+{ad.rewardPerAdd || 5}</span>
              </div>
            </div>
          </div>

          {/* Bottom of Image: Creator Avatar, Username & Badges */}
          <div className={`absolute flex items-end justify-between gap-1.5 z-10 ${
            compact ? 'bottom-2 left-2 right-2' : 'bottom-3 left-3 right-3'
          }`}>
            <div className="flex items-center gap-2">
              {/* High-res Avatar */}
              <div className="relative flex-shrink-0">
                <div className={`rounded-xl sm:rounded-2xl overflow-hidden bg-white border-2 border-white shadow-xl flex items-center justify-center ${
                  compact ? 'w-9 h-9 sm:w-14 sm:h-14' : 'w-14 h-14 sm:w-16 sm:h-16'
                }`}>
                  <img
                    src={getEffectiveAvatar(ad.avatarUrl, ad.targetHandleOrNumber || ad.userDisplayName || ad.title)}
                    alt={ad.userDisplayName || 'Contact'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-md border border-slate-100">
                  <PlatformIcon platform={ad.platform} size="xs" />
                </div>
              </div>

              {/* Creator & Verification Badges */}
              <div className="text-white space-y-0.5 max-w-[110px] sm:max-w-none">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className={`font-extrabold text-white drop-shadow-md tracking-tight truncate ${
                    compact ? 'text-[11px] sm:text-sm' : 'text-xs sm:text-sm'
                  }`}>
                    {ad.userDisplayName || 'Social Member'}
                  </span>
                  {creatorBadge && !compact && (
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-black border shadow-xs ${creatorBadge.bgClass} ${creatorBadge.colorClass} ${creatorBadge.borderClass}`}>
                      <span>{creatorBadge.icon}</span>
                      <span>{creatorBadge.shortLabel}</span>
                    </span>
                  )}
                </div>

                <p className={`text-slate-300 font-medium drop-shadow-xs flex items-center gap-1 ${
                  compact ? 'text-[9px] sm:text-[11px]' : 'text-[11px]'
                }`}>
                  <span className="truncate">{isSnapchat ? 'Snapchat' : 'WhatsApp'}</span>
                  {isPaused && (
                    <span className="px-1 py-0.1 bg-amber-400/90 text-slate-950 font-black rounded text-[8px]">
                      Paused
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Thumbs Up, Share & Report Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleToggleLike}
                disabled={isLiking}
                className={`rounded-full backdrop-blur-md border flex items-center justify-center gap-1 transition-all shadow-xs ${
                  compact ? 'h-6 sm:h-8 px-1.5 sm:px-2.5' : 'h-8 px-2.5'
                } ${
                  isLiked
                    ? 'bg-orange-500 text-white border-orange-400 font-black ring-1 ring-white/50'
                    : 'bg-black/40 hover:bg-black/60 text-white border-white/20'
                }`}
                title={isLiked ? "Unlike ad" : "Thumbs up this ad"}
              >
                <ThumbsUp className={`${compact ? "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" : "w-3.5 h-3.5"} ${
                  isLiked ? "fill-white" : ""
                } ${likePopping ? "scale-125" : ""}`} />
                {likesCount > 0 && (
                  <span className={compact ? "text-[8px] sm:text-[10px] font-bold" : "text-[10px] font-bold"}>
                    {likesCount}
                  </span>
                )}
              </button>

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
                className={`rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all shadow-xs ${
                  compact ? 'w-6 h-6 sm:w-8 sm:h-8' : 'w-8 h-8'
                }`}
                title="Share ad"
              >
                <Share2 className={compact ? "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" : "w-3.5 h-3.5"} />
              </button>

              {onReportAd && !isOwner && !compact && (
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
        <div className={compact ? "p-2.5 sm:p-4 space-y-2" : "p-4 sm:p-5 space-y-3"}>
          {/* Main Title */}
          <div>
            <h3 
              onClick={() => onSelectAd(ad)}
              className={`font-black text-slate-900 leading-snug tracking-tight hover:text-orange-600 transition-colors cursor-pointer ${
                compact ? 'text-xs sm:text-base line-clamp-1 sm:line-clamp-2' : 'text-base sm:text-lg line-clamp-2'
              }`}
            >
              {ad.title}
            </h3>
          </div>

          {/* Description Block (Compact displays on tablet+ to save mobile card space) */}
          <div className={`bg-slate-50/80 rounded-xl sm:rounded-2xl border border-slate-100/90 text-slate-600 font-normal leading-relaxed ${
            compact ? 'hidden sm:block p-2 text-xs' : 'p-3 text-xs sm:text-sm'
          }`}>
            <p className={compact ? "line-clamp-2" : "line-clamp-3"}>
              {effectiveDescription}
            </p>
          </div>

          {/* Direct Verified Link Notice */}
          <div className={`flex items-center justify-between gap-1.5 rounded-xl bg-orange-50/60 border border-orange-200/50 ${
            compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-2 text-[11px]'
          }`}>
            <span className="text-orange-950 font-bold flex items-center gap-1 truncate">
              <span>⚡</span>
              <span className="truncate">{compact ? 'Direct instant link' : `Tap below to open ${isSnapchat ? 'Snapchat' : 'WhatsApp'}`}</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-black text-orange-600 bg-white px-1.5 py-0.5 rounded border border-orange-200 shadow-2xs whitespace-nowrap">
              Direct
            </span>
          </div>

          {/* Countdown Timer & Campaign Progress - ONLY visible to the creator who posted the ad */}
          {isOwner && (
            <div className={`bg-slate-50 rounded-xl border border-slate-200/60 ${compact ? 'p-1.5' : 'p-2.5'}`}>
              <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-bold mb-1">
                <div className="flex items-center gap-1 text-orange-600">
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>{timeLeft} left (Your Campaign)</span>
                </div>
                <span className="text-slate-400 text-[9px] font-semibold">{durationLabel}</span>
              </div>
              <div className="w-full bg-slate-200/80 h-1 sm:h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 rounded-full ${
                    isSnapchat ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Performance Metrics Tracker (Views, Clicks/Taps, Likes/Thumbs) */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-medium px-0.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5" title="Feed impressions">
                <Eye className="w-3 h-3 text-slate-400" />
                <span>{views}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5" title="Taps on Add button">
                <MousePointerClick className="w-3 h-3 text-slate-400" />
                <span>{clicks}</span>
              </span>
              <span>•</span>
              <button 
                type="button" 
                onClick={handleToggleLike}
                className={`flex items-center gap-0.5 transition-colors ${
                  isLiked ? 'text-orange-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
                title={isLiked ? "Unlike ad" : "Thumbs up this ad"}
              >
                <ThumbsUp className={`w-3 h-3 ${isLiked ? 'fill-orange-500 text-orange-500' : ''}`} />
                <span>{likesCount}</span>
              </button>
            </div>
            {views > 0 && clicks > 0 && (
              <span className="text-orange-600 font-extrabold text-[9px] sm:text-[10px]">
                {ctrPercent}% CTR
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer: Thumbs Up / Like & Action Button */}
      <div className={`flex items-center gap-1.5 sm:gap-2 ${compact ? "p-2.5 sm:p-5 pt-0" : "p-4 sm:p-5 pt-0"}`}>
        {/* Thumbs Up Like Button */}
        <button
          type="button"
          onClick={handleToggleLike}
          disabled={isLiking}
          className={`flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl sm:rounded-2xl font-black transition-all active:scale-90 border shadow-2xs select-none flex-shrink-0 ${
            compact 
              ? 'px-2 py-2 sm:px-3 sm:py-3 text-[11px]' 
              : 'px-3 py-2.5 sm:py-3.5 text-xs'
          } ${
            isLiked
              ? 'bg-orange-50 text-orange-600 border-orange-300 ring-2 ring-orange-400/25'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
          }`}
          title={isLiked ? "Unlike ad" : "Thumbs up this ad"}
          aria-label={isLiked ? "Unlike ad" : "Thumbs up this ad"}
        >
          <ThumbsUp className={`transition-transform duration-300 ${
            compact ? "w-3 h-3 sm:w-4 sm:h-4" : "w-3.5 h-3.5 sm:w-4 sm:h-4"
          } ${
            isLiked ? "fill-orange-500 text-orange-500" : "text-slate-500"
          } ${likePopping ? "scale-125 -rotate-12" : ""}`} />
          <span className="font-extrabold">{likesCount}</span>
        </button>

        {/* Primary Action Button Container */}
        <div className="flex-1 min-w-0">
          {isExpired ? (
            <div className="w-full py-2.5 bg-slate-100 text-slate-400 rounded-xl sm:rounded-2xl text-center text-[11px] sm:text-xs font-bold border border-slate-200">
              Ended
            </div>
          ) : isPaused ? (
            <div className="w-full py-2.5 bg-amber-50 text-amber-800 rounded-xl sm:rounded-2xl text-center text-[10px] sm:text-xs font-bold border border-amber-200 flex items-center justify-center gap-1">
              <PauseCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span className="truncate">Ad Paused</span>
            </div>
          ) : isOwner ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onSelectAd(ad)}
                className="flex-1 py-2 sm:py-3 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all truncate"
              >
                <span>Details</span>
                <ExternalLink className="w-3 h-3 opacity-70 flex-shrink-0" />
              </button>

              {onBoostAd && (
                <button
                  onClick={() => onBoostAd(ad)}
                  className="flex-1 py-2 sm:py-3 px-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 shadow-xs hover:opacity-95 transition-all active:scale-95 truncate"
                >
                  <Rocket className="w-3 h-3 flex-shrink-0" />
                  <span>{isBoosted ? 'VIP' : 'Boost'}</span>
                </button>
              )}
            </div>
          ) : isClaimed ? (
            <div className="w-full py-2.5 sm:py-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl sm:rounded-2xl text-center text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 shadow-2xs truncate">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="truncate">Claimed (+{ad.rewardPerAdd || 5} Pts)</span>
            </div>
          ) : (
            <button
              onClick={() => {
                triggerHaptic('medium');
                onSelectAd(ad);
              }}
              className={`w-full py-2.5 sm:py-3.5 px-2.5 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-98 shadow-md ${
                isSnapchat
                  ? 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-slate-950 shadow-yellow-500/20'
                  : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20'
              }`}
            >
              <PlatformIcon platform={ad.platform} size="xs" />
              <span className="truncate">{compact ? `Add (+${ad.rewardPerAdd || 5} Pts)` : `Add (+${ad.rewardPerAdd || 5} Pts)`}</span>
              <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 opacity-90 flex-shrink-0" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


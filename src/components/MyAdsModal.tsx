import React, { useState } from 'react';
import { Ad, UserProfile } from '../types';
import { 
  X, 
  Rocket, 
  PauseCircle, 
  PlayCircle, 
  Trash2, 
  Clock, 
  Plus, 
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Eye,
  MousePointerClick
} from 'lucide-react';
import { PlatformIcon } from './PlatformIcon';
import { getEffectiveAvatar } from '../lib/avatar';
import { triggerHaptic } from '../lib/device';
import { togglePauseAd, extendAdDuration, deleteAdPermanently } from '../lib/transactions';

interface MyAdsModalProps {
  userId: string;
  profile: UserProfile | null;
  ads: Ad[];
  onClose: () => void;
  onOpenCreateAd: () => void;
  onBoostAd: (ad: Ad) => void;
  onBalanceUpdated?: (newBalance: number) => void;
}

export const MyAdsModal: React.FC<MyAdsModalProps> = ({
  userId,
  profile,
  ads,
  onClose,
  onOpenCreateAd,
  onBoostAd,
  onBalanceUpdated,
}) => {
  const userAds = ads.filter((a) => a.userId === userId);

  // States
  const [loadingAdId, setLoadingAdId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [extendingAd, setExtendingAd] = useState<Ad | null>(null);
  const [deleteConfirmAdId, setDeleteConfirmAdId] = useState<string | null>(null);

  // Aggregate stats across all creator's ads
  const totalViews = userAds.reduce((sum, a) => sum + (a.viewsCount || 0), 0);
  const totalClicks = userAds.reduce((sum, a) => sum + (a.clicksCount || 0), 0);
  const overallCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0';
  const activeCount = userAds.filter((a) => a.status === 'active' && a.expiresAt > Date.now()).length;

  const showToast = (text: string, isError: boolean = false) => {
    setFeedbackMessage({ text, isError });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleTogglePause = async (ad: Ad) => {
    try {
      triggerHaptic('medium');
      setLoadingAdId(ad.adId);
      const nextStatus = ad.status === 'paused' ? 'active' : 'paused';
      await togglePauseAd(ad.adId, userId, nextStatus);
      showToast(nextStatus === 'paused' ? 'Ad paused. It is hidden from active adds.' : 'Ad resumed and live in feed!');
    } catch (err: any) {
      triggerHaptic('warning');
      showToast(err.message || 'Failed to update ad status.', true);
    } finally {
      setLoadingAdId(null);
    }
  };

  const handleExtendDuration = async (ad: Ad, durationHours: number, costCredits: number, label: string) => {
    try {
      triggerHaptic('medium');
      setLoadingAdId(ad.adId);
      const res = await extendAdDuration({
        adId: ad.adId,
        userId,
        durationHours,
        costCredits,
        durationLabel: label,
      });

      if (res.success) {
        triggerHaptic('success');
        showToast(`Ad extended +${label}!`);
        setExtendingAd(null);
        if (onBalanceUpdated) onBalanceUpdated(res.newBalance);
      }
    } catch (err: any) {
      triggerHaptic('warning');
      showToast(err.message || 'Could not extend ad.', true);
    } finally {
      setLoadingAdId(null);
    }
  };

  const handleDelete = async (adId: string) => {
    try {
      triggerHaptic('medium');
      setLoadingAdId(adId);
      await deleteAdPermanently(adId, userId);
      triggerHaptic('success');
      showToast('Ad deleted permanently.');
      setDeleteConfirmAdId(null);
    } catch (err: any) {
      triggerHaptic('warning');
      showToast(err.message || 'Could not delete ad.', true);
    } finally {
      setLoadingAdId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in modal-safe-overlay">
      <div className="glass-card-dark border border-white/20 rounded-2xl p-4 sm:p-5 max-w-lg w-full text-white shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-1.5">
              <span>My Active Ads</span>
              <span className="bg-amber-400 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black">
                {userAds.length}
              </span>
            </h2>
            <p className="text-[11px] text-slate-300">
              Manage, pause, boost, and track impressions on your posted ads.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Global Overview Analytics Cards */}
        {userAds.length > 0 && (
          <div className="grid grid-cols-4 gap-2 my-3">
            <div className="bg-white/10 border border-white/15 p-2 rounded-xl text-center">
              <div className="text-[9px] text-slate-300 font-bold uppercase">Active</div>
              <div className="text-sm font-black text-emerald-400 mt-0.5">{activeCount}</div>
            </div>
            <div className="bg-white/10 border border-white/15 p-2 rounded-xl text-center">
              <div className="text-[9px] text-slate-300 font-bold uppercase flex items-center justify-center gap-1">
                <Eye className="w-2.5 h-2.5" />
                <span>Views</span>
              </div>
              <div className="text-sm font-black text-amber-300 mt-0.5">{totalViews}</div>
            </div>
            <div className="bg-white/10 border border-white/15 p-2 rounded-xl text-center">
              <div className="text-[9px] text-slate-300 font-bold uppercase flex items-center justify-center gap-1">
                <MousePointerClick className="w-2.5 h-2.5" />
                <span>Taps</span>
              </div>
              <div className="text-sm font-black text-orange-400 mt-0.5">{totalClicks}</div>
            </div>
            <div className="bg-white/10 border border-white/15 p-2 rounded-xl text-center">
              <div className="text-[9px] text-slate-300 font-bold uppercase flex items-center justify-center gap-1">
                <TrendingUp className="w-2.5 h-2.5" />
                <span>CTR</span>
              </div>
              <div className="text-sm font-black text-emerald-300 mt-0.5">{overallCtr}%</div>
            </div>
          </div>
        )}

        {/* Feedback notification toast */}
        {feedbackMessage && (
          <div className={`p-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 mb-2 ${
            feedbackMessage.isError 
              ? 'bg-rose-500/20 text-rose-200 border border-rose-400/30' 
              : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
          }`}>
            {feedbackMessage.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Ads List Content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {userAds.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/10 border border-white/15 flex items-center justify-center mx-auto text-amber-400">
                <Rocket className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">No Ads Created Yet</h3>
                <p className="text-[11px] text-slate-300 mt-1 max-w-xs mx-auto">
                  Post your Snapchat or WhatsApp to start receiving real adds, followers, and chats!
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenCreateAd();
                }}
                className="py-2 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Your First Ad</span>
              </button>
            </div>
          ) : (
            userAds.map((ad) => {
              const isExpired = ad.expiresAt <= Date.now();
              const isPaused = ad.status === 'paused';
              const isBoosted = Boolean(ad.boostedUntil && ad.boostedUntil > Date.now());
              const views = Number(ad.viewsCount || 0);
              const clicks = Number(ad.clicksCount || 0);
              const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : '0';

              return (
                <div 
                  key={ad.adId} 
                  className={`bg-white/10 border rounded-2xl p-3 space-y-2.5 transition-all ${
                    isBoosted 
                      ? 'border-amber-400/60 bg-amber-950/20' 
                      : isExpired 
                      ? 'border-white/10 opacity-70' 
                      : 'border-white/15 hover:border-white/25'
                  }`}
                >
                  {/* Top Ad Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-white/20 flex items-center justify-center">
                          <img
                            src={getEffectiveAvatar(ad.avatarUrl, ad.targetHandleOrNumber || ad.title)}
                            alt={ad.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-slate-900 p-0.5 rounded-full border border-white/20">
                          <PlatformIcon platform={ad.platform} size="sm" />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-black text-white line-clamp-1">{ad.title}</h4>
                          {isBoosted && (
                            <span className="bg-amber-400 text-slate-950 text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md">
                              VIP Boosted
                            </span>
                          )}
                          {isPaused && (
                            <span className="bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md">
                              Paused
                            </span>
                          )}
                          {isExpired && (
                            <span className="bg-slate-700 text-slate-300 text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md">
                              Expired
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-amber-300 font-bold">
                          {ad.targetHandleOrNumber}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">Reward</span>
                      <span className="text-xs font-extrabold text-orange-400">+{ad.rewardPerAdd || 5} Cr</span>
                    </div>
                  </div>

                  {/* Performance Metrics Bar for this Ad */}
                  <div className="bg-slate-950/60 rounded-xl p-2 flex items-center justify-between text-[11px] border border-white/10 font-medium">
                    <div className="flex items-center gap-1 text-slate-300">
                      <Eye className="w-3 h-3 text-amber-400" />
                      <span>{views} Views</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-300">
                      <MousePointerClick className="w-3 h-3 text-orange-400" />
                      <span>{clicks} Taps</span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 font-bold">
                      <TrendingUp className="w-3 h-3" />
                      <span>{ctr}% CTR</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                      <Clock className="w-3 h-3" />
                      <span>
                        {isExpired 
                          ? 'Ended' 
                          : `${Math.max(0, Math.ceil((ad.expiresAt - Date.now()) / (1000 * 60 * 60)))}h left`}
                      </span>
                    </div>
                  </div>

                  {/* Creator Action Controls */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-white/10">
                    {/* Pause / Resume button */}
                    {!isExpired && (
                      <button
                        onClick={() => handleTogglePause(ad)}
                        disabled={loadingAdId === ad.adId}
                        className={`py-1 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                          isPaused
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-white/10 text-slate-300 border border-white/15 hover:bg-white/20'
                        }`}
                        title={isPaused ? 'Resume ad' : 'Pause ad'}
                      >
                        {isPaused ? <PlayCircle className="w-3 h-3" /> : <PauseCircle className="w-3 h-3" />}
                        <span>{isPaused ? 'Resume' : 'Pause'}</span>
                      </button>
                    )}

                    {/* Boost Top shortcut */}
                    {!isExpired && !isPaused && (
                      <button
                        onClick={() => {
                          onClose();
                          onBoostAd(ad);
                        }}
                        className="py-1 px-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-[10px] font-black flex items-center gap-1 shadow-2xs hover:opacity-95 transition-all"
                      >
                        <Rocket className="w-3 h-3" />
                        <span>{isBoosted ? 'Extend VIP' : 'Boost Top'}</span>
                      </button>
                    )}

                    {/* Extend Duration */}
                    <button
                      onClick={() => setExtendingAd(extendingAd?.adId === ad.adId ? null : ad)}
                      className="py-1 px-2 bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                    >
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{isExpired ? 'Renew' : 'Extend'}</span>
                    </button>

                    <div className="flex-1" />

                    {/* Delete button */}
                    {deleteConfirmAdId === ad.adId ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(ad.adId)}
                          disabled={loadingAdId === ad.adId}
                          className="py-1 px-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-black transition-all"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmAdId(null)}
                          className="py-1 px-1.5 text-slate-400 hover:text-white text-[10px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmAdId(ad.adId)}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete ad"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Extend Duration Inline Drawer */}
                  {extendingAd?.adId === ad.adId && (
                    <div className="bg-slate-900/90 border border-amber-400/40 rounded-xl p-2.5 space-y-2 mt-2 animate-fade-in">
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
                        <span>Select Extension Time:</span>
                        <span className="text-[10px] text-slate-300 font-normal">
                          Balance: {profile?.creditBalance || 0} Cr
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleExtendDuration(ad, 12, 180, '12h')}
                          disabled={loadingAdId === ad.adId || (profile?.creditBalance || 0) < 180}
                          className="p-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-40 rounded-lg text-center border border-white/15"
                        >
                          <div className="text-[10px] font-bold text-white">+12 Hours</div>
                          <div className="text-[9px] text-amber-300 font-mono">180 Cr</div>
                        </button>
                        <button
                          onClick={() => handleExtendDuration(ad, 24, 320, '24h')}
                          disabled={loadingAdId === ad.adId || (profile?.creditBalance || 0) < 320}
                          className="p-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-40 rounded-lg text-center border border-white/15"
                        >
                          <div className="text-[10px] font-bold text-white">+24 Hours</div>
                          <div className="text-[9px] text-amber-300 font-mono">320 Cr</div>
                        </button>
                        <button
                          onClick={() => handleExtendDuration(ad, 168, 1500, '7 Days')}
                          disabled={loadingAdId === ad.adId || (profile?.creditBalance || 0) < 1500}
                          className="p-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-40 rounded-lg text-center border border-white/15"
                        >
                          <div className="text-[10px] font-bold text-white">+7 Days</div>
                          <div className="text-[9px] text-amber-300 font-mono">1500 Cr</div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer CTA */}
        {userAds.length > 0 && (
          <div className="pt-3 border-t border-white/10 mt-3 flex items-center justify-between gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenCreateAd();
              }}
              className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post Another Ad</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

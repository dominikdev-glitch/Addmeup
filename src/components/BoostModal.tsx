import React, { useState, useEffect } from 'react';
import { Ad, BoostPackage } from '../types';
import { BOOST_PACKAGES, boostAd } from '../lib/transactions';
import { PlatformIcon } from './PlatformIcon';
import { 
  Rocket, 
  X, 
  Zap, 
  Coins, 
  Clock, 
  Check, 
  Sparkles, 
  ArrowUpRight, 
  AlertCircle,
  Flame
} from 'lucide-react';

interface BoostModalProps {
  isOpen: boolean;
  onClose: () => void;
  ad: Ad;
  userUid: string;
  userBalance: number;
  onBoostSuccess: (boostedUntil: number, newBalance: number) => void;
  onOpenWallet?: () => void;
}

export const BoostModal: React.FC<BoostModalProps> = ({
  isOpen,
  onClose,
  ad,
  userUid,
  userBalance,
  onBoostSuccess,
  onOpenWallet,
}) => {
  const [selectedPackage, setSelectedPackage] = useState<BoostPackage>(
    BOOST_PACKAGES.find(p => p.isPopular) || BOOST_PACKAGES[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remainingBoostTime, setRemainingBoostTime] = useState<string>('');

  const isCurrentlyBoosted = !!(ad.boostedUntil && ad.boostedUntil > Date.now());

  // Calculate live countdown if currently boosted
  useEffect(() => {
    if (!isCurrentlyBoosted || !ad.boostedUntil) {
      setRemainingBoostTime('');
      return;
    }

    const updateTimer = () => {
      const diff = (ad.boostedUntil || 0) - Date.now();
      if (diff <= 0) {
        setRemainingBoostTime('Expired');
        return;
      }
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      if (hrs > 0) {
        setRemainingBoostTime(`${hrs}h ${mins}m left`);
      } else {
        setRemainingBoostTime(`${mins}m ${secs}s left`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isCurrentlyBoosted, ad.boostedUntil]);

  if (!isOpen) return null;

  const hasEnoughCredits = userBalance >= selectedPackage.costCredits;
  const balanceAfter = userBalance - selectedPackage.costCredits;

  const handleBoost = async () => {
    if (!userUid) return;
    if (!hasEnoughCredits) {
      setErrorMsg(`Insufficient credits. You need ${selectedPackage.costCredits} credits.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await boostAd({
        adId: ad.adId,
        userId: userUid,
        durationHours: selectedPackage.durationHours,
        costCredits: selectedPackage.costCredits,
        boostLabel: selectedPackage.label,
      });

      if (res.success) {
        onBoostSuccess(res.boostedUntil, res.newBalance);
        onClose();
      }
    } catch (err: any) {
      console.error("Failed to boost ad:", err);
      setErrorMsg(err.message || "Failed to boost ad. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-amber-200/80 overflow-hidden flex flex-col max-h-[90vh] text-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Golden Accent */}
        <div className="relative p-4 pb-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/30 shadow-inner">
              <Rocket className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black tracking-tight">Boost to Top of Feed</h3>
                <span className="bg-amber-300 text-amber-950 font-black text-[9px] px-1.5 py-0.5 rounded-full uppercase">
                  VIP
                </span>
              </div>
              <p className="text-[11px] text-amber-100 font-medium leading-tight">
                Pin your post first with golden VIP highlight
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/15 hover:bg-black/25 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Ad Summary Card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                <PlatformIcon platform={ad.platform} size="md" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-slate-900 truncate">{ad.title}</h4>
                <p className="text-[11px] font-mono text-slate-500 truncate">
                  {ad.targetHandleOrNumber}
                </p>
              </div>
            </div>

            {isCurrentlyBoosted ? (
              <div className="text-right flex-shrink-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                  <Flame className="w-3 h-3 text-amber-600 animate-bounce" />
                  <span>{remainingBoostTime}</span>
                </span>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">Extend boost</p>
              </div>
            ) : (
              <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200 flex-shrink-0">
                Standard Ad
              </span>
            )}
          </div>

          {/* Tier Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                Select Boost Duration
              </label>
              <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Up to 10x More Adds
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {BOOST_PACKAGES.map((pkg) => {
                const isSelected = selectedPackage.id === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPackage(pkg)}
                    className={`relative p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/60 shadow-xs ring-2 ring-amber-400/40'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {pkg.tag && (
                      <span className={`absolute -top-2 right-2 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                        pkg.isPopular 
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs' 
                          : 'bg-slate-800 text-white'
                      }`}>
                        {pkg.tag}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center gap-1">
                        <Zap className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-black text-slate-900">{pkg.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Top pinned for {pkg.durationHours}h
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span>🪙</span>
                        <span className="font-black text-xs text-slate-900 font-mono">
                          {pkg.costCredits}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold">Cr</span>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wallet Balance Summary */}
          <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                <span>Your Wallet Balance:</span>
              </span>
              <span className="font-mono font-black text-slate-900">
                {userBalance.toLocaleString()} Credits
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-amber-200/60">
              <span className="text-slate-600 font-medium">
                Cost for {selectedPackage.label}:
              </span>
              <span className="font-mono font-black text-rose-600">
                -{selectedPackage.costCredits} Credits
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200/60 font-bold">
              <span className="text-slate-700">Balance After Boost:</span>
              <span className={`font-mono font-black ${balanceAfter >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {balanceAfter.toLocaleString()} Credits
              </span>
            </div>
          </div>

          {/* Error / Insufficient Funds Message */}
          {(!hasEnoughCredits || errorMsg) && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <p className="text-xs font-semibold">
                  {errorMsg || `You need ${(selectedPackage.costCredits - userBalance).toLocaleString()} more credits to activate this boost.`}
                </p>
              </div>

              {onOpenWallet && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenWallet();
                  }}
                  className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-1 shadow-2xs transition-colors"
                >
                  <span>Top Up Credits in Wallet</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Benefit Explanation */}
          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 space-y-1">
            <div className="font-bold text-slate-700 flex items-center gap-1">
              <span>✨ What happens when you boost?</span>
            </div>
            <p className="leading-relaxed">
              Your ad gets pinned to the <strong>#1 VIP slot at the very top of the feed</strong> above all regular ads, with an eye-catching golden glow and verified live badge.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 pt-2 border-t border-slate-100 bg-slate-50/80 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleBoost}
            disabled={!hasEnoughCredits || isSubmitting}
            className={`flex-2 py-2.5 rounded-xl font-black text-xs text-white shadow-md flex items-center justify-center gap-1.5 transition-all ${
              !hasEnoughCredits || isSubmitting
                ? 'bg-slate-300 cursor-not-allowed text-slate-500 shadow-none'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 active:scale-98'
            }`}
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Activating Boost...</span>
              </span>
            ) : (
              <>
                <Rocket className="w-3.5 h-3.5" />
                <span>
                  {isCurrentlyBoosted ? 'Extend Boost' : 'Boost Now'} (-{selectedPackage.costCredits} Cr)
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { UserProfile } from '../types';
import { 
  X, 
  Flame, 
  Gift, 
  Check, 
  Sparkles, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '../lib/device';
import { claimDailyBonus } from '../lib/transactions';

interface DailyBonusModalProps {
  userId: string;
  profile: UserProfile | null;
  onClose: () => void;
  onBonusClaimed: (rewardCredits: number, newBalance: number) => void;
}

export const DailyBonusModal: React.FC<DailyBonusModalProps> = ({
  userId,
  profile,
  onClose,
  onBonusClaimed,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const isAlreadyClaimed = profile?.lastDailyBonusDate === todayStr;
  const currentStreak = Number(profile?.dailyStreak || 0);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ credits: number; streak: number } | null>(null);

  const daysTrack = [
    { day: 1, credits: 2 },
    { day: 2, credits: 2 },
    { day: 3, credits: 3 },
    { day: 4, credits: 3 },
    { day: 5, credits: 3 },
    { day: 6, credits: 3 },
    { day: 7, credits: 5, isSpecial: true },
  ];

  const handleClaim = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      triggerHaptic('medium');

      const res = await claimDailyBonus(userId);
      if (res.success) {
        triggerHaptic('success');
        setSuccessInfo({ credits: res.creditsAwarded, streak: res.newStreak });
        onBonusClaimed(res.creditsAwarded, res.newBalance);

        // Confetti blast celebration
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#10b981', '#f97316', '#eab308'],
        });
      }
    } catch (err: any) {
      triggerHaptic('warning');
      setErrorMessage(err.message || 'Could not claim daily reward.');
    } finally {
      setIsLoading(false);
    }
  };

  const activeDayIndex = Math.min(6, currentStreak % 7);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in modal-safe-overlay">
      <div className="glass-card-dark border border-white/20 rounded-2xl p-4 sm:p-5 max-w-sm w-full text-white shadow-2xl relative overflow-hidden text-center">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all z-10"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Top Flame & Streak Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-400 p-0.5 shadow-lg mx-auto mb-3 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950/40 rounded-[14px] flex items-center justify-center">
            <Flame className="w-8 h-8 text-amber-300 animate-pulse" />
          </div>
        </div>

        <h2 className="text-base font-black text-white">
          Daily Check-in Streak
        </h2>
        <p className="text-[11px] text-slate-300 mt-0.5">
          Visit AddMeUp daily to claim free credits and keep your streak burning!
        </p>

        {/* Streak Counter Badge */}
        <div className="my-3 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 border border-amber-400/40 rounded-full text-amber-300 text-xs font-black">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Current Streak: {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}</span>
        </div>

        {/* 7-Day Streak Road */}
        <div className="bg-white/10 border border-white/15 rounded-xl p-2.5 my-3">
          <div className="grid grid-cols-7 gap-1">
            {daysTrack.map((item, idx) => {
              const isCompleted = isAlreadyClaimed ? idx <= activeDayIndex : idx < activeDayIndex;
              const isToday = isAlreadyClaimed ? idx === activeDayIndex : idx === activeDayIndex;

              return (
                <div
                  key={item.day}
                  className={`p-1 rounded-lg text-center flex flex-col items-center justify-between transition-all ${
                    isToday && !isAlreadyClaimed
                      ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 shadow-md scale-105'
                      : isCompleted
                      ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                      : 'bg-white/5 border border-white/10 text-slate-400'
                  }`}
                >
                  <span className="text-[8px] font-black uppercase">D{item.day}</span>
                  <div className="my-0.5">
                    {isCompleted ? (
                      <Check className="w-3 h-3 text-emerald-400 mx-auto" />
                    ) : item.isSpecial ? (
                      <Gift className="w-3 h-3 text-amber-400 mx-auto" />
                    ) : (
                      <Sparkles className="w-2.5 h-2.5 mx-auto opacity-70" />
                    )}
                  </div>
                  <span className="text-[9px] font-mono font-bold">+{item.credits}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2 px-1">
            <span>Day 1-2: 2 Cr</span>
            <span>Day 3-6: 3 Cr</span>
            <span className="text-amber-300 font-bold">Day 7+: 5 Cr VIP 🎁</span>
          </div>
        </div>

        {/* Claimed / Unclaimed Status Action */}
        {successInfo ? (
          <div className="space-y-2 py-1 animate-fade-in">
            <div className="bg-emerald-500/20 border border-emerald-400/50 p-2.5 rounded-xl text-emerald-300 text-xs font-bold">
              🎉 Claimed +{successInfo.credits} Free Credits! Streak is at {successInfo.streak} days.
            </div>
            <button
              onClick={onClose}
              className="w-full py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all"
            >
              Awesome!
            </button>
          </div>
        ) : isAlreadyClaimed ? (
          <div className="space-y-2 py-1">
            <div className="bg-white/10 border border-white/15 p-2.5 rounded-xl text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>You've already claimed today's bonus!</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Come back tomorrow after midnight to unlock your next reward.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={handleClaim}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:opacity-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5 transform active:scale-95 disabled:opacity-50"
            >
              <Gift className="w-4 h-4" />
              <span>{isLoading ? 'Claiming...' : `Claim Today's Bonus (+${daysTrack[activeDayIndex]?.credits || 2} Cr)`}</span>
            </button>

            {errorMessage && (
              <div className="bg-rose-500/20 border border-rose-400/40 text-rose-200 p-2 rounded-lg text-[10px] font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-300 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

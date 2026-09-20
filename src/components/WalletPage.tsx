import React, { useState, useEffect } from 'react';
import { UserProfile, Transaction } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { DEPOSIT_PACKAGES } from '../lib/transactions';
import { DepositModal } from './DepositModal';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  RefreshCw, 
  Compass,
  CreditCard,
  Building2,
  Zap,
  Coins,
  Gift,
  Copy,
  Check,
  Share2,
  Flame
} from 'lucide-react';

interface WalletPageProps {
  userUid: string | null;
  profile: UserProfile | null;
  onNavigateFeed: () => void;
  onRequireAuth: () => void;
  onToast: (msg: string) => void;
}

export const WalletPage: React.FC<WalletPageProps> = ({
  userUid,
  profile,
  onNavigateFeed,
  onRequireAuth,
  onToast,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!userUid) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const transRef = collection(db, 'transactions');
    const q = query(
      transRef,
      where('userId', '==', userUid),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          transactionId: docSnap.id,
          userId: data.userId,
          amount: Number(data.amount || 0),
          amountNgn: data.amountNgn ? Number(data.amountNgn) : undefined,
          paymentMethod: data.paymentMethod || undefined,
          type: data.type || 'earned_ad_click',
          referenceId: data.referenceId || '',
          description: data.description || 'Credits transaction',
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
        });
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setTransactions(list);
      setLoading(false);
    }, (err) => {
      console.error("Transactions subscription error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userUid]);

  const balance = profile?.creditBalance || 0;
  const referralCode = profile?.referralCode || (userUid ? `UP-${userUid.slice(0, 6).toUpperCase()}` : '');
  const referralLink = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}?ref=${referralCode}`
    : `https://addmeup.app/?ref=${referralCode}`;

  const handleCopyInviteLink = () => {
    if (!userUid) {
      onRequireAuth();
      return;
    }
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    onToast("Referral link copied! Share with friends to earn +10 Credits 🎁");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!userUid) {
      onRequireAuth();
      return;
    }
    const text = encodeURIComponent(`Add my Snapchat & WhatsApp on AddMeUp! Use my invite link to get +10 FREE bonus credits: ${referralLink}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-md md:max-w-4xl lg:max-w-6xl mx-auto px-3.5 py-4 pb-20 space-y-4 text-slate-800">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Balance & Deposit Card */}
        <div className="lg:col-span-5 space-y-3">
          
          {/* Main Balance Card */}
          <div className="glass-card border border-orange-200/80 rounded-2xl p-4 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-orange-500 font-black text-6xl pointer-events-none select-none">
              🪙
            </div>

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                  Your Balance
                </span>
              </div>
              <span className="text-[9px] bg-white/80 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 font-bold shadow-2xs">
                AddMeUp Wallet
              </span>
            </div>

            <div className="my-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {balance.toLocaleString()}
                </span>
                <span className="text-orange-600 font-extrabold text-sm">Credits 🪙</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium leading-tight">
                100 Credits = ₦1,000 NGN. Use credits to feature your Snapchat & WhatsApp ads.
              </p>
            </div>

            {/* Deposit & Earn Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/60">
              <button
                onClick={() => {
                  if (!userUid) onRequireAuth();
                  else setIsDepositOpen(true);
                }}
                className="py-2 px-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Deposit (₦1k)</span>
              </button>

              <button
                onClick={onNavigateFeed}
                className="py-2 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1 transition-all active:scale-95"
              >
                <Compass className="w-3.5 h-3.5 text-orange-400" />
                <span>Earn Free (+5)</span>
              </button>
            </div>
          </div>

          {/* Daily Streak Status Card */}
          <div className="glass-card border border-amber-300/80 bg-gradient-to-r from-amber-50/70 to-orange-50/70 rounded-2xl p-3 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-2xs">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-900">Daily Login Streak</span>
                  <span className="text-[9px] font-black bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full">
                    {profile?.dailyStreak || 0}d streak 🔥
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  {profile?.lastDailyBonusDate === new Date().toISOString().split('T')[0]
                    ? "Claimed today! Check back tomorrow for more credits."
                    : "Bonus ready! Check Feed to claim free credits."}
                </p>
              </div>
            </div>
          </div>

          {/* Referral & Invite Card */}
          <div className="glass-card border border-purple-200/80 bg-purple-50/30 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200">
                  <Gift className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-[11px] font-black uppercase tracking-wider text-purple-950">
                  Invite Friends & Earn Free
                </h3>
              </div>
              <span className="text-[9px] font-black bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                +10 Cr Each 🎁
              </span>
            </div>

            <p className="text-[11px] text-slate-600 font-medium leading-snug">
              Give friends <strong>+10 bonus credits</strong> when they join. You earn <strong>+10 credits</strong> for every referral!
            </p>

            {/* Referral Link Copy Bar */}
            <div className="flex items-center gap-1.5 bg-white/90 p-1.5 rounded-xl border border-purple-200 shadow-2xs">
              <div className="flex-1 font-mono text-[10px] text-slate-700 truncate px-1 font-bold">
                {referralLink}
              </div>
              <button
                onClick={handleCopyInviteLink}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all active:scale-95 flex-shrink-0"
              >
                {copiedLink ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* 1-tap WhatsApp Share */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShareWhatsApp}
                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95"
              >
                <Share2 className="w-3 h-3" />
                <span>Share on WhatsApp</span>
              </button>

              <div className="text-[10px] font-mono font-bold text-slate-500 bg-white/80 px-2 py-1 rounded-xl border border-slate-200 text-center">
                <span className="text-purple-700 font-black">{profile?.referralsCount || 0}</span> referred
              </div>
            </div>
          </div>

          {/* Deposit Packages Showcase Card */}
          <div className="glass-card border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-orange-600" />
                <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                  Instant Deposit Rates (NGN)
                </h3>
              </div>
              <span className="text-[9px] font-bold text-[#0ba4db] bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200">
                via Paystack / Flutterwave
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {DEPOSIT_PACKAGES.slice(0, 4).map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => {
                    if (!userUid) onRequireAuth();
                    else setIsDepositOpen(true);
                  }}
                  className="p-2 rounded-xl bg-white/70 hover:bg-orange-50/70 border border-slate-200 hover:border-orange-300 text-left transition-all group"
                >
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-900 group-hover:text-orange-600">
                    <span>{pkg.credits} Cr</span>
                    <span className="font-mono font-bold text-slate-800">₦{pkg.priceNgn.toLocaleString('en-NG')}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium mt-0.5 leading-tight">
                    {pkg.bonusCredits ? `+${pkg.bonusCredits} free` : pkg.label}
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!userUid) onRequireAuth();
                else setIsDepositOpen(true);
              }}
              className="w-full py-1.5 text-center text-[10px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50/60 rounded-lg border border-orange-200/80 transition-colors"
            >
              Deposit with Cards, Bank Transfer, USSD →
            </button>
          </div>

        </div>

        {/* Right Column: Transaction History Section */}
        <div className="lg:col-span-7 space-y-2.5">
          <h3 className="text-xs font-extrabold text-slate-900 px-1 flex items-center justify-between">
            <span>Transaction History</span>
            <span className="text-[10px] font-medium text-slate-500">
              {transactions.length} recent
            </span>
          </h3>

          {!userUid ? (
            <div className="glass-card border border-slate-200/80 rounded-2xl p-4 text-center space-y-1.5">
              <p className="text-xs text-slate-600 font-medium">Sign in to view your full credit history.</p>
              <button
                onClick={onRequireAuth}
                className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[11px] font-black shadow-xs inline-block"
              >
                Sign in to get started
              </button>
            </div>
          ) : loading ? (
            <div className="py-6 text-center text-slate-500 space-y-1.5">
              <RefreshCw className="w-5 h-5 mx-auto animate-spin text-orange-500" />
              <p className="text-[11px] font-medium">Loading transaction log...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="glass-card border border-slate-200/80 rounded-2xl p-4 text-center space-y-1">
              <p className="text-xs text-slate-600 font-semibold">No transactions recorded yet.</p>
              <p className="text-[10px] text-slate-400">Deposit credits or tap on ads in the feed to get started!</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {transactions.map((tx) => {
                const isPositive = tx.amount > 0;
                const isDeposit = tx.type === 'deposit';
                const isReferral = tx.type === 'referral_bonus';

                return (
                  <div
                    key={tx.transactionId}
                    className="glass-card border border-slate-200/60 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs hover:border-orange-200 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isReferral
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : isDeposit
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : isPositive 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {isReferral ? (
                          <Gift className="w-3.5 h-3.5" />
                        ) : isDeposit ? (
                          <Coins className="w-3.5 h-3.5" />
                        ) : isPositive ? (
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div>
                        <h4 className="text-[11px] font-bold text-slate-900 leading-tight">
                          {tx.description || (isPositive ? 'Earned Credits' : 'Spent Credits')}
                        </h4>
                        <p className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">
                          {new Date(tx.createdAt).toLocaleDateString()} at {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {tx.referenceId && ` • Ref: ${tx.referenceId}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-full border inline-block ${
                        isReferral
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : isDeposit
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : isPositive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {isPositive ? `+${tx.amount}` : `${tx.amount}`} Cr
                      </div>
                      {tx.amountNgn && (
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                          ₦{tx.amountNgn.toLocaleString('en-NG')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        userUid={userUid}
        userEmail={profile?.email}
        onToast={onToast}
      />
    </div>
  );
};

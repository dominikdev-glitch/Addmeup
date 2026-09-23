import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Transaction } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { 
  ArrowLeft, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Coins, 
  Gift, 
  Search, 
  Filter, 
  Copy, 
  Check, 
  RefreshCw, 
  CreditCard, 
  ShieldCheck, 
  Sparkles,
  TrendingUp,
  TrendingDown,
  Wallet
} from 'lucide-react';
import { triggerHaptic } from '../lib/device';
import { DepositModal } from './DepositModal';

interface TransactionsPageProps {
  userUid: string | null;
  profile: UserProfile | null;
  onBack: () => void;
  onOpenDeposit?: () => void;
  onRequireAuth: () => void;
  onToast: (msg: string) => void;
}

type FilterType = 'all' | 'earned' | 'deposit' | 'spent' | 'referral';

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  userUid,
  profile,
  onBack,
  onOpenDeposit,
  onRequireAuth,
  onToast,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [copiedRefId, setCopiedRefId] = useState<string | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);

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
      limit(150)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
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
            description: data.description || 'Points transaction',
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
          });
        });
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setTransactions(list);
        setLoading(false);
      },
      (err) => {
        console.error('TransactionsPage subscription error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userUid]);

  const handleCopyRef = (refId: string) => {
    triggerHaptic('light');
    navigator.clipboard.writeText(refId);
    setCopiedRefId(refId);
    onToast(`Reference copied: ${refId}`);
    setTimeout(() => {
      setCopiedRefId(null);
    }, 2000);
  };

  // Filter & Search Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Category Filter
      if (activeFilter === 'earned' && (tx.amount <= 0 || tx.type === 'deposit')) {
        return false;
      }
      if (activeFilter === 'deposit' && tx.type !== 'deposit') {
        return false;
      }
      if (activeFilter === 'spent' && tx.amount >= 0) {
        return false;
      }
      if (activeFilter === 'referral' && tx.type !== 'referral_bonus') {
        return false;
      }

      // 2. Search Term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(term);
        const matchesRef = tx.referenceId.toLowerCase().includes(term);
        const matchesAmount = tx.amount.toString().includes(term);
        const matchesType = tx.type.toLowerCase().includes(term);
        return matchesDesc || matchesRef || matchesAmount || matchesType;
      }

      return true;
    });
  }, [transactions, activeFilter, searchTerm]);

  // Aggregate Stats
  const stats = useMemo(() => {
    let totalEarned = 0;
    let totalSpent = 0;
    let totalDepositedNgn = 0;

    transactions.forEach((tx) => {
      if (tx.amount > 0 && tx.type !== 'deposit') {
        totalEarned += tx.amount;
      } else if (tx.amount < 0) {
        totalSpent += Math.abs(tx.amount);
      }
      if (tx.type === 'deposit' && tx.amountNgn) {
        totalDepositedNgn += tx.amountNgn;
      }
    });

    return { totalEarned, totalSpent, totalDepositedNgn };
  }, [transactions]);

  const balance = profile?.creditBalance || 0;

  return (
    <div className="py-4 px-2 sm:px-4 space-y-4 max-w-4xl mx-auto pb-24 animate-fade-in">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white border border-slate-200/80 text-slate-700 hover:text-slate-900 text-xs font-black shadow-2xs transition-all active:scale-95 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Wallet</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenDeposit ? onOpenDeposit() : setIsDepositOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Top-up Points</span>
          </button>
        </div>
      </div>

      {/* Hero Header & Ledger Summary */}
      <div className="glass-card border border-white/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-2xs">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Full Transaction History
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  Verified audit statement of your point movements & deposits
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-orange-50/80 border border-orange-200/80 px-3 py-2 rounded-xl">
            <span className="text-[11px] font-bold text-slate-600">Available Balance:</span>
            <span className="font-mono text-base font-black text-orange-600">
              {balance.toLocaleString()} Pts
            </span>
          </div>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 text-emerald-700 text-[10px] sm:text-xs font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Total Earned</span>
            </div>
            <div className="font-mono text-sm sm:text-lg font-black text-emerald-800 mt-1">
              +{stats.totalEarned.toLocaleString()} Pts
            </div>
          </div>

          <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 text-amber-700 text-[10px] sm:text-xs font-bold">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Total Spent</span>
            </div>
            <div className="font-mono text-sm sm:text-lg font-black text-amber-900 mt-1">
              -{stats.totalSpent.toLocaleString()} Pts
            </div>
          </div>

          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 text-blue-700 text-[10px] sm:text-xs font-bold">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Deposits</span>
            </div>
            <div className="font-mono text-sm sm:text-lg font-black text-blue-900 mt-1">
              ₦{stats.totalDepositedNgn.toLocaleString('en-NG')}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="glass-card border border-white/80 rounded-2xl p-3 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by description, reference, or amount..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveFilter('all');
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              All ({transactions.length})
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveFilter('earned');
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === 'earned'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
              }`}
            >
              Earned (+)
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveFilter('deposit');
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === 'deposit'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-800'
              }`}
            >
              Deposits (₦)
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveFilter('spent');
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === 'spent'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900'
              }`}
            >
              Spent (-)
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveFilter('referral');
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === 'referral'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-800'
              }`}
            >
              Referrals (🎁)
            </button>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {!userUid ? (
          <div className="glass-card border border-slate-200/80 rounded-2xl p-8 text-center space-y-3">
            <Wallet className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-xs font-bold text-slate-700">Please sign in to inspect your transaction record.</p>
            <button
              onClick={onRequireAuth}
              className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black shadow-xs inline-block"
            >
              Sign In
            </button>
          </div>
        ) : loading ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin text-orange-500" />
            <p className="text-xs font-bold">Retrieving complete transaction statement...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="glass-card border border-slate-200/80 rounded-2xl p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Filter className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs font-black text-slate-700">No matching transactions</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              {searchTerm || activeFilter !== 'all' 
                ? 'Try adjusting your search terms or clearing category filters.' 
                : 'No transactions found on this account yet. Deposit points or complete ad adds to get started!'}
            </p>
            {(searchTerm || activeFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setActiveFilter('all');
                }}
                className="mt-2 text-xs font-extrabold text-orange-600 hover:text-orange-700 underline"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredTransactions.map((tx) => {
              const isPositive = tx.amount > 0;
              const isDeposit = tx.type === 'deposit';
              const isReferral = tx.type === 'referral_bonus';
              const isDailyBonus = tx.type === 'daily_bonus';

              return (
                <div
                  key={tx.transactionId}
                  className="glass-card border border-slate-200/70 hover:border-orange-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs transition-all hover:bg-white"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        isReferral
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : isDeposit
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : isPositive
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {isReferral ? (
                        <Gift className="w-4 h-4" />
                      ) : isDeposit ? (
                        <Coins className="w-4 h-4" />
                      ) : isDailyBonus ? (
                        <Sparkles className="w-4 h-4" />
                      ) : isPositive ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-black text-slate-900 leading-tight truncate">
                          {tx.description || (isPositive ? 'Earned Points' : 'Spent Points')}
                        </h4>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                          {tx.type.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-1 flex-wrap">
                        <span>
                          {new Date(tx.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          at{' '}
                          {new Date(tx.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>

                        {tx.referenceId && (
                          <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded text-slate-500 font-mono text-[9px]">
                            <span>Ref: {tx.referenceId.slice(0, 14)}...</span>
                            <button
                              type="button"
                              onClick={() => handleCopyRef(tx.referenceId)}
                              className="text-slate-400 hover:text-slate-700"
                              title="Copy Reference"
                            >
                              {copiedRefId === tx.referenceId ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div
                      className={`font-mono text-xs font-black px-2.5 py-1 rounded-lg border inline-block ${
                        isReferral
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : isDeposit
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : isPositive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {isPositive ? `+${tx.amount}` : `${tx.amount}`} Pts
                    </div>
                    {tx.amountNgn && (
                      <div className="text-[10px] text-slate-500 font-mono font-bold mt-0.5">
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

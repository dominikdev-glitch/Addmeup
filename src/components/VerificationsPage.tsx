import React, { useState, useEffect } from 'react';
import { Ad, Claim, UserProfile } from '../types';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { approveClaim, rejectClaim, autoApprovePendingClaim } from '../lib/transactions';
import { PlatformIcon } from './PlatformIcon';
import { BoostModal } from './BoostModal';
import { getEffectiveAvatar } from '../lib/avatar';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  Check, 
  X, 
  UserCheck, 
  Coins, 
  ExternalLink, 
  Eye, 
  RefreshCw, 
  Filter,
  Rocket,
  Sparkles
} from 'lucide-react';

interface VerificationsPageProps {
  userUid: string | null;
  profile: UserProfile | null;
  onNavigatePost: () => void;
  onNavigateFeed: () => void;
  onNavigateWallet?: () => void;
  onRequireAuth: () => void;
  onToast: (msg: string) => void;
}

export const VerificationsPage: React.FC<VerificationsPageProps> = ({
  userUid,
  profile,
  onNavigatePost,
  onNavigateFeed,
  onNavigateWallet,
  onRequireAuth,
  onToast,
}) => {
  const [subTab, setSubTab] = useState<'incoming' | 'my_ads' | 'my_claims'>('incoming');
  const [incomingClaims, setIncomingClaims] = useState<Claim[]>([]);
  const [myClaims, setMyClaims] = useState<Claim[]>([]);
  const [myAds, setMyAds] = useState<Ad[]>([]);
  const [loadingIncoming, setLoadingIncoming] = useState(true);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [loadingAds, setLoadingAds] = useState(true);
  const [processingClaimId, setProcessingClaimId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified'>('pending');
  const [selectedAdForBoost, setSelectedAdForBoost] = useState<Ad | null>(null);

  // 1. Fetch incoming claims for the current user's ads (Ad Creator view)
  useEffect(() => {
    if (!userUid) {
      setLoadingIncoming(false);
      return;
    }

    setLoadingIncoming(true);
    const q = query(
      collection(db, 'claims'),
      where('adOwnerUid', '==', userUid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const claims: Claim[] = [];
        snapshot.forEach((docSnap) => {
          claims.push({ ...(docSnap.data() as Claim), claimId: docSnap.id });
        });
        // Sort descending by createdAt
        claims.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setIncomingClaims(claims);
        setLoadingIncoming(false);
      },
      (error) => {
        console.error("Error fetching incoming claims:", error);
        setLoadingIncoming(false);
      }
    );

    return () => unsubscribe();
  }, [userUid]);

  // 2. Fetch the user's submitted claims across the platform (Earner view)
  useEffect(() => {
    if (!userUid) {
      setLoadingClaims(false);
      return;
    }

    setLoadingClaims(true);
    const q = query(
      collection(db, 'claims'),
      where('claimerUid', '==', userUid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const claims: Claim[] = [];
        snapshot.forEach((docSnap) => {
          claims.push({ ...(docSnap.data() as Claim), claimId: docSnap.id });
        });
        claims.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setMyClaims(claims);
        setLoadingClaims(false);
      },
      (error) => {
        console.error("Error fetching user claims:", error);
        setLoadingClaims(false);
      }
    );

    return () => unsubscribe();
  }, [userUid]);

  // 3. Fetch user's posted ads
  useEffect(() => {
    if (!userUid) {
      setLoadingAds(false);
      return;
    }

    setLoadingAds(true);
    const q = query(
      collection(db, 'ads'),
      where('userId', '==', userUid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ads: Ad[] = [];
        snapshot.forEach((docSnap) => {
          ads.push({ ...(docSnap.data() as Ad), adId: docSnap.id });
        });
        ads.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setMyAds(ads);
        setLoadingAds(false);
      },
      (error) => {
        console.error("Error fetching user ads:", error);
        setLoadingAds(false);
      }
    );

    return () => unsubscribe();
  }, [userUid]);

  // Actions
  const handleApprove = async (claim: Claim) => {
    if (!userUid) return;
    try {
      setProcessingClaimId(claim.claimId);
      const result = await approveClaim(claim.claimId, userUid);
      if (result.success) {
        onToast(`Approved! +${result.creditsAwarded} Credits released to ${claim.claimerDisplayName}`);
      }
    } catch (err: any) {
      console.error("Approve error:", err);
      onToast(err.message || "Failed to approve claim.");
    } finally {
      setProcessingClaimId(null);
    }
  };

  const handleReject = async (claim: Claim) => {
    if (!userUid) return;
    const confirmReject = window.confirm("Reject this claim? The claimer will not receive credits for this add.");
    if (!confirmReject) return;

    try {
      setProcessingClaimId(claim.claimId);
      await rejectClaim(claim.claimId, userUid, "Verification code or Snapchat handle not found.");
      onToast("Claim rejected.");
    } catch (err: any) {
      console.error("Reject error:", err);
      onToast(err.message || "Failed to reject claim.");
    } finally {
      setProcessingClaimId(null);
    }
  };

  const handleAutoApprove = async (claim: Claim) => {
    if (!userUid) return;
    try {
      setProcessingClaimId(claim.claimId);
      const res = await autoApprovePendingClaim(claim.claimId, userUid);
      if (res.success) {
        onToast(`+${res.creditsAwarded} Credits credited via 24h auto-approval!`);
      }
    } catch (err: any) {
      onToast(err.message || "Auto-approval not available yet.");
    } finally {
      setProcessingClaimId(null);
    }
  };

  const pendingIncomingCount = incomingClaims.filter((c) => c.status === 'pending').length;

  const filteredIncoming = incomingClaims.filter((c) => {
    if (filterStatus === 'pending') return c.status === 'pending';
    if (filterStatus === 'verified') return c.status === 'verified';
    return true;
  });

  return (
    <div className="max-w-md md:max-w-4xl lg:max-w-6xl mx-auto px-3.5 py-4 pb-20 space-y-3.5 text-slate-800">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-orange-600" />
            <span>Verifications & My Ads</span>
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">
            Verify honest adds with codes & handles, manage posted ads, and track claim rewards.
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={onNavigatePost}
          className="self-start sm:self-auto py-1.5 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1 transition-all active:scale-95"
        >
          <span>Post New Ad</span>
        </button>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex items-center gap-1 bg-white/70 p-1 rounded-xl border border-slate-200/80 shadow-2xs overflow-x-auto">
        <button
          onClick={() => setSubTab('incoming')}
          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'incoming'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Incoming Verifications</span>
          {pendingIncomingCount > 0 && (
            <span className="bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
              {pendingIncomingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab('my_ads')}
          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'my_ads'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>My Posted Ads ({myAds.length})</span>
        </button>

        <button
          onClick={() => setSubTab('my_claims')}
          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'my_claims'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>My Earned Claims ({myClaims.length})</span>
        </button>
      </div>

      {/* TAB 1: INCOMING VERIFICATIONS (Ad Creator View) */}
      {subTab === 'incoming' && (
        <div className="space-y-3">
          
          {/* Status Filter Bar & Guidance Box */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-200/70 text-amber-900 flex items-center justify-center flex-shrink-0 text-xs font-black">
                💡
              </div>
              <div className="text-[11px] text-amber-950 font-medium leading-tight">
                <span className="font-bold">How verification works: </span>
                For WhatsApp, match the <span className="font-mono font-bold bg-white/70 px-1 rounded">#Code</span> in your WhatsApp chats. For Snapchat, check your <span className="font-bold">"Added Me"</span> list for the username.
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                  filterStatus === 'pending'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Pending ({pendingIncomingCount})
              </button>
              <button
                onClick={() => setFilterStatus('verified')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                  filterStatus === 'verified'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Verified
              </button>
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                  filterStatus === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                All ({incomingClaims.length})
              </button>
            </div>
          </div>

          {/* List of Incoming Claims */}
          {loadingIncoming ? (
            <div className="py-8 text-center text-slate-500 space-y-2">
              <RefreshCw className="w-5 h-5 mx-auto animate-spin text-orange-500" />
              <p className="text-xs font-medium">Checking for claims on your ads...</p>
            </div>
          ) : filteredIncoming.length === 0 ? (
            <div className="glass-card border border-slate-200/80 rounded-2xl p-6 text-center space-y-2">
              <div className="text-2xl">✨</div>
              <p className="text-xs font-bold text-slate-800">
                {filterStatus === 'pending' ? 'No pending claims to review!' : 'No claims found.'}
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                When users tap to add your Snapchat or WhatsApp ad, their verification code or handle will appear here for 1-click approval.
              </p>
              {myAds.length === 0 && (
                <button
                  onClick={onNavigatePost}
                  className="mt-2 inline-flex items-center gap-1 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-xs"
                >
                  <span>Post your first ad</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredIncoming.map((claim) => {
                const isSnap = claim.platform === 'snapchat';
                const isPending = claim.status === 'pending';
                const isVerified = claim.status === 'verified';
                const isRejected = claim.status === 'rejected';

                return (
                  <div
                    key={claim.claimId}
                    className={`glass-card border rounded-2xl p-3 shadow-2xs space-y-2 transition-all ${
                      isPending ? 'border-orange-200 bg-white/90 ring-1 ring-orange-500/10' : 'border-slate-200/80 bg-white/60'
                    }`}
                  >
                    {/* Top Row: Platform & Ad Title */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={claim.platform} size="xs" badge={true} />
                        <span className="text-[10px] font-black uppercase text-slate-500">
                          {claim.adTitle || 'Promotional Ad'}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        isPending 
                          ? 'bg-amber-50 text-amber-800 border-amber-200' 
                          : isVerified 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {isPending ? '⏳ Needs Verification' : isVerified ? '✅ Approved' : '❌ Rejected'}
                      </span>
                    </div>

                    {/* Verification Details Box */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Claimer:</span>
                        <span className="font-bold text-slate-900">{claim.claimerDisplayName}</span>
                      </div>

                      {/* Verification Code or Snapchat Username */}
                      {isSnap ? (
                        <div className="flex items-center justify-between text-[11px] bg-yellow-50/70 border border-yellow-200/60 p-1.5 rounded-lg">
                          <span className="text-amber-900 font-semibold flex items-center gap-1.5">
                            <PlatformIcon platform="snapchat" size="xs" />
                            <span>Snapchat Username:</span>
                          </span>
                          <span className="font-mono font-black text-amber-950 bg-white/90 px-1.5 py-0.2 rounded border border-amber-300">
                            @{claim.claimerSnapchatHandle?.replace('@', '') || 'unknown'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px] bg-emerald-50/70 border border-emerald-200/60 p-1.5 rounded-lg">
                          <span className="text-emerald-900 font-semibold flex items-center gap-1.5">
                            <PlatformIcon platform="whatsapp" size="xs" />
                            <span>WhatsApp Code in Chat:</span>
                          </span>
                          <span className="font-mono font-black text-emerald-950 bg-white/90 px-1.5 py-0.2 rounded border border-emerald-300">
                            #{claim.verificationCode || 'CODE'}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span>Submitted: {new Date(claim.createdAt).toLocaleDateString()} at {new Date(claim.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="font-bold text-orange-600">+{claim.creditsAwarded || 5} Cr reward</span>
                      </div>
                    </div>

                    {/* Action Buttons for Pending Claims */}
                    {isPending && (
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          onClick={() => handleApprove(claim)}
                          disabled={processingClaimId === claim.claimId}
                          className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black shadow-xs flex items-center justify-center gap-1 transition-all active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{processingClaimId === claim.claimId ? 'Approving...' : 'Confirm & Release'}</span>
                        </button>

                        <button
                          onClick={() => handleReject(claim)}
                          disabled={processingClaimId === claim.claimId}
                          className="py-1.5 px-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg text-[11px] font-bold transition-all"
                        >
                          <X className="w-3.5 h-3.5 inline mr-0.5" />
                          <span>Not Found / Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY POSTED ADS */}
      {subTab === 'my_ads' && (
        <div className="space-y-3">
          {loadingAds ? (
            <div className="py-8 text-center text-slate-500 space-y-2">
              <RefreshCw className="w-5 h-5 mx-auto animate-spin text-orange-500" />
              <p className="text-xs font-medium">Loading your ads...</p>
            </div>
          ) : myAds.length === 0 ? (
            <div className="glass-card border border-slate-200/80 rounded-2xl p-6 text-center space-y-2">
              <p className="text-xs font-bold text-slate-800">You haven't posted any ads yet.</p>
              <p className="text-[11px] text-slate-500">
                Promote your Snapchat handle or WhatsApp group to get instant real adds and customer leads!
              </p>
              <button
                onClick={onNavigatePost}
                className="mt-2 py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black shadow-xs inline-block"
              >
                Post Your First Ad
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {myAds.map((ad) => {
                const isSnap = ad.platform === 'snapchat';
                const now = Date.now();
                const expiresAt = ad.expiresAt || 0;
                const isExpired = ad.status === 'expired' || (expiresAt > 0 && expiresAt <= now);
                const hoursLeft = Math.max(0, Math.round((expiresAt - now) / (1000 * 60 * 60)));

                // Count claims on this ad
                const adClaims = incomingClaims.filter((c) => c.adId === ad.adId);
                const approvedCount = adClaims.filter((c) => c.status === 'verified').length;
                const pendingCount = adClaims.filter((c) => c.status === 'pending').length;

                return (
                  <div
                    key={ad.adId}
                    className="glass-card border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2.5">
                        <div className="relative flex-shrink-0 mt-0.5">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs flex items-center justify-center">
                            <img
                              src={getEffectiveAvatar(ad.avatarUrl, ad.targetHandleOrNumber || ad.title)}
                              alt={ad.title}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-2xs border border-slate-200">
                            <PlatformIcon platform={ad.platform} size="xs" />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              {ad.category}
                            </span>
                          </div>
                          <h3 className="text-xs font-black text-slate-900 mt-0.5 line-clamp-1">
                            {ad.title}
                          </h3>
                          <p className="text-[11px] font-mono text-orange-600 font-bold">
                            {ad.targetHandleOrNumber}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {ad.boostedUntil && ad.boostedUntil > Date.now() && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[9px] font-black uppercase">
                            <Rocket className="w-2.5 h-2.5 text-amber-600" />
                            <span>Boosted</span>
                          </span>
                        )}
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isExpired 
                            ? 'bg-slate-100 text-slate-500 border-slate-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {isExpired ? 'Expired' : `${hoursLeft}h active`}
                        </span>
                      </div>
                    </div>

                    {/* Stats bar */}
                    <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200/60 text-center">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Verified Adds</span>
                        <span className="text-xs font-black text-emerald-600">{approvedCount}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Pending</span>
                        <span className="text-xs font-black text-amber-600">{pendingCount}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Cost</span>
                        <span className="text-xs font-black text-slate-800">{ad.costCredits || 100} Cr</span>
                      </div>
                    </div>

                    {!isExpired && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-500 font-medium">
                          {ad.boostedUntil && ad.boostedUntil > Date.now()
                            ? `⚡ VIP Boost active until ${new Date(ad.boostedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : 'Want more adds? Pin your post to top.'}
                        </span>
                        <button
                          onClick={() => setSelectedAdForBoost(ad)}
                          className="px-3 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:opacity-95 text-white font-black text-[10px] rounded-lg flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                        >
                          <Rocket className="w-3 h-3" />
                          <span>{ad.boostedUntil && ad.boostedUntil > Date.now() ? 'Extend Boost' : 'Boost to Top'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MY EARNED CLAIMS (Earner View) */}
      {subTab === 'my_claims' && (
        <div className="space-y-3">
          {loadingClaims ? (
            <div className="py-8 text-center text-slate-500 space-y-2">
              <RefreshCw className="w-5 h-5 mx-auto animate-spin text-orange-500" />
              <p className="text-xs font-medium">Loading your claimed rewards...</p>
            </div>
          ) : myClaims.length === 0 ? (
            <div className="glass-card border border-slate-200/80 rounded-2xl p-6 text-center space-y-2">
              <p className="text-xs font-bold text-slate-800">You haven't claimed any adds yet.</p>
              <p className="text-[11px] text-slate-500">
                Explore the Feed, tap on ads, and earn +5 credits for every genuine Snapchat or WhatsApp add!
              </p>
              <button
                onClick={onNavigateFeed}
                className="mt-2 py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs inline-block"
              >
                Go to Feed (+5 Cr per add)
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {myClaims.map((claim) => {
                const isSnap = claim.platform === 'snapchat';
                const isPending = claim.status === 'pending';
                const isVerified = claim.status === 'verified';
                const isRejected = claim.status === 'rejected';
                
                const nowMs = Date.now();
                const autoApproveAt = claim.autoApproveAt || 0;
                const canAutoApprove = isPending && autoApproveAt > 0 && nowMs >= autoApproveAt;

                return (
                  <div
                    key={claim.claimId}
                    className="glass-card border border-slate-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <PlatformIcon platform={claim.platform} size="md" badge={true} />

                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {claim.adTitle || 'Promotional Add'}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          <span>Target: <span className="font-mono font-semibold text-slate-600">{claim.targetHandleOrNumber}</span></span>
                          {isSnap && claim.claimerSnapchatHandle && (
                            <span>• Via: @{claim.claimerSnapchatHandle.replace('@', '')}</span>
                          )}
                          {!isSnap && claim.verificationCode && (
                            <span>• Code: #{claim.verificationCode}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        isPending 
                          ? 'bg-amber-50 text-amber-800 border-amber-200' 
                          : isVerified 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {isPending ? '⏳ Awaiting Review' : isVerified ? '+5 Credits Earned 🪙' : 'Rejected'}
                      </span>

                      {canAutoApprove && (
                        <button
                          onClick={() => handleAutoApprove(claim)}
                          disabled={processingClaimId === claim.claimId}
                          className="text-[10px] bg-orange-500 hover:bg-orange-600 text-white font-bold px-2 py-0.5 rounded-md shadow-2xs"
                        >
                          Auto-Claim (+5 Cr)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Boost Modal */}
      {selectedAdForBoost && (
        <BoostModal
          isOpen={!!selectedAdForBoost}
          onClose={() => setSelectedAdForBoost(null)}
          ad={selectedAdForBoost}
          userUid={userUid || ''}
          userBalance={profile?.creditBalance || 0}
          onBoostSuccess={(boostedUntil) => {
            onToast("🚀 Post Boost Activated! Your ad is now pinned to the top of the feed.");
            setMyAds(prev => prev.map(a => a.adId === selectedAdForBoost.adId ? { ...a, isBoosted: true, boostedUntil } : a));
          }}
          onOpenWallet={onNavigateWallet}
        />
      )}

    </div>
  );
};

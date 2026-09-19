import React, { useState, useEffect } from 'react';
import { Ad, CategoryType, PlatformType, UserProfile } from '../types';
import { AdCard } from './AdCard';
import { AddModal } from './AddModal';
import { ReportModal } from './ReportModal';
import { BoostModal } from './BoostModal';
import { PlatformIcon } from './PlatformIcon';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  limit,
  getDocs 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Search, PlusCircle, Filter, RefreshCw, Rocket, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../lib/device';

interface FeedPageProps {
  userUid: string | null;
  profile: UserProfile | null;
  onNavigatePost: () => void;
  onNavigateWallet?: () => void;
  onRequireAuth: () => void;
  onToast: (msg: string) => void;
}

export const FeedPage: React.FC<FeedPageProps> = ({
  userUid,
  profile,
  onNavigatePost,
  onNavigateWallet,
  onRequireAuth,
  onToast,
}) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [claimedAdIds, setClaimedAdIds] = useState<Set<string>>(new Set());
  const [hiddenAdIds, setHiddenAdIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAdForModal, setSelectedAdForModal] = useState<Ad | null>(null);
  const [selectedAdForReport, setSelectedAdForReport] = useState<Ad | null>(null);
  const [selectedAdForBoost, setSelectedAdForBoost] = useState<Ad | null>(null);

  // 1. Fetch live active ads
  useEffect(() => {
    setLoading(true);
    const adsRef = collection(db, 'ads');
    // Query active ads using single-field filter to avoid requiring manual composite indexes
    const q = query(
      adsRef,
      where('status', '==', 'active'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const list: Ad[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const expiresAtMs = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : Number(data.expiresAt || 0);
        // Only include non-expired ads
        if (expiresAtMs > now) {
          const boostedUntilMs = data.boostedUntil?.toMillis ? data.boostedUntil.toMillis() : Number(data.boostedUntil || 0);
          const isBoosted = boostedUntilMs > now;

          list.push({
            adId: docSnap.id,
            userId: data.userId,
            title: data.title || 'Promotional Ad',
            category: data.category || 'Friends',
            platform: data.platform || 'snapchat',
            targetHandleOrNumber: data.targetHandleOrNumber || '',
            rewardPerAdd: Number(data.rewardPerAdd || 5),
            status: data.status || 'active',
            expiresAt: expiresAtMs,
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Number(data.createdAt || Date.now()),
            userDisplayName: data.userDisplayName || 'User',
            avatarUrl: data.avatarUrl || data.photoUrl || undefined,
            reportsCount: Number(data.reportsCount || 0),
            isBoosted,
            boostedUntil: boostedUntilMs > 0 ? boostedUntilMs : undefined,
            boostTier: data.boostTier,
          });
        }
      });
      // Sort in memory: boosted ads at top, then newest ads first
      list.sort((a, b) => {
        if (a.isBoosted && !b.isBoosted) return -1;
        if (!a.isBoosted && b.isBoosted) return 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      setAds(list);
      setLoading(false);
    }, (err) => {
      console.error("Firestore ads query error:", err);
      // Fallback in case of index issues: fetch recent ads without filter and filter in memory
      const fallbackQ = query(adsRef, limit(100));
      getDocs(fallbackQ).then((fallbackSnap) => {
        const now = Date.now();
        const fallbackList: Ad[] = [];
        fallbackSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status !== 'active') return;
          const expiresAtMs = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : Number(data.expiresAt || 0);
          if (expiresAtMs <= now) return;
          const boostedUntilMs = data.boostedUntil?.toMillis ? data.boostedUntil.toMillis() : Number(data.boostedUntil || 0);
          const isBoosted = boostedUntilMs > now;
          fallbackList.push({
            adId: docSnap.id,
            userId: data.userId,
            title: data.title || 'Promotional Ad',
            category: data.category || 'Friends',
            platform: data.platform || 'snapchat',
            targetHandleOrNumber: data.targetHandleOrNumber || '',
            rewardPerAdd: Number(data.rewardPerAdd || 5),
            status: data.status || 'active',
            expiresAt: expiresAtMs,
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Number(data.createdAt || Date.now()),
            userDisplayName: data.userDisplayName || 'User',
            avatarUrl: data.avatarUrl || data.photoUrl || undefined,
            reportsCount: Number(data.reportsCount || 0),
            isBoosted,
            boostedUntil: boostedUntilMs > 0 ? boostedUntilMs : undefined,
            boostTier: data.boostTier,
          });
        });
        fallbackList.sort((a, b) => {
          if (a.isBoosted && !b.isBoosted) return -1;
          if (!a.isBoosted && b.isBoosted) return 1;
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
        setAds(fallbackList);
      }).catch((fallbackErr) => {
        console.error("Firestore fallback query error:", fallbackErr);
      }).finally(() => {
        setLoading(false);
      });
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch live claims for current logged-in user
  useEffect(() => {
    if (!userUid) {
      setClaimedAdIds(new Set());
      return;
    }

    const claimsRef = collection(db, 'claims');
    const q = query(claimsRef, where('claimerUid', '==', userUid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const claimedSet = new Set<string>();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.adId) {
          claimedSet.add(data.adId);
        }
      });
      setClaimedAdIds(claimedSet);
    }, (err) => {
      console.error("Firestore claims error:", err);
    });

    return () => unsubscribe();
  }, [userUid]);

  // Filter ads based on search, category, platform, and hidden state
  const categories = ['All', 'Friends', 'Business', 'Tech', 'Fashion', 'Services'];

  const filteredAds = ads.filter((ad) => {
    if (hiddenAdIds.has(ad.adId)) return false;
    const matchesCategory = selectedCategory === 'All' || ad.category === selectedCategory;
    const matchesPlatform = selectedPlatform === 'All' || ad.platform === selectedPlatform;
    const queryLower = searchQuery.toLowerCase().trim();
    const matchesSearch = !queryLower || 
      ad.title.toLowerCase().includes(queryLower) || 
      ad.targetHandleOrNumber.toLowerCase().includes(queryLower) ||
      ad.category.toLowerCase().includes(queryLower);

    return matchesCategory && matchesPlatform && matchesSearch;
  });

  // Sort: Boosted active ads first, then by remaining boost time, then normal ads by createdAt desc
  const sortedFilteredAds = [...filteredAds].sort((a, b) => {
    const now = Date.now();
    const aBoosted = Boolean(a.boostedUntil && a.boostedUntil > now);
    const bBoosted = Boolean(b.boostedUntil && b.boostedUntil > now);

    if (aBoosted && !bBoosted) return -1;
    if (!aBoosted && bBoosted) return 1;

    if (aBoosted && bBoosted) {
      return (b.boostedUntil || 0) - (a.boostedUntil || 0);
    }

    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  const boostedCount = sortedFilteredAds.filter(a => a.boostedUntil && a.boostedUntil > Date.now()).length;

  return (
    <div className="space-y-3 pb-20 max-w-md md:max-w-4xl lg:max-w-6xl mx-auto px-3.5 pt-3">
      {/* Desktop & Mobile Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
        {/* Search Input */}
        <div className="relative md:col-span-6">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search handles, keywords, topics..."
            className="w-full bg-white/80 border border-orange-200/60 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-all shadow-2xs"
          />
        </div>

        {/* Platform Tabs */}
        <div className="flex items-center gap-1.5 glass-card p-1 rounded-xl border border-slate-200/60 md:col-span-6">
          <button
            onClick={() => {
              triggerHaptic('light');
              setSelectedPlatform('All');
            }}
            className={`flex-1 py-1.5 text-[11px] font-extrabold rounded-lg transition-all ${
              selectedPlatform === 'All'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Platforms
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              setSelectedPlatform('snapchat');
            }}
            className={`flex-1 py-1.5 text-[11px] font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              selectedPlatform === 'snapchat'
                ? 'bg-yellow-400 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 hover:text-yellow-700'
            }`}
          >
            <PlatformIcon platform="snapchat" size="sm" />
            <span>Snapchat</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              setSelectedPlatform('whatsapp');
            }}
            className={`flex-1 py-1.5 text-[11px] font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              selectedPlatform === 'whatsapp'
                ? 'bg-emerald-600 text-white font-black shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <PlatformIcon platform="whatsapp" size="sm" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Category Pills (Horizontal Scroll) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              triggerHaptic('light');
              setSelectedCategory(cat);
            }}
            className={`px-3 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap transition-all border ${
              selectedCategory === cat
                ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                : 'bg-white/80 text-slate-600 border-slate-200/80 hover:border-orange-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Feed List */}
      {loading ? (
        <div className="py-10 text-center text-slate-500 space-y-2">
          <RefreshCw className="w-6 h-6 mx-auto animate-spin text-orange-500" />
          <p className="text-xs font-semibold">Loading live ads...</p>
        </div>
      ) : sortedFilteredAds.length === 0 ? (
        <div className="glass-card border border-orange-200/70 rounded-2xl p-6 text-center space-y-3 my-4">
          <div className="w-12 h-12 bg-orange-100/80 rounded-xl mx-auto flex items-center justify-center text-2xl shadow-2xs">
            📣
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">No active ads match your filter</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs mx-auto font-medium">
              Be the first to share your Snapchat handle or WhatsApp business number!
            </p>
          </div>
          <button
            onClick={onNavigatePost}
            className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-xs inline-flex items-center gap-1.5 transition-transform active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Post Ad (6 Hours)</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-600 px-1 font-bold">
            <div className="flex items-center gap-2">
              <span>Live Social Ads ({sortedFilteredAds.length})</span>
              {boostedCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[10px] font-black border border-amber-300">
                  <Rocket className="w-2.5 h-2.5 text-amber-600" />
                  <span>{boostedCount} VIP Boosted</span>
                </span>
              )}
            </div>
            <span className="text-orange-600 font-extrabold">+5 Credits per Add</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedFilteredAds.map((ad) => (
              <AdCard
                key={ad.adId}
                ad={ad}
                currentUserId={userUid}
                isClaimed={claimedAdIds.has(ad.adId)}
                onSelectAd={(selectedAd) => {
                  if (!userUid) {
                    onRequireAuth();
                  } else {
                    setSelectedAdForModal(selectedAd);
                  }
                }}
                onBoostAd={(selectedAd) => {
                  if (!userUid) {
                    onRequireAuth();
                  } else {
                    setSelectedAdForBoost(selectedAd);
                  }
                }}
                onReportAd={(selectedAd) => {
                  if (!userUid) {
                    onRequireAuth();
                  } else {
                    setSelectedAdForReport(selectedAd);
                  }
                }}
              />
            ))}
          </div>
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
          onBoostSuccess={(boostedUntil, newBalance) => {
            onToast("🚀 Post Boost Activated! Your ad is now pinned to the top of the feed.");
            // Update local state if needed
            setAds(prev => prev.map(a => a.adId === selectedAdForBoost.adId ? { ...a, isBoosted: true, boostedUntil } : a));
          }}
          onOpenWallet={onNavigateWallet}
        />
      )}

      {/* Add & Claim Modal */}
      {selectedAdForModal && (
        <AddModal
          ad={selectedAdForModal}
          userId={userUid}
          profile={profile}
          onClose={() => setSelectedAdForModal(null)}
          onSuccessClaim={(amount) => {
            onToast(`Verification submitted! You'll receive +${amount} Credits upon approval. 🪙`);
          }}
          onRequireAuth={onRequireAuth}
        />
      )}

      {/* Report Modal */}
      {selectedAdForReport && (
        <ReportModal
          isOpen={!!selectedAdForReport}
          onClose={() => setSelectedAdForReport(null)}
          ad={selectedAdForReport}
          userUid={userUid}
          onReportSubmitted={() => {
            if (selectedAdForReport) {
              setHiddenAdIds((prev) => new Set([...prev, selectedAdForReport.adId]));
            }
            onToast("Thank you. Report submitted and ad hidden from your feed.");
          }}
        />
      )}
    </div>
  );
};

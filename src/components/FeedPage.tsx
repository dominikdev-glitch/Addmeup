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
import { 
  Search, 
  PlusCircle, 
  RefreshCw, 
  Rocket,
  Flame 
} from 'lucide-react';
import { triggerHaptic } from '../lib/device';

interface FeedPageProps {
  userUid: string | null;
  profile: UserProfile | null;
  onNavigatePost: () => void;
  onNavigateWallet?: () => void;
  onRequireAuth: () => void;
  onToast: (msg: string) => void;
  onOpenMyAds?: () => void;
  onOpenDailyBonus?: () => void;
  allAds?: Ad[];
}

export const FeedPage: React.FC<FeedPageProps> = ({
  userUid,
  profile,
  onNavigatePost,
  onNavigateWallet,
  onRequireAuth,
  onToast,
  onOpenMyAds,
  onOpenDailyBonus,
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
    // Fetch active & paused ads
    const q = query(
      adsRef,
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const fetchedAds: Ad[] = [];
      snapshot.forEach((doc) => {
        try {
          const raw = doc.data() as any;
          if (!raw) return;

          // Safely resolve expiresAt whether it is a number, Timestamp, or string
          let exp = 0;
          if (typeof raw.expiresAt === 'number') {
            exp = raw.expiresAt;
          } else if (raw.expiresAt && typeof raw.expiresAt.toMillis === 'function') {
            exp = raw.expiresAt.toMillis();
          } else if (typeof raw.expiresAt === 'string') {
            exp = Number(raw.expiresAt) || 0;
          }

          // Keep active or paused ads
          const status = raw.status || 'active';
          if ((status === 'active' || status === 'paused') && exp > now) {
            // Normalize imageUrl if it was stored as an object
            let cleanImageUrl = raw.imageUrl;
            if (typeof raw.imageUrl === 'object' && raw.imageUrl !== null) {
              cleanImageUrl = raw.imageUrl.dataUrl || raw.imageUrl.url || undefined;
            }

            // Normalize avatarUrl if it was stored as an object
            let cleanAvatarUrl = raw.avatarUrl;
            if (typeof raw.avatarUrl === 'object' && raw.avatarUrl !== null) {
              cleanAvatarUrl = raw.avatarUrl.dataUrl || raw.avatarUrl.url || undefined;
            }

            fetchedAds.push({
              ...raw,
              adId: raw.adId || doc.id,
              status,
              expiresAt: exp,
              imageUrl: cleanImageUrl,
              avatarUrl: cleanAvatarUrl,
              title: typeof raw.title === 'string' ? raw.title : 'Social Ad',
              targetHandleOrNumber: typeof raw.targetHandleOrNumber === 'string' ? raw.targetHandleOrNumber : '',
              platform: raw.platform === 'whatsapp' ? 'whatsapp' : 'snapchat',
              category: raw.category || 'Friends',
            } as Ad);
          }
        } catch (err) {
          console.warn("Error parsing ad document:", doc.id, err);
        }
      });
      setAds(fetchedAds);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching live ads:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch user's claimed ads
  useEffect(() => {
    if (!userUid) {
      setClaimedAdIds(new Set());
      return;
    }

    const claimsRef = collection(db, 'claims');
    const q = query(claimsRef, where('claimerUid', '==', userUid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ids = new Set<string>();
      snapshot.forEach((doc) => {
        const claim = doc.data();
        if (claim.adId) {
          ids.add(claim.adId);
        }
      });
      setClaimedAdIds(ids);
    });

    return () => unsubscribe();
  }, [userUid]);

  const categories: string[] = [
    'All',
    'General',
    'Gaming',
    'Fitness',
    'Crypto',
    'Music',
    'Students',
    'Business',
    'Dating',
    'Fashion',
    'Travel'
  ];

  // Filter Ads
  const filteredAds = ads.filter((ad) => {
    if (hiddenAdIds.has(ad.adId)) return false;

    // Platform Filter
    if (selectedPlatform !== 'All' && ad.platform !== selectedPlatform) {
      return false;
    }

    // Category Filter
    if (selectedCategory !== 'All' && ad.category !== selectedCategory) {
      return false;
    }

    // Search Query Filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = ad.title.toLowerCase().includes(q);
      const matchHandle = ad.targetHandleOrNumber.toLowerCase().includes(q);
      const matchCategory = ad.category.toLowerCase().includes(q);
      if (!matchTitle && !matchHandle && !matchCategory) {
        return false;
      }
    }

    return true;
  });

  // Sort: Boosted VIP first, then newest
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
            <span className="text-orange-600 font-extrabold">+5 Points per Add</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
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
          onBoostSuccess={(boostedUntil) => {
            onToast("🚀 Post Boost Activated! Your ad is now pinned to the top of the feed.");
            // Update local state
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
            onToast(`Verification submitted! You'll receive +${amount} Points upon approval. 🪙`);
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
          reporterUid={userUid}
          onToast={onToast}
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

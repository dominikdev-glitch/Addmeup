import { CategoryType, PlatformType, AdDurationType, Ad } from '../types';

export interface AdDraft {
  platform: PlatformType;
  title: string;
  description: string;
  targetHandleOrNumber: string;
  category: CategoryType;
  durationId: AdDurationType;
  imageUrl?: string;
  avatarUrl?: string;
  lastSavedAt: number;
}

export interface SavedExpiredAd {
  adId: string;
  title: string;
  description?: string;
  platform: PlatformType;
  targetHandleOrNumber: string;
  category: CategoryType;
  imageUrl?: string;
  avatarUrl?: string;
  rewardPerAdd?: number;
  expiredAt: number;
  savedAt: number;
  stats?: {
    views: number;
    clicks: number;
    likes: number;
  };
}

const DRAFT_PREFIX = 'addmeup_ad_draft_';
const EXPIRED_PREFIX = 'addmeup_expired_ads_';

/**
 * Save incomplete draft to localStorage
 */
export function saveAdDraft(userId: string | null | undefined, draft: Omit<AdDraft, 'lastSavedAt'>): void {
  try {
    const key = `${DRAFT_PREFIX}${userId || 'guest'}`;
    const payload: AdDraft = {
      ...draft,
      lastSavedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.warn("Failed to save ad draft to localStorage:", err);
  }
}

/**
 * Retrieve incomplete draft from localStorage
 */
export function getAdDraft(userId: string | null | undefined): AdDraft | null {
  try {
    const key = `${DRAFT_PREFIX}${userId || 'guest'}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored) as AdDraft;
  } catch (err) {
    console.warn("Failed to retrieve ad draft from localStorage:", err);
    return null;
  }
}

/**
 * Clear draft from localStorage
 */
export function clearAdDraft(userId: string | null | undefined): void {
  try {
    const key = `${DRAFT_PREFIX}${userId || 'guest'}`;
    localStorage.removeItem(key);
  } catch (err) {
    console.warn("Failed to clear ad draft from localStorage:", err);
  }
}

/**
 * Save a single expired ad into local storage cache
 */
export function saveExpiredAdToLocalStorage(userId: string | null | undefined, ad: Ad): void {
  try {
    const key = `${EXPIRED_PREFIX}${userId || 'guest'}`;
    const existing = getExpiredAdsFromLocalStorage(userId);
    
    // Check if already exists, update or prepend
    const updated = existing.filter(e => e.adId !== ad.adId);
    const item: SavedExpiredAd = {
      adId: ad.adId,
      title: ad.title,
      description: ad.description,
      platform: ad.platform,
      targetHandleOrNumber: ad.targetHandleOrNumber,
      category: ad.category,
      imageUrl: ad.imageUrl,
      avatarUrl: ad.avatarUrl,
      rewardPerAdd: ad.rewardPerAdd || 5,
      expiredAt: ad.expiresAt || Date.now(),
      savedAt: Date.now(),
      stats: {
        views: ad.viewsCount || 0,
        clicks: ad.clicksCount || 0,
        likes: ad.likesCount || 0,
      }
    };

    updated.unshift(item);
    // Keep max 25 saved expired ads in localStorage
    localStorage.setItem(key, JSON.stringify(updated.slice(0, 25)));
  } catch (err) {
    console.warn("Failed to save expired ad to localStorage:", err);
  }
}

/**
 * Batch save expired ads into localStorage
 */
export function syncExpiredAdsToLocalStorage(userId: string | null | undefined, ads: Ad[]): void {
  try {
    const key = `${EXPIRED_PREFIX}${userId || 'guest'}`;
    const existing = getExpiredAdsFromLocalStorage(userId);
    const existingMap = new Map<string, SavedExpiredAd>(existing.map(e => [e.adId, e]));

    const now = Date.now();
    for (const ad of ads) {
      const isExpired = ad.status === 'expired' || (ad.expiresAt && ad.expiresAt <= now);
      if (isExpired) {
        existingMap.set(ad.adId, {
          adId: ad.adId,
          title: ad.title,
          description: ad.description,
          platform: ad.platform,
          targetHandleOrNumber: ad.targetHandleOrNumber,
          category: ad.category,
          imageUrl: ad.imageUrl,
          avatarUrl: ad.avatarUrl,
          rewardPerAdd: ad.rewardPerAdd || 5,
          expiredAt: ad.expiresAt || now,
          savedAt: Date.now(),
          stats: {
            views: ad.viewsCount || 0,
            clicks: ad.clicksCount || 0,
            likes: ad.likesCount || 0,
          }
        });
      }
    }

    const merged = Array.from(existingMap.values()).sort((a, b) => b.savedAt - a.savedAt);
    localStorage.setItem(key, JSON.stringify(merged.slice(0, 25)));
  } catch (err) {
    console.warn("Failed to sync expired ads to localStorage:", err);
  }
}

/**
 * Get all expired ads from localStorage for this user
 */
export function getExpiredAdsFromLocalStorage(userId: string | null | undefined): SavedExpiredAd[] {
  try {
    const key = `${EXPIRED_PREFIX}${userId || 'guest'}`;
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    return JSON.parse(stored) as SavedExpiredAd[];
  } catch (err) {
    console.warn("Failed to read expired ads from localStorage:", err);
    return [];
  }
}

/**
 * Remove an expired ad template from local storage
 */
export function removeExpiredAdFromLocalStorage(userId: string | null | undefined, adId: string): void {
  try {
    const key = `${EXPIRED_PREFIX}${userId || 'guest'}`;
    const existing = getExpiredAdsFromLocalStorage(userId);
    const filtered = existing.filter(e => e.adId !== adId);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (err) {
    console.warn("Failed to remove expired ad from localStorage:", err);
  }
}

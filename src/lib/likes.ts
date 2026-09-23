import { doc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const LOCAL_STORAGE_LIKES_KEY = 'addmeup_liked_ads';
const LOCAL_STORAGE_VISITOR_KEY = 'addmeup_visitor_id';

/**
 * Get or generate a persistent visitor / user identifier.
 * Works seamlessly for both authenticated users and guests,
 * so ANY user can like or thumbs-up an ad.
 */
export function getVisitorOrUserId(currentUserId?: string | null): string {
  if (currentUserId && currentUserId.trim().length > 0) {
    return currentUserId.trim();
  }

  try {
    let visitorId = localStorage.getItem(LOCAL_STORAGE_VISITOR_KEY);
    if (!visitorId) {
      visitorId = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem(LOCAL_STORAGE_VISITOR_KEY, visitorId);
    }
    return visitorId;
  } catch {
    return 'v_anon_' + Date.now().toString(36);
  }
}

/**
 * Check if the user has already liked this ad from local cache.
 */
export function isAdLikedLocally(adId: string): boolean {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LIKES_KEY);
    if (!raw) return false;
    const list: string[] = JSON.parse(raw);
    return Array.isArray(list) && list.includes(adId);
  } catch {
    return false;
  }
}

/**
 * Record like state in local storage for instantaneous UI response.
 */
export function setAdLikedLocally(adId: string, liked: boolean): void {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LIKES_KEY);
    let list: string[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    if (liked) {
      if (!list.includes(adId)) {
        list.push(adId);
      }
    } else {
      list = list.filter(id => id !== adId);
    }
    localStorage.setItem(LOCAL_STORAGE_LIKES_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn("Could not cache like state to localStorage", err);
  }
}

/**
 * Toggle like/thumbs on an ad in Firestore.
 * Increases or decreases likesCount atomically.
 * Returns { liked: boolean; newLikesCount: number }
 */
export async function toggleAdLikeInFirestore(
  adId: string,
  userIdOrVisitorId: string
): Promise<{ liked: boolean; newLikesCount: number }> {
  if (!adId) {
    throw new Error("Missing ad ID");
  }

  const identity = userIdOrVisitorId || getVisitorOrUserId();
  const safeDocKey = `${adId}_${identity.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const likeRef = doc(db, 'ad_likes', safeDocKey);
  const adRef = doc(db, 'ads', adId);

  return await runTransaction(db, async (tx) => {
    const [likeSnap, adSnap] = await Promise.all([
      tx.get(likeRef),
      tx.get(adRef),
    ]);

    if (!adSnap.exists()) {
      throw new Error("Ad not found");
    }

    const currentLikes = Math.max(0, Number(adSnap.data().likesCount || 0));

    if (likeSnap.exists()) {
      // Unlike
      tx.delete(likeRef);
      const newCount = Math.max(0, currentLikes - 1);
      tx.update(adRef, { likesCount: newCount });
      return { liked: false, newLikesCount: newCount };
    } else {
      // Like
      tx.set(likeRef, {
        likeId: safeDocKey,
        adId,
        userId: identity,
        createdAt: Date.now(),
      });
      const newCount = currentLikes + 1;
      tx.update(adRef, { likesCount: newCount });
      return { liked: true, newLikesCount: newCount };
    }
  });
}

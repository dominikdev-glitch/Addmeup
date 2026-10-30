import { 
  runTransaction, 
  doc, 
  collection, 
  serverTimestamp,
  getDocs,
  query,
  where,
  limit as fsLimit,
  updateDoc,
  deleteDoc,
  increment
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  PlatformType, 
  CategoryType, 
  AdDurationType, 
  AdDurationConfig, 
  BoostPackage,
  DepositPackage,
  ReportReason,
  AdReport
} from '../types';
import { sendNotification } from './notifications';

export const AD_DURATIONS: AdDurationConfig[] = [
  { id: '6h', label: '6 Hours', durationHours: 6, costCredits: 100 },
  { id: '12h', label: '12 Hours', durationHours: 12, costCredits: 200 },
  { id: '24h', label: '24 Hours', durationHours: 24, costCredits: 450, tag: '1 Day' },
  { id: '7d', label: '7 Days', durationHours: 168, costCredits: 2500, tag: 'Popular', isPopular: true },
  { id: '30d', label: '1 Month', durationHours: 720, costCredits: 9000, tag: 'Mega Growth' },
];

export const BOOST_PACKAGES: BoostPackage[] = [
  { id: 'boost_1h', label: '1 Hour Flash', durationHours: 1, costCredits: 25, tag: 'Quick Pin' },
  { id: 'boost_3h', label: '3 Hours Peak', durationHours: 3, costCredits: 60, tag: 'Popular', isPopular: true },
  { id: 'boost_6h', label: '6 Hours Power', durationHours: 6, costCredits: 100, tag: 'High Reach' },
  { id: 'boost_24h', label: '24 Hours Mega VIP', durationHours: 24, costCredits: 300, tag: 'Best Value' },
];

export const DEPOSIT_PACKAGES: DepositPackage[] = [
  { id: 'pkg_10', credits: 10, priceNgn: 100, label: 'Micro Test Pack', bonusCredits: 0 },
  { id: 'pkg_100', credits: 100, priceNgn: 1000, label: 'Starter Pack', bonusCredits: 0 },
  { id: 'pkg_200', credits: 200, priceNgn: 2000, label: '12-Hour Ad Pack', bonusCredits: 0 },
  { id: 'pkg_450', credits: 450, priceNgn: 4500, label: '24-Hour Full Day', bonusCredits: 0, popular: true },
  { id: 'pkg_1000', credits: 1000, priceNgn: 9500, label: 'Growth Pack', bonusCredits: 50 },
  { id: 'pkg_2500', credits: 2500, priceNgn: 23500, label: '7-Day Campaign', bonusCredits: 150 },
  { id: 'pkg_9000', credits: 9000, priceNgn: 80000, label: '1-Month Mega VIP', bonusCredits: 1000, bestValue: true },
];

/**
 * Generate a distinct 6-character verification code for WhatsApp verification.
 * e.g., "AD-8492"
 */
export function generateVerificationCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `AD-${digits}`;
}

/**
 * Submits a verification claim after user performs the add on Snapchat or WhatsApp.
 * Status is set to 'pending' awaiting ad poster verification or auto-approval.
 */
export async function submitClaimVerification(params: {
  ad: {
    adId: string;
    userId: string;
    title: string;
    platform: PlatformType;
    targetHandleOrNumber: string;
    rewardPerAdd?: number;
    status: string;
    expiresAt?: number | any;
  };
  claimerUid: string;
  claimerDisplayName: string;
  verificationCode?: string; // For WhatsApp
  claimerSnapchatHandle?: string; // For Snapchat
  proofImageUrl?: string; // Optional screenshot proof
}): Promise<{ success: boolean; claimId: string; status: 'pending' | 'verified'; creditsAwarded: number }> {
  const { ad, claimerUid, claimerDisplayName, verificationCode, claimerSnapchatHandle, proofImageUrl } = params;

  if (!ad.adId || !claimerUid) {
    throw new Error("Sign in to get started");
  }

  if (ad.userId === claimerUid) {
    throw new Error("You cannot claim rewards on your own ad.");
  }

  const claimDocId = `${ad.adId}_${claimerUid}`;
  const claimRef = doc(db, 'claims', claimDocId);
  const adRef = doc(db, 'ads', ad.adId);

  const res = await runTransaction(db, async (transaction) => {
    // 1. Check if user already submitted a claim
    const claimSnap = await transaction.get(claimRef);
    if (claimSnap.exists()) {
      const existingData = claimSnap.data();
      if (existingData.status === 'verified') {
        throw new Error("You already claimed credits for this ad!");
      } else if (existingData.status === 'pending') {
        throw new Error("You have already submitted a pending verification for this ad.");
      }
    }

    // 2. Fetch ad document & verify active status
    const adSnap = await transaction.get(adRef);
    if (!adSnap.exists()) {
      throw new Error("This ad has ended or is no longer available.");
    }

    const adData = adSnap.data();
    const nowMs = Date.now();
    const expiresAtMs = adData.expiresAt?.toMillis ? adData.expiresAt.toMillis() : Number(adData.expiresAt || 0);

    if (adData.status !== 'active' || (expiresAtMs > 0 && expiresAtMs <= nowMs)) {
      throw new Error("This ad has ended");
    }

    const rewardAmount = Number(adData.rewardPerAdd || 5);
    const autoApproveAt = nowMs + 24 * 60 * 60 * 1000; // 24 hours safeguard

    // 3. Create pending claim record
    transaction.set(claimRef, {
      claimId: claimDocId,
      adId: ad.adId,
      adOwnerUid: ad.userId,
      adTitle: ad.title,
      platform: ad.platform,
      targetHandleOrNumber: ad.targetHandleOrNumber,
      claimerUid,
      claimerDisplayName: claimerDisplayName || 'Social Member',
      verificationCode: verificationCode || null,
      claimerSnapchatHandle: claimerSnapchatHandle || null,
      proofImageUrl: proofImageUrl || null,
      status: 'pending',
      creditsAwarded: rewardAmount,
      createdAt: nowMs,
      autoApproveAt,
    });

    return {
      success: true,
      claimId: claimDocId,
      status: 'pending' as const,
      creditsAwarded: rewardAmount,
      adOwnerUid: ad.userId,
      adTitle: ad.title,
    };
  });

  // Trigger in-app notification to ad owner
  if (res.success && res.adOwnerUid) {
    sendNotification({
      userId: res.adOwnerUid,
      title: 'New Verification Claim',
      message: `${claimerDisplayName || 'A user'} claimed adding your ${ad.platform === 'snapchat' ? 'Snapchat' : 'WhatsApp'} ad (${ad.title}). Review in Verifications.`,
      type: 'claim_received',
      linkTab: 'verifications',
      meta: { claimId: claimDocId, adId: ad.adId },
    }).catch(console.error);
  }

  return {
    success: res.success,
    claimId: res.claimId,
    status: res.status,
    creditsAwarded: res.creditsAwarded,
  };
}

/**
 * Approve a pending claim (called by the Ad Owner or auto-release).
 * Releases credits to the claimer atomically and records transaction.
 */
export async function approveClaim(
  claimId: string, 
  reviewerUid: string
): Promise<{ success: boolean; creditsAwarded: number; claimerUid: string }> {
  if (!claimId || !reviewerUid) {
    throw new Error("Authentication required");
  }

  const claimRef = doc(db, 'claims', claimId);

  const res = await runTransaction(db, async (transaction) => {
    const claimSnap = await transaction.get(claimRef);
    if (!claimSnap.exists()) {
      throw new Error("Claim record not found");
    }

    const claimData = claimSnap.data();

    // Verify reviewer is the ad owner
    if (claimData.adOwnerUid !== reviewerUid) {
      throw new Error("Only the creator of this ad can verify and approve claims.");
    }

    if (claimData.status === 'verified') {
      throw new Error("This claim is already approved and credited.");
    }

    const claimerRef = doc(db, 'users', claimData.claimerUid);
    const reviewerRef = doc(db, 'users', reviewerUid);

    // Execute ALL reads before any writes
    const claimerSnap = await transaction.get(claimerRef);
    let currentBalance = 0;
    if (claimerSnap.exists()) {
      currentBalance = Number(claimerSnap.data().creditBalance || 0);
    }

    const reviewerSnap = await transaction.get(reviewerRef);
    const prevApproved = reviewerSnap.exists() ? Number(reviewerSnap.data().approvedClaimsCount || 0) : 0;
    const prevTotal = reviewerSnap.exists() ? Number(reviewerSnap.data().totalClaimsCount || 0) : 0;

    const rewardAmount = Number(claimData.creditsAwarded || 5);
    const newBalance = currentBalance + rewardAmount;
    const nowMs = Date.now();

    // 1. Credit the claimer's balance
    transaction.set(claimerRef, {
      creditBalance: newBalance,
    }, { merge: true });

    // 2. Mark claim as verified
    transaction.update(claimRef, {
      status: 'verified',
      verifiedAt: nowMs,
    });

    // 3. Update creator's reliability statistics
    transaction.set(reviewerRef, {
      approvedClaimsCount: prevApproved + 1,
      totalClaimsCount: prevTotal + 1,
    }, { merge: true });

    // 4. Log credit transaction for earner
    const transRef = doc(collection(db, 'transactions'));
    transaction.set(transRef, {
      transactionId: transRef.id,
      userId: claimData.claimerUid,
      amount: rewardAmount,
      type: 'earned_ad_click',
      referenceId: claimData.adId,
      description: `Verified add on ${claimData.platform === 'snapchat' ? 'Snapchat' : 'WhatsApp'} (${claimData.adTitle || 'Ad'})`,
      createdAt: serverTimestamp(),
    });

    return {
      success: true,
      creditsAwarded: rewardAmount,
      claimerUid: claimData.claimerUid,
      adTitle: claimData.adTitle,
    };
  });

  // Notify the earner that their claim was approved
  if (res.success && res.claimerUid) {
    sendNotification({
      userId: res.claimerUid,
      title: 'Claim Approved! +Points Added',
      message: `Your add on "${res.adTitle || 'Ad'}" was approved! +${res.creditsAwarded} Points added to your wallet 🪙`,
      type: 'claim_verified',
      linkTab: 'wallet',
      meta: { claimId },
    }).catch(console.error);
  }

  return {
    success: res.success,
    creditsAwarded: res.creditsAwarded,
    claimerUid: res.claimerUid,
  };
}

/**
 * Reject a fraudulent or unverified claim (called by Ad Owner).
 */
export async function rejectClaim(
  claimId: string, 
  reviewerUid: string, 
  reason?: string
): Promise<{ success: boolean }> {
  if (!claimId || !reviewerUid) {
    throw new Error("Authentication required");
  }

  const claimRef = doc(db, 'claims', claimId);

  const res = await runTransaction(db, async (transaction) => {
    const claimSnap = await transaction.get(claimRef);
    if (!claimSnap.exists()) {
      throw new Error("Claim record not found");
    }

    const claimData = claimSnap.data();

    if (claimData.adOwnerUid !== reviewerUid) {
      throw new Error("Only the creator of this ad can reject claims.");
    }

    if (claimData.status === 'verified') {
      throw new Error("Cannot reject an already approved claim.");
    }

    const finalReason = reason || "Handle or Code not found in friend requests / messages";
    const reviewerRef = doc(db, 'users', reviewerUid);

    // Execute ALL reads before any writes
    const reviewerSnap = await transaction.get(reviewerRef);
    const prevTotal = reviewerSnap.exists() ? Number(reviewerSnap.data().totalClaimsCount || 0) : 0;

    // Execute writes
    transaction.update(claimRef, {
      status: 'rejected',
      rejectedAt: Date.now(),
      rejectionReason: finalReason,
    });

    transaction.set(reviewerRef, {
      totalClaimsCount: prevTotal + 1,
    }, { merge: true });

    return { 
      success: true, 
      claimerUid: claimData.claimerUid,
      adTitle: claimData.adTitle,
      reason: finalReason
    };
  });

  // Notify the earner of rejection
  if (res.success && res.claimerUid) {
    sendNotification({
      userId: res.claimerUid,
      title: 'Claim Not Verified',
      message: `Your claim on "${res.adTitle || 'Ad'}" was not verified (${res.reason}).`,
      type: 'claim_rejected',
      linkTab: 'verifications',
      meta: { claimId },
    }).catch(console.error);
  }

  return { success: true };
}

/**
 * Auto-approve safeguard: if a claim has been pending for >24 hours,
 * any party or the earner can trigger auto-release.
 */
export async function autoApprovePendingClaim(
  claimId: string, 
  currentUserId: string
): Promise<{ success: boolean; creditsAwarded: number }> {
  const claimRef = doc(db, 'claims', claimId);

  const res = await runTransaction(db, async (transaction) => {
    const claimSnap = await transaction.get(claimRef);
    if (!claimSnap.exists()) {
      throw new Error("Claim not found");
    }

    const claimData = claimSnap.data();
    if (claimData.status !== 'pending') {
      throw new Error("Claim is not pending");
    }

    const nowMs = Date.now();
    const autoApproveTime = Number(claimData.autoApproveAt || 0);

    // If 24h passed OR current user is the ad owner approving
    const isOwner = claimData.adOwnerUid === currentUserId;
    const isEligibleForAuto = autoApproveTime > 0 && nowMs >= autoApproveTime;

    if (!isOwner && !isEligibleForAuto) {
      throw new Error("Auto-approval will become available after the 24-hour verification window expires.");
    }

    const claimerRef = doc(db, 'users', claimData.claimerUid);
    const claimerSnap = await transaction.get(claimerRef);
    let currentBalance = 0;
    if (claimerSnap.exists()) {
      currentBalance = Number(claimerSnap.data().creditBalance || 0);
    }

    const rewardAmount = Number(claimData.creditsAwarded || 5);
    const newBalance = currentBalance + rewardAmount;

    // Credit claimer
    transaction.set(claimerRef, {
      creditBalance: newBalance,
    }, { merge: true });

    // Mark verified
    transaction.update(claimRef, {
      status: 'verified',
      verifiedAt: nowMs,
      autoApproved: true,
    });

    // Transaction log
    const transRef = doc(collection(db, 'transactions'));
    transaction.set(transRef, {
      transactionId: transRef.id,
      userId: claimData.claimerUid,
      amount: rewardAmount,
      type: 'earned_ad_click',
      referenceId: claimData.adId,
      description: `Auto-verified add on ${claimData.platform === 'snapchat' ? 'Snapchat' : 'WhatsApp'}`,
      createdAt: serverTimestamp(),
    });

    return { 
      success: true, 
      creditsAwarded: rewardAmount,
      claimerUid: claimData.claimerUid,
      adTitle: claimData.adTitle,
    };
  });

  if (res.success && res.claimerUid) {
    sendNotification({
      userId: res.claimerUid,
      title: 'Claim Auto-Approved (24h Window)',
      message: `Your claim on "${res.adTitle || 'Ad'}" was automatically approved! +${res.creditsAwarded} Points added.`,
      type: 'claim_verified',
      linkTab: 'wallet',
    }).catch(console.error);
  }

  return { success: true, creditsAwarded: res.creditsAwarded };
}

/**
 * Atomic transaction to publish a promotional ad with flexible duration tiers.
 * Verifies credit balance and deducts credits accurately.
 */
export async function publishAd(params: {
  userId: string;
  title: string;
  category: CategoryType;
  platform: PlatformType;
  targetHandleOrNumber: string;
  durationHours: number;
  costCredits: number;
  durationLabel: string;
  userDisplayName?: string;
  avatarUrl?: string;
  imageUrl?: string;
  description?: string;
}): Promise<{ success: boolean; adId: string }> {
  const { 
    userId, 
    title, 
    category, 
    platform, 
    targetHandleOrNumber, 
    durationHours, 
    costCredits, 
    durationLabel, 
    userDisplayName,
    avatarUrl,
    imageUrl,
    description 
  } = params;

  if (!userId) {
    throw new Error("Sign in to get started");
  }

  const userRef = doc(db, 'users', userId);
  const newAdRef = doc(collection(db, 'ads'));

  return await runTransaction(db, async (transaction) => {
    // 1. Verify user balance
    const userSnap = await transaction.get(userRef);
    let currentBalance = 0;
    if (userSnap.exists()) {
      currentBalance = Number(userSnap.data().creditBalance || 0);
    }

    if (currentBalance < costCredits) {
      throw new Error(`You need at least ${costCredits} credits for a ${durationLabel} ad.`);
    }

    const newBalance = currentBalance - costCredits;
    const nowMs = Date.now();
    const durationMs = durationHours * 60 * 60 * 1000;
    const expiresAtMs = nowMs + durationMs;

    // 2. Deduct credits
    transaction.set(userRef, {
      creditBalance: newBalance,
    }, { merge: true });

    const cleanImageUrl = typeof imageUrl === 'string' && imageUrl.trim().length > 0
      ? imageUrl.trim()
      : (typeof imageUrl === 'object' && imageUrl !== null && (imageUrl as any).dataUrl
        ? (imageUrl as any).dataUrl
        : null);

    const cleanAvatarUrl = typeof avatarUrl === 'string' && avatarUrl.trim().length > 0
      ? avatarUrl.trim()
      : (typeof avatarUrl === 'object' && avatarUrl !== null && (avatarUrl as any).dataUrl
        ? (avatarUrl as any).dataUrl
        : null);

    // 3. Create ad document
    transaction.set(newAdRef, {
      adId: newAdRef.id,
      userId,
      title: title.trim(),
      category,
      platform,
      targetHandleOrNumber: targetHandleOrNumber.trim(),
      rewardPerAdd: 5,
      status: 'active',
      durationHours,
      costCredits,
      expiresAt: expiresAtMs,
      createdAt: nowMs,
      userDisplayName: userDisplayName || 'Social Member',
      avatarUrl: cleanAvatarUrl,
      imageUrl: cleanImageUrl,
      description: description ? description.trim() : null,
      reportsCount: 0,
      viewsCount: 0,
      clicksCount: 0,
      likesCount: 0,
    });

    // 4. Record transaction log
    const transRef = doc(collection(db, 'transactions'));
    transaction.set(transRef, {
      transactionId: transRef.id,
      userId,
      amount: -costCredits,
      type: 'placed_ad',
      referenceId: newAdRef.id,
      description: `Posted ${durationLabel} ${platform === 'snapchat' ? 'Snapchat' : 'WhatsApp'} Ad`,
      createdAt: serverTimestamp(),
    });

    return { success: true, adId: newAdRef.id };
  });
}

/**
 * Process credit deposit with NGN payment.
 * Top-ups user credit balance atomically in Firestore.
 */
export async function processCreditDeposit(params: {
  userId: string;
  credits: number;
  amountNgn: number;
  paymentMethod: string;
  referenceId: string;
}): Promise<{ success: boolean; newBalance: number }> {
  const { userId, credits, amountNgn, paymentMethod, referenceId } = params;

  if (!userId) {
    throw new Error("Sign in to get started");
  }

  const userRef = doc(db, 'users', userId);

  const res = await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    let currentBalance = 0;
    let linkedUid: string | null = null;
    if (userSnap.exists()) {
      const data = userSnap.data();
      currentBalance = Number(data.creditBalance || 0);
      linkedUid = data.linkedOriginalUid || data.canonicalUid || null;
    }

    const newBalance = currentBalance + credits;

    // 1. Update user balance
    transaction.set(userRef, {
      creditBalance: newBalance,
      lastDepositAt: serverTimestamp(),
    }, { merge: true });

    // Sync linked user document if exists
    if (linkedUid && linkedUid !== userId) {
      const linkedRef = doc(db, 'users', linkedUid);
      transaction.set(linkedRef, {
        creditBalance: newBalance,
        lastDepositAt: serverTimestamp(),
      }, { merge: true });
    }

    // 2. Log deposit transaction
    const transRef = doc(collection(db, 'transactions'));
    transaction.set(transRef, {
      transactionId: transRef.id,
      userId,
      amount: credits,
      amountNgn,
      paymentMethod,
      type: 'deposit',
      referenceId,
      description: `Deposited ₦${amountNgn.toLocaleString('en-NG')} (+${credits} Points via ${paymentMethod})`,
      createdAt: serverTimestamp(),
    });

    if (linkedUid && linkedUid !== userId) {
      const linkedTransRef = doc(collection(db, 'transactions'));
      transaction.set(linkedTransRef, {
        transactionId: linkedTransRef.id,
        userId: linkedUid,
        amount: credits,
        amountNgn,
        paymentMethod,
        type: 'deposit',
        referenceId,
        description: `Deposited ₦${amountNgn.toLocaleString('en-NG')} (+${credits} Points via ${paymentMethod})`,
        createdAt: serverTimestamp(),
      });
    }

    return { success: true, newBalance };
  });

  // Send notification to user
  if (res.success) {
    sendNotification({
      userId,
      title: 'Deposit Successful',
      message: `₦${amountNgn.toLocaleString('en-NG')} payment confirmed via ${paymentMethod}. +${credits} Credits credited! 🪙`,
      type: 'deposit_success',
      linkTab: 'wallet',
      meta: { referenceId, credits, amountNgn },
    }).catch(console.error);
  }

  return res;
}

/**
 * Submit an ad moderation report
 */
export async function reportAd(params: {
  adId: string;
  reportedUserId: string;
  reporterUid: string;
  reason: ReportReason;
  details?: string;
}): Promise<{ success: boolean; reportId: string }> {
  const { adId, reportedUserId, reporterUid, reason, details } = params;

  if (!reporterUid) {
    throw new Error("Sign in to report an ad");
  }

  const reportRef = doc(collection(db, 'reports'));
  const adRef = doc(db, 'ads', adId);

  await runTransaction(db, async (transaction) => {
    const adSnap = await transaction.get(adRef);
    const reportsCount = adSnap.exists() ? (adSnap.data().reportsCount || 0) + 1 : 1;

    // If ad gets excessive reports (>5), auto-flag/hide
    const newStatus = reportsCount >= 5 ? 'expired' : (adSnap.exists() ? adSnap.data().status : 'active');

    if (adSnap.exists()) {
      transaction.update(adRef, {
        reportsCount,
        ...(reportsCount >= 5 ? { status: 'expired' } : {}),
      });
    }

    transaction.set(reportRef, {
      reportId: reportRef.id,
      adId,
      reportedUserId,
      reporterUid,
      reason,
      details: details?.trim() || '',
      status: 'pending',
      createdAt: Date.now(),
    });
  });

  return { success: true, reportId: reportRef.id };
}

/**
 * Process referral bonuses when a new user signs up with a referral code.
 * Awards +10 bonus credits to both the new user and the referrer.
 */
export async function processReferralReward(newUserId: string, referralCodeOrUid: string): Promise<boolean> {
  try {
    if (!newUserId || !referralCodeOrUid || newUserId === referralCodeOrUid) return false;

    // Find referrer by referralCode or uid
    let referrerDocId: string | null = null;

    // Try direct UID match
    const userDocRef = doc(db, 'users', referralCodeOrUid);
    const userSnap = await runTransaction(db, async (tx) => tx.get(userDocRef));

    if (userSnap.exists()) {
      referrerDocId = referralCodeOrUid;
    } else {
      // Query by referralCode
      const q = query(
        collection(db, 'users'),
        where('referralCode', '==', referralCodeOrUid.toUpperCase().trim()),
        fsLimit(1)
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        referrerDocId = querySnap.docs[0].id;
      }
    }

    if (!referrerDocId || referrerDocId === newUserId) return false;

    const REFERRAL_BONUS = 10;
    const referrerRef = doc(db, 'users', referrerDocId);
    const newUserRef = doc(db, 'users', newUserId);

    await runTransaction(db, async (tx) => {
      const refSnap = await tx.get(referrerRef);
      const newSnap = await tx.get(newUserRef);

      if (!refSnap.exists() || !newSnap.exists()) return;

      const refData = refSnap.data();
      const currentRefBalance = Number(refData.creditBalance || 0);
      const currentRefCount = Number(refData.referralsCount || 0);
      const currentRefEarned = Number(refData.referralCreditsEarned || 0);

      const newUserData = newSnap.data();
      const currentNewBalance = Number(newUserData.creditBalance || 0);

      // 1. Credit Referrer +10
      tx.update(referrerRef, {
        creditBalance: currentRefBalance + REFERRAL_BONUS,
        referralsCount: currentRefCount + 1,
        referralCreditsEarned: currentRefEarned + REFERRAL_BONUS,
      });

      // 2. Credit New User +10
      tx.update(newUserRef, {
        creditBalance: currentNewBalance + REFERRAL_BONUS,
        referredBy: referrerDocId,
      });

      // 3. Log Referrer Transaction
      const refTransRef = doc(collection(db, 'transactions'));
      tx.set(refTransRef, {
        transactionId: refTransRef.id,
        userId: referrerDocId,
        amount: REFERRAL_BONUS,
        type: 'referral_bonus',
        referenceId: newUserId,
        description: `Referral Bonus: A friend joined via your invite link (+${REFERRAL_BONUS} Credits 🎁)`,
        createdAt: serverTimestamp(),
      });

      // 4. Log New User Transaction
      const newTransRef = doc(collection(db, 'transactions'));
      tx.set(newTransRef, {
        transactionId: newTransRef.id,
        userId: newUserId,
        amount: REFERRAL_BONUS,
        type: 'referral_bonus',
        referenceId: referrerDocId,
        description: `Welcome Invite Bonus: Joined with friend referral (+${REFERRAL_BONUS} Credits 🎁)`,
        createdAt: serverTimestamp(),
      });
    });

    // Send notification to the referrer
    sendNotification({
      userId: referrerDocId,
      title: 'Referral Bonus Received! 🎁',
      message: `A friend joined AddMeUp using your referral link! +10 Credits credited to your wallet.`,
      type: 'referral_bonus',
      linkTab: 'wallet',
      meta: { referredUserId: newUserId },
    }).catch(console.error);

    return true;
  } catch (error) {
    console.error('Error processing referral reward:', error);
    return false;
  }
}

/**
 * Atomic transaction to boost/pin an ad to the top of the feed for a selected duration.
 * Deducts credits from user wallet and updates the ad's boostedUntil timestamp.
 */
export async function boostAd(params: {
  adId: string;
  userId: string;
  durationHours: number;
  costCredits: number;
  boostLabel: string;
}): Promise<{ success: boolean; boostedUntil: number; newBalance: number }> {
  const { adId, userId, durationHours, costCredits, boostLabel } = params;

  if (!userId || !adId) {
    throw new Error("Sign in required to boost this post.");
  }

  const userRef = doc(db, 'users', userId);
  const adRef = doc(db, 'ads', adId);

  const res = await runTransaction(db, async (transaction) => {
    // 1. Check user credit balance
    const userSnap = await transaction.get(userRef);
    let currentBalance = 0;
    if (userSnap.exists()) {
      currentBalance = Number(userSnap.data().creditBalance || 0);
    }

    if (currentBalance < costCredits) {
      throw new Error(`Insufficient credits. You need ${costCredits} credits for ${boostLabel} (Your balance: ${currentBalance} Cr).`);
    }

    // 2. Fetch ad document
    const adSnap = await transaction.get(adRef);
    if (!adSnap.exists()) {
      throw new Error("This ad was not found or has ended.");
    }

    const adData = adSnap.data();
    if (adData.userId !== userId) {
      throw new Error("You can only boost ads that you created.");
    }

    const nowMs = Date.now();
    // If ad is already boosted and still active, extend it; otherwise start from now
    const currentBoostedUntil = Number(adData.boostedUntil || 0);
    const baseTime = currentBoostedUntil > nowMs ? currentBoostedUntil : nowMs;
    const addedMs = durationHours * 60 * 60 * 1000;
    const newBoostedUntil = baseTime + addedMs;
    const newBalance = currentBalance - costCredits;

    // 3. Deduct credits from user wallet
    transaction.set(userRef, {
      creditBalance: newBalance,
    }, { merge: true });

    // 4. Update ad document with boost status
    transaction.update(adRef, {
      isBoosted: true,
      boostedUntil: newBoostedUntil,
      boostTier: boostLabel,
    });

    // 5. Record transaction log
    const transRef = doc(collection(db, 'transactions'));
    transaction.set(transRef, {
      transactionId: transRef.id,
      userId,
      amount: -costCredits,
      type: 'boost_ad',
      referenceId: adId,
      description: `⚡ VIP Boost: Pinned ad "${adData.title || 'Ad'}" to top of feed for ${boostLabel}`,
      createdAt: serverTimestamp(),
    });

    return {
      success: true,
      boostedUntil: newBoostedUntil,
      newBalance,
      adTitle: adData.title,
    };
  });

  // Send notification to user
  if (res.success) {
    sendNotification({
      userId,
      title: '🚀 Post Boost Activated!',
      message: `"${res.adTitle || 'Your ad'}" is now boosted and pinned to the top of the feed for ${boostLabel}!`,
      type: 'boost_activated',
      linkTab: 'feed',
      meta: { adId, boostedUntil: res.boostedUntil },
    }).catch(console.error);
  }

  return {
    success: res.success,
    boostedUntil: res.boostedUntil,
    newBalance: res.newBalance,
  };
}

// Memory cache to prevent duplicate views in same session
const sessionViewedAds = new Set<string>();

/**
 * Increment view count of an ad safely once per browser session.
 */
export async function recordAdView(adId: string): Promise<void> {
  if (!adId || sessionViewedAds.has(adId)) return;
  sessionViewedAds.add(adId);
  try {
    const adRef = doc(db, 'ads', adId);
    await updateDoc(adRef, {
      viewsCount: increment(1),
    });
  } catch (err) {
    // Non-critical, ignore
  }
}

/**
 * Increment tap/click count when user clicks an ad or takes action.
 */
export async function recordAdClick(adId: string): Promise<void> {
  if (!adId) return;
  try {
    const adRef = doc(db, 'ads', adId);
    await updateDoc(adRef, {
      clicksCount: increment(1),
    });
  } catch (err) {
    // Non-critical, ignore
  }
}

/**
 * Pause or resume an ad.
 */
export async function togglePauseAd(
  adId: string, 
  userId: string, 
  newStatus: 'active' | 'paused'
): Promise<boolean> {
  if (!adId || !userId) throw new Error("Authentication required");
  const adRef = doc(db, 'ads', adId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(adRef);
    if (!snap.exists()) throw new Error("Ad not found");
    const data = snap.data();
    if (data.userId !== userId) throw new Error("Unauthorized to edit this ad");
    tx.update(adRef, { status: newStatus });
  });
  return true;
}

/**
 * Extend or renew ad duration using credits.
 */
export async function extendAdDuration(params: {
  adId: string;
  userId: string;
  durationHours: number;
  costCredits: number;
  durationLabel: string;
}): Promise<{ success: boolean; newExpiresAt: number; newBalance: number }> {
  const { adId, userId, durationHours, costCredits, durationLabel } = params;
  if (!adId || !userId) throw new Error("Authentication required");

  const userRef = doc(db, 'users', userId);
  const adRef = doc(db, 'ads', adId);

  return await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    const currentBalance = Number(userSnap.data()?.creditBalance || 0);
    if (currentBalance < costCredits) {
      throw new Error(`Insufficient credits. You need ${costCredits} Cr to extend for ${durationLabel}.`);
    }

    const adSnap = await tx.get(adRef);
    if (!adSnap.exists()) throw new Error("Ad not found");
    const adData = adSnap.data();
    if (adData.userId !== userId) throw new Error("Unauthorized to manage this ad");

    const nowMs = Date.now();
    const currentExpires = Number(adData.expiresAt || 0);
    const baseTime = currentExpires > nowMs ? currentExpires : nowMs;
    const additionalMs = durationHours * 60 * 60 * 1000;
    const newExpiresAt = baseTime + additionalMs;
    const newBalance = currentBalance - costCredits;

    // Deduct credits
    tx.set(userRef, { creditBalance: newBalance }, { merge: true });

    // Update ad duration & activate
    tx.update(adRef, {
      expiresAt: newExpiresAt,
      status: 'active',
      durationHours: (Number(adData.durationHours) || 0) + durationHours,
    });

    // Record transaction
    const transRef = doc(collection(db, 'transactions'));
    tx.set(transRef, {
      transactionId: transRef.id,
      userId,
      amount: -costCredits,
      type: 'placed_ad',
      referenceId: adId,
      description: `Extended ad "${adData.title || 'Ad'}" (+${durationLabel})`,
      createdAt: serverTimestamp(),
    });

    return { success: true, newExpiresAt, newBalance };
  });
}

/**
 * Permanently delete an ad by creator.
 */
export async function deleteAdPermanently(adId: string, userId: string): Promise<boolean> {
  if (!adId || !userId) throw new Error("Authentication required");
  const adRef = doc(db, 'ads', adId);
  const snap = await runTransaction(db, async (tx) => {
    const s = await tx.get(adRef);
    if (!s.exists()) throw new Error("Ad not found");
    if (s.data().userId !== userId) throw new Error("Unauthorized to delete this ad");
    tx.delete(adRef);
    return true;
  });
  return snap;
}

/**
 * Daily check-in streak reward system.
 * Awards base credits + streak multiplier every 24 hours.
 */
export async function claimDailyBonus(userId: string): Promise<{
  success: boolean;
  creditsAwarded: number;
  newStreak: number;
  newBalance: number;
}> {
  if (!userId) throw new Error("Please sign in to claim your daily bonus.");

  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const userRef = doc(db, 'users', userId);

  const res = await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("User record not found");
    const userData = userSnap.data();

    const lastDate = userData.lastDailyBonusDate;
    if (lastDate === todayStr) {
      throw new Error("You already claimed today's bonus! Check back tomorrow for your next reward.");
    }

    // Check if yesterday was claimed for streak continuity
    let newStreak = 1;
    if (lastDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      if (lastDate === yesterdayStr) {
        newStreak = Math.min(30, (Number(userData.dailyStreak) || 0) + 1);
      }
    }

    // Reward scaling based on streak:
    // Day 1-2: 2 Credits
    // Day 3-6: 3 Credits
    // Day 7+: 5 Credits VIP bonus!
    let rewardCredits = 2;
    if (newStreak >= 7) {
      rewardCredits = 5;
    } else if (newStreak >= 3) {
      rewardCredits = 3;
    }

    const currentBalance = Number(userData.creditBalance || 0);
    const newBalance = currentBalance + rewardCredits;

    // 1. Update user record
    tx.update(userRef, {
      creditBalance: newBalance,
      lastDailyBonusDate: todayStr,
      dailyStreak: newStreak,
    });

    // 2. Record transaction
    const transRef = doc(collection(db, 'transactions'));
    tx.set(transRef, {
      transactionId: transRef.id,
      userId,
      amount: rewardCredits,
      type: 'daily_bonus',
      referenceId: `daily_${todayStr}`,
      description: `Daily Check-in Day ${newStreak} Streak (+${rewardCredits} Credits 🎁)`,
      createdAt: serverTimestamp(),
    });

    return {
      success: true,
      creditsAwarded: rewardCredits,
      newStreak,
      newBalance,
    };
  });

  // In-app notification
  if (res.success) {
    sendNotification({
      userId,
      title: `Daily Reward Claimed! 🎁`,
      message: `Day ${res.newStreak} check-in complete! +${res.creditsAwarded} Credits added to your balance. Keep your streak alive!`,
      type: 'system',
      linkTab: 'wallet',
    }).catch(console.error);
  }

  return res;
}

/**
 * ADMIN: Toggle a user's isAdmin status in Firestore
 */
export async function adminToggleUserAdmin(targetUid: string, makeAdmin: boolean): Promise<void> {
  const userRef = doc(db, 'users', targetUid);
  await updateDoc(userRef, {
    isAdmin: makeAdmin,
  });
}

/**
 * ADMIN: Toggle a user's isBanned status in Firestore
 */
export async function adminToggleUserBan(targetUid: string, ban: boolean): Promise<void> {
  const userRef = doc(db, 'users', targetUid);
  await updateDoc(userRef, {
    isBanned: ban,
  });
}

/**
 * ADMIN: Manually adjust a user's credit balance with an audit log
 */
export async function adminAdjustUserCredits(
  targetUid: string,
  amountChange: number,
  adminReason: string
): Promise<{ newBalance: number }> {
  const userRef = doc(db, 'users', targetUid);

  return await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("Target user not found");
    }

    const currentBalance = Number(userSnap.data().creditBalance || 0);
    const newBalance = Math.max(0, currentBalance + amountChange);

    tx.update(userRef, {
      creditBalance: newBalance,
    });

    const transRef = doc(collection(db, 'transactions'));
    tx.set(transRef, {
      transactionId: transRef.id,
      userId: targetUid,
      amount: amountChange,
      type: 'admin_adjustment',
      referenceId: 'admin_manual_grant',
      description: `Admin adjustment (${amountChange >= 0 ? '+' : ''}${amountChange} Cr): ${adminReason || 'Platform adjustment'}`,
      createdAt: serverTimestamp(),
    });

    return { newBalance };
  });
}

/**
 * ADMIN: Delete or expire an ad violating guidelines
 */
export async function adminDeleteAd(adId: string, adminReason?: string): Promise<void> {
  const adRef = doc(db, 'ads', adId);
  await updateDoc(adRef, {
    status: 'expired',
    adminModerated: true,
    adminModerationReason: adminReason || 'Removed by administrator',
  });
}

/**
 * ADMIN: Resolve or dismiss an ad report
 */
export async function adminResolveReport(
  reportId: string,
  status: 'dismissed' | 'reviewed',
  deleteTargetAd?: boolean,
  adId?: string
): Promise<void> {
  const reportRef = doc(db, 'reports', reportId);
  await updateDoc(reportRef, {
    status,
    resolvedAt: Date.now(),
  });

  if (deleteTargetAd && adId) {
    await adminDeleteAd(adId, "Moderated following user reports");
  }
}

/**
 * ADMIN: Toggle ad pause / active state
 */
export async function adminToggleAdPause(adId: string, currentStatus: string): Promise<'active' | 'paused'> {
  const adRef = doc(db, 'ads', adId);
  const newStatus = currentStatus === 'paused' ? 'active' : 'paused';
  await updateDoc(adRef, {
    status: newStatus,
  });
  return newStatus;
}

/**
 * ADMIN: Give an ad a 24-hour VIP boost
 */
export async function adminBoostAd(adId: string, durationHours = 24): Promise<number> {
  const adRef = doc(db, 'ads', adId);
  const boostedUntil = Date.now() + durationHours * 60 * 60 * 1000;
  await updateDoc(adRef, {
    boostedUntil,
    boostTier: 'admin_boost',
  });
  return boostedUntil;
}

/**
 * ADMIN: Permanently delete an ad from the database
 */
export async function adminPermanentDeleteAd(adId: string): Promise<void> {
  const adRef = doc(db, 'ads', adId);
  await deleteDoc(adRef);
}

/**
 * ADMIN: Force-approve any pending claim across the system
 */
export async function adminForceApproveClaim(claimId: string): Promise<void> {
  const claimRef = doc(db, 'claims', claimId);
  await runTransaction(db, async (tx) => {
    const claimSnap = await tx.get(claimRef);
    if (!claimSnap.exists()) throw new Error("Claim record not found");
    const claimData = claimSnap.data();
    if (claimData.status === 'verified') return;

    const claimerRef = doc(db, 'users', claimData.claimerUid);
    const claimerSnap = await tx.get(claimerRef);
    const currentBalance = claimerSnap.exists() ? Number(claimerSnap.data().creditBalance || 0) : 0;
    const reward = Number(claimData.creditsAwarded || 5);

    tx.set(claimerRef, {
      creditBalance: currentBalance + reward,
      approvedClaimsCount: increment(1),
    }, { merge: true });

    tx.update(claimRef, {
      status: 'verified',
      verifiedAt: Date.now(),
      adminApproved: true,
    });

    const transRef = doc(collection(db, 'transactions'));
    tx.set(transRef, {
      transactionId: transRef.id,
      userId: claimData.claimerUid,
      amount: reward,
      type: 'reward_add',
      referenceId: claimData.adId || 'admin_verified',
      description: `Admin verified add reward on ${claimData.platform || 'Social'}`,
      createdAt: serverTimestamp(),
    });
  });
}



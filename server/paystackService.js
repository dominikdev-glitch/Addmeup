import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from './firebaseAdmin.js';

export const PAYSTACK_SECRET_KEY = 
  process.env.PAYSTACK_SECRET_KEY || '';

export const PAYSTACK_PUBLIC_KEY = 
  process.env.PAYSTACK_PUBLIC_KEY || 
  process.env.VITE_PAYSTACK_PUBLIC_KEY || '';

/**
 * Verify Paystack transaction by reference with Paystack API
 */
export async function verifyPaystackTransaction(reference) {
  const secretKey = (process.env.PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY || '').trim();
  if (!secretKey) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured on the server.');
  }

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok || !data.status) {
    throw new Error(data.message || 'Paystack verification request failed.');
  }

  return data.data;
}

/**
 * Verify HMAC SHA512 signature from Paystack Webhook
 */
export function verifyPaystackSignature(rawBody, signature) {
  const secretKey = (process.env.PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY || '').trim();
  if (!secretKey || !signature) return false;

  try {
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');
    return hash === signature;
  } catch (err) {
    console.error('[Paystack Webhook] Signature verification error:', err);
    return false;
  }
}

/**
 * Atomically credit user points and log deposit transaction in Firestore
 * using Firebase Admin SDK.
 */
export async function creditUserDeposit({
  userId,
  credits,
  amountNgn,
  reference,
  paymentMethod = 'Paystack',
  paystackData = null,
}) {
  const { db, isConfigured } = getFirebaseAdmin();

  if (!isConfigured || !db) {
    return {
      success: true,
      credited: false,
      needsClientCredit: true,
      message: 'Firebase Admin not configured on server; fallback to client credit.',
    };
  }

  // 1. Idempotency Check: check if transaction with this referenceId was already processed
  const transSnapshot = await db
    .collection('transactions')
    .where('referenceId', '==', reference)
    .limit(1)
    .get();

  if (!transSnapshot.empty) {
    console.log(`[Paystack] Reference ${reference} was already credited previously.`);
    return {
      success: true,
      credited: true,
      alreadyProcessed: true,
      message: 'Transaction has already been credited.',
    };
  }

  // 2. Check for linked account
  let linkedUid = null;
  try {
    const userDocSnap = await db.collection('users').doc(userId).get();
    if (userDocSnap.exists) {
      const uData = userDocSnap.data();
      linkedUid = uData.linkedOriginalUid || uData.canonicalUid || null;
    }
  } catch (lookupErr) {
    console.warn('[Paystack] Error looking up linked account:', lookupErr.message);
  }

  const batch = db.batch();

  // Update user points balance atomically
  const userRef = db.collection('users').doc(userId);
  batch.set(
    userRef,
    {
      creditBalance: FieldValue.increment(credits),
      lastDepositAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  if (linkedUid && linkedUid !== userId) {
    const linkedUserRef = db.collection('users').doc(linkedUid);
    batch.set(
      linkedUserRef,
      {
        creditBalance: FieldValue.increment(credits),
        lastDepositAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  // 3. Log to transactions collection
  const newTransRef = db.collection('transactions').doc();
  batch.set(newTransRef, {
    transactionId: newTransRef.id,
    userId,
    amount: credits,
    amountNgn,
    paymentMethod,
    type: 'deposit',
    referenceId: reference,
    paystackId: paystackData?.id || null,
    channel: paystackData?.channel || 'card',
    currency: paystackData?.currency || 'NGN',
    description: `Deposited ₦${Number(amountNgn).toLocaleString('en-NG')} (+${credits} Points via ${paymentMethod})`,
    verifiedAt: new Date().toISOString(),
    createdAt: FieldValue.serverTimestamp(),
  });

  if (linkedUid && linkedUid !== userId) {
    const linkedTransRef = db.collection('transactions').doc();
    batch.set(linkedTransRef, {
      transactionId: linkedTransRef.id,
      userId: linkedUid,
      amount: credits,
      amountNgn,
      paymentMethod,
      type: 'deposit',
      referenceId: reference,
      paystackId: paystackData?.id || null,
      channel: paystackData?.channel || 'card',
      currency: paystackData?.currency || 'NGN',
      description: `Deposited ₦${Number(amountNgn).toLocaleString('en-NG')} (+${credits} Points via ${paymentMethod})`,
      verifiedAt: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // 4. Create user notification
  const newNotifRef = db.collection('notifications').doc();
  batch.set(newNotifRef, {
    notificationId: newNotifRef.id,
    userId,
    title: 'Deposit Confirmed! 🪙',
    message: `₦${Number(amountNgn).toLocaleString('en-NG')} payment verified via Paystack. +${credits} Points credited to your account!`,
    type: 'deposit_success',
    read: false,
    linkTab: 'wallet',
    createdAt: Date.now(),
    meta: { referenceId: reference, credits, amountNgn },
  });

  await batch.commit();

  console.log(`[Paystack] Successfully credited user ${userId} with +${credits} points for ref ${reference}`);
  return {
    success: true,
    credited: true,
    alreadyProcessed: false,
    message: `Successfully credited +${credits} Points!`,
  };
}

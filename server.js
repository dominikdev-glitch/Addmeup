import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getFirebaseAdmin } from './server/firebaseAdmin.js';
import { 
  verifyPaystackTransaction, 
  verifyPaystackSignature, 
  creditUserDeposit,
  PAYSTACK_PUBLIC_KEY,
  PAYSTACK_SECRET_KEY
} from './server/paystackService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin at startup if configured in env
const adminInfo = getFirebaseAdmin();
if (adminInfo.isConfigured) {
  console.log('✅ [Server] Firebase Admin SDK active & connected to Firestore');
} else {
  console.log('ℹ️ [Server] Firebase Admin SDK not configured in env (FIREBASE_ADMIN_JSON). Running in verification fallback mode.');
}

// Preserve raw body buffer for Paystack Webhook HMAC verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Health check endpoint (for Render / uptime monitors)
app.get('/api/health', (_req, res) => {
  const activeSecretKey = (process.env.PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY || '').trim();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    firebaseAdmin: getFirebaseAdmin().isConfigured,
    hasPaystackSecret: Boolean(activeSecretKey),
  });
});

// Paystack Public Configuration endpoint
app.get('/api/paystack/config', (_req, res) => {
  const publicKey = 
    process.env.PAYSTACK_PUBLIC_KEY || 
    process.env.VITE_PAYSTACK_PUBLIC_KEY || 
    PAYSTACK_PUBLIC_KEY;
  const activeSecretKey = (process.env.PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY || '').trim();

  res.json({
    publicKey,
    isLive: publicKey.startsWith('pk_live_'),
    hasSecretKey: Boolean(activeSecretKey),
    hasAdminSdk: getFirebaseAdmin().isConfigured,
  });
});

// Paystack Server-side Transaction Verification & Crediting
app.post('/api/paystack/verify', async (req, res) => {
  const { reference, userId, credits, amountNgn } = req.body;

  if (!reference || !userId) {
    return res.status(400).json({
      success: false,
      message: 'Missing reference or userId parameter.',
    });
  }

  const activeSecretKey = (process.env.PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY || '').trim();

  // If secret key is not configured, inform client to proceed with client-side fallback
  if (!activeSecretKey) {
    console.warn('[Paystack Verify] PAYSTACK_SECRET_KEY is missing from environment. Bypassing server verification.');
    return res.json({
      success: true,
      verified: false,
      needsClientCredit: true,
      message: 'Server missing PAYSTACK_SECRET_KEY. Proceeding with client confirmation.',
    });
  }

  try {
    console.log(`[Paystack Verify] Verifying reference: ${reference} for user: ${userId}`);
    const paystackData = await verifyPaystackTransaction(reference);

    if (paystackData.status !== 'success') {
      return res.status(400).json({
        success: false,
        verified: false,
        message: `Paystack payment status is ${paystackData.status}: ${paystackData.gateway_response || 'Unsuccessful'}`,
      });
    }

    // Verify amount in Kobo matches
    const paidNgn = paystackData.amount / 100;
    const expectedNgn = Number(amountNgn || 0);

    // If expected amount was passed, verify tolerance
    if (expectedNgn > 0 && Math.abs(paidNgn - expectedNgn) > 1) {
      console.warn(`[Paystack Verify] Amount mismatch: Paid ₦${paidNgn}, expected ₦${expectedNgn}`);
      return res.status(400).json({
        success: false,
        verified: false,
        message: `Amount mismatch: Paid ₦${paidNgn} does not match requested ₦${expectedNgn}`,
      });
    }

    const calculatedCredits = Number(credits) || Math.round(paidNgn * 2);

    // Credit user balance in Firestore using Firebase Admin SDK
    const creditResult = await creditUserDeposit({
      userId,
      credits: calculatedCredits,
      amountNgn: paidNgn,
      reference,
      paymentMethod: `Paystack (${paystackData.channel || 'Online'})`,
      paystackData,
    });

    return res.json({
      success: true,
      verified: true,
      credited: creditResult.credited,
      alreadyProcessed: creditResult.alreadyProcessed,
      needsClientCredit: creditResult.needsClientCredit,
      reference,
      amountNgn: paidNgn,
      credits: calculatedCredits,
      message: creditResult.message,
    });
  } catch (err) {
    console.error('[Paystack Verify] Error during verification:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Payment verification encountered an internal error.',
    });
  }
});

// Paystack Official Webhook Receiver
app.post('/api/paystack/webhook', async (req, res) => {
  const signature = req.headers['x-paystack-signature'];

  if (!signature || !verifyPaystackSignature(req.rawBody, signature)) {
    console.warn('[Paystack Webhook] Invalid webhook signature detected.');
    return res.status(400).send('Invalid signature');
  }

  const event = req.body;
  console.log(`[Paystack Webhook] Received valid event: ${event?.event}`);

  if (event.event === 'charge.success') {
    const data = event.data;
    const reference = data.reference;
    const paidNgn = data.amount / 100;
    
    // Extract metadata
    const userUid = 
      data.metadata?.user_uid || 
      data.metadata?.custom_fields?.find(f => f.variable_name === 'user_uid')?.value;
    
    const creditsCount = 
      Number(data.metadata?.credits_count) || 
      Number(data.metadata?.custom_fields?.find(f => f.variable_name === 'credits_count')?.value) ||
      Math.round(paidNgn * 2);

    if (userUid && reference) {
      try {
        console.log(`[Paystack Webhook] Processing charge.success for user ${userUid}, ref: ${reference}`);
        await creditUserDeposit({
          userId: userUid,
          credits: creditsCount,
          amountNgn: paidNgn,
          reference,
          paymentMethod: `Paystack Webhook (${data.channel || 'Online'})`,
          paystackData: data,
        });
      } catch (err) {
        console.error('[Paystack Webhook] Failed to credit user from webhook:', err);
      }
    } else {
      console.warn('[Paystack Webhook] charge.success missing userUid in metadata, reference:', reference);
    }
  }

  // Paystack expects a 200 OK immediately
  res.sendStatus(200);
});

// Google Search Console verification file route
app.get('/google7b85a384a73f8c2a.html', (_req, res) => {
  res.type('text/html').send('google-site-verification: google7b85a384a73f8c2a.html');
});

// Serve static assets from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback: redirect all unknown routes to index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AddMeUp server listening on port ${PORT}`);
});

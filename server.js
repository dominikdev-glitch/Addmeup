import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getFirebaseAdmin } from './server/firebaseAdmin.js';
import { getGoogleOAuthConfig, resolveRedirectUri } from './server/googleOAuth.js';
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
app.set('trust proxy', true);
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin at startup if configured in env
const adminInfo = getFirebaseAdmin();
if (adminInfo.isConfigured) {
  console.log('✅ [Server] Firebase Admin SDK active & connected to Firestore');
} else {
  console.log('ℹ️ [Server] Firebase Admin SDK not configured in env (FIREBASE_ADMIN_JSON). Running in verification fallback mode.');
}

const oauthInfo = getGoogleOAuthConfig();
if (oauthInfo.isConfigured) {
  console.log('✅ [Server] Native Google OAuth 2.0 active (Custom domain sign-in enabled for addmeup.ng)');
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
  const googleOAuth = getGoogleOAuthConfig();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    firebaseAdmin: getFirebaseAdmin().isConfigured,
    hasPaystackSecret: Boolean(activeSecretKey),
    nativeGoogleOAuth: googleOAuth.isConfigured,
  });
});

// ============================================================================
// NATIVE GOOGLE OAUTH 2.0 (Custom Domain Branding e.g. addmeup.ng)
// ============================================================================

app.get('/api/auth/google/config', (req, res) => {
  const config = getGoogleOAuthConfig();
  res.json({
    configured: config.isConfigured,
    clientId: config.clientId || null,
    redirectUri: resolveRedirectUri(req),
  });
});

app.get('/api/auth/google/start', (req, res) => {
  const config = getGoogleOAuthConfig();
  if (!config.isConfigured) {
    return res.status(400).send('GOOGLE_OAUTH_JSON is not configured on the server.');
  }

  const redirectUri = resolveRedirectUri(req);
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('prompt', 'select_account');
  authUrl.searchParams.set('access_type', 'online');

  res.redirect(authUrl.toString());
});

async function handleGoogleOAuthCallback(req, res) {
  const { code, error } = req.query;
  const config = getGoogleOAuthConfig();
  const redirectUri = resolveRedirectUri(req);

  if (error || !code || !config.isConfigured) {
    const errMsg = error || 'Google authentication was cancelled or unconfigured.';
    return res.type('text/html').send(`<!DOCTYPE html>
<html><head><title>Sign In Notice</title></head>
<body style="font-family:sans-serif;text-align:center;padding:40px;">
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'ADDMEUP_GOOGLE_OAUTH_ERROR', error: ${JSON.stringify(String(errMsg))} }, '*');
      window.close();
    } else {
      window.location.replace('/');
    }
  </script>
  <p>Returning to AddMeUp...</p>
</body></html>`);
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || (!tokenData.id_token && !tokenData.access_token)) {
      const errDetail = tokenData.error_description || tokenData.error || 'Failed to exchange Google OAuth code.';
      console.error('[Google OAuth Callback] Token exchange error:', tokenData);
      return res.type('text/html').send(`<!DOCTYPE html>
<html><head><title>Sign In Error</title></head>
<body style="font-family:sans-serif;text-align:center;padding:40px;">
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'ADDMEUP_GOOGLE_OAUTH_ERROR', error: ${JSON.stringify(errDetail)} }, '*');
      window.close();
    } else {
      window.location.replace('/');
    }
  </script>
</body></html>`);
    }

    const payload = {
      type: 'ADDMEUP_GOOGLE_OAUTH_SUCCESS',
      idToken: tokenData.id_token || null,
      accessToken: tokenData.access_token || null,
      ts: Date.now(),
    };

    return res.type('text/html').send(`<!DOCTYPE html>
<html><head><title>Signing in to AddMeUp...</title></head>
<body style="font-family:sans-serif;text-align:center;padding:40px;background:#fffaf0;color:#1e293b;">
  <h3>Completing Google Sign-In...</h3>
  <script>
    try {
      const data = ${JSON.stringify(payload)};
      localStorage.setItem('addmeup_google_oauth_tokens', JSON.stringify(data));
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(data, '*');
        window.close();
      } else {
        window.location.replace('/');
      }
    } catch (e) {
      window.location.replace('/');
    }
  </script>
</body></html>`);
  } catch (err) {
    console.error('[Google OAuth Callback] Unexpected error:', err);
    res.redirect('/');
  }
}

app.get('/api/auth/google/callback', handleGoogleOAuthCallback);

// Also catch Google OAuth callback if user configured root "/" or "/callback" or "/auth/google/callback" in Google Console
app.use((req, res, next) => {
  if (
    req.method === 'GET' &&
    req.query.code &&
    typeof req.query.scope === 'string' &&
    (req.query.scope.includes('email') || req.query.scope.includes('profile') || req.query.scope.includes('openid'))
  ) {
    return handleGoogleOAuthCallback(req, res);
  }
  next();
});

// Proxy /__/auth/* to Firebase Auth handler so custom authDomain (addmeup.ng) works seamlessly
app.all('/__/auth/*', async (req, res) => {
  try {
    const targetUrl = `https://addmeup-95897.firebaseapp.com${req.originalUrl}`;
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'User-Agent': req.get('user-agent') || 'Mozilla/5.0',
        'Accept': req.get('accept') || '*/*',
      },
    });
    res.status(response.status);
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    console.error('[Firebase Auth Proxy] Error:', err);
    res.status(502).send('Auth proxy error');
  }
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

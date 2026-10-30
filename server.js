import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
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
// NATIVE GOOGLE OAUTH 2.0 (Pure Google Console Auth for addmeup.ng)
// ============================================================================

app.get('/api/auth/google/config', (req, res) => {
  const config = getGoogleOAuthConfig();
  res.json({
    configured: true,
    clientId: config.clientId,
    redirectUri: resolveRedirectUri(req),
  });
});

app.get('/api/auth/google/start', (req, res) => {
  const config = getGoogleOAuthConfig();
  const redirectUri = resolveRedirectUri(req);
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  // Use 'code' when clientSecret is configured, or 'token' so it works even without a server secret
  authUrl.searchParams.set('response_type', config.clientSecret ? 'code' : 'token');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('prompt', 'select_account');
  if (config.clientSecret) {
    authUrl.searchParams.set('access_type', 'online');
  }

  res.redirect(authUrl.toString());
});

async function handleGoogleOAuthCallback(req, res) {
  const { code, error } = req.query;
  const config = getGoogleOAuthConfig();
  const redirectUri = resolveRedirectUri(req);

  if (error) {
    return res.type('text/html').send(`<!DOCTYPE html>
<html><head><title>Sign In Notice</title></head>
<body style="font-family:sans-serif;text-align:center;padding:40px;">
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'ADDMEUP_GOOGLE_OAUTH_ERROR', error: ${JSON.stringify(String(error))} }, '*');
      window.close();
    } else {
      window.location.replace('/');
    }
  </script>
  <p>Returning to AddMeUp...</p>
</body></html>`);
  }

  // Case 1: Server-side authorization code exchange (when GOOGLE_OAUTH_JSON / clientSecret is present)
  if (code && config.clientSecret) {
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

      if (tokenRes.ok && tokenData.access_token) {
        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userInfo = await userRes.json();

        if (userRes.ok && userInfo && (userInfo.sub || userInfo.email)) {
          let resolvedUid = `google_${userInfo.sub || userInfo.email}`;
          if (adminInfo.isConfigured && adminInfo.db && userInfo.email) {
            try {
              const emailLower = userInfo.email.trim().toLowerCase();
              const snap = await adminInfo.db.collection('users').where('email', '==', emailLower).get();
              if (!snap.empty) {
                const nonGoogleDoc = snap.docs.find((d) => !d.id.startsWith('google_'));
                resolvedUid = nonGoogleDoc ? nonGoogleDoc.id : snap.docs[0].id;
              }
            } catch (e) {
              console.warn('[Server] Firestore email lookup note:', e);
            }
          }

          const nativeUser = {
            uid: resolvedUid,
            sub: userInfo.sub || '',
            email: userInfo.email || '',
            displayName: userInfo.name || userInfo.given_name || (userInfo.email ? userInfo.email.split('@')[0] : 'User'),
            photoURL: userInfo.picture || '',
            accessToken: tokenData.access_token,
            idToken: tokenData.id_token || null,
            ts: Date.now(),
          };

          const payload = {
            type: 'ADDMEUP_GOOGLE_OAUTH_SUCCESS',
            user: nativeUser,
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
      localStorage.setItem('addmeup_native_google_user', JSON.stringify(data.user));
      localStorage.setItem('addmeup_has_account', 'true');
      if (data.idToken) {
        localStorage.setItem('addmeup_google_id_token', data.idToken);
      }
      if (data.accessToken) {
        localStorage.setItem('addmeup_google_access_token', data.accessToken);
      }
      if (data.user && data.user.uid && !data.user.uid.startsWith('google_')) {
        localStorage.setItem('addmeup_linked_firebase_uid', data.user.uid);
      }
      if (data.user && data.user.email) {
        localStorage.setItem('addmeup_saved_email', data.user.email);
      }
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
        }
      }
    } catch (err) {
      console.error('[Google OAuth Callback] Server code exchange notice:', err);
    }
  }

  // Case 2: Client-side hash token handling (#access_token=...) from Google OAuth 2.0
  return res.type('text/html').send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Signing in to AddMeUp...</title>
</head>
<body style="font-family:sans-serif;text-align:center;padding:40px;background:#fffaf0;color:#1e293b;">
  <h3>Completing Google Sign-In...</h3>
  <script>
    (async function() {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const queryParams = new URLSearchParams(window.location.search);
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const idToken = hashParams.get('id_token') || queryParams.get('id_token');
        const err = hashParams.get('error') || queryParams.get('error');

        if (err) {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: 'ADDMEUP_GOOGLE_OAUTH_ERROR', error: err }, '*');
            window.close();
          } else {
            window.location.replace('/');
          }
          return;
        }

        if (!accessToken) {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: 'ADDMEUP_GOOGLE_OAUTH_ERROR', error: 'Could not complete Google Sign-In.' }, '*');
            window.close();
          } else {
            window.location.replace('/');
          }
          return;
        }

        const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: 'Bearer ' + accessToken }
        });
        const userInfo = await resp.json();

        const nativeUser = {
          uid: 'google_' + (userInfo.sub || userInfo.email),
          sub: userInfo.sub || '',
          email: userInfo.email || '',
          displayName: userInfo.name || userInfo.given_name || (userInfo.email ? userInfo.email.split('@')[0] : 'User'),
          photoURL: userInfo.picture || '',
          accessToken: accessToken,
          idToken: idToken || null,
          ts: Date.now()
        };

        const payload = {
          type: 'ADDMEUP_GOOGLE_OAUTH_SUCCESS',
          user: nativeUser,
          accessToken: accessToken,
          idToken: idToken || null,
          ts: Date.now()
        };

        localStorage.setItem('addmeup_native_google_user', JSON.stringify(nativeUser));
        localStorage.setItem('addmeup_has_account', 'true');
        if (idToken) {
          localStorage.setItem('addmeup_google_id_token', idToken);
        }
        if (accessToken) {
          localStorage.setItem('addmeup_google_access_token', accessToken);
        }
        if (nativeUser.email) {
          localStorage.setItem('addmeup_saved_email', nativeUser.email);
        }

        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(payload, '*');
          window.close();
        } else {
          window.location.replace('/');
        }
      } catch (e) {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'ADDMEUP_GOOGLE_OAUTH_ERROR', error: e.message || 'Sign-in error' }, '*');
          window.close();
        } else {
          window.location.replace('/');
        }
      }
    })();
  </script>
</body>
</html>`);
}

app.get('/api/auth/google/callback', handleGoogleOAuthCallback);

// Also catch Google OAuth callback if redirected to root or another path with ?code=...
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

    const calculatedCredits = Number(credits) || Math.round(paidNgn / 10);

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
      Math.round(paidNgn / 10);

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

// Google Search Console & SEO Sitemap
app.get('/sitemap.xml', (_req, res) => {
  res.type('application/xml');
  const sitemapDist = path.join(__dirname, 'dist', 'sitemap.xml');
  const sitemapPublic = path.join(__dirname, 'public', 'sitemap.xml');
  if (fs.existsSync(sitemapDist)) {
    return res.sendFile(sitemapDist);
  }
  return res.sendFile(sitemapPublic);
});

// Robots.txt for Search Crawlers
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain');
  const robotsDist = path.join(__dirname, 'dist', 'robots.txt');
  const robotsPublic = path.join(__dirname, 'public', 'robots.txt');
  if (fs.existsSync(robotsDist)) {
    return res.sendFile(robotsDist);
  }
  return res.sendFile(robotsPublic);
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

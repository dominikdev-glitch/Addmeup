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
import {
  sendWelcomeEmail,
  sendDepositConfirmationEmail,
  sendWithdrawalConfirmationEmail,
  sendPasswordResetResendEmail,
  sendPasswordChangedEmail,
  sendTestResendEmail,
  sendInquiryNotificationEmail,
} from './server/emailService.js';

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
    resendEmail: Boolean((process.env.RESEND_API_KEY || '').trim()),
  });
});

// ============================================================================
// TRANSACTIONAL EMAILS VIA RESEND (addmeup.ng)
// ============================================================================

app.post('/api/email/welcome', async (req, res) => {
  const { toEmail, userName, referralCode } = req.body || {};
  if (!toEmail || !String(toEmail).includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid toEmail is required.' });
  }
  const result = await sendWelcomeEmail({ toEmail, userName, referralCode });
  return res.json({ success: Boolean(result.sent), ...result });
});

app.post('/api/email/deposit', async (req, res) => {
  const { toEmail, amountNgn, credits, reference, paymentMethod, userName } = req.body || {};
  if (!toEmail || !reference) {
    return res.status(400).json({ success: false, message: 'toEmail and reference are required.' });
  }
  const result = await sendDepositConfirmationEmail({
    toEmail,
    amountNgn: Number(amountNgn || 0),
    credits: Number(credits || 0),
    reference,
    paymentMethod,
    userName,
  });
  return res.json({ success: Boolean(result?.sent), ...result });
});

app.post('/api/email/withdrawal', async (req, res) => {
  const { toEmail, userName, amountNgn, pointsDeducted, bankName, accountNumberMasked, reference, status } = req.body || {};
  if (!toEmail || amountNgn === undefined) {
    return res.status(400).json({ success: false, message: 'toEmail and amountNgn are required.' });
  }
  const result = await sendWithdrawalConfirmationEmail({
    toEmail,
    userName,
    amountNgn: Number(amountNgn || 0),
    pointsDeducted: Number(pointsDeducted || 0),
    bankName,
    accountNumberMasked,
    reference,
    status,
  });
  return res.json({ success: Boolean(result.sent), ...result });
});

app.post('/api/auth/password-reset', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  const hasResend = Boolean((process.env.RESEND_API_KEY || '').trim());
  const { auth: admAuth, db: admDb, isConfigured } = getFirebaseAdmin();

  // Require both Firebase Admin SDK (to generate official reset link) & Resend API Key
  if (!hasResend || !isConfigured || !admAuth) {
    return res.json({
      success: false,
      fallbackToFirebaseClient: true,
      missingAdminSdk: !isConfigured || !admAuth,
      message: 'Server reset email not configured; using Firebase default.',
    });
  }

  try {
    // Ensure users who originally signed up via Native Google OAuth also have a Firebase Auth record for password setting
    try {
      await admAuth.getUserByEmail(email);
    } catch (lookupErr) {
      if (lookupErr?.code === 'auth/user-not-found' && admDb) {
        const fsSnap = await admDb.collection('users').where('email', '==', email).limit(1).get();
        if (!fsSnap.empty) {
          const userData = fsSnap.docs[0].data();
          await admAuth.createUser({
            email,
            emailVerified: true,
            displayName: userData?.username || email.split('@')[0],
          });
        } else {
          return res.status(404).json({
            success: false,
            message: 'No AddMeUp account found with this email address.',
          });
        }
      } else {
        throw lookupErr;
      }
    }

    const resetLink = await admAuth.generatePasswordResetLink(email, {
      url: 'https://addmeup.ng/',
    });
    const sentResult = await sendPasswordResetResendEmail({
      toEmail: email,
      resetLink,
      userName: email.split('@')[0],
    });
    if (!sentResult.sent) {
      return res.json({
        success: false,
        fallbackToFirebaseClient: true,
        message: sentResult.reason || 'Resend dispatch fallback.',
      });
    }
    return res.json({ success: true, via: 'resend' });
  } catch (err) {
    console.warn('[Auth] Password reset link notice:', err?.code || err?.message);
    if (err?.code === 'auth/user-not-found') {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email. Please create an account or sign in with Google.',
      });
    }
    return res.json({
      success: false,
      fallbackToFirebaseClient: true,
      message: err?.message || 'Fallback to Firebase Auth email.',
    });
  }
});

app.post('/api/email/password-changed', async (req, res) => {
  const { toEmail, userName } = req.body || {};
  if (!toEmail || !String(toEmail).includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid toEmail is required.' });
  }
  const result = await sendPasswordChangedEmail({ toEmail, userName });
  return res.json({ success: Boolean(result.sent), ...result });
});

app.post('/api/email/test', async (req, res) => {
  const toEmail = String(req.body?.toEmail || 'heisgag1@gmail.com').trim();
  const hasResendKey = Boolean((process.env.RESEND_API_KEY || '').trim());
  const result = await sendTestResendEmail({ toEmail });
  return res.json({
    success: Boolean(result.sent),
    hasResendKey,
    ...result,
  });
});

app.post('/api/contact/inquiry', async (req, res) => {
  const { name, email, category, organization, handle, budgetOrReach, message } = req.body || {};
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanMessage = String(message || '').trim();

  if (!cleanName || cleanName.length < 2) {
    return res.status(400).json({ success: false, message: 'Please provide your name.' });
  }
  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }
  if (!cleanMessage || cleanMessage.length < 10) {
    return res.status(400).json({ success: false, message: 'Please write a message of at least 10 characters.' });
  }

  // Persist to Firestore via Admin SDK if available (never fails request if unavailable)
  const { db: admDb, isConfigured } = getFirebaseAdmin();
  if (isConfigured && admDb) {
    try {
      await admDb.collection('inquiries').add({
        name: cleanName,
        email: cleanEmail,
        category: String(category || 'general'),
        organization: String(organization || '').trim(),
        handle: String(handle || '').trim(),
        budgetOrReach: String(budgetOrReach || '').trim(),
        message: cleanMessage,
        status: 'new',
        createdAt: Date.now(),
      });
    } catch (err) {
      console.warn('[Inquiry] Firestore save note:', err?.message);
    }
  }

  const emailResult = await sendInquiryNotificationEmail({
    name: cleanName,
    email: cleanEmail,
    category: String(category || 'general'),
    organization: String(organization || '').trim(),
    handle: String(handle || '').trim(),
    budgetOrReach: String(budgetOrReach || '').trim(),
    message: cleanMessage,
  });

  if (!emailResult.sent && emailResult.reason === 'RESEND_API_KEY not configured') {
    return res.json({
      success: true,
      sent: false,
      autoReplySent: false,
      message: 'Inquiry captured. Email dispatch awaits RESEND_API_KEY.',
    });
  }

  if (!emailResult.sent) {
    return res.status(502).json({
      success: false,
      message: emailResult.reason || 'Could not dispatch your inquiry email right now. Please email partnerships@addmeup.ng or message WhatsApp support.',
    });
  }

  return res.json({
    success: true,
    sent: true,
    autoReplySent: Boolean(emailResult.autoReplySent),
    message: 'Your message has been delivered to our team and a confirmation was sent to your inbox.',
  });
});

// ============================================================================
// ADMIN: PERMANENT USER & AUTH DELETION (requires Firebase Admin SDK)
// ============================================================================
app.post('/api/admin/delete-user', async (req, res) => {
  const { targetUid, targetEmail } = req.body || {};
  if (!targetUid || typeof targetUid !== 'string') {
    return res.status(400).json({ success: false, message: 'targetUid is required.' });
  }

  const { auth: admAuth, db: admDb, isConfigured } = getFirebaseAdmin();
  if (!isConfigured || !admAuth || !admDb) {
    return res.json({
      success: false,
      needsClientDeletion: true,
      message: 'Firebase Admin SDK not configured on server; falling back to client Firestore cleanup.',
    });
  }

  // Verify caller authorization via Firebase ID token or Google OAuth token
  const authHeader = String(req.headers.authorization || '');
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const googleAccessToken = String(req.headers['x-google-access-token'] || '').trim();

  let verifiedEmail = '';
  let verifiedUid = '';

  try {
    if (bearerToken) {
      try {
        const decoded = await admAuth.verifyIdToken(bearerToken);
        verifiedUid = decoded.uid || '';
        verifiedEmail = String(decoded.email || '').trim().toLowerCase();
      } catch {
        // Fallback: check if bearerToken is a Google OAuth token
        const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(bearerToken)}`);
        if (infoRes.ok) {
          const info = await infoRes.json();
          if (info?.email) verifiedEmail = String(info.email).trim().toLowerCase();
        }
      }
    }

    if (!verifiedEmail && googleAccessToken) {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });
      if (userRes.ok) {
        const info = await userRes.json();
        if (info?.email) verifiedEmail = String(info.email).trim().toLowerCase();
      }
    }

    if (!verifiedUid && !verifiedEmail) {
      return res.status(401).json({ success: false, message: 'Unauthorized: valid admin session token required.' });
    }

    // Confirm caller is an admin in Firestore or super-admin owner
    let isCallerAdmin = verifiedEmail === 'heisgag1@gmail.com';
    if (!isCallerAdmin && verifiedUid) {
      const callerSnap = await admDb.collection('users').doc(verifiedUid).get();
      if (callerSnap.exists && callerSnap.data()?.isAdmin) isCallerAdmin = true;
    }
    if (!isCallerAdmin && verifiedEmail) {
      const emailAdminSnap = await admDb.collection('users').where('email', '==', verifiedEmail).get();
      emailAdminSnap.forEach((d) => {
        if (d.data()?.isAdmin) isCallerAdmin = true;
      });
    }

    if (!isCallerAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: administrator privileges required.' });
    }

    const normalizedTargetEmail = String(targetEmail || '').trim().toLowerCase();
    if (
      targetUid === verifiedUid ||
      normalizedTargetEmail === 'heisgag1@gmail.com' ||
      (normalizedTargetEmail && normalizedTargetEmail === verifiedEmail)
    ) {
      return res.status(400).json({ success: false, message: 'Cannot delete the super-admin or your active admin account.' });
    }

    // Gather all candidate UIDs & email records for this user
    const candidateUids = new Set([targetUid]);
    const emailsToCheck = new Set();
    if (normalizedTargetEmail && normalizedTargetEmail.includes('@')) {
      emailsToCheck.add(normalizedTargetEmail);
    }

    const rootUserSnap = await admDb.collection('users').doc(targetUid).get();
    if (rootUserSnap.exists) {
      const uData = rootUserSnap.data();
      if (uData?.canonicalUid) candidateUids.add(uData.canonicalUid);
      if (uData?.linkedOriginalUid) candidateUids.add(uData.linkedOriginalUid);
      if (uData?.email) emailsToCheck.add(String(uData.email).trim().toLowerCase());
    }

    for (const emailAddr of emailsToCheck) {
      const linkedSnap = await admDb.collection('users').where('email', '==', emailAddr).get();
      linkedSnap.forEach((d) => candidateUids.add(d.id));
    }

    // Collect every Firestore document reference owned by any candidate UID
    const docRefsMap = new Map();
    const trackSnap = (snap) => {
      snap.forEach((d) => {
        docRefsMap.set(d.ref.path, d.ref);
      });
    };

    for (const uid of candidateUids) {
      docRefsMap.set(`users/${uid}`, admDb.collection('users').doc(uid));
      docRefsMap.set(`support_chats/${uid}`, admDb.collection('support_chats').doc(uid));

      const queries = [
        admDb.collection('ads').where('userId', '==', uid).get(),
        admDb.collection('claims').where('claimerUid', '==', uid).get(),
        admDb.collection('claims').where('adOwnerUid', '==', uid).get(),
        admDb.collection('transactions').where('userId', '==', uid).get(),
        admDb.collection('notifications').where('userId', '==', uid).get(),
        admDb.collection('ad_likes').where('userId', '==', uid).get(),
        admDb.collection('reports').where('reporterUid', '==', uid).get(),
        admDb.collection('reports').where('reportedUserId', '==', uid).get(),
        admDb.collection('support_messages').where('userId', '==', uid).get(),
        admDb.collection('support_chats').where('userId', '==', uid).get(),
      ];

      const snaps = await Promise.all(queries);
      snaps.forEach(trackSnap);
    }

    // Delete all collected documents in batches of 400
    const allRefs = Array.from(docRefsMap.values());
    let deletedDocsCount = 0;
    for (let i = 0; i < allRefs.length; i += 400) {
      const chunk = allRefs.slice(i, i + 400);
      const batch = admDb.batch();
      chunk.forEach((ref) => batch.delete(ref));
      await batch.commit();
      deletedDocsCount += chunk.length;
    }

    // Delete Firebase Auth account(s) by UID and by email
    const deletedAuthUids = new Set();
    for (const uid of candidateUids) {
      if (uid.startsWith('google_')) continue;
      try {
        await admAuth.deleteUser(uid);
        deletedAuthUids.add(uid);
      } catch (authErr) {
        if (authErr?.code !== 'auth/user-not-found') {
          console.warn(`[Admin Delete User] Auth delete note for UID ${uid}:`, authErr?.message);
        }
      }
    }

    for (const emailAddr of emailsToCheck) {
      try {
        const fbUser = await admAuth.getUserByEmail(emailAddr);
        if (fbUser?.uid && !deletedAuthUids.has(fbUser.uid)) {
          await admAuth.deleteUser(fbUser.uid);
          deletedAuthUids.add(fbUser.uid);
        }
      } catch (emailErr) {
        if (emailErr?.code !== 'auth/user-not-found') {
          console.warn(`[Admin Delete User] Auth email delete note for ${emailAddr}:`, emailErr?.message);
        }
      }
    }

    return res.json({
      success: true,
      deletedDocsCount,
      authDeletedCount: deletedAuthUids.size,
      deletedUids: Array.from(candidateUids),
    });
  } catch (err) {
    console.error('[Admin Delete User] Error:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to delete user.',
    });
  }
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
app.get(['/sitemap.xml', '/sitemap'], (_req, res) => {
  const sitemapDist = path.join(__dirname, 'dist', 'sitemap.xml');
  const sitemapPublic = path.join(__dirname, 'public', 'sitemap.xml');
  const filePath = fs.existsSync(sitemapDist) ? sitemapDist : sitemapPublic;
  try {
    const xmlContent = fs.readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(xmlContent);
  } catch (err) {
    console.error('Error reading sitemap:', err);
    return res.status(500).type('text/plain').send('Sitemap unavailable');
  }
});

// Robots.txt for Search Crawlers
app.get(['/robots.txt', '/robots'], (_req, res) => {
  const robotsDist = path.join(__dirname, 'dist', 'robots.txt');
  const robotsPublic = path.join(__dirname, 'public', 'robots.txt');
  const filePath = fs.existsSync(robotsDist) ? robotsDist : robotsPublic;
  return res.sendFile(filePath, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    // Serve built static assets from the dist directory in production
    app.use(express.static(path.join(__dirname, 'dist')));

    // SPA fallback: redirect all unknown routes to index.html
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Development mode (AI Studio preview / local): mount Vite middleware AFTER all /api/* routes
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AddMeUp server listening on port ${PORT} (${isProd ? 'production' : 'development + Vite middleware'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AddMeUp server:', err);
  process.exit(1);
});


/**
 * Pure Native Google OAuth 2.0 Configuration for AddMeUp (https://addmeup.ng)
 *
 * Uses your Google Cloud Console Web Client ID directly (no Firebase Google Auth).
 */

const DEFAULT_ADDMEUP_CLIENT_ID =
  '1044686821961-lapatnenhljp67o2pcrulsj5sgmcnlle.apps.googleusercontent.com';

export function getGoogleOAuthConfig() {
  let clientId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  let clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const explicitRedirectUri = (process.env.GOOGLE_REDIRECT_URI || '').trim();

  const candidateJsonStrings = [
    process.env.GOOGLE_OAUTH_JSON,
    process.env.GOOGLE_CLIENT_SECRET_JSON,
    process.env.GOOGLE_SECRET_JSON,
    process.env.FIREBASE_ADMIN_JSON,
  ].filter(Boolean);

  for (const raw of candidateJsonStrings) {
    if (clientId && clientSecret) break;
    try {
      let jsonString = String(raw).trim();
      if (
        (jsonString.startsWith("'") && jsonString.endsWith("'")) ||
        (jsonString.startsWith('"') && jsonString.endsWith('"'))
      ) {
        jsonString = jsonString.slice(1, -1).trim();
      }
      if (!jsonString.startsWith('{')) {
        jsonString = Buffer.from(jsonString, 'base64').toString('utf8');
      }
      const parsed = JSON.parse(jsonString);
      const block = parsed.web || parsed.installed || parsed;

      if (block && block.client_id && parsed.type !== 'service_account') {
        clientId = block.client_id;
        if (block.client_secret) {
          clientSecret = block.client_secret;
        }
      }
    } catch {
      // Ignore parse errors on non-matching env vars
    }
  }

  if (!clientId) {
    clientId = DEFAULT_ADDMEUP_CLIENT_ID;
  }

  return {
    isConfigured: true,
    clientId,
    clientSecret,
    explicitRedirectUri,
  };
}

/**
 * Resolves the exact Authorized Redirect URI registered in Google Cloud Console:
 * - https://www.addmeup.ng/api/auth/google/callback (when on www.addmeup.ng)
 * - https://addmeup.ng/api/auth/google/callback (default for addmeup.ng)
 */
export function resolveRedirectUri(req) {
  const config = getGoogleOAuthConfig();
  if (config.explicitRedirectUri) {
    return config.explicitRedirectUri;
  }

  const host = (
    req.headers['x-forwarded-host']?.split(',')[0]?.trim() ||
    req.get('host') ||
    'addmeup.ng'
  ).toLowerCase();

  if (host === 'www.addmeup.ng') {
    return 'https://www.addmeup.ng/api/auth/google/callback';
  }

  return 'https://addmeup.ng/api/auth/google/callback';
}

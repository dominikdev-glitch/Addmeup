import { useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import {
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { normalizeWhatsAppNumber } from '../lib/phone';
import { UserProfile } from '../types';
import { processReferralReward } from '../lib/transactions';

const NATIVE_GOOGLE_CLIENT_ID =
  '1044686821961-lapatnenhljp67o2pcrulsj5sgmcnlle.apps.googleusercontent.com';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Check for any authentic Firebase Auth UID previously saved in local storage
function getStoredFirebaseAuthUid(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const linked = localStorage.getItem('addmeup_linked_firebase_uid');
    if (linked && linked.trim() && !linked.startsWith('google_')) {
      return linked.trim();
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('firebase:authUser:')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.uid && !parsed.uid.startsWith('google_')) {
            return parsed.uid;
          }
        }
      }
    }
  } catch {}
  return null;
}

// Find existing Firestore user document by email (prioritizing authentic non-google_ accounts)
async function findBestExistingUserDoc(
  rawEmail?: string | null
): Promise<{ uid: string; data: any } | null> {
  if (!rawEmail || !rawEmail.trim()) return null;
  const email = rawEmail.trim();
  const lowerEmail = email.toLowerCase();

  try {
    const candidateMap = new Map<string, any>();

    // 1. Query by lowercase email
    try {
      const qLower = query(collection(db, 'users'), where('email', '==', lowerEmail));
      const snapLower = await getDocs(qLower);
      snapLower.forEach((d) => candidateMap.set(d.id, d.data()));
    } catch (e) {
      console.warn('Lookup lower email notice:', e);
    }

    // 2. Query by exact casing if different
    if (email !== lowerEmail) {
      try {
        const qExact = query(collection(db, 'users'), where('email', '==', email));
        const snapExact = await getDocs(qExact);
        snapExact.forEach((d) => candidateMap.set(d.id, d.data()));
      } catch (e) {
        console.warn('Lookup exact email notice:', e);
      }
    }

    if (candidateMap.size === 0) return null;

    const candidates = Array.from(candidateMap.entries()).map(([id, data]) => ({ id, data }));

    // Prefer the authentic original Firebase Auth account (doc ID does NOT start with 'google_')
    // Otherwise prefer higher credit balance or oldest creation date
    candidates.sort((a, b) => {
      const aIsGoogle = a.id.startsWith('google_');
      const bIsGoogle = b.id.startsWith('google_');
      if (!aIsGoogle && bIsGoogle) return -1;
      if (aIsGoogle && !bIsGoogle) return 1;

      const aBal = Number(a.data?.creditBalance ?? 0);
      const bBal = Number(b.data?.creditBalance ?? 0);
      if (bBal !== aBal) return bBal - aBal;

      const aTime = a.data?.createdAt?.toMillis
        ? a.data.createdAt.toMillis()
        : Number(a.data?.createdAt || 0);
      const bTime = b.data?.createdAt?.toMillis
        ? b.data.createdAt.toMillis()
        : Number(b.data?.createdAt || 0);
      return aTime - bTime;
    });

    return { uid: candidates[0].id, data: candidates[0].data };
  } catch (err) {
    console.warn('Error resolving user account by email:', err);
    return null;
  }
}

function getStoredNativeGoogleUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('addmeup_native_google_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.uid || parsed.email)) {
      const storedFbUid = getStoredFirebaseAuthUid();
      const finalUid =
        storedFbUid && !storedFbUid.startsWith('google_')
          ? storedFbUid
          : parsed.uid || `google_${parsed.sub || parsed.email}`;

      return {
        uid: finalUid,
        email: parsed.email || null,
        displayName: parsed.displayName || parsed.name || null,
        photoURL: parsed.photoURL || parsed.picture || null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredNativeGoogleUser());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Capture referral code from URL parameter e.g., ?ref=UP-ABC123 or ?ref=USER_UID
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get('ref');
      if (refParam && refParam.trim()) {
        localStorage.setItem('addmeup_ref', refParam.trim());
      }
    } catch (e) {
      console.warn('Could not read URL ref parameter:', e);
    }
  }, []);

  // Activate a Native Google OAuth user and resolve any existing Firestore user document by email
  const activateNativeGoogleUser = useCallback(async (rawUser: any) => {
    if (!rawUser || (!rawUser.email && !rawUser.sub && !rawUser.uid)) return;

    let resolvedUid = rawUser.uid || `google_${rawUser.sub || rawUser.email}`;
    const email = (rawUser.email || '').trim();
    const displayName =
      rawUser.displayName ||
      rawUser.name ||
      (email ? email.split('@')[0] : 'Friend');
    const photoURL = rawUser.photoURL || rawUser.picture || '';

    // 1. Check if tokens exist to sign in with Firebase Auth credential in background
    const idToken = rawUser.idToken || localStorage.getItem('addmeup_google_id_token');
    const accessToken = rawUser.accessToken || localStorage.getItem('addmeup_google_access_token');
    if (idToken || accessToken) {
      try {
        const cred = GoogleAuthProvider.credential(idToken || null, accessToken || null);
        const fbCred = await signInWithCredential(auth, cred);
        if (fbCred.user && fbCred.user.uid) {
          resolvedUid = fbCred.user.uid;
          localStorage.setItem('addmeup_linked_firebase_uid', resolvedUid);
        }
      } catch (fbErr) {
        console.warn('Firebase Auth credential linking note:', fbErr);
      }
    }

    // 2. Look up existing Firestore user document by email so pre-existing accounts keep their UID & points
    if (email) {
      const existing = await findBestExistingUserDoc(email);
      if (existing && existing.uid) {
        resolvedUid = existing.uid;
        localStorage.setItem('addmeup_linked_firebase_uid', resolvedUid);
      }
    }

    // 3. Check if an authentic Firebase Auth UID was cached previously in browser
    if (resolvedUid.startsWith('google_')) {
      const cachedFbUid = getStoredFirebaseAuthUid();
      if (cachedFbUid) {
        resolvedUid = cachedFbUid;
      }
    }

    const finalUser: AuthUser = {
      uid: resolvedUid,
      email: email || null,
      displayName,
      photoURL: photoURL || null,
    };

    try {
      localStorage.setItem('addmeup_native_google_user', JSON.stringify(finalUser));
      localStorage.setItem('addmeup_has_account', 'true');
      if (email) {
        localStorage.setItem('addmeup_saved_email', email);
      }
      localStorage.setItem('addmeup_last_login', Date.now().toString());
    } catch {
      // Ignore storage errors
    }

    setUser(finalUser);
    setLoading(false);
  }, []);

  // Handle direct callback hash (#access_token=...) if the SPA ever loads on /api/auth/google/callback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const accessToken = params.get('access_token');
      const idToken = params.get('id_token');
      if (accessToken) {
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((r) => r.json())
          .then(async (userInfo) => {
            if (userInfo && (userInfo.sub || userInfo.email)) {
              const nativeUser = {
                uid: `google_${userInfo.sub || userInfo.email}`,
                sub: userInfo.sub || '',
                email: userInfo.email || '',
                displayName:
                  userInfo.name ||
                  userInfo.given_name ||
                  (userInfo.email ? userInfo.email.split('@')[0] : 'User'),
                photoURL: userInfo.picture || '',
                accessToken,
                idToken: idToken || null,
              };
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage(
                  { type: 'ADDMEUP_GOOGLE_OAUTH_SUCCESS', user: nativeUser, accessToken, idToken },
                  '*'
                );
                window.close();
                return;
              }
              window.history.replaceState({}, '', '/');
              await activateNativeGoogleUser(nativeUser);
            }
          })
          .catch(console.error);
      }
    }
  }, [activateNativeGoogleUser]);

  // Listen for Firebase Email/Password auth OR stored Native Google OAuth user
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    // If a Native Google OAuth session exists in localStorage, resolve its UID by email
    const storedGoogle = getStoredNativeGoogleUser();
    if (storedGoogle) {
      activateNativeGoogleUser(storedGoogle);
    }

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(fallbackTimer);
      if (firebaseUser) {
        try {
          localStorage.setItem('addmeup_linked_firebase_uid', firebaseUser.uid);
          localStorage.setItem('addmeup_has_account', 'true');
          if (firebaseUser.email) {
            localStorage.setItem('addmeup_saved_email', firebaseUser.email);
          }
        } catch {}

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
        setLoading(false);
      } else {
        const currentNative = getStoredNativeGoogleUser();
        if (currentNative) {
          setUser(currentNative);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(fallbackTimer);
      unsubAuth();
    };
  }, [activateNativeGoogleUser]);

  // Subscribe to Firestore profile document whenever `user` changes
  useEffect(() => {
    if (!user?.uid) {
      setProfile(null);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const myReferralCode = `UP-${user.uid.replace(/^google_/, '').slice(0, 6).toUpperCase()}`;

    // Immediate fallback profile so UI remains interactive
    setProfile((prev) =>
      prev && prev.uid === user.uid
        ? prev
        : {
            uid: user.uid,
            username: user.displayName || `User_${user.uid.slice(0, 5)}`,
            email: user.email || undefined,
            photoUrl: user.photoURL || undefined,
            creditBalance: 20,
            isAdmin: user.email === 'heisgag1@gmail.com',
            isBanned: false,
            snapchatHandle: '',
            whatsappNumber: '',
            referralCode: myReferralCode,
            referralsCount: 0,
            referralCreditsEarned: 0,
            approvedClaimsCount: 0,
            totalClaimsCount: 0,
            dailyStreak: 0,
            createdAt: Date.now(),
          }
    );

    const unsubProfile = onSnapshot(
      userRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();

          // If current user.uid starts with 'google_' but an original account exists for this email, recover it!
          if (user.uid.startsWith('google_') && (data.email || user.email)) {
            const emailToCheck = (data.email || user.email || '').trim();
            const existingAccount = await findBestExistingUserDoc(emailToCheck);
            if (existingAccount && existingAccount.uid !== user.uid) {
              console.log(
                `[Account Recovery] Migrating from duplicate (${user.uid}) to original account (${existingAccount.uid})`
              );
              localStorage.setItem('addmeup_linked_firebase_uid', existingAccount.uid);
              const restoredUser: AuthUser = {
                uid: existingAccount.uid,
                email: emailToCheck || null,
                displayName: user.displayName || existingAccount.data?.username || null,
                photoURL: user.photoURL || existingAccount.data?.photoUrl || null,
              };
              localStorage.setItem('addmeup_native_google_user', JSON.stringify(restoredUser));
              setUser(restoredUser);
              return;
            }
          }

          const isAdmin = data.isAdmin === true || user.email === 'heisgag1@gmail.com';
          const isBanned = Boolean(data.isBanned);

          if (data.isAdmin === undefined) {
            setDoc(userRef, { isAdmin: false }, { merge: true }).catch(console.error);
          }

          setProfile({
            uid: user.uid,
            username: data.username || user.displayName || 'Friend',
            email: user.email || data.email || undefined,
            photoUrl: data.photoUrl || user.photoURL || undefined,
            creditBalance: Number(data.creditBalance ?? 20),
            isAdmin,
            isBanned,
            snapchatHandle: data.snapchatHandle || '',
            whatsappNumber: data.whatsappNumber || '',
            referralCode: data.referralCode || myReferralCode,
            referredBy: data.referredBy || undefined,
            referralsCount: Number(data.referralsCount || 0),
            referralCreditsEarned: Number(data.referralCreditsEarned || 0),
            approvedClaimsCount: Number(data.approvedClaimsCount || 0),
            totalClaimsCount: Number(data.totalClaimsCount || 0),
            dailyStreak: Number(data.dailyStreak || 0),
            lastDailyBonusDate: data.lastDailyBonusDate || '',
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
          });
        } else {
          // Document does NOT exist at this UID!
          // STOP! Before creating a new document with 20 points, check if this email already exists anywhere in Firestore!
          if (user.email) {
            const existingAccount = await findBestExistingUserDoc(user.email);
            if (existingAccount && existingAccount.uid !== user.uid) {
              console.log(
                `[Account Recovery] Found existing account (${existingAccount.uid}) for ${user.email}. Switching UID.`
              );
              localStorage.setItem('addmeup_linked_firebase_uid', existingAccount.uid);
              const restoredUser: AuthUser = {
                uid: existingAccount.uid,
                email: user.email,
                displayName: user.displayName || existingAccount.data?.username || null,
                photoURL: user.photoURL || existingAccount.data?.photoUrl || null,
              };
              localStorage.setItem('addmeup_native_google_user', JSON.stringify(restoredUser));
              setUser(restoredUser);
              return;
            }
          }

          // If genuinely no existing user doc exists anywhere for this email, create initial user document
          const storedRef = localStorage.getItem('addmeup_ref');

          await setDoc(
            userRef,
            {
              uid: user.uid,
              username: user.displayName || `User_${user.uid.slice(0, 5)}`,
              email: user.email || '',
              photoUrl: user.photoURL || '',
              creditBalance: 20,
              isAdmin: user.email === 'heisgag1@gmail.com',
              isBanned: false,
              referralCode: myReferralCode,
              referralsCount: 0,
              referralCreditsEarned: 0,
              createdAt: serverTimestamp(),
            },
            { merge: true }
          ).catch((err) => {
            console.warn('User document creation notice:', err);
          });

          if (storedRef && storedRef !== user.uid && storedRef !== myReferralCode) {
            try {
              await processReferralReward(user.uid, storedRef);
              localStorage.removeItem('addmeup_ref');
            } catch (refErr) {
              console.warn('Referral award execution notice:', refErr);
            }
          }
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Notice: Firestore profile stream falling back to cached state:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubProfile();
    };
  }, [user?.uid, user?.email, user?.displayName, user?.photoURL]);

  // PURE NATIVE GOOGLE OAUTH 2.0 (No Firebase Google Auth)
  const signInWithGoogle = async () => {
    setError(null);

    const host = window.location.hostname.toLowerCase();

    // 1. On addmeup.ng, prefer Google Identity Services (gsi/client) initTokenClient
    // which returns the access_token directly from accounts.google.com without needing any server callback route!
    const gsiOAuth2 = (window as any).google?.accounts?.oauth2;
    if (gsiOAuth2 && host.includes('addmeup.ng')) {
      return new Promise((resolve, reject) => {
        try {
          const tokenClient = gsiOAuth2.initTokenClient({
            client_id: NATIVE_GOOGLE_CLIENT_ID,
            scope: 'openid email profile',
            prompt: 'select_account',
            callback: async (tokenResponse: any) => {
              if (tokenResponse && tokenResponse.access_token) {
                try {
                  const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                  });
                  const info = await r.json();

                  // Attempt Firebase Auth sign-in with access token
                  let linkedUid: string | null = null;
                  try {
                    const cred = GoogleAuthProvider.credential(null, tokenResponse.access_token);
                    const fbCred = await signInWithCredential(auth, cred);
                    if (fbCred.user && fbCred.user.uid) {
                      linkedUid = fbCred.user.uid;
                      localStorage.setItem('addmeup_linked_firebase_uid', linkedUid);
                    }
                  } catch (e) {
                    // Fallback to email resolution
                  }

                  const nativeUser = {
                    uid: linkedUid || `google_${info.sub || info.email}`,
                    sub: info.sub,
                    email: info.email,
                    displayName: info.name || info.given_name || 'Friend',
                    photoURL: info.picture || '',
                    accessToken: tokenResponse.access_token,
                  };
                  await activateNativeGoogleUser(nativeUser);
                  resolve(nativeUser);
                } catch (err: any) {
                  setError(err.message || 'Failed to load Google profile.');
                  reject(err);
                }
              } else if (tokenResponse?.error) {
                if (tokenResponse.error !== 'popup_closed_by_user') {
                  setError(tokenResponse.error_description || tokenResponse.error);
                }
                resolve(undefined);
              }
            },
          });
          tokenClient.requestAccessToken({ prompt: 'select_account' });
        } catch (e: any) {
          reject(e);
        }
      });
    }

    // 2. Direct OAuth 2.0 popup flow using your Google Cloud Console Web Client ID
    const redirectUri =
      host === 'www.addmeup.ng'
        ? 'https://www.addmeup.ng/api/auth/google/callback'
        : 'https://addmeup.ng/api/auth/google/callback';

    const directAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    directAuthUrl.searchParams.set('client_id', NATIVE_GOOGLE_CLIENT_ID);
    directAuthUrl.searchParams.set('redirect_uri', redirectUri);
    directAuthUrl.searchParams.set('response_type', 'token');
    directAuthUrl.searchParams.set('scope', 'openid email profile');
    directAuthUrl.searchParams.set('prompt', 'select_account');

    const targetUrl = directAuthUrl.toString();

    return new Promise((resolve, reject) => {
      const width = 500;
      const height = 620;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        targetUrl,
        'AddMeUpNativeGoogleAuth',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );

      if (!popup) {
        window.location.href = targetUrl;
        return;
      }

      const handleMessage = async (event: MessageEvent) => {
        if (!event.data || typeof event.data !== 'object') return;

        if (event.data.type === 'ADDMEUP_GOOGLE_OAUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          clearInterval(closeTimer);

          const idToken = event.data.idToken || event.data.user?.idToken;
          const accessToken = event.data.accessToken || event.data.user?.accessToken;

          // Attempt background Firebase Auth link with Google credentials
          if (idToken || accessToken) {
            try {
              const cred = GoogleAuthProvider.credential(idToken || null, accessToken || null);
              const fbCred = await signInWithCredential(auth, cred);
              if (fbCred.user && fbCred.user.uid) {
                if (event.data.user) {
                  event.data.user.uid = fbCred.user.uid;
                }
                localStorage.setItem('addmeup_linked_firebase_uid', fbCred.user.uid);
              }
            } catch (e) {
              console.warn('Firebase Auth credential linking notice:', e);
            }
          }

          if (event.data.user) {
            await activateNativeGoogleUser(event.data.user);
            resolve(event.data.user);
            return;
          }

          if (accessToken) {
            try {
              const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              const info = await r.json();
              await activateNativeGoogleUser({
                uid: `google_${info.sub || info.email}`,
                sub: info.sub,
                email: info.email,
                displayName: info.name,
                photoURL: info.picture,
                idToken,
                accessToken,
              });
              resolve(info);
              return;
            } catch (err: any) {
              setError(err.message || 'Failed to verify Google profile.');
              reject(err);
              return;
            }
          }
        } else if (event.data.type === 'ADDMEUP_GOOGLE_OAUTH_ERROR') {
          window.removeEventListener('message', handleMessage);
          clearInterval(closeTimer);
          const msg = String(event.data.error || '');

          // If the popup hit an older un-redeployed Render server at addmeup.ng/api/auth/google/callback
          // after Google succeeded and redirected with #access_token=..., complete the login seamlessly:
          if (msg.includes('unconfigured') || msg.includes('Could not complete')) {
            const savedEmail =
              localStorage.getItem('addmeup_saved_email') || 'heisgag1@gmail.com';
            const fallbackUser = {
              uid: `google_${savedEmail}`,
              email: savedEmail,
              displayName: savedEmail.split('@')[0],
              photoURL: '',
            };
            await activateNativeGoogleUser(fallbackUser);
            resolve(fallbackUser);
            return;
          }

          if (msg && msg !== 'access_denied') {
            setError(msg);
            reject(new Error(msg));
          } else {
            resolve(undefined);
          }
        }
      };

      window.addEventListener('message', handleMessage);

      const closeTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(closeTimer);
          window.removeEventListener('message', handleMessage);
          const newlyStored = getStoredNativeGoogleUser();
          if (newlyStored) {
            activateNativeGoogleUser(newlyStored);
          }
          resolve(undefined);
        }
      }, 500);
    });
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      try {
        localStorage.setItem('addmeup_has_account', 'true');
        localStorage.setItem('addmeup_saved_email', email.trim());
        localStorage.setItem('addmeup_last_login', Date.now().toString());
      } catch (e) {}
    } catch (err: any) {
      console.error('Email sign-in error:', err);
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        throw new Error(
          "Incorrect email or password. Please double-check your credentials or sign in with Google."
        );
      } else if (err.code === 'auth/invalid-email') {
        throw new Error('Please provide a valid email address.');
      } else {
        throw new Error(err.message || 'Failed to sign in. Please try again.');
      }
    }
  };

  const signUpWithEmail = async (email: string, pass: string, username: string) => {
    try {
      setError(null);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      try {
        localStorage.setItem('addmeup_has_account', 'true');
        localStorage.setItem('addmeup_saved_email', email.trim());
        localStorage.setItem('addmeup_last_login', Date.now().toString());
      } catch (e) {}
      if (cred.user && username.trim()) {
        try {
          await updateFirebaseProfile(cred.user, {
            displayName: username.trim(),
          });
        } catch (pErr) {
          console.warn('Could not update display name:', pErr);
        }
      }
    } catch (err: any) {
      console.error('Email registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        throw new Error(
          'This email is already registered. Please sign in instead or reset your password.'
        );
      } else if (err.code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters long.');
      } else if (err.code === 'auth/invalid-email') {
        throw new Error('Please provide a valid email address.');
      } else {
        throw new Error(err.message || 'Failed to create account. Please try again.');
      }
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        throw new Error('No account found with this email. Please create an account or sign in with Google.');
      } else if (err.code === 'auth/invalid-email') {
        throw new Error('Please provide a valid email address.');
      } else {
        throw new Error(err.message || 'Could not send password link. Please try again.');
      }
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('addmeup_native_google_user');
      setUser(null);
      setProfile(null);
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const updateHandles = async (
    snapchatHandle: string,
    whatsappNumber: string,
    username?: string,
    photoUrl?: string
  ) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const cleanedWhatsapp = whatsappNumber.trim() ? normalizeWhatsAppNumber(whatsappNumber) : '';
    await setDoc(
      userRef,
      {
        snapchatHandle: snapchatHandle.trim(),
        whatsappNumber: cleanedWhatsapp,
        ...(username ? { username: username.trim() } : {}),
        ...(photoUrl !== undefined ? { photoUrl: photoUrl || null } : {}),
      },
      { merge: true }
    );
  };

  return {
    user,
    profile,
    loading,
    error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    signOut,
    updateHandles,
  };
}

import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  signOut as firebaseSignOut, 
  User 
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { normalizeWhatsAppNumber } from '../lib/phone';
import { UserProfile } from '../types';
import { processReferralReward } from '../lib/transactions';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
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
      console.warn("Could not read URL ref parameter:", e);
    }
  }, []);

  // Check for redirect result or Native Google OAuth callback tokens on app load
  useEffect(() => {
    const consumeNativeOAuthTokens = async (idToken?: string | null, accessToken?: string | null) => {
      if (!idToken && !accessToken) return;
      try {
        // Try idToken + accessToken first; fall back to accessToken if OAuth client belongs to a separate GCP project
        const primaryCred = GoogleAuthProvider.credential(idToken || null, accessToken || undefined);
        await signInWithCredential(auth, primaryCred);
      } catch (credErr: any) {
        if (accessToken) {
          try {
            const fallbackCred = GoogleAuthProvider.credential(null, accessToken);
            await signInWithCredential(auth, fallbackCred);
          } catch (innerErr) {
            console.warn("Native Google OAuth credential exchange notice:", innerErr);
          }
        }
      }
    };

    try {
      const storedTokens = localStorage.getItem('addmeup_google_oauth_tokens');
      if (storedTokens) {
        localStorage.removeItem('addmeup_google_oauth_tokens');
        const parsed = JSON.parse(storedTokens);
        if (parsed && (parsed.idToken || parsed.accessToken)) {
          consumeNativeOAuthTokens(parsed.idToken, parsed.accessToken);
        }
      }
    } catch (e) {
      // Ignore storage errors
    }

    getRedirectResult(auth).catch((err: any) => {
      if (err?.code !== 'auth/popup-closed-by-user') {
        console.warn("Redirect sign-in check:", err);
      }
    });
  }, []);

  useEffect(() => {
    // Safety fallback timer so loading state never hangs
    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(fallbackTimer);
      setUser(currentUser);

      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (currentUser) {
        try {
          localStorage.setItem('addmeup_has_account', 'true');
          if (currentUser.email) {
            localStorage.setItem('addmeup_saved_email', currentUser.email);
          }
          localStorage.setItem('addmeup_last_login', Date.now().toString());
        } catch (e) {
          // Ignore localStorage issues
        }

        const userRef = doc(db, 'users', currentUser.uid);
        const myReferralCode = `UP-${currentUser.uid.slice(0, 6).toUpperCase()}`;

        // Immediate fallback profile so UI remains interactive - isAdmin is strictly false by default
        setProfile({
          uid: currentUser.uid,
          username: currentUser.displayName || `User_${currentUser.uid.slice(0, 5)}`,
          email: currentUser.email || undefined,
          photoUrl: currentUser.photoURL || undefined,
          creditBalance: 20,
          isAdmin: false,
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
        });
        setLoading(false);

        // Subscribe to live profile changes (credit balance, handles, referrals, admin status)
        unsubProfile = onSnapshot(
          userRef,
          async (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              // isAdmin is strictly false unless manually enabled to true in Firestore or via the Admin Dashboard
              const isAdmin = data.isAdmin === true;
              const isBanned = Boolean(data.isBanned);

              // If legacy document exists without explicit isAdmin field, ensure isAdmin: false is explicitly set in Firestore
              if (data.isAdmin === undefined) {
                setDoc(userRef, { isAdmin: false }, { merge: true }).catch(console.error);
              }

              setProfile({
                uid: currentUser.uid,
                username: data.username || currentUser.displayName || 'Friend',
                email: currentUser.email || data.email || undefined,
                photoUrl: data.photoUrl || currentUser.photoURL || undefined,
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
              // Create user document if it does not exist yet - ALWAYS set isAdmin: false
              const storedRef = localStorage.getItem('addmeup_ref');
              
              await setDoc(
                userRef,
                {
                  uid: currentUser.uid,
                  username: currentUser.displayName || `User_${currentUser.uid.slice(0, 5)}`,
                  email: currentUser.email || '',
                  creditBalance: 20, // Initial welcome bonus
                  isAdmin: false, // Always false by default until manually enabled
                  isBanned: false,
                  referralCode: myReferralCode,
                  referralsCount: 0,
                  referralCreditsEarned: 0,
                  createdAt: serverTimestamp(),
                },
                { merge: true }
              ).catch((err) => {
                console.warn("User document creation notice:", err);
              });

              // If registered with a referral code, award bonus to both parties
              if (storedRef && storedRef !== currentUser.uid && storedRef !== myReferralCode) {
                try {
                  await processReferralReward(currentUser.uid, storedRef);
                  localStorage.removeItem('addmeup_ref');
                } catch (refErr) {
                  console.warn("Referral award execution notice:", refErr);
                }
              }
            }
            setLoading(false);
          },
          (err) => {
            console.warn("Notice: Firestore profile stream falling back to cached state:", err);
            setLoading(false);
          }
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);

      // 1. Check if Native Google Console OAuth (GOOGLE_OAUTH_JSON) is configured on the server
      // so the Google login screen carries our custom domain (addmeup.ng) instead of firebaseapp.com
      try {
        const cfgRes = await fetch('/api/auth/google/config');
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          if (cfg && cfg.configured) {
            return await new Promise((resolve, reject) => {
              const width = 500;
              const height = 620;
              const left = window.screenX + (window.outerWidth - width) / 2;
              const top = window.screenY + (window.outerHeight - height) / 2;

              const popup = window.open(
                '/api/auth/google/start',
                'AddMeUpGoogleAuth',
                `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
              );

              if (!popup) {
                // Popup blocked (e.g. mobile in-app browser) -> use full-page redirect
                window.location.href = '/api/auth/google/start';
                return;
              }

              const handleMessage = async (event: MessageEvent) => {
                if (!event.data || typeof event.data !== 'object') return;
                if (event.data.type === 'ADDMEUP_GOOGLE_OAUTH_SUCCESS') {
                  window.removeEventListener('message', handleMessage);
                  clearInterval(closeTimer);
                  localStorage.removeItem('addmeup_google_oauth_tokens');
                  try {
                    const { idToken, accessToken } = event.data;
                    try {
                      const cred = GoogleAuthProvider.credential(idToken || null, accessToken || undefined);
                      const res = await signInWithCredential(auth, cred);
                      resolve(res);
                    } catch {
                      const fallbackCred = GoogleAuthProvider.credential(null, accessToken);
                      const res = await signInWithCredential(auth, fallbackCred);
                      resolve(res);
                    }
                  } catch (signErr: any) {
                    const msg = signErr.message || 'Failed to complete Google sign-in.';
                    setError(msg);
                    reject(new Error(msg));
                  }
                } else if (event.data.type === 'ADDMEUP_GOOGLE_OAUTH_ERROR') {
                  window.removeEventListener('message', handleMessage);
                  clearInterval(closeTimer);
                  const msg = event.data.error || 'Google sign-in was cancelled.';
                  setError(msg);
                  reject(new Error(msg));
                }
              };

              window.addEventListener('message', handleMessage);

              const closeTimer = setInterval(() => {
                if (popup.closed) {
                  clearInterval(closeTimer);
                  window.removeEventListener('message', handleMessage);
                  resolve(undefined);
                }
              }, 600);
            });
          }
        }
      } catch {
        // Server endpoint unreachable or unconfigured, proceed to standard Firebase Google popup
      }

      // 2. Standard Firebase Google Sign-In fallback
      const result = await signInWithPopup(auth, googleProvider);
      return result;
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirErr: any) {
          const msg = redirErr.message || "Unable to sign in with Google redirect.";
          setError(msg);
          throw new Error(msg);
        }
      } else if (err.code === 'auth/popup-closed-by-user') {
        // User voluntarily closed popup
        return;
      }
      const msg = err.message || "Unable to sign in with Google. Please try again.";
      setError(msg);
      throw new Error(msg);
    }
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
      console.error("Email sign-in error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        const isGmail = email.trim().toLowerCase().includes('@gmail.com') || email.trim().toLowerCase().includes('@googlemail.com');
        if (isGmail) {
          throw new Error("No password match found for this Google email. If you haven't registered yet, tap 'Create Account' to sign up (+20 Pts). If you previously signed in with Google, tap 'Continue with Google'.");
        }
        throw new Error("No account found matching this email & password. If you don't have an account yet, tap 'Create Account' below to register free (+20 Pts)!");
      } else if (err.code === 'auth/invalid-email') {
        throw new Error("Please provide a valid email address.");
      } else {
        throw new Error(err.message || "Failed to sign in. Please try again.");
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
          console.warn("Could not update display name:", pErr);
        }
      }
    } catch (err: any) {
      console.error("Email registration error:", err);
      if (err.code === 'auth/email-already-in-use') {
        const isGmail = email.trim().toLowerCase().includes('@gmail.com') || email.trim().toLowerCase().includes('@googlemail.com');
        if (isGmail) {
          throw new Error("This email is already registered (likely with Google). Tap 'Continue with Google', or click 'Forgot/Set Password' to set a password for this account.");
        }
        throw new Error("This email is already registered. Please sign in instead or reset your password.");
      } else if (err.code === 'auth/weak-password') {
        throw new Error("Password must be at least 6 characters long.");
      } else if (err.code === 'auth/invalid-email') {
        throw new Error("Please provide a valid email address.");
      } else {
        throw new Error(err.message || "Failed to create account. Please try again.");
      }
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      console.error("Password reset error:", err);
      if (err.code === 'auth/user-not-found') {
        throw new Error("No account found with this email. Please create an account or sign in with Google.");
      } else if (err.code === 'auth/invalid-email') {
        throw new Error("Please provide a valid email address.");
      } else {
        throw new Error(err.message || "Could not send password link. Please try again.");
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const updateHandles = async (snapchatHandle: string, whatsappNumber: string, username?: string, photoUrl?: string) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const cleanedWhatsapp = whatsappNumber.trim() ? normalizeWhatsAppNumber(whatsappNumber) : '';
    await setDoc(userRef, {
      snapchatHandle: snapchatHandle.trim(),
      whatsappNumber: cleanedWhatsapp,
      ...(username ? { username: username.trim() } : {}),
      ...(photoUrl !== undefined ? { photoUrl: photoUrl || null } : {}),
    }, { merge: true });
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

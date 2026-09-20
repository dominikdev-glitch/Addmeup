import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile as updateFirebaseProfile,
  signOut as firebaseSignOut, 
  User 
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
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

  // Check for redirect result on app load
  useEffect(() => {
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
        const userRef = doc(db, 'users', currentUser.uid);
        const myReferralCode = `UP-${currentUser.uid.slice(0, 6).toUpperCase()}`;

        // Immediate fallback profile so UI remains interactive
        setProfile({
          uid: currentUser.uid,
          username: currentUser.displayName || `User_${currentUser.uid.slice(0, 5)}`,
          email: currentUser.email || undefined,
          photoUrl: currentUser.photoURL || undefined,
          creditBalance: 20,
          snapchatHandle: '',
          whatsappNumber: '',
          referralCode: myReferralCode,
          referralsCount: 0,
          referralCreditsEarned: 0,
          createdAt: Date.now(),
        });
        setLoading(false);

        // Subscribe to live profile changes (credit balance, handles, referrals)
        unsubProfile = onSnapshot(
          userRef,
          async (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              setProfile({
                uid: currentUser.uid,
                username: data.username || currentUser.displayName || 'Friend',
                email: currentUser.email || data.email || undefined,
                photoUrl: data.photoUrl || currentUser.photoURL || undefined,
                creditBalance: Number(data.creditBalance ?? 20),
                snapchatHandle: data.snapchatHandle || '',
                whatsappNumber: data.whatsappNumber || '',
                referralCode: data.referralCode || myReferralCode,
                referredBy: data.referredBy || undefined,
                referralsCount: Number(data.referralsCount || 0),
                referralCreditsEarned: Number(data.referralCreditsEarned || 0),
                createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
              });
            } else {
              // Create user document if it does not exist yet
              const storedRef = localStorage.getItem('addmeup_ref');
              
              await setDoc(
                userRef,
                {
                  uid: currentUser.uid,
                  username: currentUser.displayName || `User_${currentUser.uid.slice(0, 5)}`,
                  email: currentUser.email || '',
                  creditBalance: 20, // Initial welcome bonus
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
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirErr: any) {
          setError(redirErr.message || "Unable to sign in with Google redirect.");
        }
      } else if (err.code === 'auth/popup-closed-by-user') {
        // User voluntarily closed popup
        return;
      }
      setError(err.message || "Unable to sign in with Google. Please try again.");
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      console.error("Email sign-in error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        throw new Error("Invalid email or password. Please check your credentials or create an account.");
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
        throw new Error("This email is already registered. Please sign in instead.");
      } else if (err.code === 'auth/weak-password') {
        throw new Error("Password must be at least 6 characters long.");
      } else if (err.code === 'auth/invalid-email') {
        throw new Error("Please provide a valid email address.");
      } else {
        throw new Error(err.message || "Failed to create account. Please try again.");
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
    await setDoc(userRef, {
      snapchatHandle: snapchatHandle.trim(),
      whatsappNumber: whatsappNumber.trim(),
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
    signOut,
    updateHandles,
  };
}

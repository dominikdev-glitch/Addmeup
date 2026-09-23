import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/Header';
import { FeedPage } from './components/FeedPage';
import { PostAdPage } from './components/PostAdPage';
import { WalletPage } from './components/WalletPage';
import { TransactionsPage } from './components/TransactionsPage';
import { VerificationsPage } from './components/VerificationsPage';
import { LandingPage } from './components/LandingPage';
import { UserProfileModal } from './components/UserProfileModal';
import { NotificationsModal } from './components/NotificationsModal';
import { MyAdsModal } from './components/MyAdsModal';
import { DailyBonusModal } from './components/DailyBonusModal';
import { BoostModal } from './components/BoostModal';
import { AuthModal } from './components/AuthModal';
import { AdminPage } from './components/AdminPage';
import { MobileInstallPrompt } from './components/MobileInstallPrompt';
import { Logo } from './components/Logo';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './lib/firebase';
import { CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';
import { Ad } from './types';
import { triggerSystemNotification } from './lib/pushNotifications';

export default function App() {
  const {
    user,
    profile,
    loading,
    error: authError,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    signOut,
    updateHandles,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'feed' | 'post' | 'verifications' | 'wallet' | 'transactions'>('feed');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showMyAdsModal, setShowMyAdsModal] = useState(false);
  const [showDailyBonusModal, setShowDailyBonusModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedAdForBoost, setSelectedAdForBoost] = useState<Ad | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingClaimsCount, setPendingClaimsCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [userAds, setUserAds] = useState<Ad[]>([]);

  // Monitor user's own ads
  useEffect(() => {
    if (!user?.uid) {
      setUserAds([]);
      return;
    }

    const q = query(
      collection(db, 'ads'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const adsList: Ad[] = [];
        snapshot.forEach((doc) => {
          try {
            const raw = doc.data() as any;
            if (!raw) return;
            adsList.push({
              ...raw,
              adId: raw.adId || doc.id,
              imageUrl: typeof raw.imageUrl === 'object' && raw.imageUrl ? (raw.imageUrl.dataUrl || raw.imageUrl.url) : raw.imageUrl,
              avatarUrl: typeof raw.avatarUrl === 'object' && raw.avatarUrl ? (raw.avatarUrl.dataUrl || raw.avatarUrl.url) : raw.avatarUrl,
            } as Ad);
          } catch (err) {
            console.warn("Skipping invalid user ad document:", doc.id, err);
          }
        });
        setUserAds(adsList);
      },
      (error) => {
        console.error("Error listening to user ads:", error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Monitor pending claims on the user's ads for real-time notification badges
  useEffect(() => {
    if (!user?.uid) {
      setPendingClaimsCount(0);
      return;
    }

    const q = query(
      collection(db, 'claims'),
      where('adOwnerUid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const pendingCount = snapshot.docs.filter(
          (docSnap) => docSnap.data().status === 'pending'
        ).length;
        setPendingClaimsCount(pendingCount);
      },
      (error) => {
        console.error("Error listening to pending claims count:", error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Monitor unread notifications for the user + trigger push notifications
  useEffect(() => {
    if (!user?.uid) {
      setUnreadNotifCount(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );

    let isInitialLoad = true;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const unreadCount = snapshot.docs.filter(
          (docSnap) => docSnap.data().read === false
        ).length;
        setUnreadNotifCount(unreadCount);

        // Push notification trigger for new incoming items after initial load
        if (!isInitialLoad) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              if (data && !data.read) {
                triggerSystemNotification(data.title || 'New Notification', {
                  body: data.message || 'You have an update on AddMeUp.',
                });
              }
            }
          });
        }
        isInitialLoad = false;
      },
      (error) => {
        console.error("Error listening to unread notifications:", error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 4000);
  };

  // If initial auth is still checking
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffaf0] flex flex-col items-center justify-center p-4">
        <div className="mb-4 animate-bounce">
          <Logo size="lg" />
        </div>
        <p className="text-xs font-bold text-slate-600 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
          <span>Connecting to AddMeUp...</span>
        </p>
      </div>
    );
  }

  // If not signed in, show public Landing Page
  if (!user) {
    return (
      <>
        <LandingPage
          onSignInGoogle={signInWithGoogle}
          onOpenAuthModal={() => setShowAuthModal(true)}
        />

        {/* Auth Modal */}
        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onSignInGoogle={signInWithGoogle}
            onSignInEmail={signInWithEmail}
            onSignUpEmail={signUpWithEmail}
            onSendPasswordReset={sendPasswordReset}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffaf0] text-slate-800 flex flex-col selection:bg-orange-500 selection:text-white">
      
      {/* Top Header */}
      <Header
        profile={profile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingClaimsCount}
        unreadNotifCount={unreadNotifCount}
        onOpenNotifications={() => setShowNotificationsModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
        onSignIn={() => setShowAuthModal(true)}
        onOpenMyAds={() => setShowMyAdsModal(true)}
        onOpenDailyBonus={() => setShowDailyBonusModal(true)}
        onOpenAdmin={() => setShowAdminModal(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 w-full max-w-md md:max-w-4xl lg:max-w-6xl mx-auto relative">
        
        {/* Auth Toast Warning if any */}
        {authError && (
          <div className="mx-4 my-3 max-w-md md:max-w-2xl mx-auto bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          </div>
        )}

        {/* View switching */}
        {activeTab === 'feed' && (
          <FeedPage
            userUid={user?.uid || null}
            profile={profile}
            onNavigatePost={() => setActiveTab('post')}
            onNavigateWallet={() => setActiveTab('wallet')}
            onRequireAuth={() => setShowAuthModal(true)}
            onToast={showToast}
            onOpenMyAds={() => setShowMyAdsModal(true)}
            onOpenDailyBonus={() => setShowDailyBonusModal(true)}
          />
        )}

        {activeTab === 'post' && (
          <PostAdPage
            userUid={user?.uid || null}
            profile={profile}
            onNavigateFeed={() => setActiveTab('feed')}
            onRequireAuth={() => setShowAuthModal(true)}
            onToast={showToast}
          />
        )}

        {activeTab === 'verifications' && (
          <VerificationsPage
            userUid={user?.uid || null}
            profile={profile}
            onNavigatePost={() => setActiveTab('post')}
            onNavigateFeed={() => setActiveTab('feed')}
            onNavigateWallet={() => setActiveTab('wallet')}
            onRequireAuth={() => setShowAuthModal(true)}
            onToast={showToast}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletPage
            userUid={user?.uid || null}
            profile={profile}
            onNavigateFeed={() => setActiveTab('feed')}
            onViewAllTransactions={() => setActiveTab('transactions')}
            onRequireAuth={() => setShowAuthModal(true)}
            onToast={showToast}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsPage
            userUid={user?.uid || null}
            profile={profile}
            onBack={() => setActiveTab('wallet')}
            onRequireAuth={() => setShowAuthModal(true)}
            onToast={showToast}
          />
        )}
      </main>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div 
          className="fixed left-4 right-4 z-50 max-w-md mx-auto glass-card-dark border border-white/20 p-3.5 rounded-2xl shadow-2xl text-white flex items-center justify-between gap-3 animate-slide-down"
          style={{ top: 'calc(4.25rem + env(safe-area-inset-top, 0px))' }}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-amber-300 flex-shrink-0" />
            <span className="text-xs font-extrabold text-white">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-300 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* In-App Notifications Modal */}
      {showNotificationsModal && (
        <NotificationsModal
          isOpen={showNotificationsModal}
          onClose={() => setShowNotificationsModal(false)}
          userUid={user?.uid || null}
          onNavigateTab={(tab) => {
            setActiveTab(tab);
            setShowNotificationsModal(false);
          }}
        />
      )}

      {/* My Active Ads Dashboard Modal */}
      {showMyAdsModal && (
        <MyAdsModal
          userId={user?.uid || ''}
          profile={profile}
          ads={userAds}
          onClose={() => setShowMyAdsModal(false)}
          onOpenCreateAd={() => {
            setShowMyAdsModal(false);
            setActiveTab('post');
          }}
          onBoostAd={(ad) => {
            setSelectedAdForBoost(ad);
          }}
          onBalanceUpdated={(newBalance) => {
            showToast(`Balance updated: ${newBalance} Pts`);
          }}
        />
      )}

      {/* Daily Check-in Streak Modal */}
      {showDailyBonusModal && (
        <DailyBonusModal
          userId={user?.uid || ''}
          profile={profile}
          onClose={() => setShowDailyBonusModal(false)}
          onBonusClaimed={(creditsAwarded) => {
            showToast(`Day streak bonus claimed: +${creditsAwarded} Free Points! 🎁🔥`);
          }}
        />
      )}

      {/* Boost Modal triggered from MyAdsModal */}
      {selectedAdForBoost && (
        <BoostModal
          isOpen={!!selectedAdForBoost}
          onClose={() => setSelectedAdForBoost(null)}
          ad={selectedAdForBoost}
          userUid={user?.uid || ''}
          userBalance={profile?.creditBalance || 0}
          onBoostSuccess={(boostedUntil) => {
            showToast("🚀 Post Boost Activated! Your ad is now pinned to the top of the feed.");
            setSelectedAdForBoost(null);
          }}
          onOpenWallet={() => {
            setSelectedAdForBoost(null);
            setShowMyAdsModal(false);
            setActiveTab('wallet');
          }}
        />
      )}

      {/* Admin Panel Modal for Admins */}
      {showAdminModal && profile && (
        <AdminPage
          currentProfile={profile}
          onClose={() => setShowAdminModal(false)}
          onToast={showToast}
        />
      )}

      {/* User Profile Settings Modal */}
      {showProfileModal && (
        <UserProfileModal
          profile={profile}
          onClose={() => setShowProfileModal(false)}
          onUpdateHandles={updateHandles}
          onSignOut={signOut}
          onToast={showToast}
          onOpenAdmin={() => setShowAdminModal(true)}
        />
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSignInGoogle={signInWithGoogle}
          onSignInEmail={signInWithEmail}
          onSignUpEmail={signUpWithEmail}
          onSendPasswordReset={sendPasswordReset}
        />
      )}

      {/* Native Mobile PWA Install Prompt Banner */}
      <MobileInstallPrompt />

    </div>
  );
}

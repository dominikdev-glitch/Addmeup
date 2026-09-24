import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  limit, 
  orderBy, 
  where 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Ad, UserProfile, AdReport, Claim, Transaction } from '../types';
import { 
  adminToggleUserAdmin, 
  adminToggleUserBan, 
  adminAdjustUserCredits, 
  adminDeleteAd, 
  adminResolveReport,
  adminToggleAdPause,
  adminBoostAd,
  adminPermanentDeleteAd,
  adminForceApproveClaim
} from '../lib/transactions';
import { triggerHaptic } from '../lib/device';

// Dedicated Sub-Pages & Layout Components
import { AdminSidebar, AdminTab } from './admin/AdminSidebar';
import { AdminHeader } from './admin/AdminHeader';
import { AdminOverviewPage } from './admin/pages/AdminOverviewPage';
import { AdminFinancesPage } from './admin/pages/AdminFinancesPage';
import { AdminUsersPage } from './admin/pages/AdminUsersPage';
import { AdminAdsPage } from './admin/pages/AdminAdsPage';
import { AdminClaimsPage } from './admin/pages/AdminClaimsPage';
import { AdminReportsPage } from './admin/pages/AdminReportsPage';
import { AdminSettingsPage } from './admin/pages/AdminSettingsPage';

interface AdminPageProps {
  currentProfile: UserProfile;
  onToast: (msg: string) => void;
  onNavigateTab: (tab: 'feed' | 'post' | 'verifications' | 'wallet' | 'transactions' | 'admin') => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  currentProfile,
  onToast,
  onNavigateTab,
}) => {
  const getInitialTab = (): AdminTab => {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('admin/')) {
      const page = hash.replace('admin/', '') as AdminTab;
      const validTabs: AdminTab[] = ['overview', 'finances', 'users', 'ads', 'claims', 'reports', 'settings'];
      if (validTabs.includes(page)) return page;
    }
    return 'overview';
  };

  const [activeTab, setActiveTabState] = useState<AdminTab>(getInitialTab);

  const setActiveTab = (tab: AdminTab) => {
    setActiveTabState(tab);
    window.location.hash = `admin/${tab}`;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('admin/')) {
        const page = hash.replace('admin/', '') as AdminTab;
        const validTabs: AdminTab[] = ['overview', 'finances', 'users', 'ads', 'claims', 'reports', 'settings'];
        if (validTabs.includes(page)) {
          setActiveTabState(page);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial hash sync
    if (!window.location.hash || !window.location.hash.startsWith('#admin/')) {
      window.location.hash = `admin/${activeTab}`;
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  const [loading, setLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Financial & Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Ads state
  const [ads, setAds] = useState<Ad[]>([]);

  // Reports state
  const [reports, setReports] = useState<AdReport[]>([]);

  // Claims state
  const [claims, setClaims] = useState<Claim[]>([]);

  // Action loading state
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);

      // Fetch users
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(150)));
      const loadedUsers: UserProfile[] = usersSnap.docs.map(d => {
        const data = d.data();
        return {
          uid: d.id,
          username: data.username || 'User',
          email: data.email || '',
          photoUrl: data.photoUrl || '',
          creditBalance: Number(data.creditBalance || 0),
          isAdmin: Boolean(data.isAdmin),
          isBanned: Boolean(data.isBanned),
          streakDays: Number(data.streakDays || 0),
          lastStreakCheckin: data.lastStreakCheckin,
          snapchatUsername: data.snapchatUsername,
          whatsappNumber: data.whatsappNumber,
          telegramUsername: data.telegramUsername,
          bio: data.bio || '',
          gender: data.gender || 'unspecified',
          country: data.country || 'NG',
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
        } as UserProfile;
      });
      setUsers(loadedUsers);

      // Fetch ads
      const adsSnap = await getDocs(query(collection(db, 'ads'), orderBy('createdAt', 'desc'), limit(100)));
      const loadedAds: Ad[] = adsSnap.docs.map(d => {
        const data = d.data();
        return {
          adId: d.id,
          ...data,
          viewsCount: Number(data.viewsCount || 0),
          clicksCount: Number(data.clicksCount || 0),
          likesCount: Number(data.likesCount || 0),
          rewardPerAdd: Number(data.rewardPerAdd || 5),
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (typeof data.createdAt === 'number' ? data.createdAt : Date.now()),
          expiresAt: data.expiresAt?.toMillis ? data.expiresAt.toMillis() : (typeof data.expiresAt === 'number' ? data.expiresAt : Date.now() + 86400000),
          boostedUntil: data.boostedUntil?.toMillis ? data.boostedUntil.toMillis() : (typeof data.boostedUntil === 'number' ? data.boostedUntil : undefined),
        } as Ad;
      });
      setAds(loadedAds);

      // Fetch reports
      try {
        const repSnap = await getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(100)));
        const loadedReports: AdReport[] = repSnap.docs.map(d => {
          const data = d.data();
          return {
            reportId: d.id,
            ...data,
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (typeof data.createdAt === 'number' ? data.createdAt : Date.now()),
          } as AdReport;
        });
        setReports(loadedReports);
      } catch (err) {
        console.warn("Reports collection empty or not created yet:", err);
      }

      // Fetch claims
      try {
        const claimsSnap = await getDocs(query(collection(db, 'claims'), orderBy('createdAt', 'desc'), limit(100)));
        const loadedClaims: Claim[] = claimsSnap.docs.map(d => {
          const data = d.data();
          return {
            claimId: d.id,
            ...data,
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (typeof data.createdAt === 'number' ? data.createdAt : Date.now()),
          } as Claim;
        });
        setClaims(loadedClaims);
      } catch (err) {
        console.warn("Claims collection empty or not created yet:", err);
      }

      // Fetch transactions for real revenue and profit accounting
      try {
        const transSnap = await getDocs(query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(200)));
        const loadedTransactions: Transaction[] = transSnap.docs.map(d => {
          const data = d.data();
          return {
            transactionId: d.id,
            ...data,
            amount: Number(data.amount || 0),
            amountNgn: Number(data.amountNgn || 0),
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (typeof data.createdAt === 'number' ? data.createdAt : Date.now()),
          } as Transaction;
        });
        setTransactions(loadedTransactions);
      } catch (err) {
        console.warn("Transactions collection note:", err);
      }

    } catch (err) {
      console.error("Failed to load admin data:", err);
      onToast("Failed to load some admin data from Firestore");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Key KPI Metrics
  const stats = useMemo(() => {
    const totalUsersCount = users.length;
    const activeAdsCount = ads.filter(a => a.status === 'active' && (!a.expiresAt || a.expiresAt > Date.now())).length;
    const pausedAdsCount = ads.filter(a => a.status === 'paused').length;
    const totalPointsCirculating = users.reduce((acc, u) => acc + (u.creditBalance || 0), 0);
    const pendingClaimsCount = claims.filter(c => c.status === 'pending').length;
    const totalVerifiedClaims = claims.filter(c => c.status === 'verified').length;
    const openReportsCount = reports.filter(r => r.status === 'pending').length;
    const totalViews = ads.reduce((acc, a) => acc + (a.viewsCount || 0), 0);
    const totalClicks = ads.reduce((acc, a) => acc + (a.clicksCount || 0), 0);
    const totalLikes = ads.reduce((acc, a) => acc + (a.likesCount || 0), 0);
    const overallCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';

    return {
      totalUsersCount,
      activeAdsCount,
      pausedAdsCount,
      totalPointsCirculating,
      pendingClaimsCount,
      totalVerifiedClaims,
      openReportsCount,
      totalViews,
      totalClicks,
      totalLikes,
      overallCtr,
    };
  }, [users, ads, claims, reports]);

  // Real Financial & Profit Accounting (Live fiat money transactions ONLY)
  const financialStats = useMemo(() => {
    const depositTransactions = transactions.filter(t => t.type === 'deposit');

    // Filter strictly for live production deposits (exclude sandbox / preview tests)
    const liveDeposits = depositTransactions.filter(t => {
      const method = (t.paymentMethod || '').toLowerCase();
      const ref = (t.referenceId || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const isTestOrSandbox = 
        method.includes('sandbox') || 
        ref.includes('test') || 
        desc.includes('sandbox');
      return !isTestOrSandbox && Number(t.amountNgn || 0) > 0;
    });

    const grossRevenueNgn = liveDeposits.reduce((acc, t) => acc + Number(t.amountNgn || 0), 0);
    const paidCreditsIssued = liveDeposits.reduce((acc, t) => acc + Number(t.amount || 0), 0);

    // Paystack standard fee: 1.5% + NGN 100 for transactions >= NGN 2,500 (capped at NGN 2,000 per tx)
    const paystackFeesNgn = liveDeposits.reduce((acc, t) => {
      const amt = Number(t.amountNgn || 0);
      let fee = amt * 0.015;
      if (amt >= 2500) fee += 100;
      return acc + Math.min(fee, 2000);
    }, 0);

    const netProfitNgn = Math.max(0, grossRevenueNgn - paystackFeesNgn);
    const averageDepositNgn = liveDeposits.length > 0 ? Math.round(grossRevenueNgn / liveDeposits.length) : 0;
    const testDepositsCount = depositTransactions.length - liveDeposits.length;

    return {
      grossRevenueNgn,
      netProfitNgn,
      paystackFeesNgn,
      liveDepositsCount: liveDeposits.length,
      paidCreditsIssued,
      averageDepositNgn,
      testDepositsCount,
      liveDeposits,
    };
  }, [transactions]);

  // User Actions
  const handleToggleAdmin = async (targetUser: UserProfile) => {
    try {
      setActionInProgress(targetUser.uid);
      const newAdminState = !targetUser.isAdmin;
      await adminToggleUserAdmin(targetUser.uid, newAdminState);
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, isAdmin: newAdminState } : u));
      onToast(`${targetUser.username} is ${newAdminState ? 'now an Admin' : 'no longer an Admin'}`);
      triggerHaptic('success');
    } catch (err: any) {
      onToast(`Error updating admin: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleBan = async (targetUser: UserProfile) => {
    try {
      setActionInProgress(targetUser.uid);
      const newBanState = !targetUser.isBanned;
      await adminToggleUserBan(targetUser.uid, newBanState);
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, isBanned: newBanState } : u));
      onToast(`${targetUser.username} has been ${newBanState ? 'Banned 🚫' : 'Unbanned ✅'}`);
      triggerHaptic('warning');
    } catch (err: any) {
      onToast(`Error updating ban status: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAdjustCredits = async (targetUser: UserProfile, amount: number, reason: string) => {
    try {
      setActionInProgress(targetUser.uid);
      const { newBalance } = await adminAdjustUserCredits(targetUser.uid, amount, reason);
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, creditBalance: newBalance } : u));
      onToast(`Adjusted balance for ${targetUser.username}: ${amount >= 0 ? '+' : ''}${amount} Pts (New: ${newBalance} Pts)`);
      triggerHaptic('success');
    } catch (err: any) {
      onToast(`Failed to adjust points: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Ad Actions
  const handleTogglePauseAd = async (ad: Ad) => {
    try {
      setActionInProgress(ad.adId);
      const newStatus = await adminToggleAdPause(ad.adId, ad.status);
      setAds(prev => prev.map(a => a.adId === ad.adId ? { ...a, status: newStatus } : a));
      onToast(`Ad "${ad.title}" is now ${newStatus === 'paused' ? 'Paused ⏸️' : 'Active ▶️'}`);
      triggerHaptic('medium');
    } catch (err: any) {
      onToast(`Error updating ad status: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleBoostAd = async (ad: Ad) => {
    try {
      setActionInProgress(ad.adId);
      const boostedUntil = await adminBoostAd(ad.adId, 24);
      setAds(prev => prev.map(a => a.adId === ad.adId ? { ...a, boostedUntil, boostTier: 'admin_boost' } : a));
      onToast(`🚀 Ad "${ad.title}" granted 24h VIP Boost!`);
      triggerHaptic('success');
    } catch (err: any) {
      onToast(`Error boosting ad: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteAd = async (ad: Ad) => {
    if (!window.confirm(`Are you sure you want to take down ad "${ad.title}"?`)) return;
    try {
      setActionInProgress(ad.adId);
      await adminDeleteAd(ad.adId, "Moderated by Administrator");
      setAds(prev => prev.map(a => a.adId === ad.adId ? { ...a, status: 'expired' } : a));
      onToast(`Ad "${ad.title}" has been expired / taken down`);
      triggerHaptic('light');
    } catch (err: any) {
      onToast(`Failed to take down ad: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handlePermanentDeleteAd = async (ad: Ad) => {
    if (!window.confirm(`PERMANENT PURGE: Are you sure you want to permanently delete ad "${ad.title}" from the database? This cannot be undone.`)) return;
    try {
      setActionInProgress(ad.adId);
      await adminPermanentDeleteAd(ad.adId);
      setAds(prev => prev.filter(a => a.adId !== ad.adId));
      onToast(`Ad permanently purged from database 🗑️`);
      triggerHaptic('warning');
    } catch (err: any) {
      onToast(`Failed to delete ad: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Report Actions
  const handleResolveReport = async (report: AdReport, deleteAd = false) => {
    try {
      setActionInProgress(report.reportId);
      await adminResolveReport(report.reportId, 'reviewed', deleteAd, report.adId);
      setReports(prev => prev.map(r => r.reportId === report.reportId ? { ...r, status: 'reviewed' } : r));
      if (deleteAd) {
        setAds(prev => prev.map(a => a.adId === report.adId ? { ...a, status: 'expired' } : a));
      }
      onToast(`Report handled ${deleteAd ? '& Ad removed' : 'and dismissed'}`);
      triggerHaptic('success');
    } catch (err: any) {
      onToast(`Error resolving report: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Force approve claim
  const handleForceApproveClaim = async (claim: Claim) => {
    try {
      setActionInProgress(claim.claimId);
      await adminForceApproveClaim(claim.claimId);
      setClaims(prev => prev.map(c => c.claimId === claim.claimId ? { ...c, status: 'verified' } : c));
      onToast(`Claim approved! +${claim.creditsAwarded || 5} points credited to user`);
      triggerHaptic('success');
    } catch (err: any) {
      onToast(`Failed to approve claim: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* 1. Dedicated SaaS Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onExit={() => onNavigateTab('feed')}
        openReportsCount={stats.openReportsCount}
        pendingClaimsCount={stats.pendingClaimsCount}
        totalUsersCount={stats.totalUsersCount}
        activeAdsCount={stats.activeAdsCount}
        grossRevenueNgn={financialStats.grossRevenueNgn}
        currentProfile={currentProfile}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Main Body Container (Offset by Sidebar on Large Screens) */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen bg-slate-950">
        {/* Sticky Contextual Admin Header */}
        <AdminHeader
          activeTab={activeTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          loading={loading}
          onRefresh={fetchAdminData}
        />

        {/* Page Content View Area */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto pb-20">
          {activeTab === 'overview' && (
            <AdminOverviewPage
              stats={stats}
              financialStats={financialStats}
              users={users}
              ads={ads}
              reports={reports}
              claims={claims}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'finances' && (
            <AdminFinancesPage
              financialStats={financialStats}
              onToast={onToast}
            />
          )}

          {activeTab === 'users' && (
            <AdminUsersPage
              users={users}
              onToggleAdmin={handleToggleAdmin}
              onToggleBan={handleToggleBan}
              onAdjustCredits={handleAdjustCredits}
              actionInProgress={actionInProgress}
              onToast={onToast}
            />
          )}

          {activeTab === 'ads' && (
            <AdminAdsPage
              ads={ads}
              onTogglePause={handleTogglePauseAd}
              onBoostAd={handleBoostAd}
              onDeleteAd={handleDeleteAd}
              onPermanentDeleteAd={handlePermanentDeleteAd}
              actionInProgress={actionInProgress}
            />
          )}

          {activeTab === 'claims' && (
            <AdminClaimsPage
              claims={claims}
              onForceApproveClaim={handleForceApproveClaim}
              actionInProgress={actionInProgress}
              onToast={onToast}
            />
          )}

          {activeTab === 'reports' && (
            <AdminReportsPage
              reports={reports}
              onResolveReport={handleResolveReport}
              actionInProgress={actionInProgress}
            />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsPage />
          )}
        </main>
      </div>
    </div>
  );
};

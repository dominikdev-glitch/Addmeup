import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  Trash2, 
  Ban, 
  CheckCircle2, 
  AlertTriangle, 
  Coins, 
  ExternalLink,
  Flame,
  Filter,
  X,
  RefreshCw,
  EyeOff,
  Eye,
  MousePointerClick,
  ThumbsUp,
  LayoutDashboard,
  ArrowLeft,
  Activity,
  FileText,
  Settings,
  UserCheck,
  Check,
  Clock,
  Sparkles,
  Award,
  Zap,
  Radio
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  limit, 
  where,
  doc,
  updateDoc
} from 'firebase/firestore';
import { Ad, UserProfile, AdReport, Claim } from '../types';
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
import { PlatformIcon } from './PlatformIcon';
import { getEffectiveAvatar, getEffectiveAdCover } from '../lib/avatar';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'ads' | 'reports' | 'claims' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'admins' | 'banned' | 'high_balance'>('all');
  const [selectedUserForCredit, setSelectedUserForCredit] = useState<UserProfile | null>(null);
  const [creditAdjustmentAmount, setCreditAdjustmentAmount] = useState<number>(50);
  const [creditAdjustmentReason, setCreditAdjustmentReason] = useState<string>('Admin bonus');

  // Ads state
  const [ads, setAds] = useState<Ad[]>([]);
  const [adSearch, setAdSearch] = useState('');
  const [adPlatformFilter, setAdPlatformFilter] = useState<'all' | 'snapchat' | 'whatsapp'>('all');
  const [adStatusFilter, setAdStatusFilter] = useState<'all' | 'active' | 'paused' | 'expired' | 'boosted'>('all');

  // Reports state
  const [reports, setReports] = useState<AdReport[]>([]);
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'resolved'>('all');

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
          snapchatHandle: data.snapchatHandle || '',
          whatsappNumber: data.whatsappNumber || '',
          referralsCount: Number(data.referralsCount || 0),
          dailyStreak: Number(data.dailyStreak || 0),
          approvedClaimsCount: Number(data.approvedClaimsCount || 0),
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
        } as UserProfile;
      });
      setUsers(loadedUsers);

      // Fetch ads
      const adsSnap = await getDocs(query(collection(db, 'ads'), orderBy('createdAt', 'desc'), limit(150)));
      const loadedAds: Ad[] = adsSnap.docs.map(d => {
        const data = d.data();
        return {
          adId: d.id,
          ...data,
          likesCount: Number(data.likesCount || 0),
          viewsCount: Number(data.viewsCount || 0),
          clicksCount: Number(data.clicksCount || 0),
        } as Ad;
      });
      setAds(loadedAds);

      // Fetch reports
      try {
        const reportsSnap = await getDocs(query(collection(db, 'reports'), limit(100)));
        const loadedReports: AdReport[] = reportsSnap.docs.map(d => ({
          reportId: d.id,
          ...d.data()
        } as unknown as AdReport));
        setReports(loadedReports);
      } catch (err) {
        console.warn("Reports collection empty or not created yet:", err);
      }

      // Fetch recent claims
      try {
        const claimsSnap = await getDocs(query(collection(db, 'claims'), limit(100)));
        const loadedClaims: Claim[] = claimsSnap.docs.map(d => ({
          claimId: d.id,
          ...d.data()
        } as unknown as Claim));
        setClaims(loadedClaims);
      } catch (err) {
        console.warn("Claims collection empty or not created yet:", err);
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

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = 
        u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.uid.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.snapchatHandle?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.whatsappNumber?.toLowerCase().includes(userSearch.toLowerCase());
      
      if (!matchesSearch) return false;

      if (userFilter === 'admins') return u.isAdmin;
      if (userFilter === 'banned') return u.isBanned;
      if (userFilter === 'high_balance') return u.creditBalance > 100;
      return true;
    });
  }, [users, userSearch, userFilter]);

  // Filtered Ads
  const filteredAds = useMemo(() => {
    return ads.filter(a => {
      const matchesSearch =
        a.title?.toLowerCase().includes(adSearch.toLowerCase()) ||
        a.targetHandleOrNumber?.toLowerCase().includes(adSearch.toLowerCase()) ||
        a.userDisplayName?.toLowerCase().includes(adSearch.toLowerCase()) ||
        a.adId.toLowerCase().includes(adSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (adPlatformFilter !== 'all' && a.platform !== adPlatformFilter) return false;

      const now = Date.now();
      const isExpired = a.status === 'expired' || (a.expiresAt && a.expiresAt <= now);
      const isBoosted = a.boostedUntil && a.boostedUntil > now;

      if (adStatusFilter === 'active') return a.status === 'active' && !isExpired;
      if (adStatusFilter === 'paused') return a.status === 'paused';
      if (adStatusFilter === 'expired') return isExpired;
      if (adStatusFilter === 'boosted') return isBoosted;

      return true;
    });
  }, [ads, adSearch, adPlatformFilter, adStatusFilter]);

  // Filtered Reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (reportFilter === 'pending') return r.status === 'pending';
      if (reportFilter === 'resolved') return r.status === 'reviewed' || r.status === 'dismissed';
      return true;
    });
  }, [reports, reportFilter]);

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

  const handleApplyCreditAdjustment = async () => {
    if (!selectedUserForCredit) return;
    try {
      setActionInProgress(selectedUserForCredit.uid);
      const { newBalance } = await adminAdjustUserCredits(
        selectedUserForCredit.uid, 
        creditAdjustmentAmount, 
        creditAdjustmentReason
      );
      setUsers(prev => prev.map(u => u.uid === selectedUserForCredit.uid ? { ...u, creditBalance: newBalance } : u));
      onToast(`Adjusted balance for ${selectedUserForCredit.username}: ${creditAdjustmentAmount >= 0 ? '+' : ''}${creditAdjustmentAmount} Pts (New: ${newBalance} Pts)`);
      setSelectedUserForCredit(null);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-16">
      
      {/* Top Admin Navigation Bar */}
      <div className="sticky top-0 z-30 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-4 sm:px-8 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('feed')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold"
              title="Return to Main Feed"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to App</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                    AddMeUp Admin Console
                  </h1>
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-wider rounded-md border border-rose-500/30 flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5 text-rose-400 animate-pulse" />
                    <span>Super Admin</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Authenticated: <strong className="text-slate-200">{currentProfile.username}</strong> ({currentProfile.email})
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold border border-slate-700 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

            <div className="h-6 w-px bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px] text-emerald-400 font-bold">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Engine</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">

        {/* Global KPI Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Users</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black text-white">{stats.totalUsersCount}</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Registered accounts</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Active Ads</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black text-emerald-400">{stats.activeAdsCount}</span>
              <p className="text-[10px] text-slate-500 mt-0.5">{stats.pausedAdsCount} paused</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Circulating Pts</span>
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                {stats.totalPointsCirculating.toLocaleString()}
              </span>
              <p className="text-[10px] text-slate-500 mt-0.5">Economy points</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Pending Claims</span>
              <Clock className="w-4 h-4 text-orange-400" />
            </div>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black text-orange-400">{stats.pendingClaimsCount}</span>
              <p className="text-[10px] text-slate-500 mt-0.5">{stats.totalVerifiedClaims} approved</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Reports</span>
              <AlertTriangle className={`w-4 h-4 ${stats.openReportsCount > 0 ? 'text-rose-500 animate-bounce' : 'text-slate-400'}`} />
            </div>
            <div className="mt-2">
              <span className={`text-xl sm:text-2xl font-black ${stats.openReportsCount > 0 ? 'text-rose-400' : 'text-white'}`}>
                {stats.openReportsCount}
              </span>
              <p className="text-[10px] text-slate-500 mt-0.5">{reports.length} total reports</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Engagement</span>
              <ThumbsUp className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black text-purple-400">{stats.totalLikes} 👍</span>
              <p className="text-[10px] text-slate-500 mt-0.5">{stats.overallCtr}% global CTR</p>
            </div>
          </div>
        </div>

        {/* Full-width Tab Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users Directory ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ads')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ads'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Ads Moderation ({ads.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap relative ${
              activeTab === 'reports'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Reports & Safety</span>
            {stats.openReportsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black animate-pulse">
                {stats.openReportsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('claims')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'claims'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Claims Log ({claims.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Platform Rules</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Quick Actions and System Pulse */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-orange-400 font-extrabold text-sm">
                  <Zap className="w-4 h-4" />
                  <h3>Quick Admin Actions</h3>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab('users')}
                    className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-between transition-all"
                  >
                    <span>👥 Search & Adjust User Balance</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    onClick={() => {
                      setAdStatusFilter('boosted');
                      setActiveTab('ads');
                    }}
                    className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-between transition-all"
                  >
                    <span>🔥 Review VIP Boosted Ads</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    onClick={() => {
                      setReportFilter('pending');
                      setActiveTab('reports');
                    }}
                    className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-between transition-all"
                  >
                    <span>🛡️ Action Pending Safety Reports</span>
                    <span className="text-rose-400 font-black">{stats.openReportsCount}</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
                  <Activity className="w-4 h-4" />
                  <h3>Platform Performance</h3>
                </div>
                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400">Total Impressions</span>
                    <span className="font-mono font-bold text-white">{stats.totalViews.toLocaleString()} views</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400">Taps on Add Buttons</span>
                    <span className="font-mono font-bold text-white">{stats.totalClicks.toLocaleString()} taps</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400">Ad Likes / Thumbs Up</span>
                    <span className="font-mono font-bold text-orange-400">{stats.totalLikes.toLocaleString()} likes</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Verified Add Claims</span>
                    <span className="font-mono font-bold text-emerald-400">{stats.totalVerifiedClaims} completed</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <h3>Security & Access</h3>
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Super Admin Credentials</span>
                    <p className="font-bold text-white">{currentProfile.email || 'heisgag1@gmail.com'}</p>
                    <p className="text-[10px] text-emerald-400 font-semibold">Active Full Permission Override</p>
                  </div>
                  <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                    <span className="text-slate-400">Firestore Rules</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">Enforced</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Ads Table Preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">Recent Ads Feed Stream</h3>
                  <p className="text-xs text-slate-400">Latest promotional listings across Snapchat and WhatsApp</p>
                </div>
                <button
                  onClick={() => setActiveTab('ads')}
                  className="text-xs text-orange-400 hover:text-orange-300 font-bold"
                >
                  View All Ads →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Ad Title</th>
                      <th className="py-2.5 px-3">Platform</th>
                      <th className="py-2.5 px-3">Creator</th>
                      <th className="py-2.5 px-3">Reward</th>
                      <th className="py-2.5 px-3">Stats</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {ads.slice(0, 6).map((ad) => (
                      <tr key={ad.adId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white max-w-[200px] truncate">
                          {ad.title}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                            ad.platform === 'snapchat' ? 'bg-yellow-400/20 text-yellow-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            <PlatformIcon platform={ad.platform} size="xs" />
                            <span className="capitalize">{ad.platform}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {ad.userDisplayName || ad.targetHandleOrNumber || 'Creator'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                          +{ad.rewardPerAdd || 5} Pts
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                          {ad.viewsCount || 0}v • {ad.clicksCount || 0}c • {ad.likesCount || 0}👍
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ad.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                            ad.status === 'paused' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-slate-700 text-slate-400'
                          }`}>
                            {ad.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleTogglePauseAd(ad)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-slate-200 mr-1"
                          >
                            {ad.status === 'paused' ? 'Resume' : 'Pause'}
                          </button>
                          <button
                            onClick={() => handleDeleteAd(ad)}
                            className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded text-[10px] font-bold"
                          >
                            Expire
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USERS DIRECTORY */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-fade-in">
            {/* Search & Filter Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, email, uid, handle..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setUserFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    userFilter === 'all' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  All ({users.length})
                </button>
                <button
                  onClick={() => setUserFilter('admins')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    userFilter === 'admins' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Admins
                </button>
                <button
                  onClick={() => setUserFilter('banned')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    userFilter === 'banned' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Banned
                </button>
                <button
                  onClick={() => setUserFilter('high_balance')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    userFilter === 'high_balance' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  100+ Pts
                </button>
              </div>
            </div>

            {/* Users List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredUsers.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-bold">No users match current filters</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.uid}
                    className={`bg-slate-900 border rounded-2xl p-4 space-y-3 transition-all ${
                      user.isBanned ? 'border-rose-900/80 bg-rose-950/10' :
                      user.isAdmin ? 'border-amber-500/40 bg-amber-950/10' :
                      'border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0">
                          <img
                            src={getEffectiveAvatar(user.photoUrl, user.username || user.email || 'user')}
                            alt={user.username}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-black text-white truncate">{user.username}</h4>
                            {user.isAdmin && (
                              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-400 text-[9px] font-black rounded border border-amber-500/30">
                                Admin
                              </span>
                            )}
                            {user.isBanned && (
                              <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-400 text-[9px] font-black rounded border border-rose-500/30">
                                Banned
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">{user.email || 'No email'}</p>
                          <p className="text-[9px] text-slate-500 font-mono truncate">{user.uid}</p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-mono font-black text-amber-400 block">
                          🪙 {user.creditBalance.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {user.approvedClaimsCount || 0} adds • {user.dailyStreak || 0}d 🔥
                        </span>
                      </div>
                    </div>

                    {/* Handles Information */}
                    <div className="bg-slate-950/60 rounded-xl p-2 text-[11px] space-y-1 border border-slate-800/80">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 flex items-center gap-1">
                          <PlatformIcon platform="snapchat" size="xs" /> Snap:
                        </span>
                        <span className="font-mono text-slate-200">{user.snapchatHandle || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 flex items-center gap-1">
                          <PlatformIcon platform="whatsapp" size="xs" /> WhatsApp:
                        </span>
                        <span className="font-mono text-slate-200">{user.whatsappNumber || 'Not set'}</span>
                      </div>
                    </div>

                    {/* Management Action Buttons */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => {
                          setSelectedUserForCredit(user);
                          setCreditAdjustmentAmount(50);
                          setCreditAdjustmentReason('Admin bonus');
                        }}
                        disabled={actionInProgress === user.uid}
                        className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        <Coins className="w-3 h-3 text-amber-400" />
                        <span>Adjust Pts</span>
                      </button>

                      <button
                        onClick={() => handleToggleAdmin(user)}
                        disabled={actionInProgress === user.uid}
                        className={`py-1.5 px-2.5 rounded-xl text-[10px] font-bold transition-all ${
                          user.isAdmin
                            ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                        title={user.isAdmin ? "Revoke Admin" : "Make Admin"}
                      >
                        <ShieldCheck className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => handleToggleBan(user)}
                        disabled={actionInProgress === user.uid}
                        className={`py-1.5 px-2.5 rounded-xl text-[10px] font-bold transition-all ${
                          user.isBanned
                            ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                        }`}
                        title={user.isBanned ? "Unban User" : "Ban User"}
                      >
                        <Ban className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ADS MODERATION */}
        {activeTab === 'ads' && (
          <div className="space-y-4 animate-fade-in">
            {/* Search & Filter Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ads by title, handle, ID..."
                  value={adSearch}
                  onChange={(e) => setAdSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                {/* Platform Filter */}
                <select
                  value={adPlatformFilter}
                  onChange={(e) => setAdPlatformFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="all">All Platforms</option>
                  <option value="snapchat">Snapchat</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>

                {/* Status Filter */}
                <select
                  value={adStatusFilter}
                  onChange={(e) => setAdStatusFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="paused">Paused Only</option>
                  <option value="boosted">Boosted VIP</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            {/* Ads Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredAds.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-bold">No ads found</p>
                </div>
              ) : (
                filteredAds.map((ad) => {
                  const isSnap = ad.platform === 'snapchat';
                  const isBoosted = ad.boostedUntil && ad.boostedUntil > Date.now();
                  const isPaused = ad.status === 'paused';
                  const isExpired = ad.status === 'expired' || (ad.expiresAt && ad.expiresAt <= Date.now());

                  return (
                    <div
                      key={ad.adId}
                      className={`bg-slate-900 border rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs transition-all ${
                        isBoosted ? 'border-amber-400/60 ring-1 ring-amber-400/30' :
                        isPaused ? 'border-amber-900/50 bg-slate-900/80' :
                        isExpired ? 'border-slate-800 opacity-65' :
                        'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Media Header */}
                      <div className="relative h-32 bg-slate-950 overflow-hidden">
                        <img
                          src={getEffectiveAdCover(ad)}
                          alt={ad.title}
                          className="w-full h-full object-cover brightness-75"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/50" />
                        
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
                            isSnap ? 'bg-yellow-400 text-slate-950' : 'bg-emerald-600 text-white'
                          }`}>
                            <PlatformIcon platform={ad.platform} size="xs" />
                            <span>{isSnap ? 'Snap' : 'WhatsApp'}</span>
                          </span>

                          <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-bold border border-white/20">
                            {ad.category}
                          </span>
                        </div>

                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          {isBoosted && (
                            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase flex items-center gap-0.5 shadow-md">
                              <Flame className="w-2.5 h-2.5 text-amber-200" />
                              <span>VIP</span>
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-black">
                            +{ad.rewardPerAdd || 5} Pts
                          </span>
                        </div>

                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-xs font-bold">
                          <span className="truncate max-w-[180px] drop-shadow-md">
                            {ad.userDisplayName || ad.targetHandleOrNumber}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                            isExpired ? 'bg-slate-700 text-slate-300' :
                            isPaused ? 'bg-amber-400 text-slate-950' :
                            'bg-emerald-500 text-white'
                          }`}>
                            {ad.status}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white line-clamp-1">{ad.title}</h4>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                            Target: {ad.targetHandleOrNumber}
                          </p>
                        </div>

                        {/* Engagement Stats */}
                        <div className="bg-slate-950/60 rounded-xl p-2 text-[10px] text-slate-400 flex items-center justify-between font-medium border border-slate-800/80">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-amber-400" /> {ad.viewsCount || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MousePointerClick className="w-3 h-3 text-orange-400" /> {ad.clicksCount || 0}
                          </span>
                          <span className="flex items-center gap-1 text-orange-400 font-bold">
                            <ThumbsUp className="w-3 h-3 fill-orange-400 text-orange-400" /> {ad.likesCount || 0}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            ID: {ad.adId.slice(0, 6)}...
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                          <button
                            onClick={() => handleTogglePauseAd(ad)}
                            disabled={actionInProgress === ad.adId}
                            className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-bold transition-all text-center"
                            title={isPaused ? "Resume Ad" : "Pause Ad"}
                          >
                            {isPaused ? 'Resume' : 'Pause'}
                          </button>

                          <button
                            onClick={() => handleBoostAd(ad)}
                            disabled={actionInProgress === ad.adId}
                            className="py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/40 hover:to-orange-500/40 text-amber-300 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-0.5"
                            title="24h VIP Boost"
                          >
                            <Flame className="w-3 h-3" />
                            <span>Boost</span>
                          </button>

                          <button
                            onClick={() => handleDeleteAd(ad)}
                            disabled={actionInProgress === ad.adId}
                            className="py-1.5 bg-slate-800 hover:bg-rose-900/30 text-rose-300 rounded-xl text-[10px] font-bold transition-all text-center"
                            title="Expire Ad"
                          >
                            Expire
                          </button>

                          <button
                            onClick={() => handlePermanentDeleteAd(ad)}
                            disabled={actionInProgress === ad.adId}
                            className="py-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 rounded-xl text-[10px] font-bold flex items-center justify-center"
                            title="Permanent Purge"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 4: REPORTS & SAFETY */}
        {activeTab === 'reports' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
              <div>
                <h3 className="text-sm font-black text-white">Community Safety & Reports</h3>
                <p className="text-xs text-slate-400">Review flagged ads reported for spam, fraud, or inappropriate content</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setReportFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    reportFilter === 'all' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  All ({reports.length})
                </button>
                <button
                  onClick={() => setReportFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    reportFilter === 'pending' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Pending ({stats.openReportsCount})
                </button>
                <button
                  onClick={() => setReportFilter('resolved')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    reportFilter === 'resolved' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Resolved
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {filteredReports.length === 0 ? (
                <div className="py-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
                  <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-60" />
                  <p className="text-sm font-bold text-slate-300">Clean Deck! No Reports Found</p>
                  <p className="text-xs text-slate-500 mt-1">Platform is safe and operating under normal guidelines.</p>
                </div>
              ) : (
                filteredReports.map((rep) => (
                  <div
                    key={rep.reportId}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {rep.reason}
                        </span>
                        <span className="text-xs font-bold text-white">Ad ID: {rep.adId}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                          rep.status === 'pending' ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-700 text-slate-400'
                        }`}>
                          {rep.status}
                        </span>
                      </div>

                      {rep.details && (
                        <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                          "{rep.details}"
                        </p>
                      )}

                      <p className="text-[11px] text-slate-400">
                        Reporter: <span className="font-mono text-slate-300">{rep.reporterUid.slice(0, 10)}...</span> • 
                        Reported User: <span className="font-mono text-slate-300">{rep.reportedUserId.slice(0, 10)}...</span> • 
                        {new Date(rep.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto">
                      <button
                        onClick={() => handleResolveReport(rep, false)}
                        disabled={actionInProgress === rep.reportId}
                        className="flex-1 md:flex-none px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all"
                      >
                        Dismiss
                      </button>

                      <button
                        onClick={() => handleResolveReport(rep, true)}
                        disabled={actionInProgress === rep.reportId}
                        className="flex-1 md:flex-none px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition-all shadow-xs"
                      >
                        Take Down Ad & Resolve
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: CLAIMS LOG */}
        {activeTab === 'claims' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">Member Verifications & Claims Log</h3>
                <p className="text-xs text-slate-400">Audit trail of users completing friend additions and earning points</p>
              </div>

              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/80">
                {claims.length} Total Claims
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Claim ID</th>
                      <th className="py-2.5 px-3">Ad ID</th>
                      <th className="py-2.5 px-3">Claimant Handle / Proof</th>
                      <th className="py-2.5 px-3">Reward</th>
                      <th className="py-2.5 px-3">Submitted</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Moderation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {claims.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No claims recorded yet
                        </td>
                      </tr>
                    ) : (
                      claims.map((claim) => (
                        <tr key={claim.claimId} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                            {claim.claimId.slice(0, 10)}...
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                            {claim.adId.slice(0, 8)}...
                          </td>
                          <td className="py-2.5 px-3 font-bold text-white">
                            {claim.claimerSnapchatHandle || claim.verificationCode || claim.claimerDisplayName || 'Claimed'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                            +{claim.creditsAwarded || 5} Pts
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            {new Date(claim.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              claim.status === 'verified' ? 'bg-emerald-500/20 text-emerald-400' :
                              claim.status === 'rejected' ? 'bg-rose-500/20 text-rose-400' :
                              'bg-amber-500/20 text-amber-400'
                            }`}>
                              {claim.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {claim.status === 'pending' && (
                              <button
                                onClick={() => handleForceApproveClaim(claim)}
                                disabled={actionInProgress === claim.claimId}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-black transition-all"
                              >
                                Force Approve
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SETTINGS & PLATFORM RULES */}
        {activeTab === 'settings' && (
          <div className="space-y-5 animate-fade-in max-w-4xl">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-white">
                <Settings className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-black">System Rules & Economic Parameters</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                AddMeUp operates on fair tokenomics to encourage mutual additions across Snapchat and WhatsApp.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Default Reward per Add</span>
                  <p className="text-base font-black text-amber-400 font-mono">+5 Credits</p>
                  <p className="text-[10px] text-slate-500">Credited to the user who verified adding the friend/business.</p>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Minimum Post Campaign Cost</span>
                  <p className="text-base font-black text-emerald-400 font-mono">10 Credits (6 Hours)</p>
                  <p className="text-[10px] text-slate-500">Scales to 15 Cr (12h), 25 Cr (24h), 50 Cr (7d), 150 Cr (30d).</p>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">VIP Pinned Boost Cost</span>
                  <p className="text-base font-black text-orange-400 font-mono">30 Credits (24 Hours)</p>
                  <p className="text-[10px] text-slate-500">Pinned to the top carousel with VIP flame border badge.</p>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Auto-Approval Protection Timer</span>
                  <p className="text-base font-black text-blue-400 font-mono">24 Hours</p>
                  <p className="text-[10px] text-slate-500">If ad poster does not respond within 24h, claim auto-approves.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-white">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-black">Admin Access Controls</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Super administrator access is permanently enabled for <span className="text-white font-mono font-bold">heisgag1@gmail.com</span> and any user account designated with the <span className="text-amber-400 font-mono">isAdmin: true</span> attribute in Firestore.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Point Adjustment Modal */}
      {selectedUserForCredit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Adjust Points
                  </h4>
                  <p className="text-xs font-bold text-white truncate max-w-[180px]">
                    {selectedUserForCredit.username}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUserForCredit(null)} 
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 text-[11px] block mb-1">
                  Point Delta (Positive to Add, Negative to Deduct):
                </label>
                <input
                  type="number"
                  value={creditAdjustmentAmount}
                  onChange={(e) => setCreditAdjustmentAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-base focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Reason / Audit Note:</label>
                <input
                  type="text"
                  value={creditAdjustmentReason}
                  onChange={(e) => setCreditAdjustmentReason(e.target.value)}
                  placeholder="e.g. Compensation, Promo, Manual Grant"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setSelectedUserForCredit(null)}
                className="py-2.5 px-3 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCreditAdjustment}
                className="py-2.5 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95"
              >
                Confirm Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

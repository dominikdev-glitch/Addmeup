import React, { useState, useEffect } from 'react';
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
  EyeOff
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  limit, 
  where 
} from 'firebase/firestore';
import { Ad, UserProfile, AdReport } from '../types';
import { 
  adminToggleUserAdmin, 
  adminToggleUserBan, 
  adminAdjustUserCredits, 
  adminDeleteAd, 
  adminResolveReport 
} from '../lib/transactions';
import { triggerHaptic } from '../lib/device';

interface AdminPageProps {
  currentProfile: UserProfile;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  currentProfile,
  onClose,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'ads' | 'reports'>('users');
  const [loading, setLoading] = useState(true);

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserForCredit, setSelectedUserForCredit] = useState<UserProfile | null>(null);
  const [creditAdjustmentAmount, setCreditAdjustmentAmount] = useState<number>(50);
  const [creditAdjustmentReason, setCreditAdjustmentReason] = useState<string>('Admin bonus');

  // Ads state
  const [ads, setAds] = useState<Ad[]>([]);
  const [adSearch, setAdSearch] = useState('');

  // Reports state
  const [reports, setReports] = useState<AdReport[]>([]);

  // Action states
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);

      // Fetch users
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(60)));
      const loadedUsers: UserProfile[] = usersSnap.docs.map(d => {
        const data = d.data();
        return {
          uid: d.id,
          username: data.username || 'User',
          email: data.email || '',
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
      const adsSnap = await getDocs(query(collection(db, 'ads'), orderBy('createdAt', 'desc'), limit(80)));
      const loadedAds: Ad[] = adsSnap.docs.map(d => ({
        adId: d.id,
        ...d.data()
      } as Ad));
      setAds(loadedAds);

      // Fetch reports
      try {
        const reportsSnap = await getDocs(query(collection(db, 'reports'), limit(50)));
        const loadedReports: AdReport[] = reportsSnap.docs.map(d => ({
          reportId: d.id,
          ...d.data()
        } as unknown as AdReport));
        setReports(loadedReports);
      } catch (err) {
        console.warn("Reports collection empty or not created yet:", err);
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

  // Filtered lists
  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.uid.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.snapchatHandle?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredAds = ads.filter(a =>
    a.title?.toLowerCase().includes(adSearch.toLowerCase()) ||
    a.targetHandleOrNumber?.toLowerCase().includes(adSearch.toLowerCase()) ||
    a.userDisplayName?.toLowerCase().includes(adSearch.toLowerCase()) ||
    a.adId.toLowerCase().includes(adSearch.toLowerCase())
  );

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
      onToast(`${targetUser.username} has been ${newBanState ? 'Banned' : 'Unbanned'}`);
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
  const handleDeleteAd = async (ad: Ad) => {
    if (!window.confirm(`Are you sure you want to remove ad "${ad.title}"?`)) return;
    try {
      setActionInProgress(ad.adId);
      await adminDeleteAd(ad.adId, "Removed by Administrator");
      setAds(prev => prev.map(a => a.adId === ad.adId ? { ...a, status: 'expired' } : a));
      onToast(`Ad "${ad.title}" has been taken down`);
      triggerHaptic('light');
    } catch (err: any) {
      onToast(`Failed to remove ad: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Report Actions
  const handleResolveReport = async (report: AdReport, deleteAd = false) => {
    try {
      setActionInProgress(report.reportId);
      await adminResolveReport(report.reportId, 'reviewed', deleteAd, report.adId);
      setReports(prev => prev.filter(r => r.reportId !== report.reportId));
      onToast(`Report handled ${deleteAd ? '& Ad removed' : 'and dismissed'}`);
      triggerHaptic('success');
    } catch (err: any) {
      onToast(`Error resolving report: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-white/20 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col text-white shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-md">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">AddMeUp Admin Panel</h2>
                <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-wider rounded-md border border-rose-500/30">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Logged in as <strong className="text-white">{currentProfile.username}</strong> ({currentProfile.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 px-4 pt-3 border-b border-white/10 bg-slate-950/30">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-4 text-xs font-black rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'users'
                ? 'border-orange-500 text-orange-400 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ads')}
            className={`py-2 px-4 text-xs font-black rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'ads'
                ? 'border-orange-500 text-orange-400 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Ads & Posts ({ads.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`py-2 px-4 text-xs font-black rounded-t-xl transition-all flex items-center gap-2 border-b-2 relative ${
              activeTab === 'reports'
                ? 'border-orange-500 text-orange-400 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Reports ({reports.length})</span>
            {reports.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* TAB 1: USERS */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user by username, email, UID, or Snapchat..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Balance</th>
                      <th className="p-3">Handles</th>
                      <th className="p-3">Role</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => {
                      const isActing = actionInProgress === u.uid;
                      return (
                        <tr key={u.uid} className={`hover:bg-white/5 transition-colors ${u.isBanned ? 'bg-rose-950/20' : ''}`}>
                          <td className="p-3">
                            <div className="font-black text-white flex items-center gap-1.5">
                              <span>{u.username}</span>
                              {u.isAdmin && (
                                <span className="bg-amber-500/20 text-amber-300 text-[9px] px-1.5 py-0.2 rounded font-black border border-amber-500/30">
                                  ADMIN
                                </span>
                              )}
                              {u.isBanned && (
                                <span className="bg-rose-500/20 text-rose-300 text-[9px] px-1.5 py-0.2 rounded font-black border border-rose-500/30">
                                  BANNED
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {u.email || u.uid}
                            </div>
                          </td>
                          <td className="p-3 font-mono font-bold text-amber-400">
                            {u.creditBalance} Pts
                          </td>
                          <td className="p-3 text-[11px] text-slate-300">
                            {u.snapchatHandle && <span className="block">👻 {u.snapchatHandle}</span>}
                            {u.whatsappNumber && <span className="block">💬 {u.whatsappNumber}</span>}
                            {!u.snapchatHandle && !u.whatsappNumber && <span className="text-slate-500">—</span>}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleToggleAdmin(u)}
                              disabled={isActing}
                              className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                                u.isAdmin 
                                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' 
                                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
                              }`}
                            >
                              {u.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                            </button>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedUserForCredit(u)}
                                className="px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 rounded-lg text-[10px] font-bold border border-orange-500/30 transition-all flex items-center gap-1"
                                title="Adjust points"
                              >
                                <Coins className="w-3 h-3" />
                                <span>Adjust Pts</span>
                              </button>

                              <button
                                onClick={() => handleToggleBan(u)}
                                disabled={isActing}
                                className={`p-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                  u.isBanned
                                    ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                                }`}
                                title={u.isBanned ? 'Unban User' : 'Ban User'}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ADS */}
          {activeTab === 'ads' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ads by title, username, handle, or ad ID..."
                  value={adSearch}
                  onChange={(e) => setAdSearch(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredAds.map((ad) => (
                  <div 
                    key={ad.adId} 
                    className="p-3 rounded-2xl bg-slate-950/50 border border-white/10 space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-slate-300">
                          {ad.platform} • {ad.category}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          ad.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                        }`}>
                          {ad.status}
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-white line-clamp-1">{ad.title}</h4>
                      <p className="text-[11px] text-slate-300 line-clamp-2">{ad.description || 'No description'}</p>
                      <div className="text-[10px] text-amber-400 font-mono">
                        Target: {ad.targetHandleOrNumber} • Poster: {ad.userDisplayName || ad.userId}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        Reward: <strong className="text-white">+{ad.rewardPerAdd || 5} Cr</strong> • Expires: {new Date(ad.expiresAt).toLocaleDateString()}
                      </span>
                      {ad.status === 'active' && (
                        <button
                          onClick={() => handleDeleteAd(ad)}
                          disabled={actionInProgress === ad.adId}
                          className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-[10px] font-bold border border-rose-500/30 flex items-center gap-1 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Take Down Ad</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  No open reports! Community is running smoothly.
                </div>
              ) : (
                reports.map((rep) => (
                  <div key={rep.reportId} className="p-3.5 rounded-2xl bg-slate-950/60 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Reason: {rep.reason}</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Reported on: {new Date(rep.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {rep.details && (
                      <p className="text-xs text-slate-300 bg-black/40 p-2 rounded-lg italic">
                        "{rep.details}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <span className="text-[10px] text-slate-400">Target Ad ID: {rep.adId}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResolveReport(rep, false)}
                          className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg text-[10px] font-bold transition-all"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleResolveReport(rep, true)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-black transition-all"
                        >
                          Delete Ad & Close
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Modal: Adjust User Credits */}
        {selectedUserForCredit && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="bg-slate-900 border border-white/20 rounded-2xl p-4 max-w-sm w-full space-y-3 shadow-2xl">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Adjust Points: {selectedUserForCredit.username}
                </h4>
                <button onClick={() => setSelectedUserForCredit(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Point Delta (+ to add, - to deduct):</label>
                  <input
                    type="number"
                    value={creditAdjustmentAmount}
                    onChange={(e) => setCreditAdjustmentAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Reason / Note:</label>
                  <input
                    type="text"
                    value={creditAdjustmentReason}
                    onChange={(e) => setCreditAdjustmentReason(e.target.value)}
                    placeholder="e.g. Compensation, Promo, Manual Grant"
                    className="w-full bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => setSelectedUserForCredit(null)}
                  className="py-1.5 px-3 bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyCreditAdjustment}
                  className="py-1.5 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

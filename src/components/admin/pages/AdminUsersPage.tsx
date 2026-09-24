import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Shield, 
  Ban, 
  Coins, 
  Plus, 
  Minus, 
  Check, 
  X, 
  AlertCircle,
  Copy,
  Sparkles,
  Calendar,
  ExternalLink,
  Phone,
  Mail,
  UserCheck,
  UserX
} from 'lucide-react';
import { UserProfile } from '../../../types';
import { getEffectiveAvatar } from '../../../lib/avatar';
import { AdminPagination } from '../AdminPagination';

interface AdminUsersPageProps {
  users: UserProfile[];
  onToggleAdmin: (user: UserProfile) => Promise<void>;
  onToggleBan: (user: UserProfile) => Promise<void>;
  onAdjustCredits: (user: UserProfile, amount: number, reason: string) => Promise<void>;
  actionInProgress: string | null;
  onToast: (msg: string) => void;
}

export const AdminUsersPage: React.FC<AdminUsersPageProps> = ({
  users,
  onToggleAdmin,
  onToggleBan,
  onAdjustCredits,
  actionInProgress,
  onToast,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'admins' | 'banned' | 'high_balance'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Selected user for inspection drawer/modal
  const [inspectingUser, setInspectingUser] = useState<UserProfile | null>(null);

  // Adjust credit modal state
  const [selectedUserForCredit, setSelectedUserForCredit] = useState<UserProfile | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(50);
  const [creditReason, setCreditReason] = useState<string>('Admin bonus');

  // Filtered users
  const filteredUsers = users.filter(u => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (u.username || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchUid = u.uid.toLowerCase().includes(q);
      const matchSnap = (u.snapchatHandle || '').toLowerCase().includes(q);
      const matchWa = (u.whatsappNumber || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchUid && !matchSnap && !matchWa) return false;
    }

    if (filter === 'admins') return u.isAdmin;
    if (filter === 'banned') return u.isBanned;
    if (filter === 'high_balance') return (u.creditBalance || 0) >= 100;
    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const adminCount = users.filter(u => u.isAdmin).length;
  const bannedCount = users.filter(u => u.isBanned).length;
  const totalBalance = users.reduce((acc, u) => acc + (u.creditBalance || 0), 0);

  const handleOpenCreditModal = (user: UserProfile) => {
    setSelectedUserForCredit(user);
    setCreditAmount(50);
    setCreditReason('Admin bonus');
  };

  const handleConfirmCreditAdjustment = async () => {
    if (!selectedUserForCredit) return;
    await onAdjustCredits(selectedUserForCredit, creditAmount, creditReason);
    setSelectedUserForCredit(null);
  };

  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    onToast(`Copied ${label} to clipboard!`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Registered Accounts</p>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1.5">{users.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Super & Staff Admins</p>
          <p className="text-2xl sm:text-3xl font-black text-orange-400 mt-1.5">{adminCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Banned Accounts</p>
          <p className="text-2xl sm:text-3xl font-black text-rose-400 mt-1.5">{bannedCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Circulating Points</p>
          <p className="text-2xl sm:text-3xl font-black text-amber-400 font-mono mt-1.5">{totalBalance.toLocaleString()}</p>
        </div>
      </div>

      {/* Main Directory Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5">
        {/* Controls bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <button
              onClick={() => { setFilter('all'); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Users ({users.length})
            </button>
            <button
              onClick={() => { setFilter('admins'); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === 'admins'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Admins ({adminCount})
            </button>
            <button
              onClick={() => { setFilter('banned'); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === 'banned'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Banned ({bannedCount})
            </button>
            <button
              onClick={() => { setFilter('high_balance'); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === 'high_balance'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              High Balance (≥100)
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user, email, handle, UID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto border border-slate-800/80 rounded-2xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">User Identity</th>
                <th className="py-3 px-4">Wallet Balance</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {paginatedUsers.map((u) => {
                const isWorking = actionInProgress === u.uid;

                return (
                  <tr key={u.uid} className="hover:bg-slate-800/30 transition-colors group">
                    {/* User Identity */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setInspectingUser(u)}
                          className="relative rounded-xl overflow-hidden shrink-0 group-hover:ring-2 group-hover:ring-orange-500/50 transition-all"
                        >
                          <img
                            src={getEffectiveAvatar(u.photoUrl, u.uid)}
                            alt={u.username}
                            className="w-9 h-9 object-cover bg-slate-800 border border-slate-700"
                          />
                        </button>
                        <div className="min-w-0">
                          <p 
                            onClick={() => setInspectingUser(u)}
                            className="font-bold text-white text-xs truncate flex items-center gap-1.5 cursor-pointer hover:text-orange-400 transition-colors"
                          >
                            <span>{u.username || 'User'}</span>
                            {u.isAdmin && (
                              <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[9px] font-black px-1.5 py-0.2 rounded">
                                ADMIN
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="font-mono text-slate-500">{u.uid.slice(0, 8)}...</span>
                            <button
                              onClick={() => copyText(u.uid, 'UID')}
                              className="text-slate-600 hover:text-slate-300 transition-colors"
                              title="Copy UID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            {u.email && <span className="text-slate-500 truncate max-w-36">• {u.email}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Balance */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-amber-400 text-sm">
                          {(u.creditBalance || 0).toLocaleString()} Pts
                        </span>
                        <button
                          onClick={() => handleOpenCreditModal(u)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-[11px] font-bold border border-slate-700"
                          title="Adjust Points"
                        >
                          Adjust
                        </button>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      {u.isAdmin ? (
                        <span className="inline-flex items-center gap-1 bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          <Shield className="w-3 h-3" />
                          <span>Admin</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Member</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {u.isBanned ? (
                        <span className="inline-flex items-center gap-1 bg-rose-950 text-rose-300 border border-rose-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          <Ban className="w-3 h-3" />
                          <span>Banned</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          <Check className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectingUser(u)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all border border-slate-700"
                        >
                          Inspect
                        </button>

                        <button
                          onClick={() => onToggleAdmin(u)}
                          disabled={isWorking}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            u.isAdmin
                              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                              : 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20'
                          }`}
                        >
                          {u.isAdmin ? 'Demote' : 'Make Admin'}
                        </button>

                        <button
                          onClick={() => onToggleBan(u)}
                          disabled={isWorking}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            u.isBanned
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                          }`}
                        >
                          {u.isBanned ? 'Unban' : 'Ban'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500 space-y-2">
                    <Users className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-300">No users match your filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredUsers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* User Inspection Modal / Drawer */}
      {inspectingUser && (
        <div 
          onClick={() => setInspectingUser(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl text-white animate-scale-up"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <img
                  src={getEffectiveAvatar(inspectingUser.photoUrl, inspectingUser.uid)}
                  alt={inspectingUser.username}
                  className="w-14 h-14 rounded-2xl object-cover bg-slate-800 border-2 border-orange-500/50"
                />
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>{inspectingUser.username}</span>
                    {inspectingUser.isAdmin && (
                      <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                        ADMIN
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">{inspectingUser.email || 'No email registered'}</p>
                </div>
              </div>

              <button
                onClick={() => setInspectingUser(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Wallet Balance</span>
                <span className="text-xl font-black text-amber-400 font-mono">
                  {(inspectingUser.creditBalance || 0).toLocaleString()} Pts
                </span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Day Streak</span>
                <span className="text-xl font-black text-purple-400 font-mono">
                  {inspectingUser.dailyStreak || 0} Days 🔥
                </span>
              </div>
            </div>

            {/* User Meta List */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">User UID:</span>
                <span 
                  onClick={() => copyText(inspectingUser.uid, 'UID')}
                  className="font-mono text-slate-300 hover:text-white cursor-pointer flex items-center gap-1"
                >
                  <span>{inspectingUser.uid}</span>
                  <Copy className="w-3 h-3 text-slate-500" />
                </span>
              </div>

              {inspectingUser.snapchatHandle && (
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Snapchat Handle:</span>
                  <span className="font-bold text-[#FFFC00]">@{inspectingUser.snapchatHandle}</span>
                </div>
              )}

              {inspectingUser.whatsappNumber && (
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">WhatsApp Number:</span>
                  <span className="font-bold text-[#25D366]">{inspectingUser.whatsappNumber}</span>
                </div>
              )}

              {inspectingUser.referralCode && (
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Referral Code:</span>
                  <span className="font-mono font-bold text-orange-400">{inspectingUser.referralCode}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Member Since:</span>
                <span className="text-slate-300">
                  {new Date(inspectingUser.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  const target = inspectingUser;
                  setInspectingUser(null);
                  handleOpenCreditModal(target);
                }}
                className="py-2.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all text-center"
              >
                Adjust Balance
              </button>

              <button
                onClick={async () => {
                  const target = inspectingUser;
                  setInspectingUser(null);
                  await onToggleBan(target);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center border ${
                  inspectingUser.isBanned
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500'
                }`}
              >
                {inspectingUser.isBanned ? 'Unban Account' : 'Ban Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Credit Modal */}
      {selectedUserForCredit && (
        <div 
          onClick={() => setSelectedUserForCredit(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-white"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Adjust Balance
                  </h4>
                  <p className="text-sm font-bold text-white truncate max-w-[180px]">
                    {selectedUserForCredit.username}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUserForCredit(null)} 
                className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
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
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold text-base focus:border-orange-500 focus:outline-none"
                />

                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 pt-2 flex-wrap">
                  {[+20, +50, +100, +250, -50].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCreditAmount(preset)}
                      className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono font-bold text-slate-300"
                    >
                      {preset > 0 ? `+${preset}` : preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Audit Log / Reason:</label>
                <input
                  type="text"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="e.g. Compensation, Promo, Manual Grant"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none"
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
                onClick={handleConfirmCreditAdjustment}
                className="py-2.5 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

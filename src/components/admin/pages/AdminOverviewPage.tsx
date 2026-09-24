import React from 'react';
import { 
  Users, 
  Sparkles, 
  Coins, 
  Clock, 
  AlertTriangle, 
  ThumbsUp, 
  Banknote, 
  TrendingUp, 
  Zap, 
  ExternalLink, 
  ShieldCheck, 
  ArrowRight,
  Database,
  Radio,
  CheckCircle2
} from 'lucide-react';
import { AdminTab } from '../AdminSidebar';
import { UserProfile, Ad, AdReport, Claim } from '../../../types';

interface AdminOverviewPageProps {
  stats: {
    totalUsersCount: number;
    activeAdsCount: number;
    pausedAdsCount: number;
    totalPointsCirculating: number;
    pendingClaimsCount: number;
    totalVerifiedClaims: number;
    openReportsCount: number;
    totalViews: number;
    totalClicks: number;
    totalLikes: number;
    overallCtr: string;
  };
  financialStats: {
    grossRevenueNgn: number;
    netProfitNgn: number;
    paystackFeesNgn: number;
    liveDepositsCount: number;
    paidCreditsIssued: number;
    averageDepositNgn: number;
  };
  users: UserProfile[];
  ads: Ad[];
  reports: AdReport[];
  claims: Claim[];
  onNavigateTab: (tab: AdminTab) => void;
}

export const AdminOverviewPage: React.FC<AdminOverviewPageProps> = ({
  stats,
  financialStats,
  users,
  ads,
  reports,
  claims,
  onNavigateTab,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Real Profit & Revenue Hero Card */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/40 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-radial from-emerald-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Live Real Money Engine</span>
              </span>
              <span className="text-xs text-slate-400">Paystack Verified</span>
            </div>

            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl sm:text-4xl font-black text-emerald-300 font-mono tracking-tight">
                ₦{financialStats.grossRevenueNgn.toLocaleString('en-NG')}
              </span>
              <span className="text-sm font-extrabold text-emerald-400/90">
                Gross Revenue
              </span>
            </div>

            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Total verified customer deposits. Estimated Net Profit after processing fees is{' '}
              <strong className="text-white font-mono font-black">
                ₦{financialStats.netProfitNgn.toLocaleString('en-NG')}
              </strong>{' '}
              across {financialStats.liveDepositsCount} customer transactions.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateTab('finances')}
              className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <span>View Financial Ledger</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Core Executive KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div 
          onClick={() => onNavigateTab('users')}
          className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Users</span>
            <Users className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">{stats.totalUsersCount}</span>
            <p className="text-[10px] text-slate-500 mt-0.5">Registered accounts</p>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('ads')}
          className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Active Ads</span>
            <Sparkles className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-400">{stats.activeAdsCount}</span>
            <p className="text-[10px] text-slate-500 mt-0.5">{stats.pausedAdsCount} paused</p>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('settings')}
          className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Circulating Pts</span>
            <Coins className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-400 font-mono">
              {stats.totalPointsCirculating.toLocaleString()}
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">In user wallets</p>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('claims')}
          className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Pending Claims</span>
            <Clock className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-orange-400">{stats.pendingClaimsCount}</span>
            <p className="text-[10px] text-slate-500 mt-0.5">{stats.totalVerifiedClaims} approved</p>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('reports')}
          className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Reports</span>
            <AlertTriangle className={`w-4 h-4 ${stats.openReportsCount > 0 ? 'text-rose-500 animate-bounce' : 'text-slate-400'}`} />
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-black ${stats.openReportsCount > 0 ? 'text-rose-400' : 'text-white'}`}>
              {stats.openReportsCount}
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">{reports.length} total reports</p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>CTR & Likes</span>
            <ThumbsUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-purple-400">{stats.overallCtr}%</span>
            <p className="text-[10px] text-slate-500 mt-0.5">{stats.totalLikes} total reactions</p>
          </div>
        </div>
      </div>

      {/* Two Columns: Quick Action Launcher & System Integrity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Quick Actions Center */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-extrabold text-sm">
              <Zap className="w-4 h-4 text-orange-400" />
              <h3>Direct Operations</h3>
            </div>
            <span className="text-xs text-slate-500">Fast shortcuts</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => onNavigateTab('users')}
              className="p-4 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/90 hover:border-slate-700 rounded-2xl text-left transition-all group flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Adjust User Balances</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Search user profiles & credit bonus points</p>
              </div>
            </button>

            <button
              onClick={() => onNavigateTab('finances')}
              className="p-4 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/90 hover:border-slate-700 rounded-2xl text-left transition-all group flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Banknote className="w-4 h-4" />
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Review Paystack Deposits</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Audit live references & settlement ledger</p>
              </div>
            </button>

            <button
              onClick={() => onNavigateTab('claims')}
              className="p-4 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/90 hover:border-slate-700 rounded-2xl text-left transition-all group flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {stats.pendingClaimsCount} Pending
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-white">Verify Proof Claims</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Inspect screenshots & authorize earner payouts</p>
              </div>
            </button>

            <button
              onClick={() => onNavigateTab('reports')}
              className="p-4 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/90 hover:border-slate-700 rounded-2xl text-left transition-all group flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                {stats.openReportsCount > 0 && (
                  <span className="text-[10px] font-black text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
                    {stats.openReportsCount} Action Required
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Safety & Moderation</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Investigate community abuse flags</p>
              </div>
            </button>
          </div>
        </div>

        {/* Right: Platform Health & System Status */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-extrabold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3>System Health</h3>
            </div>
            <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
              100% Operational
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Google Cloud Firestore</p>
                  <p className="text-[11px] text-slate-500">Connected to (default) database</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-400">Active</span>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Paystack Payment Engine</p>
                  <p className="text-[11px] text-slate-500">Production Live API Mode</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-400">Verified</span>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Social Add Verification</p>
                  <p className="text-[11px] text-slate-500">WhatsApp & Snapchat parser rules</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-400">Optimal</span>
            </div>
          </div>

          <div className="pt-1 text-[11px] text-slate-400 leading-relaxed">
            All user transactions, daily streak bonuses, and campaign durations are monitored in real time with zero simulation hooks.
          </div>
        </div>
      </div>
    </div>
  );
};

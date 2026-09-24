import React from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Users, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Settings, 
  ArrowLeft, 
  Shield, 
  Banknote,
  X
} from 'lucide-react';
import { UserProfile } from '../../types';

export type AdminTab = 'overview' | 'finances' | 'users' | 'ads' | 'reports' | 'claims' | 'settings';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onExit: () => void;
  openReportsCount: number;
  pendingClaimsCount: number;
  totalUsersCount: number;
  activeAdsCount: number;
  grossRevenueNgn: number;
  currentProfile: UserProfile;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  onExit,
  openReportsCount,
  pendingClaimsCount,
  totalUsersCount,
  activeAdsCount,
  grossRevenueNgn,
  currentProfile,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'overview' as AdminTab,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
      description: 'Platform pulse & stats',
    },
    {
      id: 'finances' as AdminTab,
      label: 'Revenue & Profits',
      icon: Banknote,
      badge: `₦${grossRevenueNgn.toLocaleString('en-NG')}`,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      description: 'Live fiat deposits & fees',
    },
    {
      id: 'users' as AdminTab,
      label: 'Users Directory',
      icon: Users,
      badge: totalUsersCount.toString(),
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
      description: 'Profiles, balances & roles',
    },
    {
      id: 'ads' as AdminTab,
      label: 'Ads & Campaigns',
      icon: Sparkles,
      badge: activeAdsCount.toString(),
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      description: 'Active, paused & boosted ads',
    },
    {
      id: 'claims' as AdminTab,
      label: 'Verification Claims',
      icon: CheckCircle2,
      badge: pendingClaimsCount > 0 ? `${pendingClaimsCount} pending` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description: 'Proof verification & payouts',
    },
    {
      id: 'reports' as AdminTab,
      label: 'Reports & Safety',
      icon: AlertTriangle,
      badge: openReportsCount > 0 ? `${openReportsCount} open` : null,
      badgeColor: 'bg-rose-500 text-white animate-pulse',
      description: 'Flagged ads & moderation',
    },
    {
      id: 'settings' as AdminTab,
      label: 'System & Economy',
      icon: Settings,
      badge: null,
      description: 'Point values & rules',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-800/90 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Portal Branding Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white tracking-wide">AddMeUp</span>
                <span className="bg-orange-500 text-[9px] font-black uppercase text-white px-1.5 py-0.5 rounded tracking-widest">
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Control Center</p>
            </div>
          </div>

          {/* Close Mobile Button */}
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Money Quick Callout */}
        <div className="px-4 pt-4">
          <div 
            onClick={() => {
              onSelectTab('finances');
              onCloseMobile();
            }}
            className="bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-3 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Live Real Revenue</span>
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="mt-1 text-lg font-black text-emerald-300 font-mono">
              ₦{grossRevenueNgn.toLocaleString('en-NG')}
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
          <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
            Pages & Modules
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full p-2.5 rounded-2xl text-left transition-all flex items-center justify-between gap-3 group ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/90 font-medium'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-900 text-slate-400 group-hover:text-white group-hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs truncate ${isActive ? 'text-white font-bold' : 'text-slate-200'}`}>
                      {item.label}
                    </p>
                    <p className={`text-[10px] truncate ${isActive ? 'text-orange-100' : 'text-slate-500'}`}>
                      {item.description}
                    </p>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white border-white/30'
                        : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer: User profile & Exit */}
        <div className="p-3 border-t border-slate-800/80 space-y-2 bg-slate-950/80">
          <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {currentProfile.username ? currentProfile.username.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{currentProfile.username}</p>
                <p className="text-[10px] text-emerald-400 font-semibold">Super Admin</p>
              </div>
            </div>
          </div>

          <button
            onClick={onExit}
            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-800 active:scale-98"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to User App</span>
          </button>
        </div>
      </aside>
    </>
  );
};

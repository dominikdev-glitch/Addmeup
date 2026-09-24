import React from 'react';
import { Menu, RefreshCw, Radio } from 'lucide-react';
import { AdminTab } from './AdminSidebar';

interface AdminHeaderProps {
  activeTab: AdminTab;
  onOpenMobileSidebar: () => void;
  loading: boolean;
  onRefresh: () => void;
}

const TAB_TITLES: Record<AdminTab, { title: string; subtitle: string; category: string }> = {
  overview: {
    title: 'Platform Overview',
    subtitle: 'System health, key performance indicators and high-level activity pulse',
    category: 'Executive Dashboard',
  },
  finances: {
    title: 'Revenue & Profits',
    subtitle: 'Real-time fiat deposits, Paystack fee calculations and transaction audit ledger',
    category: 'Financial Portal',
  },
  users: {
    title: 'Users Directory',
    subtitle: 'Manage user profiles, adjust wallet balances, assign admin roles and restrict accounts',
    category: 'User Management',
  },
  ads: {
    title: 'Ads & Campaigns',
    subtitle: 'Monitor active, paused and expired campaigns, apply 24h VIP boosts and moderate content',
    category: 'Campaign Operations',
  },
  claims: {
    title: 'Verification Claims',
    subtitle: 'Review task proof submissions, inspect screenshots and manually approve payouts',
    category: 'Proof Verification',
  },
  reports: {
    title: 'Reports & Safety',
    subtitle: 'Investigate community flagged ads, resolve violations and remove offensive materials',
    category: 'Trust & Safety',
  },
  settings: {
    title: 'Platform Rules & Economy',
    subtitle: 'Configure reward rates, points conversion economics and streak reward multipliers',
    category: 'System Configuration',
  },
};

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab,
  onOpenMobileSidebar,
  loading,
  onRefresh,
}) => {
  const current = TAB_TITLES[activeTab] || TAB_TITLES.overview;

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left Side: Mobile Hamburger & Page Context */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white lg:hidden transition-colors"
            title="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">
                {current.category}
              </span>
              <span className="text-slate-600 text-xs">•</span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Admin Console
              </span>
            </div>
            <h1 className="text-base sm:text-xl font-black text-white tracking-tight truncate">
              {current.title}
            </h1>
          </div>
        </div>

        {/* Right Side: Refresh & Live System Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold border border-slate-800 active:scale-95 disabled:opacity-50"
            title="Reload all data from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : 'text-slate-400'}`} />
            <span className="hidden md:inline">Refresh Data</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-[11px] text-emerald-400 font-bold">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Production Mode</span>
          </div>
        </div>
      </div>
    </header>
  );
};
